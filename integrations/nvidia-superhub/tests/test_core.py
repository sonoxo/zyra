import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from superhub import core


class HubTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.patches = [
            patch.object(core, "ROOT", self.root),
            patch.object(core, "CATALOG", self.root / "data" / "catalog.json"),
        ]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)
        self.fixture = str(Path(__file__).parent / "fixtures" / "repos.json")
        core.fetch_catalog(self.fixture)

    def test_catalog_plan_graph(self):
        self.assertEqual(len(core.load_catalog()), 4)
        self.assertEqual(len(core.plan("ai-foundry")), 4)
        self.assertEqual(len(core.graph()["edges"]), 4)

    def test_dry_run_does_not_execute(self):
        with patch.object(core.subprocess, "run") as run:
            self.assertEqual(len(core.sync("ai-foundry", True)), 4)
            run.assert_not_called()

    def test_missing_stack(self):
        with self.assertRaises(SystemExit):
            core.plan("not-a-stack")

    def test_missing_repository(self):
        self.assertTrue(all(r.get("status") == "not-in-catalog"
                            for r in core.plan("robotics-lab")))

    def test_unknown_license_blocked(self):
        data = core.load_catalog()
        data[0]["license"] = "unknown"
        core.CATALOG.write_text(json.dumps(data))
        self.assertTrue(any(a.startswith("BLOCK NeMo") for a in core.sync("ai-foundry", True)))

    def test_archived_blocked(self):
        data = core.load_catalog()
        data[0]["archived"] = True
        core.CATALOG.write_text(json.dumps(data))
        self.assertTrue(any("archived" in a for a in core.sync("ai-foundry", True)))

    def test_clone_url_tampering_rejected(self):
        data = core.load_catalog()
        data[0]["clone_url"] = "https://evil.example/repo"
        core.CATALOG.write_text(json.dumps(data))
        with self.assertRaises(ValueError):
            core.sync("ai-foundry", True)

    def test_path_traversal_rejected(self):
        bad = self.root / "bad.json"
        bad.write_text(json.dumps([{"name": "../escape"}]))
        with self.assertRaises(ValueError):
            core.fetch_catalog(str(bad))
        self.assertEqual(len(core.load_catalog()), 4)

    def test_existing_checkout_preserved(self):
        destination = self.root / "workspace" / "NeMo"
        destination.mkdir(parents=True)
        self.assertTrue(any("already exists" in a for a in core.sync("ai-foundry", True)))

    def test_workspace_symlink_rejected(self):
        (self.root / "workspace").symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            core.sync("ai-foundry", True)


if __name__ == "__main__":
    unittest.main()
