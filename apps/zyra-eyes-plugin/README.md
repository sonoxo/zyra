# ZYRA Eyes Local Plugin

Local owned-machine perception and gaze-control adapter for the VA / RVIA runtime.

## What it does

ZYRA Eyes now has two local modes:

1. **Binary screen perception** — capture the owned machine's screen, compress it into a VA 0/1 field, plan a bounded pointer action, and simulate by default.
2. **Gaze control** — use the local webcam to estimate where the authorized operator is looking, calibrate that signal to screen coordinates, smooth the gaze vector, and optionally move the local pointer.

Camera frames stay in memory. The gaze runtime does not save video or still images. Calibration stores only numeric mapping coefficients and metadata under `~/.zyra/eyes/`.

## Install

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r apps/zyra-eyes-plugin/requirements.txt
```

On macOS, Terminal/Python may need permission under:

- **Privacy & Security → Camera** for gaze tracking
- **Privacy & Security → Screen & System Audio Recording** for screen capture
- **Privacy & Security → Accessibility** for native pointer control

## Binary screen simulation

```bash
python apps/zyra-eyes-plugin/zyra_eyes.py --capture --goal brightest --threshold 40
```

Native pointer movement requires explicit local authorization:

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE
python apps/zyra-eyes-plugin/zyra_eyes.py --capture --goal brightest --threshold 40 --native --approve
```

## Gaze control

### 1. Calibrate

Sit in the position you normally use the computer and run:

```bash
python apps/zyra-eyes-plugin/zyra_gaze.py --calibrate
```

ZYRA Eyes displays nine targets. Look directly at each target while it samples your gaze. Keep your head in a comfortable, repeatable position.

Calibration data is stored locally at:

```text
~/.zyra/eyes/gaze-calibration.json
```

### 2. Preview gaze without moving the mouse

```bash
python apps/zyra-eyes-plugin/zyra_gaze.py --run
```

The preview displays the detected face/eye region, estimated gaze coordinate and confidence. Press **Esc** or **Ctrl-C** to stop.

### 3. Make the cursor follow your gaze

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE
python apps/zyra-eyes-plugin/zyra_gaze.py --run --native --approve
```

Native mode moves the pointer only. It does not click, type, submit forms or bypass operating-system permissions.

## One-eye / monocular use

The gaze runtime is deliberately able to produce a gaze feature from **one detected eye or two**. A person who relies primarily on one eye can calibrate using the eye signal the camera is able to track; the calibration maps that user's observed pupil movement to their screen.

Practical setup for monocular use:

- Put the webcam close to the centerline of the display.
- Use even front lighting so the usable eye is clearly visible.
- Re-run calibration whenever the seating position or camera moves substantially.
- If tracking is unstable, reduce reflections from glasses and increase front lighting.
- Start with preview-only mode before enabling native pointer movement.

This is an accessibility/control experiment, not a medical device and not a substitute for a dedicated clinical or commercial eye-tracking system when precise assistive access is required.

## Tuning

Smoother movement:

```bash
python apps/zyra-eyes-plugin/zyra_gaze.py --run --native --approve --smoothing 0.12
```

More responsive movement:

```bash
python apps/zyra-eyes-plugin/zyra_gaze.py --run --native --approve --smoothing 0.35
```

Reduce small cursor jitter:

```bash
python apps/zyra-eyes-plugin/zyra_gaze.py --run --native --approve --deadzone 14
```

Use another camera:

```bash
python apps/zyra-eyes-plugin/zyra_gaze.py --calibrate --camera 1
python apps/zyra-eyes-plugin/zyra_gaze.py --run --camera 1
```

## Architecture

```text
AUTHORIZED OPERATOR EYE(S)
        ↓
LOCAL WEBCAM FRAME (memory only)
        ↓
FACE / EYE REGION
        ↓
PUPIL FEATURE
        ↓
9-POINT USER CALIBRATION
        ↓
SCREEN GAZE VECTOR
        ↓
EMA SMOOTHING + DEADZONE
        ↓
SIMULATION / PREVIEW (default)
        OR
OWNER SENTINEL + --native + --approve
        ↓
LOCAL POINTER MOVE
        ↓
PRIVACY-PRESERVING SESSION AUDIT
```

## Safety / emergency stop

- Native execution is disabled by default.
- `--approve` is required every native invocation.
- `ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE` must be set locally.
- PyAutoGUI's corner failsafe remains enabled.
- Press **Esc** in the preview or **Ctrl-C** in Terminal to stop the gaze loop.
- No remote-control server is created by this plugin.
- No credential, password, cookie or token extraction is implemented.

Default audit files:

```text
~/.zyra/eyes/native-audit.jsonl
~/.zyra/eyes/gaze-audit.jsonl
```

Audit records contain action/session metadata, not screenshot bytes or webcam frames.

## Source

- `zyra_eyes.py` — binary screen perception and bounded local actions
- `zyra_gaze.py` — webcam gaze calibration and gaze-to-pointer runtime
- `requirements.txt` — local Python dependencies
- `../../docs/ZYRA-EYES-RVIA.md` — ecosystem/runtime architecture
- `../../shared/policy/us-cz-ethical-scope.yaml` — policy boundary
