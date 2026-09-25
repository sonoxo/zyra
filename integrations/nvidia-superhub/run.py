"""Repo-local entry point; works without pip installation."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from superhub.cli import main
main()
