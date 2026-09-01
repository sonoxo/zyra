#!/usr/bin/env python3
"""ZYRA Eyes full local accessibility system controller.

Purpose
-------
Map an authorized operator's gaze to a bounded set of local desktop actions:
pointer movement, dwell click, explicit click types, drag, scrolling, keyboard
navigation, application switching, and browser-style back/forward shortcuts.

Security / privacy
------------------
- Simulation is the default.
- Native actions require BOTH --native --approve and the owner authorization
  sentinel ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE.
- PyAutoGUI's corner failsafe remains enabled.
- ESC / Ctrl-C stops the runtime and releases any held drag.
- Webcam frames remain memory-only.
- No network server, remote desktop, credential extraction, or hidden control
  channel is implemented. Remote control is intentionally out of scope.

This is an accessibility/control experiment, not a medical device.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import signal
import sys
import time
from dataclasses import dataclass
from pathlib import Path

try:
    import cv2
    import numpy as np
    import pyautogui
except Exception as exc:  # pragma: no cover - runtime dependency guard
    raise SystemExit(
        "ZYRA controller dependencies are missing. Run: "
        "python -m pip install -r apps/zyra-eyes-plugin/requirements.txt"
    ) from exc

from zyra_gaze import (
    GazeFeature,
    calibration_targets,
    candidate_eyes,
    largest_face,
    load_cascades,
    open_camera,
    pupil_feature,
    robust_average,
)

NATIVE_SENTINEL = "I_OWN_AND_AUTHORIZE_THIS_MACHINE"
ZYRA_HOME = Path.home() / ".zyra" / "eyes"
PROFILE_DIR = ZYRA_HOME / "profiles"
AUDIT_PATH = Path(
    os.environ.get("ZYRA_EYES_CONTROLLER_AUDIT", str(ZYRA_HOME / "controller-audit.jsonl"))
)
PREVIEW_NAME = "ZYRA Eyes — System Controller"
CALIBRATION_NAME = "ZYRA Eyes — Controller Calibration"
DOCK_NAME = "ZYRA Eyes — Control Dock"

EYE_MODES = ("auto", "camera-left", "camera-right")
COMMANDS = (
    "CLICK",
    "DOUBLE",
    "RIGHT",
    "DWELL",
    "SCROLL",
    "DRAG",
    "TAB",
    "ENTER",
    "ESC",
    "SPACE",
    "APP",
    "BACK",
    "FWD",
    "PAUSE",
)


@dataclass(frozen=True)
class ControllerProfile:
    name: str
    x_coefficients: tuple[float, float, float]
    y_coefficients: tuple[float, float, float]
    screen_width: int
    screen_height: int
    camera_index: int
    eye_mode: str
    created_at: str

    def predict(self, feature: GazeFeature) -> tuple[int, int]:
        vector = np.array([feature.x, feature.y, 1.0], dtype=float)
        sx = float(np.dot(np.array(self.x_coefficients), vector))
        sy = float(np.dot(np.array(self.y_coefficients), vector))
        sx = max(0.0, min(float(self.screen_width - 1), sx))
        sy = max(0.0, min(float(self.screen_height - 1), sy))
        return round(sx), round(sy)


@dataclass
class RuntimeState:
    paused: bool = False
    scroll_mode: bool = False
    dwell_enabled: bool = True
    dragging: bool = False
    dwell_anchor: tuple[float, float] | None = None
    dwell_started: float = 0.0
    dwell_fired: bool = False
    dock_index: int | None = None
    dock_started: float = 0.0
    last_command_at: float = 0.0
    last_scroll_at: float = 0.0
    last_content_target: tuple[int, int] | None = None


def iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def audit(event: str, **fields) -> None:
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    record = {"at": iso_now(), "event": event, **fields}
    with AUDIT_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, separators=(",", ":")) + "\n")


def safe_profile_name(name: str) -> str:
    cleaned = "".join(ch for ch in name if ch.isalnum() or ch in "-_.")
    if not cleaned or cleaned in {".", ".."}:
        raise ValueError("profile name must contain letters, numbers, dot, dash, or underscore")
    return cleaned[:80]


def profile_path(name: str) -> Path:
    return PROFILE_DIR / f"{safe_profile_name(name)}.json"


def save_profile(profile: ControllerProfile) -> None:
    path = profile_path(profile.name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "version": 1,
                "name": profile.name,
                "xCoefficients": list(profile.x_coefficients),
                "yCoefficients": list(profile.y_coefficients),
                "screenWidth": profile.screen_width,
                "screenHeight": profile.screen_height,
                "cameraIndex": profile.camera_index,
                "eyeMode": profile.eye_mode,
                "createdAt": profile.created_at,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def load_profile(name: str) -> ControllerProfile:
    path = profile_path(name)
    if not path.exists():
        raise SystemExit(
            f"No controller profile found at {path}. "
            f"Run: python apps/zyra-eyes-plugin/zyra_system_controller.py "
            f"--calibrate --profile {safe_profile_name(name)}"
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    return ControllerProfile(
        name=str(payload.get("name", name)),
        x_coefficients=tuple(float(v) for v in payload["xCoefficients"]),
        y_coefficients=tuple(float(v) for v in payload["yCoefficients"]),
        screen_width=int(payload["screenWidth"]),
        screen_height=int(payload["screenHeight"]),
        camera_index=int(payload.get("cameraIndex", 0)),
        eye_mode=str(payload.get("eyeMode", "auto")),
        created_at=str(payload["createdAt"]),
    )


def require_native_authorization(native: bool, approve: bool) -> None:
    if not native:
        return
    if not approve:
        raise SystemExit("Native system control requires --approve for this invocation")
    if os.environ.get("ZYRA_EYES_NATIVE_CONTROL") != NATIVE_SENTINEL:
        raise SystemExit(
            "Native system control blocked. Set "
            "ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE "
            "only on a machine you own and authorize."
        )


def choose_eye_boxes(boxes: list[tuple[int, int, int, int]], eye_mode: str):
    if not boxes:
        return []
    if eye_mode == "auto" or len(boxes) == 1:
        return boxes
    ordered = sorted(boxes, key=lambda rect: rect[0] + rect[2] / 2)
    if eye_mode == "camera-left":
        return [ordered[0]]
    return [ordered[-1]]


def extract_controller_feature(
    frame,
    face_cascade,
    eye_cascade,
    eye_mode: str,
    draw: bool = False,
):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    face = largest_face(gray, face_cascade)
    if face is None:
        return None, frame

    fx, fy, fw, fh = [int(v) for v in face]
    face_gray = gray[fy : fy + fh, fx : fx + fw]
    boxes = choose_eye_boxes(candidate_eyes(face_gray, eye_cascade), eye_mode)
    features = []

    if draw:
        cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (70, 210, 255), 1)

    for ex, ey, ew, eh in boxes:
        eye_gray = face_gray[ey : ey + eh, ex : ex + ew]
        feature = pupil_feature(eye_gray)
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
        return None, frame

    total_weight = sum(max(0.05, item.confidence) for item in features)
    x = sum(item.x * max(0.05, item.confidence) for item in features) / total_weight
    y = sum(item.y * max(0.05, item.confidence) for item in features) / total_weight
    confidence = sum(item.confidence for item in features) / len(features)
    return GazeFeature(x, y, confidence, len(features)), frame


def fit_profile(
    name: str,
    features: list[GazeFeature],
    targets: list[tuple[int, int]],
    screen_width: int,
    screen_height: int,
    camera_index: int,
    eye_mode: str,
) -> ControllerProfile:
    if len(features) < 5 or len(features) != len(targets):
        raise ValueError("controller calibration requires matching feature/target samples")
    design = np.array([[item.x, item.y, 1.0] for item in features], dtype=float)
    target_x = np.array([point[0] for point in targets], dtype=float)
    target_y = np.array([point[1] for point in targets], dtype=float)
    x_coefficients, *_ = np.linalg.lstsq(design, target_x, rcond=None)
    y_coefficients, *_ = np.linalg.lstsq(design, target_y, rcond=None)
    return ControllerProfile(
        name=safe_profile_name(name),
        x_coefficients=tuple(float(v) for v in x_coefficients),
        y_coefficients=tuple(float(v) for v in y_coefficients),
        screen_width=screen_width,
        screen_height=screen_height,
        camera_index=camera_index,
        eye_mode=eye_mode,
        created_at=iso_now(),
    )


def draw_calibration(canvas, point, index: int, total: int, phase: str, eye_mode: str) -> None:
    canvas[:] = (7, 4, 18)
    x, y = point
    cv2.circle(canvas, (x, y), 30, (60, 230, 255), 3)
    cv2.circle(canvas, (x, y), 8, (190, 100, 255), -1)
    cv2.putText(
        canvas,
        f"ZYRA SYSTEM CALIBRATION {index + 1}/{total} — {phase}",
        (48, 72),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (230, 230, 240),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        canvas,
        f"eye={eye_mode} | look directly at the target | ESC aborts",
        (48, 110),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.58,
        (170, 170, 190),
        1,
        cv2.LINE_AA,
    )


def calibrate(
    profile_name: str,
    camera_index: int,
    camera_width: int,
    camera_height: int,
    eye_mode: str,
    settle_seconds: float,
    sample_seconds: float,
) -> None:
    face_cascade, eye_cascade = load_cascades()
    camera = open_camera(camera_index, camera_width, camera_height)
    screen_width, screen_height = pyautogui.size()
    targets = calibration_targets(screen_width, screen_height)
    collected: list[GazeFeature] = []

    cv2.namedWindow(CALIBRATION_NAME, cv2.WINDOW_NORMAL)
    cv2.setWindowProperty(CALIBRATION_NAME, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    canvas = np.zeros((screen_height, screen_width, 3), dtype=np.uint8)

    try:
        for index, target in enumerate(targets):
            settle_until = time.monotonic() + settle_seconds
            while time.monotonic() < settle_until:
                draw_calibration(canvas, target, index, len(targets), "LOOK", eye_mode)
                cv2.imshow(CALIBRATION_NAME, canvas)
                if cv2.waitKey(1) & 0xFF == 27:
                    raise KeyboardInterrupt
                camera.grab()

            samples: list[GazeFeature] = []
            sample_until = time.monotonic() + sample_seconds
            while time.monotonic() < sample_until:
                ok, frame = camera.read()
                if not ok:
                    continue
                feature, _ = extract_controller_feature(
                    frame, face_cascade, eye_cascade, eye_mode, draw=False
                )
                if feature is not None and feature.confidence >= 0.12:
                    samples.append(feature)
                draw_calibration(
                    canvas,
                    target,
                    index,
                    len(targets),
                    f"SAMPLE {len(samples)}",
                    eye_mode,
                )
                cv2.imshow(CALIBRATION_NAME, canvas)
                if cv2.waitKey(1) & 0xFF == 27:
                    raise KeyboardInterrupt

            aggregate = robust_average(samples)
            if aggregate is None or len(samples) < 6:
                raise SystemExit(
                    f"Could not get a stable eye signal at point {index + 1}. "
                    "Use front lighting, face the camera, or change --eye."
                )
            collected.append(aggregate)

        profile = fit_profile(
            profile_name,
            collected,
            targets,
            screen_width,
            screen_height,
            camera_index,
            eye_mode,
        )
        save_profile(profile)
        audit(
            "CONTROLLER_CALIBRATED",
            profile=profile.name,
            points=len(collected),
            eyeMode=eye_mode,
            cameraIndex=camera_index,
        )
        print(
            json.dumps(
                {
                    "calibrated": True,
                    "profile": profile.name,
                    "eyeMode": profile.eye_mode,
                    "path": str(profile_path(profile.name)),
                    "points": len(collected),
                },
                indent=2,
            )
        )
    except KeyboardInterrupt:
        print("Controller calibration aborted.")
    finally:
        camera.release()
        cv2.destroyWindow(CALIBRATION_NAME)


def distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def dock_geometry(screen_width: int, screen_height: int):
    width = min(screen_width, 1200)
    height = min(110, max(80, round(screen_height * 0.09)))
    x = max(0, (screen_width - width) // 2)
    y = max(0, screen_height - height - 8)
    return x, y, width, height


def point_in_rect(point: tuple[int, int], rect: tuple[int, int, int, int]) -> bool:
    x, y = point
    rx, ry, rw, rh = rect
    return rx <= x < rx + rw and ry <= y < ry + rh


def command_at(point: tuple[int, int], rect: tuple[int, int, int, int]):
    if not point_in_rect(point, rect):
        return None
    rx, _, rw, _ = rect
    slot = rw / len(COMMANDS)
    index = min(len(COMMANDS) - 1, max(0, int((point[0] - rx) / slot)))
    return index


def render_dock(
    rect: tuple[int, int, int, int],
    state: RuntimeState,
    target: tuple[int, int] | None,
    active_index: int | None,
    native: bool,
):
    _, _, width, height = rect
    canvas = np.zeros((height, width, 3), dtype=np.uint8)
    canvas[:] = (10, 6, 22)
    slot = width / len(COMMANDS)

    for index, label in enumerate(COMMANDS):
        x0 = round(index * slot)
        x1 = round((index + 1) * slot)
        selected = index == active_index
        fill = (46, 28, 78) if not selected else (95, 55, 150)
        cv2.rectangle(canvas, (x0 + 2, 3), (x1 - 2, height - 4), fill, -1)
        cv2.rectangle(canvas, (x0 + 2, 3), (x1 - 2, height - 4), (130, 95, 190), 1)
        display = label
        if label == "DWELL":
            display = "DWELL ON" if state.dwell_enabled else "DWELL OFF"
        elif label == "SCROLL":
            display = "SCROLL ON" if state.scroll_mode else "SCROLL"
        elif label == "DRAG":
            display = "DROP" if state.dragging else "DRAG"
        elif label == "PAUSE":
            display = "RESUME" if state.paused else "PAUSE"
        cv2.putText(
            canvas,
            display,
            (x0 + 7, round(height * 0.55)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.43,
            (235, 235, 245),
            1,
            cv2.LINE_AA,
        )

    mode = "NATIVE" if native else "DEMO"
    summary = (
        f"{mode} | eye control | dwell={'on' if state.dwell_enabled else 'off'} "
        f"| scroll={'on' if state.scroll_mode else 'off'}"
    )
    cv2.putText(
        canvas,
        summary,
        (8, height - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.38,
        (120, 245, 190),
        1,
        cv2.LINE_AA,
    )
    return canvas


def open_dock(rect: tuple[int, int, int, int]) -> None:
    x, y, width, height = rect
    cv2.namedWindow(DOCK_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(DOCK_NAME, width, height)
    cv2.moveWindow(DOCK_NAME, x, y)
    if hasattr(cv2, "WND_PROP_TOPMOST"):
        try:
            cv2.setWindowProperty(DOCK_NAME, cv2.WND_PROP_TOPMOST, 1)
        except cv2.error:
            pass


def release_drag(state: RuntimeState, native: bool) -> None:
    if state.dragging and native:
        try:
            pyautogui.mouseUp()
        except Exception:
            pass
    state.dragging = False


def simulate_or_run(native: bool, name: str, fn=None, **fields) -> None:
    if not native:
        audit("CONTROLLER_ACTION_SIMULATED", action=name, **fields)
        print(json.dumps({"simulated": True, "action": name, **fields}, separators=(",", ":")))
        return
    if fn is not None:
        fn()
    audit("CONTROLLER_ACTION_EXECUTED", action=name, **fields)


def perform_command(
    command: str,
    state: RuntimeState,
    native: bool,
    target: tuple[int, int] | None,
) -> None:
    now = time.monotonic()
    if now - state.last_command_at < 0.45:
        return
    state.last_command_at = now

    if command == "DWELL":
        state.dwell_enabled = not state.dwell_enabled
        state.dwell_anchor = None
        state.dwell_fired = False
        audit("CONTROLLER_MODE", dwellEnabled=state.dwell_enabled)
        return
    if command == "SCROLL":
        state.scroll_mode = not state.scroll_mode
        audit("CONTROLLER_MODE", scrollMode=state.scroll_mode)
        return
    if command == "PAUSE":
        state.paused = not state.paused
        if state.paused:
            release_drag(state, native)
        audit("CONTROLLER_MODE", paused=state.paused)
        return

    if state.paused:
        return

    if command == "DRAG":
        if target is None:
            return
        if state.dragging:
            simulate_or_run(native, "DROP", lambda: pyautogui.mouseUp(), x=target[0], y=target[1])
            state.dragging = False
        else:
            if native:
                pyautogui.moveTo(target[0], target[1], duration=0)
            simulate_or_run(native, "DRAG_START", lambda: pyautogui.mouseDown(), x=target[0], y=target[1])
            state.dragging = True
        return

    if command in {"CLICK", "DOUBLE", "RIGHT"}:
        if target is None:
            return
        if native:
            pyautogui.moveTo(target[0], target[1], duration=0)
        if command == "CLICK":
            simulate_or_run(native, "CLICK", lambda: pyautogui.click(), x=target[0], y=target[1])
        elif command == "DOUBLE":
            simulate_or_run(native, "DOUBLE_CLICK", lambda: pyautogui.doubleClick(interval=0.12), x=target[0], y=target[1])
        else:
            simulate_or_run(native, "RIGHT_CLICK", lambda: pyautogui.rightClick(), x=target[0], y=target[1])
        return

    key_actions = {
        "TAB": lambda: pyautogui.press("tab"),
        "ENTER": lambda: pyautogui.press("enter"),
        "ESC": lambda: pyautogui.press("esc"),
        "SPACE": lambda: pyautogui.press("space"),
    }
    if command in key_actions:
        simulate_or_run(native, command, key_actions[command])
        return

    if command == "APP":
        if sys.platform == "darwin":
            action = lambda: pyautogui.hotkey("command", "tab")
        else:
            action = lambda: pyautogui.hotkey("alt", "tab")
        simulate_or_run(native, "APP_SWITCH", action)
        return

    if command == "BACK":
        if sys.platform == "darwin":
            action = lambda: pyautogui.hotkey("command", "[")
        else:
            action = lambda: pyautogui.hotkey("alt", "left")
        simulate_or_run(native, "BACK", action)
        return

    if command == "FWD":
        if sys.platform == "darwin":
            action = lambda: pyautogui.hotkey("command", "]")
        else:
            action = lambda: pyautogui.hotkey("alt", "right")
        simulate_or_run(native, "FORWARD", action)


def update_dwell(
    target: tuple[int, int],
    state: RuntimeState,
    native: bool,
    dwell_seconds: float,
    dwell_radius: float,
    dwell_cooldown: float,
) -> None:
    if not state.dwell_enabled or state.paused or state.scroll_mode or state.dragging:
        state.dwell_anchor = None
        state.dwell_fired = False
        return

    now = time.monotonic()
    if state.dwell_anchor is None or distance(target, state.dwell_anchor) > dwell_radius:
        state.dwell_anchor = (float(target[0]), float(target[1]))
        state.dwell_started = now
        state.dwell_fired = False
        return

    if state.dwell_fired or now - state.dwell_started < dwell_seconds:
        return
    if now - state.last_command_at < dwell_cooldown:
        return

    if native:
        pyautogui.moveTo(target[0], target[1], duration=0)
    simulate_or_run(native, "DWELL_CLICK", lambda: pyautogui.click(), x=target[0], y=target[1])
    state.last_command_at = now
    state.dwell_fired = True


def update_scroll(
    target: tuple[int, int],
    state: RuntimeState,
    native: bool,
    screen_height: int,
    scroll_margin: float,
    scroll_step: int,
    scroll_interval: float,
) -> None:
    if not state.scroll_mode or state.paused:
        return
    now = time.monotonic()
    if now - state.last_scroll_at < scroll_interval:
        return

    margin = max(30, round(screen_height * scroll_margin))
    amount = 0
    if target[1] < margin:
        amount = abs(scroll_step)
    elif target[1] > screen_height - margin:
        amount = -abs(scroll_step)
    if amount == 0:
        return

    state.last_scroll_at = now
    simulate_or_run(native, "SCROLL", lambda: pyautogui.scroll(amount), amount=amount)


def run_controller(
    profile_name: str,
    camera_index: int | None,
    camera_width: int,
    camera_height: int,
    native: bool,
    approve: bool,
    eye_override: str | None,
    smoothing: float,
    deadzone: float,
    dwell_seconds: float,
    dwell_radius: float,
    dwell_cooldown: float,
    dock_dwell_seconds: float,
    scroll_margin: float,
    scroll_step: int,
    scroll_interval: float,
    preview: bool,
    dock: bool,
) -> None:
    require_native_authorization(native, approve)
    profile = load_profile(profile_name)
    eye_mode = eye_override or profile.eye_mode
    camera_index = profile.camera_index if camera_index is None else camera_index

    face_cascade, eye_cascade = load_cascades()
    camera = open_camera(camera_index, camera_width, camera_height)
    screen_width, screen_height = pyautogui.size()

    state = RuntimeState()
    current: tuple[float, float] | None = None
    last_move: tuple[float, float] | None = None
    frames = 0
    tracked = 0
    stop = False
    started = time.monotonic()
    rect = dock_geometry(screen_width, screen_height)

    if dock:
        open_dock(rect)

    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.01

    def request_stop(_signum=None, _frame=None):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)

    audit(
        "CONTROLLER_SESSION_STARTED",
        profile=profile.name,
        native=native,
        eyeMode=eye_mode,
        cameraIndex=camera_index,
    )
    print(
        "ZYRA Eyes system controller started. "
        + ("NATIVE local control enabled." if native else "DEMO/SIMULATION mode.")
        + " ESC or Ctrl-C stops; PyAutoGUI corner failsafe is enabled."
    )

    try:
        while not stop:
            ok, frame = camera.read()
            if not ok:
                time.sleep(0.01)
                continue
            frames += 1
            feature, annotated = extract_controller_feature(
                frame,
                face_cascade,
                eye_cascade,
                eye_mode,
                draw=preview,
            )

            target: tuple[int, int] | None = None
            active_index = None

            if feature is not None:
                tracked += 1
                predicted = profile.predict(feature)
                if current is None:
                    current = (float(predicted[0]), float(predicted[1]))
                else:
                    current = (
                        current[0] + smoothing * (predicted[0] - current[0]),
                        current[1] + smoothing * (predicted[1] - current[1]),
                    )
                target = (round(current[0]), round(current[1]))

                if dock:
                    active_index = command_at(target, rect)

                if active_index is not None:
                    now = time.monotonic()
                    if state.dock_index != active_index:
                        state.dock_index = active_index
                        state.dock_started = now
                    elif now - state.dock_started >= dock_dwell_seconds:
                        perform_command(
                            COMMANDS[active_index],
                            state,
                            native,
                            state.last_content_target,
                        )
                        state.dock_started = now + 9999.0
                    state.dwell_anchor = None
                    state.dwell_fired = False
                else:
                    state.dock_index = None
                    state.dock_started = 0.0
                    state.last_content_target = target

                    if not state.paused:
                        if native and (last_move is None or distance(target, last_move) >= deadzone):
                            pyautogui.moveTo(target[0], target[1], duration=0)
                            last_move = target
                        update_dwell(
                            target,
                            state,
                            native,
                            dwell_seconds,
                            dwell_radius,
                            dwell_cooldown,
                        )
                        update_scroll(
                            target,
                            state,
                            native,
                            screen_height,
                            scroll_margin,
                            scroll_step,
                            scroll_interval,
                        )

                if preview:
                    dwell_progress = 0.0
                    if state.dwell_anchor is not None and not state.dwell_fired:
                        dwell_progress = min(
                            1.0,
                            max(0.0, (time.monotonic() - state.dwell_started) / dwell_seconds),
                        )
                    cv2.putText(
                        annotated,
                        f"gaze=({target[0]},{target[1]}) conf={feature.confidence:.2f} eyes={feature.eyes} eyeMode={eye_mode}",
                        (18, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.56,
                        (80, 255, 120),
                        2,
                        cv2.LINE_AA,
                    )
                    cv2.putText(
                        annotated,
                        f"mode={'PAUSED' if state.paused else 'ACTIVE'} native={native} dwell={state.dwell_enabled} "
                        f"scroll={state.scroll_mode} drag={state.dragging} dwellProgress={dwell_progress:.2f}",
                        (18, 58),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.48,
                        (230, 230, 240),
                        1,
                        cv2.LINE_AA,
                    )
            elif preview:
                cv2.putText(
                    annotated,
                    "No stable eye signal — face camera / improve front lighting / change --eye",
                    (18, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.54,
                    (80, 180, 255),
                    2,
                    cv2.LINE_AA,
                )

            if dock:
                cv2.imshow(DOCK_NAME, render_dock(rect, state, target, active_index, native))

            if preview:
                cv2.imshow(PREVIEW_NAME, annotated)

            key = cv2.waitKey(1) & 0xFF if (preview or dock) else 255
            if key == 27:
                break
            if key in (ord("p"), ord("P")):
                perform_command("PAUSE", state, native, state.last_content_target)
            elif key in (ord("c"), ord("C")):
                perform_command("CLICK", state, native, state.last_content_target)
            elif key in (ord("d"), ord("D")):
                perform_command("DOUBLE", state, native, state.last_content_target)
            elif key in (ord("r"), ord("R")):
                perform_command("RIGHT", state, native, state.last_content_target)
            elif key in (ord("g"), ord("G")):
                perform_command("DRAG", state, native, state.last_content_target)
            elif key in (ord("s"), ord("S")):
                perform_command("SCROLL", state, native, state.last_content_target)

    except pyautogui.FailSafeException:
        print("PyAutoGUI failsafe triggered — system controller stopped.")
    finally:
        release_drag(state, native)
        elapsed = max(0.001, time.monotonic() - started)
        camera.release()
        if preview or dock:
            cv2.destroyAllWindows()
        ratio = tracked / frames if frames else 0.0
        audit(
            "CONTROLLER_SESSION_STOPPED",
            profile=profile.name,
            native=native,
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
                    "native": native,
                    "frames": frames,
                    "trackedFrames": tracked,
                    "trackingRatio": round(ratio, 4),
                    "durationSeconds": round(elapsed, 2),
                },
                indent=2,
            )
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ZYRA Eyes local gaze-driven accessibility system controller"
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--calibrate", action="store_true", help="Create/update a gaze profile")
    mode.add_argument("--run", action="store_true", help="Run the full controller")

    parser.add_argument("--profile", default="default", help="Calibration profile name")
    parser.add_argument("--eye", choices=EYE_MODES, help="auto or one camera-side eye")
    parser.add_argument("--camera", type=int, default=None, help="Camera index; defaults to profile")
    parser.add_argument("--camera-width", type=int, default=960)
    parser.add_argument("--camera-height", type=int, default=540)

    parser.add_argument("--native", action="store_true", help="Enable approved local OS actions")
    parser.add_argument("--approve", action="store_true", help="Required acknowledgement for native mode")
    parser.add_argument("--smoothing", type=float, default=0.18, help="0..1 EMA gain; lower is smoother")
    parser.add_argument("--deadzone", type=float, default=7.0, help="Minimum pointer movement in pixels")
    parser.add_argument("--dwell-seconds", type=float, default=1.25, help="Stable gaze time before dwell click")
    parser.add_argument("--dwell-radius", type=float, default=34.0, help="Gaze stability radius in pixels")
    parser.add_argument("--dwell-cooldown", type=float, default=0.9)
    parser.add_argument("--dock-dwell-seconds", type=float, default=0.85)
    parser.add_argument("--scroll-margin", type=float, default=0.12, help="Top/bottom screen scroll zone fraction")
    parser.add_argument("--scroll-step", type=int, default=4)
    parser.add_argument("--scroll-interval", type=float, default=0.22)
    parser.add_argument("--no-preview", action="store_true")
    parser.add_argument("--no-dock", action="store_true")
    parser.add_argument("--settle-seconds", type=float, default=0.8)
    parser.add_argument("--sample-seconds", type=float, default=1.4)
    args = parser.parse_args()

    if not 0.02 <= args.smoothing <= 1.0:
        parser.error("--smoothing must be between 0.02 and 1.0")
    if args.deadzone < 0 or args.dwell_radius < 1:
        parser.error("movement/dwell values are invalid")
    if args.dwell_seconds < 0.35 or args.dock_dwell_seconds < 0.35:
        parser.error("dwell timing is too short for safe use")
    if not 0.03 <= args.scroll_margin <= 0.30:
        parser.error("--scroll-margin must be between 0.03 and 0.30")
    if args.scroll_interval < 0.08:
        parser.error("--scroll-interval must be >= 0.08")
    if args.settle_seconds < 0.1 or args.sample_seconds < 0.4:
        parser.error("calibration timing values are too small")

    if args.calibrate:
        calibrate(
            args.profile,
            0 if args.camera is None else args.camera,
            args.camera_width,
            args.camera_height,
            args.eye or "auto",
            args.settle_seconds,
            args.sample_seconds,
        )
    else:
        run_controller(
            args.profile,
            args.camera,
            args.camera_width,
            args.camera_height,
            args.native,
            args.approve,
            args.eye,
            args.smoothing,
            args.deadzone,
            args.dwell_seconds,
            args.dwell_radius,
            args.dwell_cooldown,
            args.dock_dwell_seconds,
            args.scroll_margin,
            args.scroll_step,
            args.scroll_interval,
            not args.no_preview,
            not args.no_dock,
        )


if __name__ == "__main__":
    main()
