# ZYRA Eyes Local Plugin

Local owned-machine perception, gaze-control, and accessibility system-controller adapter for the VA / RVIA runtime.

## What it does

ZYRA Eyes now has three local modes:

1. **Binary screen perception** — capture the owned machine's screen, compress it into a VA 0/1 field, plan a bounded pointer action, and simulate by default.
2. **Gaze control** — use the local webcam to estimate where the authorized operator is looking, calibrate that signal to screen coordinates, smooth the gaze vector, and optionally move the local pointer.
3. **Full system controller** — add per-user/one-eye profiles, dwell click, click types, drag/drop, scrolling, keyboard navigation, app switching, back/forward navigation, pause/resume, and a gaze-selected control dock.

Camera frames stay in memory. The gaze runtimes do not save video or still images. Calibration stores only numeric mapping coefficients and metadata under `~/.zyra/eyes/`.

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
- **Privacy & Security → Accessibility** for native pointer/system control

## Binary screen simulation

```bash
python apps/zyra-eyes-plugin/zyra_eyes.py --capture --goal brightest --threshold 40
```

Native pointer movement requires explicit local authorization:

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE
python apps/zyra-eyes-plugin/zyra_eyes.py --capture --goal brightest --threshold 40 --native --approve
```

## Gaze pointer control

### 1. Calibrate

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

### 3. Make the cursor follow your gaze

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE
python apps/zyra-eyes-plugin/zyra_gaze.py --run --native --approve
```

Native gaze-pointer mode moves the pointer only. It does not click, type, submit forms or bypass operating-system permissions.

## Full system controller

The full controller is `zyra_system_controller.py`.

### Calibrate a named user profile

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --calibrate \
  --profile operator
```

### One-eye / monocular profile

Use the side of the usable eye **as seen in the ZYRA camera image**:

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --calibrate \
  --profile operator \
  --eye camera-left
```

or:

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --calibrate \
  --profile operator \
  --eye camera-right
```

If only one eye is detected, the controller can use that single signal even in `auto` mode.

### Demo the complete controller without controlling macOS

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run \
  --profile operator
```

This default demo/simulation mode displays the gaze runtime and control dock and records proposed actions as simulated events.

### Native full-system control

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE

python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run \
  --profile operator \
  --native \
  --approve
```

The gaze-selected dock provides:

```text
CLICK | DOUBLE | RIGHT | DWELL | SCROLL | DRAG |
TAB | ENTER | ESC | SPACE | APP | BACK | FWD | PAUSE
```

Native controller capabilities are bounded to local visible desktop actions:

- pointer follows gaze
- dwell click
- left/double/right click
- drag/drop
- gaze-zone scrolling
- Tab / Enter / Escape / Space
- app switching
- back/forward navigation
- pause/resume

For eye-driven text entry on macOS, enable the built-in **Accessibility Keyboard** and operate it with the same gaze pointer + dwell click rather than hiding text entry behind an autonomous typing layer.

Full runbook: [`../../docs/ZYRA-EYES-SYSTEM-CONTROLLER.md`](../../docs/ZYRA-EYES-SYSTEM-CONTROLLER.md)

## Tuning

Smoother movement:

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run --profile operator --native --approve --smoothing 0.12
```

More stable dwell for a user with less precise gaze:

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run --profile operator --native --approve \
  --dwell-seconds 1.6 --dwell-radius 45
```

Reduce small cursor jitter:

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run --profile operator --native --approve --deadzone 14
```

## Architecture

```text
AUTHORIZED OPERATOR EYE(S)
        ↓
LOCAL WEBCAM FRAME (memory only)
        ↓
FACE / SELECTED EYE REGION
        ↓
PUPIL FEATURE
        ↓
PER-USER 9-POINT CALIBRATION
        ↓
SCREEN GAZE VECTOR
        ↓
EMA SMOOTHING + DEADZONE
        ↓
CONTENT TARGET / CONTROL DOCK
        ↓
DEMO/SIMULATION (default)
        OR
OWNER SENTINEL + --native + --approve
        ↓
BOUNDED LOCAL DESKTOP ACTION
        ↓
PRIVACY-PRESERVING SESSION AUDIT
```

## Safety / emergency stop

- Native execution is disabled by default.
- `--approve` is required every native invocation.
- `ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE` must be set locally.
- PyAutoGUI's corner failsafe remains enabled.
- Press **Esc** in a ZYRA window or **Ctrl-C** in Terminal to stop.
- Active drag is released during controller shutdown.
- No remote-control server is created by this plugin.
- No credential, password, cookie or token extraction is implemented.

Default audit files:

```text
~/.zyra/eyes/native-audit.jsonl
~/.zyra/eyes/gaze-audit.jsonl
~/.zyra/eyes/controller-audit.jsonl
```

Controller profiles:

```text
~/.zyra/eyes/profiles/<profile>.json
```

Audit records contain action/session metadata, not screenshot bytes or webcam frames.

## Source

- `zyra_eyes.py` — binary screen perception and bounded local actions
- `zyra_gaze.py` — webcam gaze calibration and gaze-to-pointer runtime
- `zyra_system_controller.py` — full local accessibility system controller
- `requirements.txt` — local Python dependencies
- `../../docs/ZYRA-EYES-RVIA.md` — ecosystem/runtime architecture
- `../../docs/ZYRA-EYES-SYSTEM-CONTROLLER.md` — controller runbook
- `../../shared/policy/us-cz-ethical-scope.yaml` — policy boundary
