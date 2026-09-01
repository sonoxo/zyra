# ZYRA Eyes Local Plugin

Local owned-machine adapter for the VA / RVIA binary vision runtime.

## Default behavior

The plugin **simulates** actions unless native mode is explicitly enabled. It is not designed for remote control, stealth, credential extraction, or authorization bypass.

## Install

```bash
python3 -m pip install -r apps/zyra-eyes-plugin/requirements.txt
```

On macOS, the terminal/Python process may also need Screen Recording and Accessibility permission from the operating system before screenshot or pointer control works.

## Simulation

Capture the local screen, downsample to a 24×14 binary field, locate the brightest region, and simulate moving toward it:

```bash
python3 apps/zyra-eyes-plugin/zyra_eyes.py --capture --goal brightest
```

Other simulations:

```bash
python3 apps/zyra-eyes-plugin/zyra_eyes.py --move 800 450
python3 apps/zyra-eyes-plugin/zyra_eyes.py --key tab
python3 apps/zyra-eyes-plugin/zyra_eyes.py --type-text "hello"
```

## Native owner-controlled mode

Native execution requires two independent opt-ins:

```bash
export ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE
python3 apps/zyra-eyes-plugin/zyra_eyes.py --capture --goal brightest --native --approve
```

The `--approve` flag is required every invocation. PyAutoGUI failsafe remains enabled.

## Architecture

```text
LOCAL SCREEN
   ↓
SCREENSHOT IN MEMORY
   ↓
GRAYSCALE DOWNSAMPLE
   ↓
VA 0/1 GRID
   ↓
RVIA TARGET PLAN
   ↓
SIMULATE (default)
   OR
OWNER SENTINEL + --approve
   ↓
ALLOWLISTED LOCAL ACTION
   ↓
PRIVACY-PRESERVING AUDIT
```

## Audit

Default local audit file:

```text
~/.zyra/eyes/native-audit.jsonl
```

Audit records store action metadata and hashes. They do not store screenshot bytes or plaintext `TYPE_TEXT` payloads.

## Scope

See:

- [`../../ETHICAL_SCOPE.md`](../../ETHICAL_SCOPE.md)
- [`../../shared/policy/us-cz-ethical-scope.yaml`](../../shared/policy/us-cz-ethical-scope.yaml)
- [`../../docs/ZYRA-EYES-RVIA.md`](../../docs/ZYRA-EYES-RVIA.md)
