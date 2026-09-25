import sys
import unittest
from pathlib import Path
root = Path(__file__).resolve().parent
sys.path.insert(0, str(root / "src"))
suite = unittest.defaultTestLoader.discover(str(root / "tests"))
sys.exit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
