#!/usr/bin/env python3
"""ZYRA Eyes low-latency native gaze controller.

This runtime attacks end-to-end control latency rather than only tuning a
smoothing constant. It decouples camera capture, vision tracking and pointer
actuation; always consumes the newest camera frame; reuses a cached face ROI
between periodic detector refreshes; predicts a short distance ahead of the
latest gaze sample; and on macOS moves the cursor through CoreGraphics instead
of sending high-rate PyAutoGUI move commands.

Simulation remains the default. Native actions require the existing owner
sentinel plus --native --approve. No network listener or remote-control channel
is created.
"""

from __future__ import annotations

import argparse
import ctypes
import json
import math
import signal
import sys
import threading
import time
from dataclasses import dataclass

import cv2
import numpy as np
import pyautogui

import zyra_smooth_controller as smooth
import zyra_system_controller as base


@dataclass
class FrameSample:
    seq: int
    captured_at: float
    frame: np.ndarray


class LatestFrameCapture:
    """Continuously capture frames and expose only the newest frame."""

    def __init__(self, camera_index: int, width: int, height: int, fps: float) -> None:
        self.camera = base.open_camera(camera_index, width, height)
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, float(width))
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, float(height))
        self.camera.set(cv2.CAP_PROP_FPS, float(fps))
        self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.lock = threading.Lock()
        self.latest: FrameSample | None = None
        self.stop_requested = False
        self.thread: threading.Thread | None = None
        self.frames = 0
        self.started = time.monotonic()

    def start(self) -> None:
        if self.thread is not None:
            return
        self.thread = threading.Thread(target=self._run, name="zyra-camera-capture", daemon=True)
        self.thread.start()

    def _run(self) -> None:
        seq = 0
        while True:
            with self.lock:
                if self.stop_requested:
                    return
            ok, frame = self.camera.read()
            if not ok:
                time.sleep(0.001)
                continue
            seq += 1
            sample = FrameSample(seq=seq, captured_at=time.monotonic(), frame=frame)
            with self.lock:
                self.latest = sample
                self.frames += 1

    def newest_after(self, seq: int) -> FrameSample | None:
        with self.lock:
            sample = self.latest
        if sample is None or sample.seq <= seq:
            return None
        return sample

    def fps(self) -> float:
        elapsed = max(0.001, time.monotonic() - self.started)
        with self.lock:
            frames = self.frames
        return frames / elapsed

    def stop(self) -> None:
        with self.lock:
            self.stop_requested = True
        if self.thread is not None:
            self.thread.join(timeout=1.0)
        self.camera.release()


class FastEyeTracker:
    """Reuse the face ROI and run the expensive face detector periodically."""

    def __init__(self, face_refresh: int = 10) -> None:
        self.face_refresh = max(1, int(face_refresh))
        self.cached_face: tuple[int, int, int, int] | None = None
        self.frames_since_face = self.face_refresh
        self.consecutive_misses = 0

    @staticmethod
    def _clamp_face(face: tuple[int, int, int, int], shape) -> tuple[int, int, int, int] | None:
        height, width = shape[:2]
        x, y, w, h = [int(v) for v in face]
        x = max(0, min(width - 1, x))
        y = max(0, min(height - 1, y))
        w = max(1, min(width - x, w))
        h = max(1, min(height - y, h))
        if w < 40 or h < 40:
            return None
        return x, y, w, h

    def extract(self, frame, face_cascade, eye_cascade, eye_mode: str, draw: bool = False):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        need_face = self.cached_face is None or self.frames_since_face >= self.face_refresh
        if need_face:
            face = base.largest_face(gray, face_cascade)
            if face is not None:
                self.cached_face = tuple(int(v) for v in face)
                self.frames_since_face = 0
                self.consecutive_misses = 0
            elif self.cached_face is None:
                return None, frame
        self.frames_since_face += 1

        if self.cached_face is None:
            return None, frame
        face = self._clamp_face(self.cached_face, gray.shape)
        if face is None:
            self.cached_face = None
            return None, frame

        fx, fy, fw, fh = face
        face_gray = gray[fy : fy + fh, fx : fx + fw]
        boxes = base.choose_eye_boxes(base.candidate_eyes(face_gray, eye_cascade), eye_mode)
        features = []

        if draw:
            cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (70, 210, 255), 1)

        for ex, ey, ew, eh in boxes:
            eye_gray = face_gray[ey : ey + eh, ex : ex + ew]
            feature = base.pupil_feature(eye_gray)
            if feature is None:
                continue
            features.append(feature)
            if draw:
                px = fx + ex + round(feature.x * ew)
                py = fy + ey + round(feature.y * eh)
                cv2.rectangle(
                    frame,
                    (fx + ex, fy + ey),
                    (fx + ex + ew, fy + ey + eh),
                    (255, 180, 80),
                    1,
                )
                cv2.circle(frame, (px, py), 4, (80, 255, 120), -1)

        if not features:
            self.consecutive_misses += 1
            if self.consecutive_misses >= 2:
                self.frames_since_face = self.face_refresh
            if self.consecutive_misses >= 5:
                self.cached_face = None
            return None, frame

        self.consecutive_misses = 0
        total_weight = sum(max(0.05, item.confidence) for item in features)
        x = sum(item.x * max(0.05, item.confidence) for item in features) / total_weight
        y = sum(item.y * max(0.05, item.confidence) for item in features) / total_weight
        confidence = sum(item.confidence for item in features) / len(features)
        return base.GazeFeature(x, y, confidence, len(features)), frame


