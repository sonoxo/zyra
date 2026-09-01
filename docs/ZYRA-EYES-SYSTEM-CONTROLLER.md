# ZYRA Eyes — Full Local System Controller

**Status:** implementation branch `feat/zyra-eyes-system-controller`  
**Purpose:** accessibility-oriented local computer control driven by calibrated gaze.

ZYRA Eyes now extends beyond pointer-follow. The system controller turns an authorized operator's gaze into a bounded local desktop control surface while keeping simulation as the default and requiring explicit local authorization for native actions.

## Runtime

```text
AUTHORIZED OPERATOR EYE
        ↓
LOCAL WEBCAM FRAME (memory only)
        ↓
FACE / SELECTED EYE SIGNAL
        ↓
9-POINT USER PROFILE CALIBRATION
        ↓
SCREEN GAZE VECTOR
        ↓
SMOOTHING + DEADZONE
        ↓
CONTENT TARGET / CONTROL DOCK
        ↓
┌────────────────────────────────────────────────────────────┐
│ MOVE │ DWELL CLICK │ DOUBLE │ RIGHT │ DRAG │ SCROLL       │
│ TAB  │ ENTER       │ ESC    │ SPACE │ APP  │ BACK/FWD     │
│ PAUSE / RESUME                                            │
└────────────────────────────────────────────────────────────┘
        ↓
DEMO/SIMULATION (default)
        OR
OWNER SENTINEL + --native + --approve
        ↓
LOCAL OS ACTION
        ↓
PRIVACY-PRESERVING AUDIT
```

## What is implemented

| Capability | Status | Notes |
|---|---|---|
| Gaze pointer | Implemented | Calibrated screen-coordinate mapping |
| One-eye operation | Implemented | `--eye camera-left` or `--eye camera-right`; `auto` can use one or two detections |
| Per-user profiles | Implemented | Stored under `~/.zyra/eyes/profiles/` |
| Dwell click | Implemented | Stable gaze triggers a bounded left click |
| Explicit click | Implemented | Dock command |
| Double click | Implemented | Dock command |
| Right click | Implemented | Dock command |
| Drag / drop | Implemented | Gaze selects drag start; dock toggles drop |
| Scroll | Implemented | Top/bottom gaze zones while scroll mode is active |
| Tab / Enter / Escape / Space | Implemented | Dock navigation commands |
| App switch | Implemented | Command-Tab on macOS; Alt-Tab elsewhere |
| Back / Forward | Implemented | Platform browser/navigation shortcuts |
| Pause / resume | Implemented | Dock command and keyboard hotkey |
| Emergency stop | Implemented | Esc, Ctrl-C and PyAutoGUI corner failsafe |
| Demo mode | Implemented | Default; shows tracking + simulated action events without controlling OS |
| Camera-frame persistence | Disabled | Frames stay in memory |
| Remote control server | Not implemented | Intentionally out of scope |
| Credential extraction | Not implemented | Intentionally out of scope |

## Install

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r apps/zyra-eyes-plugin/requirements.txt
```

On macOS allow the Terminal/Python process under:

- **Privacy & Security → Camera**
- **Privacy & Security → Accessibility**
- **Privacy & Security → Screen & System Audio Recording** if using binary screen perception as well

## Calibrate a user profile

### Auto eye detection

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --calibrate \
  --profile operator
```

### Force the usable eye visible on the camera-left side

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --calibrate \
  --profile operator \
  --eye camera-left
```

### Force the usable eye visible on the camera-right side

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --calibrate \
  --profile operator \
  --eye camera-right
```

`camera-left` and `camera-right` mean the side as seen in the ZYRA camera image, avoiding ambiguity about anatomical left/right.

## Remote-demo use case

The controller can be demonstrated over a normal screen-share or recorded demo without enabling OS actions:

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run \
  --profile operator
```

This is the default **DEMO/SIMULATION** mode. The camera preview displays the tracked eye signal and gaze coordinate while the bottom control dock highlights gaze-selected commands. Action events are logged as simulated instead of being executed.

A remote viewer can therefore watch the complete interaction model without receiving control of the machine.

## Native full-system control

After calibration and only on the owned/authorized machine:

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE

python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run \
  --profile operator \
  --native \
  --approve
```

Native mode provides:

- pointer follows gaze
- dwell click
- click / double-click / right-click
- drag / drop
- scroll mode
- Tab / Enter / Escape / Space
- application switching
- back / forward navigation
- pause / resume

## Control dock

The always-on-top dock is selected by gaze dwell. Commands act on the last content target outside the dock so selecting `CLICK`, `DOUBLE`, `RIGHT`, or `DRAG` does not click the dock itself.

```text
CLICK | DOUBLE | RIGHT | DWELL | SCROLL | DRAG | TAB | ENTER | ESC | SPACE | APP | BACK | FWD | PAUSE
```

### Dwell behavior

Default content dwell click:

- dwell time: `1.25 s`
- stability radius: `34 px`
- cooldown: `0.9 s`

Tune it:

```bash
python apps/zyra-eyes-plugin/zyra_system_controller.py \
  --run --profile operator --native --approve \
  --dwell-seconds 1.6 \
  --dwell-radius 45
```

For users with less stable gaze, increase both values before increasing responsiveness.

## Scrolling

Activate `SCROLL` from the control dock. Looking near the top screen edge scrolls upward; looking near the bottom edge scrolls downward.

Tune:

```bash
--scroll-margin 0.12
--scroll-step 4
--scroll-interval 0.22
```

## Text entry

ZYRA Eyes supplies pointer, dwell-click and keyboard navigation actions. For full eye-driven text entry on macOS, pair it with the built-in **Accessibility Keyboard** so letters can be selected with the same gaze pointer/dwell mechanism. This avoids duplicating an OS-level keyboard and keeps text entry visible to the operator.

## Emergency stop

Three stop paths remain active:

1. Press **Esc** in a ZYRA preview/dock window.
2. Press **Ctrl-C** in Terminal.
3. Move the pointer to the PyAutoGUI failsafe corner.

If a drag is active when the runtime stops, ZYRA releases the held mouse button during shutdown.

## Privacy and authority boundary

- Camera frames are not written to disk.
- Profiles contain only numeric gaze-to-screen coefficients and metadata.
- Audit files contain action/session metadata, not webcam images.
- Native control is disabled by default.
- `--approve` is required for each native runtime launch.
- The owner sentinel must be present in the local environment.
- No remote desktop server, hidden network listener, credential access, or authorization bypass is implemented.

Default audit:

```text
~/.zyra/eyes/controller-audit.jsonl
```

## Files

```text
apps/zyra-eyes-plugin/zyra_eyes.py              binary screen perception
apps/zyra-eyes-plugin/zyra_gaze.py              gaze-to-pointer runtime
apps/zyra-eyes-plugin/zyra_system_controller.py full local accessibility controller
apps/zyra-eyes-plugin/requirements.txt
.github/workflows/zyra-eyes-ci.yml
docs/ZYRA-EYES-RVIA.md
docs/ZYRA-EYES-SYSTEM-CONTROLLER.md
```

## Positioning

The Matrix analogy is the interface concept: human visual intent becomes a machine-control signal. The actual implementation remains a local accessibility runtime with explicit calibration, bounded actions, visible controls, auditable state and operator authority.
