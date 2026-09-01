#!/usr/bin/env python3
"""ZYRA Eyes adaptive smooth gaze controller.

This runtime keeps the full local accessibility controller but replaces the old
fixed EMA + pixel deadzone pointer motion with two stages:

1. A One Euro adaptive gaze filter. Slow/small motion gets strong noise
   suppression; fast/large motion automatically gets a higher cutoff and lower
   latency.
2. A high-rate cursor actuator. Camera observations may arrive around 30 fps,
   but the local pointer is interpolated toward the newest filtered target at a
   configurable 120+ Hz with velocity limiting and smooth acceleration/deceleration.

Simulation remains the default. Native actions require the same local owner
sentinel plus --native --approve. No network listener or remote-control channel
is created.
"""

from __future__ import annotations

import argparse
import json
import math
import signal
import threading
import time

import cv2
import pyautogui

import zyra_system_controller as base


class LowPass:
    def __init__(self) -> None:
        self.initialized = False
        self.value = 0.0

    def apply(self, value: float, alpha: float) -> float:
        if not self.initialized:
            self.value = float(value)
            self.initialized = True
            return self.value
        self.value = alpha * float(value) + (1.0 - alpha) * self.value
        return self.value


class OneEuroAxis:
    """Adaptive low-pass filter based on the One Euro filter."""

    def __init__(self, min_cutoff: float, beta: float, derivative_cutoff: float = 1.0) -> None:
        self.min_cutoff = float(min_cutoff)
        self.beta = float(beta)
        self.derivative_cutoff = float(derivative_cutoff)
        self.signal = LowPass()
        self.derivative = LowPass()
        self.last_raw: float | None = None
        self.last_time: float | None = None

    @staticmethod
    def alpha(cutoff: float, dt: float) -> float:
        cutoff = max(0.01, float(cutoff))
        dt = max(1e-4, float(dt))
        tau = 1.0 / (2.0 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def apply(self, value: float, now: float, confidence: float) -> float:
        if self.last_time is None or self.last_raw is None:
            self.last_time = now
            self.last_raw = float(value)
            return self.signal.apply(value, 1.0)

        dt = min(0.12, max(1e-4, now - self.last_time))
        raw_derivative = (float(value) - self.last_raw) / dt
        derivative = self.derivative.apply(
            raw_derivative,
            self.alpha(self.derivative_cutoff, dt),
        )

        # Low-confidence frames are deliberately more conservative. High speed
        # raises the cutoff so large intentional eye movements remain responsive.
        confidence = min(1.0, max(0.0, float(confidence)))
        confidence_scale = 0.55 + 0.45 * confidence
        cutoff = self.min_cutoff * confidence_scale + self.beta * confidence_scale * abs(derivative)
        filtered = self.signal.apply(value, self.alpha(cutoff, dt))

        self.last_time = now
        self.last_raw = float(value)
        return filtered


class AdaptiveGazeFilter:
    def __init__(self, min_cutoff: float, beta: float, derivative_cutoff: float) -> None:
        self.x = OneEuroAxis(min_cutoff, beta, derivative_cutoff)
        self.y = OneEuroAxis(min_cutoff, beta, derivative_cutoff)

    def apply(self, target: tuple[int, int], confidence: float, now: float) -> tuple[int, int]:
        return (
            round(self.x.apply(float(target[0]), now, confidence)),
            round(self.y.apply(float(target[1]), now, confidence)),
        )


class CursorMotionEngine:
    """Move the pointer at a higher rate than the camera observation loop."""

    def __init__(
        self,
        rate_hz: float,
        motion_gain: float,
        max_speed: float,
        velocity_tau: float,
        hold_radius: float,
    ) -> None:
        self.rate_hz = max(30.0, float(rate_hz))
        self.motion_gain = max(1.0, float(motion_gain))
        self.max_speed = max(200.0, float(max_speed))
        self.velocity_tau = max(0.005, float(velocity_tau))
        self.hold_radius = max(0.0, float(hold_radius))

        point = pyautogui.position()
        self.position = [float(point.x), float(point.y)]
        self.velocity = [0.0, 0.0]
        self.target: tuple[float, float] | None = None
        self.paused = False
        self.stop_requested = False
        self.failed = False
        self.failure_message: str | None = None
        self.lock = threading.Lock()
        self.thread: threading.Thread | None = None

    def start(self) -> None:
        if self.thread is not None:
            return
        self.thread = threading.Thread(target=self._run, name="zyra-cursor-actuator", daemon=True)
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

    @staticmethod
    def _clamp_vector(x: float, y: float, maximum: float) -> tuple[float, float]:
        magnitude = math.hypot(x, y)
        if magnitude <= maximum or magnitude <= 1e-9:
            return x, y
        scale = maximum / magnitude
        return x * scale, y * scale

    def _run(self) -> None:
        period = 1.0 / self.rate_hz
        previous = time.monotonic()
        try:
            while True:
                tick_started = time.monotonic()
                dt = min(0.05, max(1e-4, tick_started - previous))
                previous = tick_started

                with self.lock:
                    if self.stop_requested:
                        return
                    target = self.target
                    paused = self.paused

                if paused or target is None:
                    decay = math.exp(-dt / 0.025)
                    self.velocity[0] *= decay
                    self.velocity[1] *= decay
                else:
                    error_x = target[0] - self.position[0]
                    error_y = target[1] - self.position[1]
                    error_distance = math.hypot(error_x, error_y)

                    if error_distance <= self.hold_radius:
                        desired_vx = 0.0
                        desired_vy = 0.0
                    else:
                        desired_vx = error_x * self.motion_gain
                        desired_vy = error_y * self.motion_gain
                        desired_vx, desired_vy = self._clamp_vector(
                            desired_vx,
                            desired_vy,
                            self.max_speed,
                        )

                    # Smooth velocity changes instead of jumping directly to a
                    # new absolute cursor position each camera frame.
                    velocity_alpha = 1.0 - math.exp(-dt / self.velocity_tau)
                    self.velocity[0] += (desired_vx - self.velocity[0]) * velocity_alpha
                    self.velocity[1] += (desired_vy - self.velocity[1]) * velocity_alpha

                    self.position[0] += self.velocity[0] * dt
                    self.position[1] += self.velocity[1] * dt

                    # Avoid endless sub-pixel drift once the target has settled.
                    if error_distance < 0.75 and math.hypot(*self.velocity) < 25.0:
                        self.position[0] = target[0]
                        self.position[1] = target[1]
                        self.velocity[0] = 0.0
                        self.velocity[1] = 0.0

                    pyautogui.moveTo(
                        round(self.position[0]),
                        round(self.position[1]),
                        duration=0,
                        _pause=False,
                    )

                elapsed = time.monotonic() - tick_started
                if elapsed < period:
                    time.sleep(period - elapsed)
        except pyautogui.FailSafeException:
            self.failed = True
            self.failure_message = "PyAutoGUI corner failsafe triggered"
        except Exception as exc:  # pragma: no cover - native OS runtime guard
            self.failed = True
            self.failure_message = f"cursor actuator stopped: {exc}"


def run_smooth_controller(args: argparse.Namespace) -> None:
    base.require_native_authorization(args.native, args.approve)
    profile = base.load_profile(args.profile)
    eye_mode = args.eye or profile.eye_mode
    camera_index = profile.camera_index if args.camera is None else args.camera

    face_cascade, eye_cascade = base.load_cascades()
    camera = base.open_camera(camera_index, args.camera_width, args.camera_height)
    camera.set(cv2.CAP_PROP_FPS, float(args.camera_fps))
    screen_width, screen_height = pyautogui.size()

    state = base.RuntimeState()
    gaze_filter = AdaptiveGazeFilter(args.min_cutoff, args.beta, args.derivative_cutoff)
    motion = None
    if args.native:
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.0
        motion = CursorMotionEngine(
            args.cursor_hz,
            args.motion_gain,
            args.max_speed,
            args.velocity_tau,
            args.hold_radius,
        )
        motion.start()

    frames = 0
    tracked = 0
    stop = False
    started = time.monotonic()
    rect = base.dock_geometry(screen_width, screen_height)
    target: tuple[int, int] | None = None
    active_index: int | None = None

    if not args.no_dock:
        base.open_dock(rect)

    def request_stop(_signum=None, _frame=None):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)

    base.audit(
        "SMOOTH_CONTROLLER_SESSION_STARTED",
        profile=profile.name,
        native=args.native,
        eyeMode=eye_mode,
        cameraIndex=camera_index,
        cursorHz=args.cursor_hz,
        minCutoff=args.min_cutoff,
        beta=args.beta,
    )
    print(
        "ZYRA Eyes smooth controller started. "
        + ("NATIVE mouse-like cursor engine enabled." if args.native else "DEMO/SIMULATION mode.")
        + " ESC or Ctrl-C stops; PyAutoGUI corner failsafe is enabled."
    )

    try:
        while not stop:
            if motion is not None and motion.failed:
                print(motion.failure_message or "cursor actuator stopped")
                break

            ok, frame = camera.read()
            if not ok:
                time.sleep(0.002)
                continue

            frames += 1
            feature, annotated = base.extract_controller_feature(
                frame,
                face_cascade,
                eye_cascade,
                eye_mode,
                draw=not args.no_preview,
            )

            active_index = None
            if feature is not None:
                tracked += 1
                raw_target = profile.predict(feature)
                target = gaze_filter.apply(raw_target, feature.confidence, time.monotonic())

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
                            base.COMMANDS[active_index],
                            state,
                            args.native,
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
                            target,
                            state,
                            args.native,
                            args.dwell_seconds,
                            args.dwell_radius,
                            args.dwell_cooldown,
                        )
                        base.update_scroll(
                            target,
                            state,
                            args.native,
                            screen_height,
                            args.scroll_margin,
                            args.scroll_step,
                            args.scroll_interval,
                        )

                if not args.no_preview:
                    dwell_progress = 0.0
                    if state.dwell_anchor is not None and not state.dwell_fired:
                        dwell_progress = min(
                            1.0,
                            max(0.0, (time.monotonic() - state.dwell_started) / args.dwell_seconds),
                        )
                    cv2.putText(
                        annotated,
                        f"raw=({raw_target[0]},{raw_target[1]}) smooth=({target[0]},{target[1]}) "
                        f"conf={feature.confidence:.2f} eyes={feature.eyes}",
                        (18, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.52,
                        (80, 255, 120),
                        2,
                        cv2.LINE_AA,
                    )
                    cv2.putText(
                        annotated,
                        f"cursor={args.cursor_hz:.0f}Hz one-euro cutoff={args.min_cutoff:.2f} beta={args.beta:.4f} "
                        f"native={args.native} dwell={state.dwell_enabled} progress={dwell_progress:.2f}",
                        (18, 58),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.46,
                        (230, 230, 240),
                        1,
                        cv2.LINE_AA,
                    )
            else:
                if motion is not None:
                    motion.set_paused(True)
                if not args.no_preview:
                    cv2.putText(
                        annotated,
                        "No stable eye signal — improve front lighting / camera angle / eye selection",
                        (18, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.52,
                        (80, 180, 255),
                        2,
                        cv2.LINE_AA,
                    )

            if not args.no_dock:
                cv2.imshow(
                    base.DOCK_NAME,
                    base.render_dock(rect, state, target, active_index, args.native),
                )
            if not args.no_preview:
                cv2.imshow(base.PREVIEW_NAME, annotated)

            key = cv2.waitKey(1) & 0xFF if (not args.no_preview or not args.no_dock) else 255
            if key == 27:
                break
            if key in (ord("p"), ord("P")):
                base.perform_command("PAUSE", state, args.native, state.last_content_target)
                if motion is not None:
                    motion.set_paused(state.paused)
            elif key in (ord("c"), ord("C")):
                base.perform_command("CLICK", state, args.native, state.last_content_target)
            elif key in (ord("d"), ord("D")):
                base.perform_command("DOUBLE", state, args.native, state.last_content_target)
            elif key in (ord("r"), ord("R")):
                base.perform_command("RIGHT", state, args.native, state.last_content_target)
            elif key in (ord("g"), ord("G")):
                base.perform_command("DRAG", state, args.native, state.last_content_target)
            elif key in (ord("s"), ord("S")):
                base.perform_command("SCROLL", state, args.native, state.last_content_target)

    except pyautogui.FailSafeException:
        print("PyAutoGUI failsafe triggered — smooth controller stopped.")
    finally:
        if motion is not None:
            motion.stop()
        base.release_drag(state, args.native)
        elapsed = max(0.001, time.monotonic() - started)
        camera.release()
        if not args.no_preview or not args.no_dock:
            cv2.destroyAllWindows()
        ratio = tracked / frames if frames else 0.0
        base.audit(
            "SMOOTH_CONTROLLER_SESSION_STOPPED",
            profile=profile.name,
            native=args.native,
            frames=frames,
            trackedFrames=tracked,
            trackingRatio=round(ratio, 4),
            durationSeconds=round(elapsed, 2),
        )
        print(
            json.dumps(
                {
                    "stopped": True,
                    "profile": profile.name,
                    "native": args.native,
                    "frames": frames,
                    "trackedFrames": tracked,
                    "trackingRatio": round(ratio, 4),
                    "durationSeconds": round(elapsed, 2),
                },
                indent=2,
            )
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="ZYRA Eyes adaptive mouse-like gaze system controller"
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--calibrate", action="store_true")
    mode.add_argument("--run", action="store_true")

    parser.add_argument("--profile", default="default")
    parser.add_argument("--eye", choices=base.EYE_MODES)
    parser.add_argument("--camera", type=int, default=None)
    parser.add_argument("--camera-width", type=int, default=960)
    parser.add_argument("--camera-height", type=int, default=540)
    parser.add_argument("--camera-fps", type=float, default=60.0)

    parser.add_argument("--native", action="store_true")
    parser.add_argument("--approve", action="store_true")

    # Gaze signal filter. Defaults prioritize stability without the heavy lag of
    # the previous fixed EMA.
    parser.add_argument("--min-cutoff", type=float, default=1.15)
    parser.add_argument("--beta", type=float, default=0.0045)
    parser.add_argument("--derivative-cutoff", type=float, default=1.0)

    # High-rate mouse-like actuator.
    parser.add_argument("--cursor-hz", type=float, default=120.0)
    parser.add_argument("--motion-gain", type=float, default=18.0)
    parser.add_argument("--max-speed", type=float, default=5200.0)
    parser.add_argument("--velocity-tau", type=float, default=0.032)
    parser.add_argument("--hold-radius", type=float, default=1.25)

    parser.add_argument("--dwell-seconds", type=float, default=1.25)
    parser.add_argument("--dwell-radius", type=float, default=34.0)
    parser.add_argument("--dwell-cooldown", type=float, default=0.9)
    parser.add_argument("--dock-dwell-seconds", type=float, default=0.85)
    parser.add_argument("--scroll-margin", type=float, default=0.12)
    parser.add_argument("--scroll-step", type=int, default=4)
    parser.add_argument("--scroll-interval", type=float, default=0.22)
    parser.add_argument("--no-preview", action="store_true")
    parser.add_argument("--no-dock", action="store_true")
    parser.add_argument("--settle-seconds", type=float, default=0.8)
    parser.add_argument("--sample-seconds", type=float, default=1.4)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.min_cutoff <= 0 or args.derivative_cutoff <= 0 or args.beta < 0:
        parser.error("filter values must be positive and beta must be >= 0")
    if not 30 <= args.cursor_hz <= 240:
        parser.error("--cursor-hz must be between 30 and 240")
    if args.motion_gain <= 0 or args.max_speed < 200 or args.velocity_tau <= 0:
        parser.error("cursor dynamics values are invalid")
    if args.hold_radius < 0 or args.dwell_radius < 1:
        parser.error("radius values are invalid")
    if args.dwell_seconds < 0.35 or args.dock_dwell_seconds < 0.35:
        parser.error("dwell timing is too short for safe use")
    if not 0.03 <= args.scroll_margin <= 0.30:
        parser.error("--scroll-margin must be between 0.03 and 0.30")
    if args.scroll_interval < 0.08:
        parser.error("--scroll-interval must be >= 0.08")

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

    run_smooth_controller(args)


if __name__ == "__main__":
    main()
