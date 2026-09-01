#!/usr/bin/env python3
"""ZYRA Eyes gaze controller.

Local-only webcam gaze estimation for an owned/authorized machine.

The runtime uses OpenCV's bundled face/eye cascades, estimates pupil position
inside the detected eye regions, calibrates that normalized gaze feature to
screen coordinates, and can move the local pointer after explicit opt-in.

Native pointer movement requires BOTH:
1) --native --approve on the command line, and
2) ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE

No camera frames are written to disk. Calibration stores only numeric mapping
coefficients and metadata under ~/.zyra/eyes/.
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
from typing import Iterable

try:
    import cv2
    import numpy as np
    import pyautogui
except Exception as exc:  # pragma: no cover - dependency/runtime guard
    raise SystemExit(
        "ZYRA gaze dependencies are missing. Run: "
        "python -m pip install -r apps/zyra-eyes-plugin/requirements.txt"
    ) from exc


NATIVE_SENTINEL = "I_OWN_AND_AUTHORIZE_THIS_MACHINE"
ZYRA_HOME = Path.home() / ".zyra" / "eyes"
CALIBRATION_PATH = Path(
    os.environ.get("ZYRA_EYES_GAZE_CALIBRATION", str(ZYRA_HOME / "gaze-calibration.json"))
)
AUDIT_PATH = Path(
    os.environ.get("ZYRA_EYES_GAZE_AUDIT", str(ZYRA_HOME / "gaze-audit.jsonl"))
)
WINDOW_NAME = "ZYRA Eyes — Gaze Runtime"
CALIBRATION_WINDOW = "ZYRA Eyes — Calibration"


@dataclass(frozen=True)
class EyeFeature:
    x: float
    y: float
    confidence: float


@dataclass(frozen=True)
class GazeFeature:
    x: float
    y: float
    confidence: float
    eyes: int


@dataclass(frozen=True)
class CalibrationModel:
    x_coefficients: tuple[float, float, float]
    y_coefficients: tuple[float, float, float]
    screen_width: int
    screen_height: int
    camera_index: int
    created_at: str

    def predict(self, feature: GazeFeature) -> tuple[int, int]:
        vector = np.array([feature.x, feature.y, 1.0], dtype=float)
        sx = float(np.dot(np.array(self.x_coefficients), vector))
        sy = float(np.dot(np.array(self.y_coefficients), vector))
        sx = max(0.0, min(float(self.screen_width - 1), sx))
        sy = max(0.0, min(float(self.screen_height - 1), sy))
        return round(sx), round(sy)


def iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def audit(event: str, **fields) -> None:
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    record = {"at": iso_now(), "event": event, **fields}
    with AUDIT_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, separators=(",", ":")) + "\n")


def require_native_authorization(native: bool, approve: bool) -> None:
    if not native:
        return
    if not approve:
        raise SystemExit("Native gaze control requires --approve for this invocation")
    if os.environ.get("ZYRA_EYES_NATIVE_CONTROL") != NATIVE_SENTINEL:
        raise SystemExit(
            "Native gaze control blocked. Set "
            "ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE "
            "only on a machine you own and authorize."
        )


def load_cascades():
    face_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    eye_path = cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml"
    face = cv2.CascadeClassifier(face_path)
    eyes = cv2.CascadeClassifier(eye_path)
    if face.empty() or eyes.empty():
        raise SystemExit("OpenCV face/eye cascade data is unavailable")
    return face, eyes


def open_camera(index: int, width: int, height: int):
    backend = cv2.CAP_AVFOUNDATION if sys.platform == "darwin" else cv2.CAP_ANY
    camera = cv2.VideoCapture(index, backend)
    if not camera.isOpened():
        # Some OpenCV builds behave better with the default backend.
        camera.release()
        camera = cv2.VideoCapture(index)
    if not camera.isOpened():
        raise SystemExit(
            f"Unable to open camera {index}. On macOS, allow Terminal/Python under "
            "System Settings → Privacy & Security → Camera."
        )
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return camera


def largest_face(gray, face_cascade):
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.12,
        minNeighbors=5,
        minSize=(120, 120),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(faces) == 0:
        return None
    return max(faces, key=lambda rect: rect[2] * rect[3])


def candidate_eyes(face_gray, eye_cascade):
    # Eyes should live in roughly the upper 65% of the face.
    upper_h = max(1, round(face_gray.shape[0] * 0.65))
    upper = face_gray[:upper_h, :]
    candidates = eye_cascade.detectMultiScale(
        upper,
        scaleFactor=1.08,
        minNeighbors=6,
        minSize=(24, 18),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(candidates) == 0:
        return []

    # Prefer larger detections and then keep one eye on each side when possible.
    ordered = sorted(candidates, key=lambda r: r[2] * r[3], reverse=True)
    selected = []
    for rect in ordered:
        x, y, w, h = [int(v) for v in rect]
        center_x = x + w / 2
        if any(abs(center_x - (sx + sw / 2)) < min(w, sw) * 0.55 for sx, _, sw, _ in selected):
            continue
        selected.append((x, y, w, h))
        if len(selected) == 2:
            break
    return sorted(selected, key=lambda r: r[0])


def pupil_feature(eye_gray) -> EyeFeature | None:
    h, w = eye_gray.shape[:2]
    if w < 10 or h < 8:
        return None

    # Crop eyelid/brow edges to make the darkest blob more likely to be the pupil.
    x0, x1 = round(w * 0.12), round(w * 0.88)
    y0, y1 = round(h * 0.22), round(h * 0.82)
    core = eye_gray[y0:y1, x0:x1]
    if core.size == 0:
        return None

    blur = cv2.GaussianBlur(core, (5, 5), 0)
    threshold_value = float(np.percentile(blur, 24))
    _, mask = cv2.threshold(blur, threshold_value, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    core_area = float(core.shape[0] * core.shape[1])
    best = None
    best_score = -1.0

    for contour in contours:
        area = float(cv2.contourArea(contour))
        if area < core_area * 0.01 or area > core_area * 0.32:
            continue
        moments = cv2.moments(contour)
        if moments["m00"] <= 0:
            continue
        cx = float(moments["m10"] / moments["m00"])
        cy = float(moments["m01"] / moments["m00"])
        center_penalty = abs(cx / core.shape[1] - 0.5) * 0.45 + abs(cy / core.shape[0] - 0.5) * 0.25
        score = area / core_area - center_penalty * 0.05
        if score > best_score:
            best = (cx, cy, area)
            best_score = score

    if best is None:
        # Fallback to the darkest local neighborhood rather than failing the frame.
        minimum = cv2.minMaxLoc(blur)[2]
        cx, cy = float(minimum[0]), float(minimum[1])
        confidence = 0.18
    else:
        cx, cy, area = best
        confidence = min(1.0, max(0.2, area / (core_area * 0.11)))

    normalized_x = (cx + x0) / w
    normalized_y = (cy + y0) / h
    return EyeFeature(normalized_x, normalized_y, confidence)


def extract_gaze_feature(frame, face_cascade, eye_cascade, draw: bool = False):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    face = largest_face(gray, face_cascade)
    if face is None:
        return None, frame

    fx, fy, fw, fh = [int(v) for v in face]
    face_gray = gray[fy:fy + fh, fx:fx + fw]
    eye_boxes = candidate_eyes(face_gray, eye_cascade)
    features: list[EyeFeature] = []

    if draw:
        cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (70, 210, 255), 1)

    for ex, ey, ew, eh in eye_boxes:
        eye_gray = face_gray[ey:ey + eh, ex:ex + ew]
        feature = pupil_feature(eye_gray)
        if feature is None:
            continue
        features.append(feature)
        if draw:
            px = fx + ex + round(feature.x * ew)
            py = fy + ey + round(feature.y * eh)
            cv2.rectangle(frame, (fx + ex, fy + ey), (fx + ex + ew, fy + ey + eh), (255, 180, 80), 1)
            cv2.circle(frame, (px, py), 4, (80, 255, 120), -1)

    if not features:
        return None, frame

    total_weight = sum(max(0.05, item.confidence) for item in features)
    gaze_x = sum(item.x * max(0.05, item.confidence) for item in features) / total_weight
    gaze_y = sum(item.y * max(0.05, item.confidence) for item in features) / total_weight
    confidence = sum(item.confidence for item in features) / len(features)
    return GazeFeature(gaze_x, gaze_y, confidence, len(features)), frame


def calibration_targets(screen_width: int, screen_height: int):
    margin_x = round(screen_width * 0.12)
    margin_y = round(screen_height * 0.12)
    center = (screen_width // 2, screen_height // 2)
    return [
        center,
        (margin_x, center[1]),
        (screen_width - margin_x, center[1]),
        (center[0], margin_y),
        (center[0], screen_height - margin_y),
        (margin_x, margin_y),
        (screen_width - margin_x, margin_y),
        (margin_x, screen_height - margin_y),
        (screen_width - margin_x, screen_height - margin_y),
    ]


def draw_calibration_target(canvas, point, index: int, total: int, phase: str):
    canvas[:] = (7, 4, 18)
    x, y = point
    cv2.circle(canvas, (x, y), 28, (60, 230, 255), 3)
    cv2.circle(canvas, (x, y), 8, (190, 100, 255), -1)
    cv2.putText(
        canvas,
        f"ZYRA EYES CALIBRATION {index + 1}/{total} — {phase}",
        (48, 72),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (230, 230, 240),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        canvas,
        "Keep your head comfortable and look directly at the target. ESC aborts.",
        (48, 110),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.58,
        (170, 170, 190),
        1,
        cv2.LINE_AA,
    )


def robust_average(samples: Iterable[GazeFeature]) -> GazeFeature | None:
    items = list(samples)
    if not items:
        return None
    xs = np.array([item.x for item in items], dtype=float)
    ys = np.array([item.y for item in items], dtype=float)
    median_x, median_y = float(np.median(xs)), float(np.median(ys))
    distances = np.sqrt((xs - median_x) ** 2 + (ys - median_y) ** 2)
    if len(items) >= 8:
        cutoff = float(np.percentile(distances, 75))
        kept = [item for item, distance in zip(items, distances) if distance <= max(cutoff, 1e-6)]
    else:
        kept = items
    if not kept:
        kept = items
    return GazeFeature(
        x=float(np.mean([item.x for item in kept])),
        y=float(np.mean([item.y for item in kept])),
        confidence=float(np.mean([item.confidence for item in kept])),
        eyes=round(float(np.mean([item.eyes for item in kept]))),
    )


def fit_calibration(features: list[GazeFeature], targets: list[tuple[int, int]], screen_width: int, screen_height: int, camera_index: int):
    if len(features) < 5 or len(features) != len(targets):
        raise ValueError("Calibration requires matching feature/target samples")
    design = np.array([[item.x, item.y, 1.0] for item in features], dtype=float)
    target_x = np.array([point[0] for point in targets], dtype=float)
    target_y = np.array([point[1] for point in targets], dtype=float)
    x_coefficients, *_ = np.linalg.lstsq(design, target_x, rcond=None)
    y_coefficients, *_ = np.linalg.lstsq(design, target_y, rcond=None)
    return CalibrationModel(
        x_coefficients=tuple(float(v) for v in x_coefficients),
        y_coefficients=tuple(float(v) for v in y_coefficients),
        screen_width=screen_width,
        screen_height=screen_height,
        camera_index=camera_index,
        created_at=iso_now(),
    )


def save_calibration(model: CalibrationModel) -> None:
    CALIBRATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    CALIBRATION_PATH.write_text(
        json.dumps(
            {
                "version": 1,
                "xCoefficients": list(model.x_coefficients),
                "yCoefficients": list(model.y_coefficients),
                "screenWidth": model.screen_width,
                "screenHeight": model.screen_height,
                "cameraIndex": model.camera_index,
                "createdAt": model.created_at,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def load_calibration() -> CalibrationModel:
    if not CALIBRATION_PATH.exists():
        raise SystemExit(
            f"No gaze calibration found at {CALIBRATION_PATH}. Run with --calibrate first."
        )
    payload = json.loads(CALIBRATION_PATH.read_text(encoding="utf-8"))
    return CalibrationModel(
        x_coefficients=tuple(float(v) for v in payload["xCoefficients"]),
        y_coefficients=tuple(float(v) for v in payload["yCoefficients"]),
        screen_width=int(payload["screenWidth"]),
        screen_height=int(payload["screenHeight"]),
        camera_index=int(payload.get("cameraIndex", 0)),
        created_at=str(payload["createdAt"]),
    )


def calibrate(camera_index: int, camera_width: int, camera_height: int, settle_seconds: float, sample_seconds: float) -> None:
    face_cascade, eye_cascade = load_cascades()
    camera = open_camera(camera_index, camera_width, camera_height)
    screen_width, screen_height = pyautogui.size()
    targets = calibration_targets(screen_width, screen_height)
    collected: list[GazeFeature] = []

    cv2.namedWindow(CALIBRATION_WINDOW, cv2.WINDOW_NORMAL)
    cv2.setWindowProperty(CALIBRATION_WINDOW, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    canvas = np.zeros((screen_height, screen_width, 3), dtype=np.uint8)

    try:
        for index, target in enumerate(targets):
            settle_until = time.monotonic() + settle_seconds
            while time.monotonic() < settle_until:
                draw_calibration_target(canvas, target, index, len(targets), "LOOK")
                cv2.imshow(CALIBRATION_WINDOW, canvas)
                if cv2.waitKey(1) & 0xFF == 27:
                    raise KeyboardInterrupt
                camera.grab()

            samples: list[GazeFeature] = []
            sample_until = time.monotonic() + sample_seconds
            while time.monotonic() < sample_until:
                ok, frame = camera.read()
                if not ok:
                    continue
                feature, _ = extract_gaze_feature(frame, face_cascade, eye_cascade, draw=False)
                if feature is not None and feature.confidence >= 0.12:
                    samples.append(feature)
                draw_calibration_target(canvas, target, index, len(targets), f"SAMPLE {len(samples)}")
                cv2.imshow(CALIBRATION_WINDOW, canvas)
                if cv2.waitKey(1) & 0xFF == 27:
                    raise KeyboardInterrupt

            aggregate = robust_average(samples)
            if aggregate is None or len(samples) < 6:
                raise SystemExit(
                    f"Could not get a stable eye signal at calibration point {index + 1}. "
                    "Increase room/front lighting, face the camera, and try again."
                )
            collected.append(aggregate)

        model = fit_calibration(collected, targets, screen_width, screen_height, camera_index)
        save_calibration(model)
        audit("GAZE_CALIBRATED", points=len(collected), cameraIndex=camera_index)
        print(json.dumps({"calibrated": True, "path": str(CALIBRATION_PATH), "points": len(collected)}, indent=2))
    except KeyboardInterrupt:
        print("Calibration aborted.")
    finally:
        camera.release()
        cv2.destroyWindow(CALIBRATION_WINDOW)


def distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def run_gaze(camera_index: int, camera_width: int, camera_height: int, native: bool, approve: bool, smoothing: float, deadzone: float, preview: bool) -> None:
    require_native_authorization(native, approve)
    model = load_calibration()
    face_cascade, eye_cascade = load_cascades()
    camera = open_camera(camera_index, camera_width, camera_height)

    current: tuple[float, float] | None = None
    last_move: tuple[float, float] | None = None
    frames = 0
    tracked_frames = 0
    started = time.monotonic()
    stop = False

    def request_stop(_signum=None, _frame=None):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)

    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.01

    audit("GAZE_SESSION_STARTED", native=native, cameraIndex=camera_index)
    print(
        "ZYRA Eyes gaze runtime started. "
        + ("NATIVE pointer-follow enabled." if native else "SIMULATION only; pointer will not move.")
        + " Press ESC in the preview or Ctrl-C to stop."
    )

    try:
        while not stop:
            ok, frame = camera.read()
            if not ok:
                time.sleep(0.01)
                continue
            frames += 1
            feature, annotated = extract_gaze_feature(frame, face_cascade, eye_cascade, draw=preview)

            if feature is not None:
                tracked_frames += 1
                predicted = model.predict(feature)
                if current is None:
                    current = (float(predicted[0]), float(predicted[1]))
                else:
                    current = (
                        current[0] + smoothing * (predicted[0] - current[0]),
                        current[1] + smoothing * (predicted[1] - current[1]),
                    )

                target = (round(current[0]), round(current[1]))
                if native and (last_move is None or distance(target, last_move) >= deadzone):
                    pyautogui.moveTo(target[0], target[1], duration=0)
                    last_move = target

                if preview:
                    cv2.putText(
                        annotated,
                        f"gaze=({target[0]}, {target[1]}) conf={feature.confidence:.2f} eyes={feature.eyes}",
                        (18, 32),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.65,
                        (80, 255, 120),
                        2,
                        cv2.LINE_AA,
                    )
                    mode = "NATIVE" if native else "SIMULATE"
                    cv2.putText(
                        annotated,
                        f"mode={mode} | ESC quits | PyAutoGUI corner failsafe enabled",
                        (18, 62),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.52,
                        (230, 230, 240),
                        1,
                        cv2.LINE_AA,
                    )

            elif preview:
                cv2.putText(
                    annotated,
                    "No stable eye signal — face camera / improve front lighting",
                    (18, 32),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.58,
                    (80, 180, 255),
                    2,
                    cv2.LINE_AA,
                )

            if preview:
                cv2.imshow(WINDOW_NAME, annotated)
                if cv2.waitKey(1) & 0xFF == 27:
                    break

    except pyautogui.FailSafeException:
        print("PyAutoGUI failsafe triggered — native gaze control stopped.")
    finally:
        elapsed = max(0.001, time.monotonic() - started)
        camera.release()
        if preview:
            cv2.destroyAllWindows()
        tracking_ratio = tracked_frames / frames if frames else 0.0
        audit(
            "GAZE_SESSION_STOPPED",
            native=native,
            frames=frames,
            trackedFrames=tracked_frames,
            trackingRatio=round(tracking_ratio, 4),
            durationSeconds=round(elapsed, 2),
        )
        print(
            json.dumps(
                {
                    "stopped": True,
                    "native": native,
                    "frames": frames,
                    "trackedFrames": tracked_frames,
                    "trackingRatio": round(tracking_ratio, 4),
                    "durationSeconds": round(elapsed, 2),
                },
                indent=2,
            )
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="ZYRA Eyes webcam gaze-to-pointer runtime")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--calibrate", action="store_true", help="Run nine-point gaze calibration")
    mode.add_argument("--run", action="store_true", help="Run gaze estimation using saved calibration")
    parser.add_argument("--camera", type=int, default=0, help="Camera index, default 0")
    parser.add_argument("--camera-width", type=int, default=960)
    parser.add_argument("--camera-height", type=int, default=540)
    parser.add_argument("--native", action="store_true", help="Move the local pointer to the estimated gaze target")
    parser.add_argument("--approve", action="store_true", help="Required acknowledgement for native pointer movement")
    parser.add_argument("--smoothing", type=float, default=0.22, help="0..1 EMA gain; lower is smoother")
    parser.add_argument("--deadzone", type=float, default=8.0, help="Minimum pointer movement in pixels")
    parser.add_argument("--no-preview", action="store_true", help="Hide camera preview while running")
    parser.add_argument("--settle-seconds", type=float, default=0.8, help="Calibration settle time per point")
    parser.add_argument("--sample-seconds", type=float, default=1.4, help="Calibration sample time per point")
    args = parser.parse_args()

    if not 0.02 <= args.smoothing <= 1.0:
        parser.error("--smoothing must be between 0.02 and 1.0")
    if args.deadzone < 0:
        parser.error("--deadzone must be >= 0")
    if args.settle_seconds < 0.1 or args.sample_seconds < 0.4:
        parser.error("calibration timing values are too small")

    if args.calibrate:
        calibrate(
            args.camera,
            args.camera_width,
            args.camera_height,
            args.settle_seconds,
            args.sample_seconds,
        )
    else:
        run_gaze(
            args.camera,
            args.camera_width,
            args.camera_height,
            args.native,
            args.approve,
            args.smoothing,
            args.deadzone,
            not args.no_preview,
        )


if __name__ == "__main__":
    main()