class PredictiveGaze:
    """Adaptive filtering plus short, bounded velocity prediction."""

    def __init__(
        self,
        min_cutoff: float,
        beta: float,
        derivative_cutoff: float,
        prediction_ms: float,
        max_prediction_ms: float,
        velocity_tau: float,
        max_velocity: float,
        screen_width: int,
        screen_height: int,
    ) -> None:
        self.filter = smooth.AdaptiveGazeFilter(min_cutoff, beta, derivative_cutoff)
        self.prediction_seconds = max(0.0, prediction_ms / 1000.0)
        self.max_prediction_seconds = max(0.0, max_prediction_ms / 1000.0)
        self.velocity_tau = max(0.005, velocity_tau)
        self.max_velocity = max(500.0, max_velocity)
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.last: tuple[float, float] | None = None
        self.last_time: float | None = None
        self.velocity = [0.0, 0.0]

    @staticmethod
    def _clamp_vector(x: float, y: float, maximum: float) -> tuple[float, float]:
        magnitude = math.hypot(x, y)
        if magnitude <= maximum or magnitude <= 1e-9:
            return x, y
        scale = maximum / magnitude
        return x * scale, y * scale

    def apply(
        self,
        raw_target: tuple[int, int],
        confidence: float,
        captured_at: float,
        now: float,
    ) -> tuple[tuple[int, int], tuple[int, int], float]:
        filtered = self.filter.apply(raw_target, confidence, now)
        filtered_float = (float(filtered[0]), float(filtered[1]))

        if self.last is not None and self.last_time is not None:
            dt = min(0.10, max(1e-4, now - self.last_time))
            raw_vx = (filtered_float[0] - self.last[0]) / dt
            raw_vy = (filtered_float[1] - self.last[1]) / dt
            raw_vx, raw_vy = self._clamp_vector(raw_vx, raw_vy, self.max_velocity)
            alpha = 1.0 - math.exp(-dt / self.velocity_tau)
            self.velocity[0] += (raw_vx - self.velocity[0]) * alpha
            self.velocity[1] += (raw_vy - self.velocity[1]) * alpha

        self.last = filtered_float
        self.last_time = now

        frame_age = max(0.0, now - captured_at)
        horizon = min(self.max_prediction_seconds, frame_age + self.prediction_seconds)
        confidence_scale = max(0.15, min(1.0, confidence))
        px = filtered_float[0] + self.velocity[0] * horizon * confidence_scale
        py = filtered_float[1] + self.velocity[1] * horizon * confidence_scale
        px = max(0.0, min(float(self.screen_width - 1), px))
        py = max(0.0, min(float(self.screen_height - 1), py))
        return filtered, (round(px), round(py)), frame_age * 1000.0


class CGPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]


class NativePointerBackend:
    """Use CoreGraphics cursor warp on macOS; PyAutoGUI elsewhere."""

    def __init__(self) -> None:
        self.kind = "pyautogui"
        self.cg = None
        if sys.platform == "darwin":
            try:
                self.cg = ctypes.CDLL(
                    "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices"
                )
                self.cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]
                self.cg.CGWarpMouseCursorPosition.restype = ctypes.c_int32
                self.kind = "coregraphics"
            except Exception:
                self.cg = None

    def move(self, x: float, y: float) -> None:
        if self.cg is not None:
            result = self.cg.CGWarpMouseCursorPosition(CGPoint(float(x), float(y)))
            if result != 0:
                raise RuntimeError(f"CGWarpMouseCursorPosition failed with code {result}")
            return
        pyautogui.moveTo(round(x), round(y), duration=0, _pause=False)


