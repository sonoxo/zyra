#!/usr/bin/env python3
"""ZYRA Eyes local desktop adapter.

Simulation is the default. Native mouse/keyboard execution requires BOTH:
1) --native on the command line, and
2) ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE

The adapter is local-only, uses PyAutoGUI's failsafe, and writes privacy-preserving
JSONL audit metadata. It never logs screenshot bytes or plaintext typed text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

try:
    import pyautogui
except Exception:
    pyautogui = None

NATIVE_SENTINEL = "I_OWN_AND_AUTHORIZE_THIS_MACHINE"
AUDIT_PATH = Path(os.environ.get("ZYRA_EYES_LOCAL_AUDIT", str(Path.home() / ".zyra" / "eyes" / "native-audit.jsonl")))


@dataclass(frozen=True)
class Action:
    type: str
    x: int | None = None
    y: int | None = None
    key: str | None = None
    text: str | None = None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_action(action: Action) -> dict:
    data = asdict(action)
    if action.type == "TYPE_TEXT":
        text = action.text or ""
        data["text"] = None
        data["textLength"] = len(text)
        data["textHash"] = sha256_bytes(text.encode("utf-8"))
    return {k: v for k, v in data.items() if v is not None}


def audit(event: str, **fields) -> None:
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    record = {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "event": event, **fields}
    with AUDIT_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, separators=(",", ":")) + "\n")


def require_pyautogui() -> None:
    if pyautogui is None:
        raise SystemExit("PyAutoGUI is not installed. Run: python -m pip install -r apps/zyra-eyes-plugin/requirements.txt")


def binary_rows(values: Iterable[int], width: int, height: int, threshold: int) -> list[str]:
    pixels = list(values)
    if len(pixels) != width * height:
        raise ValueError("pixel count does not match width*height")
    bits = ["1" if value >= threshold else "0" for value in pixels]
    return ["".join(bits[y * width:(y + 1) * width]) for y in range(height)]


def downsample_grayscale(image, grid_width: int, grid_height: int) -> tuple[list[int], int, int]:
    gray = image.convert("L").resize((grid_width, grid_height))
    return list(gray.getdata()), grid_width, grid_height


def analyze(values: list[int], width: int, height: int, threshold: int, goal: str, screen_width: int, screen_height: int) -> dict:
    rows = binary_rows(values, width, height, threshold)
    bits = [1 if value >= threshold else 0 for value in values]
    active = [(i % width, i // width) for i, bit in enumerate(bits) if bit]
    brightest_index = max(range(len(values)), key=values.__getitem__)
    darkest_index = min(range(len(values)), key=values.__getitem__)

    if goal == "darkest":
        gx, gy = darkest_index % width, darkest_index // width
    elif goal == "center" and active:
        gx = sum(x for x, _ in active) / len(active)
        gy = sum(y for _, y in active) / len(active)
    else:
        gx, gy = brightest_index % width, brightest_index // width

    target_x = max(0, min(screen_width - 1, round((gx + 0.5) / width * screen_width)))
    target_y = max(0, min(screen_height - 1, round((gy + 0.5) / height * screen_height)))
    density = round(sum(bits) / len(bits), 4)
    frame_hash = sha256_bytes(bytes(values))
    return {
        "rows": rows,
        "density": density,
        "frameHash": frame_hash,
        "target": {"x": target_x, "y": target_y},
        "brightest": {"x": brightest_index % width, "y": brightest_index // width, "value": values[brightest_index]},
        "darkest": {"x": darkest_index % width, "y": darkest_index // width, "value": values[darkest_index]},
    }


def execute(action: Action, native: bool) -> None:
    if not native:
        audit("ACTION_SIMULATED", action=safe_action(action))
        print(json.dumps({"simulated": True, "action": safe_action(action)}, indent=2))
        return

    if os.environ.get("ZYRA_EYES_NATIVE_CONTROL") != NATIVE_SENTINEL:
        raise SystemExit("Native control blocked. Set ZYRA_EYES_NATIVE_CONTROL=I_OWN_AND_AUTHORIZE_THIS_MACHINE only on a machine you own and authorize.")

    require_pyautogui()
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.08

    if action.type == "MOVE":
        pyautogui.moveTo(action.x, action.y, duration=0.15)
    elif action.type == "LEFT_CLICK":
        pyautogui.click(action.x, action.y)
    elif action.type == "KEY_PRESS":
        allowed = {"enter", "esc", "escape", "tab", "space", "up", "down", "left", "right"}
        key = (action.key or "").lower()
        if key not in allowed:
            raise SystemExit("Key is not in the local allowlist")
        pyautogui.press("esc" if key == "escape" else key)
    elif action.type == "TYPE_TEXT":
        text = action.text or ""
        if len(text) > 200:
            raise SystemExit("TYPE_TEXT is capped at 200 characters per approved action")
        pyautogui.write(text, interval=0.01)
    else:
        raise SystemExit(f"Unsupported action: {action.type}")

    audit("ACTION_EXECUTED_NATIVE", action=safe_action(action))
    print(json.dumps({"executed": True, "action": safe_action(action)}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="ZYRA Eyes / RVIA binary vision local controller")
    parser.add_argument("--native", action="store_true", help="Execute locally after explicit authorization; otherwise simulate")
    parser.add_argument("--capture", action="store_true", help="Capture the current local screen and plan a pointer target")
    parser.add_argument("--goal", choices=["brightest", "darkest", "center"], default="brightest")
    parser.add_argument("--grid", default="24x14", help="Binary sensory grid, e.g. 24x14")
    parser.add_argument("--threshold", type=int, default=128)
    parser.add_argument("--click", action="store_true", help="Plan LEFT_CLICK instead of MOVE")
    parser.add_argument("--move", nargs=2, type=int, metavar=("X", "Y"))
    parser.add_argument("--key", type=str)
    parser.add_argument("--type-text", type=str)
    parser.add_argument("--approve", action="store_true", help="Required acknowledgement for any native action")
    args = parser.parse_args()

    if args.native and not args.approve:
        raise SystemExit("Native execution requires --approve for this invocation")

    if args.capture:
        require_pyautogui()
        width, height = [int(part) for part in args.grid.lower().split("x", 1)]
        screen_width, screen_height = pyautogui.size()
        image = pyautogui.screenshot()
        values, grid_width, grid_height = downsample_grayscale(image, width, height)
        result = analyze(values, grid_width, grid_height, args.threshold, args.goal, screen_width, screen_height)
        action = Action("LEFT_CLICK" if args.click else "MOVE", x=result["target"]["x"], y=result["target"]["y"])
        audit("FRAME_ANALYZED", frameHash=result["frameHash"], grid=f"{grid_width}x{grid_height}", density=result["density"], goal=args.goal)
        print("\n".join(result["rows"]))
        print(json.dumps({k: v for k, v in result.items() if k != "rows"}, indent=2))
        execute(action, args.native)
        return

    if args.move:
        execute(Action("MOVE", x=args.move[0], y=args.move[1]), args.native)
    elif args.key:
        execute(Action("KEY_PRESS", key=args.key), args.native)
    elif args.type_text is not None:
        execute(Action("TYPE_TEXT", text=args.type_text), args.native)
    else:
        parser.error("choose --capture, --move X Y, --key KEY, or --type-text TEXT")


if __name__ == "__main__":
    main()
