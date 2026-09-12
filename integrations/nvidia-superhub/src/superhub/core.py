from __future__ import annotations

import json
import os
import re
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "data" / "catalog.json"
STACKS = ROOT / "config" / "stacks.json"
ALLOWED_LICENSES = {"apache-2.0", "mit", "bsd-2-clause", "bsd-3-clause", "isc", "mpl-2.0"}


def fetch_catalog(fixture: str | None = None) -> list[dict]:
    if fixture:
        repos = json.loads(Path(fixture).read_text())
    else:
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "nvidia-superhub"}
        if os.getenv("GITHUB_TOKEN"):
            headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
        repos, page = [], 1
        while True:
            req = urllib.request.Request(f"https://api.github.com/orgs/NVIDIA/repos?per_page=100&page={page}", headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response:
                batch = json.load(response)
            repos.extend(batch)
            if len(batch) < 100:
                break
            page += 1
    if not isinstance(repos, list):
        raise ValueError("Expected repository list")
    for repo in repos:
        name = repo.get("name", "")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", name):
            raise ValueError("Invalid repository name")
        if repo.get("owner", {}).get("login", "NVIDIA").lower() != "nvidia":
            raise ValueError("Unexpected repository owner")
    normalized = [{
        "name": r["name"], "url": f"https://github.com/NVIDIA/{r['name']}",
        "clone_url": f"https://github.com/NVIDIA/{r['name']}.git",
        "description": r.get("description") or "", "language": r.get("language"),
        "stars": r.get("stargazers_count", 0), "archived": r.get("archived", False),
        "license": ((r.get("license") or {}).get("spdx_id") or "UNKNOWN").lower(),
        "updated_at": r.get("updated_at"),
    } for r in repos]
    CATALOG.parent.mkdir(exist_ok=True)
    CATALOG.write_text(json.dumps(sorted(normalized, key=lambda x: (-x["stars"], x["name"])), indent=2) + "\n")
    return normalized


def load_catalog() -> list[dict]:
    if not CATALOG.exists():
        raise SystemExit("Catalog missing. Run: superhub catalog")
    return json.loads(CATALOG.read_text())


def load_stacks() -> dict[str, list[str]]:
    return json.loads(STACKS.read_text())


def plan(stack: str) -> list[dict]:
    names = load_stacks().get(stack)
    if names is None:
        raise SystemExit(f"Unknown stack: {stack}")
    by_name = {r["name"].lower(): r for r in load_catalog()}
    return [by_name.get(name.lower(), {"name": name, "status": "not-in-catalog"}) for name in names]


def sync(stack: str, dry_run: bool = False, allow_unknown_license: bool = False) -> list[str]:
    actions = []
    for repo in plan(stack):
        if "clone_url" not in repo:
            actions.append(f"SKIP {repo['name']}: absent")
            continue
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", repo["name"]):
            raise ValueError("Invalid repository name")
        if repo["clone_url"] != f"https://github.com/NVIDIA/{repo['name']}.git":
            raise ValueError("Unexpected clone URL")
        if repo.get("archived"):
            actions.append(f"BLOCK {repo['name']}: archived")
            continue
        license_id = repo["license"]
        if license_id not in ALLOWED_LICENSES and not (allow_unknown_license and license_id == "unknown"):
            actions.append(f"BLOCK {repo['name']}: license={license_id}")
            continue
        destination = ROOT / "workspace" / repo["name"]
        if destination.is_symlink() or destination.parent.is_symlink():
            raise ValueError("Workspace symlinks are not allowed")
        if destination.exists():
            actions.append(f"SKIP {repo['name']}: destination already exists; no update performed")
            continue
        command = ["git", "clone", "--depth=1", "--filter=blob:none", repo["clone_url"], str(destination)]
        actions.append(" ".join(command))
        if not dry_run and not destination.exists():
            destination.parent.mkdir(exist_ok=True)
            subprocess.run(command, check=True)
    return actions



def graph():
    """Export metadata only, using canonical Black House types/relationships."""
    repos = load_catalog()
    nodes = [{"id": "nvidia-superhub", "type": "Tool", "name": "NVIDIA SuperHub"}]
    nodes += [{"id": r["url"], "type": "Repository", "name": r["name"],
               "license": r["license"], "source": r["url"],
               "integration_status": "cataloged-not-installed"} for r in repos]
    return {"schema_version": 1, "nodes": nodes,
            "edges": [{"source": "nvidia-superhub", "relationship": "USES",
                       "target": r["url"]} for r in repos],
            "note": "USES denotes a metadata reference, not executable integration."}
