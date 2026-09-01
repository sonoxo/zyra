# ZYRA Eyes Native Low-Latency Controller

This runtime exists because cursor smoothness is an end-to-end latency problem, not only a filter problem.

## What changed

The native controller separates the pipeline into independent loops:

```text
CAMERA CAPTURE THREAD
        │ newest frame only
        ▼
FAST EYE TRACKER
        │ cached face ROI + periodic refresh
        ▼
ONE EURO FILTER
        │
        ▼
SHORT-HORIZON GAZE PREDICTION
        │
        ▼
180 Hz POINTER ACTUATOR
        │
        ├─ macOS: CoreGraphics CGWarpMouseCursorPosition
        └─ fallback: PyAutoGUI
```

The capture thread overwrites old frames instead of building a queue, so the tracker does not work through stale camera frames. The tracker reuses the current face region and refreshes the expensive face detector periodically. On macOS, high-frequency pointer motion bypasses PyAutoGUI and goes directly through CoreGraphics. A bounded predictor compensates for camera and processing age without allowing unlimited extrapolation.

## First test: pure pointer latency

Disable the preview and control dock so they cannot consume rendering time:

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE
python apps/zyra-eyes-plugin/zyra_native_controller.py \
  --run \
  --profile friend \
  --native \
  --approve \
  --no-preview \
  --no-dock
```

The controller prints performance telemetry every two seconds, for example:

```json
{"captureFps":59.2,"trackFps":47.8,"trackedRatio":0.96,"avgFrameAgeMs":11.8,"cursorHz":176.4,"pointerBackend":"coregraphics"}
```

The important fields are:

- `captureFps`: what the webcam actually supplies.
- `trackFps`: how quickly ZYRA produces fresh gaze estimates.
- `trackedRatio`: fraction of processed frames with a usable eye signal.
- `avgFrameAgeMs`: age of the frame when the gaze target was produced. Lower is better.
- `cursorHz`: effective pointer update rate.
- `pointerBackend`: on macOS this should be `coregraphics`.

## Recommended targets

For a usable webcam experience, aim for:

- capture FPS: 30+; 60 preferred
- track FPS: 25+; 40+ preferred
- tracked ratio: 0.85+
- average frame age: under 35 ms; under 20 ms preferred
- pointer backend on macOS: `coregraphics`

If capture FPS is around 15 or lower, the camera/driver is already the primary bottleneck. If track FPS is much lower than capture FPS, reduce camera resolution or increase `--face-refresh`. If tracked ratio is poor, improve front lighting, camera alignment, eye selection, or recalibrate.

## Low-latency defaults

The new defaults are intentionally more aggressive than the old smooth controller:

- camera request: 640×360 @ 60 fps
- face detector refresh: every 10 processed frames
- pointer actuator: 180 Hz
- pointer settling constant: 10 ms
- large-motion settling constant: 3.5 ms
- bounded prediction: 18 ms base, 45 ms maximum

## Faster profile

If telemetry is healthy but motion still feels behind:

```bash
python apps/zyra-eyes-plugin/zyra_native_controller.py \
  --run --profile friend --native --approve \
  --no-preview --no-dock \
  --cursor-hz 240 \
  --cursor-tau 0.006 \
  --fast-tau 0.0025 \
  --prediction-ms 24 \
  --max-prediction-ms 50 \
  --min-cutoff 2.2 \
  --beta 0.010
```

Use more prediction only after checking telemetry. Excessive prediction can overshoot during rapid saccades.

## Stability profile

If latency is acceptable but the pointer shakes:

```bash
python apps/zyra-eyes-plugin/zyra_native_controller.py \
  --run --profile friend --native --approve \
  --no-preview --no-dock \
  --min-cutoff 1.3 \
  --beta 0.004 \
  --prediction-ms 10 \
  --cursor-tau 0.014 \
  --hold-radius 1.0
```

## Full controller after the pointer test

Once pure pointer motion feels good, re-enable the control dock by removing `--no-dock`. Re-enable the camera preview only when needed for setup or demonstration. The pointer path, dwell actions, scrolling, drag/drop and navigation remain local and require explicit native authorization.

## Physical sensor limit

A software pipeline can remove queueing, reduce processing cost, use a native pointer API and compensate for a small amount of delay. It cannot make a 30 fps RGB webcam produce the same raw temporal resolution as a dedicated high-rate eye tracker or a physical mouse. If telemetry shows low frame rate or high frame age after these changes, the next performance step is the camera/eye-tracking sensor rather than another smoothing constant.