class NativeLowLatencyActuator:
    """Fast actuator with a tiny adaptive settling constant, not a spring chase."""

    def __init__(self, backend, rate_hz, cursor_tau, fast_tau, fast_distance, max_speed, hold_radius):
        self.backend = backend
        self.rate_hz = max(60.0, float(rate_hz))
        self.cursor_tau = max(0.002, float(cursor_tau))
        self.fast_tau = max(0.001, float(fast_tau))
        self.fast_distance = max(5.0, float(fast_distance))
        self.max_speed = max(1000.0, float(max_speed))
        self.hold_radius = max(0.0, float(hold_radius))
        point = pyautogui.position()
        self.position = [float(point.x), float(point.y)]
        self.target: tuple[float, float] | None = None
        self.paused = False
        self.stop_requested = False
        self.failed = False
        self.failure_message: str | None = None
        self.lock = threading.Lock()
        self.thread: threading.Thread | None = None
        self.moves = 0
        self.started = time.monotonic()

    def start(self) -> None:
        self.thread = threading.Thread(target=self._run, name="zyra-native-pointer", daemon=True)
        self.thread.start()

    def set_target(self, target: tuple[int, int] | None) -> None:
        with self.lock:
            self.target = None if target is None else (float(target[0]), float(target[1]))

    def set_paused(self, paused: bool) -> None:
        with self.lock:
            self.paused = bool(paused)

    def stop(self) -> None:
        with self.lock:
            self.stop_requested = True
        if self.thread is not None:
            self.thread.join(timeout=1.0)

    def effective_hz(self) -> float:
        return self.moves / max(0.001, time.monotonic() - self.started)

    def _run(self) -> None:
        period = 1.0 / self.rate_hz
        previous = time.monotonic()
        try:
            while True:
                tick = time.monotonic()
                dt = min(0.03, max(1e-4, tick - previous))
                previous = tick
                with self.lock:
                    if self.stop_requested:
                        return
                    target = self.target
                    paused = self.paused

                if not paused and target is not None:
                    dx = target[0] - self.position[0]
                    dy = target[1] - self.position[1]
                    distance = math.hypot(dx, dy)
                    if distance > self.hold_radius:
                        tau = self.fast_tau if distance >= self.fast_distance else self.cursor_tau
                        alpha = 1.0 - math.exp(-dt / tau)
                        step_x = dx * alpha
                        step_y = dy * alpha
                        step_distance = math.hypot(step_x, step_y)
                        max_step = self.max_speed * dt
                        if step_distance > max_step and step_distance > 1e-9:
                            scale = max_step / step_distance
                            step_x *= scale
                            step_y *= scale
                        self.position[0] += step_x
                        self.position[1] += step_y
                        self.backend.move(self.position[0], self.position[1])
                        self.moves += 1

                elapsed = time.monotonic() - tick
                if elapsed < period:
                    time.sleep(period - elapsed)
        except Exception as exc:
            self.failed = True
            self.failure_message = f"native pointer actuator stopped: {exc}"


