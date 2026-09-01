# ZYRA Eyes — Mouse-Like Smooth Cursor Runtime

The original ZYRA Eyes controller used a fixed EMA filter plus a pixel deadzone and sent absolute cursor jumps at the camera frame rate. That is stable enough for a proof-of-concept, but it does not feel like a physical mouse.

The smooth runtime adds two motion stages:

1. **Adaptive One Euro gaze filtering** — slow/small movement receives stronger jitter suppression while faster intentional movement automatically gets lower latency.
2. **High-rate cursor actuation** — the camera may update around 30–60 fps, but the cursor actuator interpolates the newest gaze target at 120 Hz by default with velocity limiting and smooth acceleration/deceleration.

```text
EYE / PUPIL SIGNAL
      ↓
CALIBRATED SCREEN TARGET
      ↓
ONE EURO ADAPTIVE FILTER
      ↓
LATEST STABLE GAZE TARGET
      ↓
120 Hz CURSOR ACTUATOR
      ↓
VELOCITY LIMIT + SMOOTH ACCELERATION
      ↓
MACOS POINTER
```

## Use the existing calibration profile

You do not need to recalibrate merely to test the new motion engine. If your profile is named `friend`:

```bash
cd ~/zyra
source .venv/bin/activate
python apps/zyra-eyes-plugin/zyra_smooth_controller.py --run --profile friend
```

That is demo mode and does not move the pointer.

## Native mouse-like test

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE
python apps/zyra-eyes-plugin/zyra_smooth_controller.py \
  --run \
  --profile friend \
  --native \
  --approve
```

## Maximum smoothness on a MacBook

The camera preview itself consumes CPU/GPU and can reduce capture cadence. For the smoothest pointer while keeping the gaze control dock:

```bash
python apps/zyra-eyes-plugin/zyra_smooth_controller.py \
  --run \
  --profile friend \
  --native \
  --approve \
  --cursor-hz 120 \
  --camera-fps 60 \
  --no-preview
```

A built-in webcam may still deliver only 30 fps even when 60 fps is requested. The 120 Hz actuator still interpolates between the latest gaze observations so cursor motion does not step at camera-frame cadence.

## Tuning presets

### Balanced — default

```text
min-cutoff=1.15
beta=0.0045
cursor-hz=120
motion-gain=18
max-speed=5200
velocity-tau=0.032
hold-radius=1.25
```

### Smoother / steadier

Use this when the cursor trembles around a target:

```bash
python apps/zyra-eyes-plugin/zyra_smooth_controller.py \
  --run --profile friend --native --approve \
  --min-cutoff 0.85 \
  --beta 0.0030 \
  --velocity-tau 0.045 \
  --hold-radius 2.0 \
  --no-preview
```

### Faster / more mouse-like

Use this when the pointer feels delayed:

```bash
python apps/zyra-eyes-plugin/zyra_smooth_controller.py \
  --run --profile friend --native --approve \
  --min-cutoff 1.35 \
  --beta 0.0060 \
  --motion-gain 22 \
  --velocity-tau 0.025 \
  --max-speed 6500 \
  --no-preview
```

### Very high refresh display

```bash
python apps/zyra-eyes-plugin/zyra_smooth_controller.py \
  --run --profile friend --native --approve \
  --cursor-hz 144 \
  --no-preview
```

Do not expect the camera itself to become a 144 Hz eye tracker. This only makes the pointer interpolation loop higher frequency.

## What this fixes

- Removes fixed pixel-step behavior from normal cursor movement.
- Stops treating every small gaze change as a new hard mouse coordinate.
- Smooths sensor jitter heavily when gaze is nearly stationary.
- Reacts faster during large intentional gaze shifts.
- Interpolates cursor motion between camera observations.
- Keeps dwell click, scrolling, drag/drop, control dock, app switching, keyboard navigation, pause/resume and one-eye calibration from the full system controller.

## What software smoothing cannot fix

A webcam eye tracker is still limited by the camera, lighting, pupil visibility, head motion and the underlying pupil estimator. A dedicated infrared eye tracker can provide much higher spatial accuracy and sampling rate. The adaptive motion engine improves pointer feel; it does not manufacture sensor precision that the camera did not observe.

For best results:

- Keep the usable eye evenly front-lit.
- Keep the camera close to display centerline.
- Recalibrate after moving the camera or changing seating position substantially.
- Use `--eye camera-left` or `--eye camera-right` when only one eye should drive the system.
- Run with `--no-preview` once calibration is verified.

## Emergency stop

Native execution still requires the local owner authorization sentinel plus `--native --approve`. PyAutoGUI's corner failsafe remains enabled. `Esc` in an OpenCV window or `Ctrl-C` in Terminal stops the runtime.