def run_controller(args: argparse.Namespace) -> None:
    base.require_native_authorization(args.native, args.approve)
    profile = base.load_profile(args.profile)
    eye_mode = args.eye or profile.eye_mode
    camera_index = profile.camera_index if args.camera is None else args.camera
    screen_width, screen_height = pyautogui.size()
    face_cascade, eye_cascade = base.load_cascades()

    capture = LatestFrameCapture(camera_index, args.camera_width, args.camera_height, args.camera_fps)
    capture.start()
    tracker = FastEyeTracker(args.face_refresh)
    predictor = PredictiveGaze(
        args.min_cutoff, args.beta, args.derivative_cutoff,
        args.prediction_ms, args.max_prediction_ms,
        args.prediction_velocity_tau, args.max_prediction_velocity,
        screen_width, screen_height,
    )

    backend = NativePointerBackend()
    motion = None
    if args.native:
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.0
        motion = NativeLowLatencyActuator(
            backend, args.cursor_hz, args.cursor_tau, args.fast_tau,
            args.fast_distance, args.max_speed, args.hold_radius,
        )
        motion.start()

    state = base.RuntimeState()
    rect = base.dock_geometry(screen_width, screen_height)
    if not args.no_dock:
        base.open_dock(rect)

    stop = False
    started = time.monotonic()
    last_seq = 0
    processed = tracked = 0
    target = None
    active_index = None
    latency_total_ms = 0.0
    latency_samples = 0
    last_stats = started

    def request_stop(_signum=None, _frame=None):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)

    base.audit(
        "NATIVE_LOW_LATENCY_SESSION_STARTED",
        profile=profile.name, native=args.native, backend=backend.kind,
        cursorHz=args.cursor_hz, cameraFps=args.camera_fps,
        faceRefresh=args.face_refresh, predictionMs=args.prediction_ms,
    )
    print(
        "ZYRA Eyes native low-latency controller started. "
        + (f"NATIVE backend={backend.kind}." if args.native else "DEMO/SIMULATION mode.")
        + " Ctrl-C stops."
    )

    try:
        while not stop:
            if motion is not None and motion.failed:
                print(motion.failure_message or "native pointer actuator stopped")
                break

            sample = capture.newest_after(last_seq)
            if sample is None:
                if not args.no_preview or not args.no_dock:
                    key = cv2.waitKey(1) & 0xFF
                    if key == 27:
                        break
                time.sleep(0.0008)
                continue

            last_seq = sample.seq
            processed += 1
            feature, annotated = tracker.extract(
                sample.frame, face_cascade, eye_cascade, eye_mode,
                draw=not args.no_preview,
            )
            active_index = None

            if feature is not None:
                tracked += 1
                now = time.monotonic()
                raw_target = profile.predict(feature)
                filtered, predicted, frame_age_ms = predictor.apply(
                    raw_target, feature.confidence, sample.captured_at, now,
                )
                latency_total_ms += frame_age_ms
                latency_samples += 1
                target = predicted

                if not args.no_dock:
                    active_index = base.command_at(target, rect)

                if active_index is not None:
                    if motion is not None:
                        motion.set_paused(True)
                    now = time.monotonic()
                    if state.dock_index != active_index:
                        state.dock_index = active_index
                        state.dock_started = now
                    elif now - state.dock_started >= args.dock_dwell_seconds:
                        base.perform_command(
                            base.COMMANDS[active_index], state, args.native,
                            state.last_content_target,
                        )
                        state.dock_started = now + 9999.0
                    state.dwell_anchor = None
                    state.dwell_fired = False
                else:
                    state.dock_index = None
                    state.dock_started = 0.0
                    state.last_content_target = target
                    if motion is not None:
                        motion.set_paused(state.paused)
                        if not state.paused:
                            motion.set_target(target)
                    if not state.paused:
                        base.update_dwell(
                            target, state, args.native, args.dwell_seconds,
                            args.dwell_radius, args.dwell_cooldown,
                        )
                        base.update_scroll(
                            target, state, args.native, screen_height,
                            args.scroll_margin, args.scroll_step, args.scroll_interval,
                        )

                if not args.no_preview:
                    cv2.putText(
                        annotated,
                        f"raw={raw_target} filt={filtered} pred={predicted} age={frame_age_ms:.1f}ms",
                        (14, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.48,
                        (80, 255, 120), 1, cv2.LINE_AA,
                    )
                    cv2.putText(
                        annotated,
                        f"backend={backend.kind} capture={capture.fps():.1f}fps cursor={motion.effective_hz() if motion else 0:.1f}Hz",
                        (14, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.44,
                        (230, 230, 240), 1, cv2.LINE_AA,
                    )
            elif motion is not None:
                motion.set_paused(True)

            if not args.no_dock:
                cv2.imshow(base.DOCK_NAME, base.render_dock(rect, state, target, active_index, args.native))
            if not args.no_preview:
                cv2.imshow(base.PREVIEW_NAME, annotated)

            if not args.no_preview or not args.no_dock:
                key = cv2.waitKey(1) & 0xFF
                if key == 27:
                    break
                if key in (ord("p"), ord("P")):
                    base.perform_command("PAUSE", state, args.native, state.last_content_target)
                    if motion is not None:
                        motion.set_paused(state.paused)

            now = time.monotonic()
            if now - last_stats >= args.stats_interval:
                elapsed = max(0.001, now - started)
                avg_age = latency_total_ms / latency_samples if latency_samples else 0.0
                print(json.dumps({
                    "captureFps": round(capture.fps(), 1),
                    "trackFps": round(processed / elapsed, 1),
                    "trackedRatio": round(tracked / processed, 3) if processed else 0.0,
                    "avgFrameAgeMs": round(avg_age, 1),
                    "cursorHz": round(motion.effective_hz(), 1) if motion else 0.0,
                    "pointerBackend": backend.kind,
                }, separators=(",", ":")))
                last_stats = now

    finally:
        if motion is not None:
            motion.stop()
        base.release_drag(state, args.native)
        capture.stop()
        if not args.no_preview or not args.no_dock:
            cv2.destroyAllWindows()
        elapsed = max(0.001, time.monotonic() - started)
        avg_age = latency_total_ms / latency_samples if latency_samples else 0.0
        base.audit(
            "NATIVE_LOW_LATENCY_SESSION_STOPPED",
            profile=profile.name, native=args.native, backend=backend.kind,
            processedFrames=processed, trackedFrames=tracked,
            avgFrameAgeMs=round(avg_age, 2), durationSeconds=round(elapsed, 2),
        )
        print(json.dumps({
            "stopped": True,
            "profile": profile.name,
            "backend": backend.kind,
            "captureFps": round(capture.fps(), 1),
            "trackFps": round(processed / elapsed, 1),
            "trackedRatio": round(tracked / processed, 3) if processed else 0.0,
            "avgFrameAgeMs": round(avg_age, 1),
            "cursorHz": round(motion.effective_hz(), 1) if motion else 0.0,
        }, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ZYRA Eyes decoupled native low-latency gaze controller")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--calibrate", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--profile", default="default")
    parser.add_argument("--eye", choices=base.EYE_MODES)
    parser.add_argument("--camera", type=int, default=None)
    parser.add_argument("--camera-width", type=int, default=640)
    parser.add_argument("--camera-height", type=int, default=360)
    parser.add_argument("--camera-fps", type=float, default=60.0)
    parser.add_argument("--face-refresh", type=int, default=10)
    parser.add_argument("--native", action="store_true")
    parser.add_argument("--approve", action="store_true")
    parser.add_argument("--min-cutoff", type=float, default=1.8)
    parser.add_argument("--beta", type=float, default=0.008)
    parser.add_argument("--derivative-cutoff", type=float, default=1.5)
    parser.add_argument("--prediction-ms", type=float, default=18.0)
    parser.add_argument("--max-prediction-ms", type=float, default=45.0)
    parser.add_argument("--prediction-velocity-tau", type=float, default=0.025)
    parser.add_argument("--max-prediction-velocity", type=float, default=9000.0)
    parser.add_argument("--cursor-hz", type=float, default=180.0)
    parser.add_argument("--cursor-tau", type=float, default=0.010)
    parser.add_argument("--fast-tau", type=float, default=0.0035)
    parser.add_argument("--fast-distance", type=float, default=120.0)
    parser.add_argument("--max-speed", type=float, default=14000.0)
    parser.add_argument("--hold-radius", type=float, default=0.35)
    parser.add_argument("--dwell-seconds", type=float, default=1.25)
    parser.add_argument("--dwell-radius", type=float, default=34.0)
    parser.add_argument("--dwell-cooldown", type=float, default=0.9)
    parser.add_argument("--dock-dwell-seconds", type=float, default=0.85)
    parser.add_argument("--scroll-margin", type=float, default=0.12)
    parser.add_argument("--scroll-step", type=int, default=4)
    parser.add_argument("--scroll-interval", type=float, default=0.22)
    parser.add_argument("--stats-interval", type=float, default=2.0)
    parser.add_argument("--no-preview", action="store_true")
    parser.add_argument("--no-dock", action="store_true")
    parser.add_argument("--settle-seconds", type=float, default=0.8)
    parser.add_argument("--sample-seconds", type=float, default=1.4)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.face_refresh < 1:
        parser.error("--face-refresh must be >= 1")
    if args.min_cutoff <= 0 or args.beta < 0 or args.derivative_cutoff <= 0:
        parser.error("filter values are invalid")
    if not 60 <= args.cursor_hz <= 300:
        parser.error("--cursor-hz must be between 60 and 300")
    if args.cursor_tau <= 0 or args.fast_tau <= 0 or args.max_speed < 1000:
        parser.error("cursor dynamics values are invalid")
    if args.max_prediction_ms < args.prediction_ms or args.prediction_ms < 0:
        parser.error("prediction timing values are invalid")
    if args.dwell_seconds < 0.35 or args.dock_dwell_seconds < 0.35:
        parser.error("dwell timing is too short for safe use")

    if args.calibrate:
        base.calibrate(
            args.profile,
            0 if args.camera is None else args.camera,
            args.camera_width,
            args.camera_height,
            args.eye or "auto",
            args.settle_seconds,
            args.sample_seconds,
        )
        return
    run_controller(args)


if __name__ == "__main__":
    main()
