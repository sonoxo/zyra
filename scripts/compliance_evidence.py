#!/usr/bin/env python3
"""Validate and summarize XUNIA control evidence without reading sensitive artifacts."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys

STATUSES = {
    "not_assessed",
    "not_applicable",
    "planned",
    "partially_implemented",
    "implemented_unverified",
    "verified",
}
VERIFIER_TYPES = {"automated_test", "human_review"}


class EvidenceError(RuntimeError):
    pass


def load_json(path: pathlib.Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise EvidenceError(f"missing file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise EvidenceError(f"invalid JSON in {path}: {exc}") from exc


def file_sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_index(index: dict, repo_root: pathlib.Path) -> list[str]:
    errors: list[str] = []
    if index.get("schema_version") != 1:
        errors.append("evidence index schema_version must be 1")

    controls = index.get("controls")
    if not isinstance(controls, list):
        return errors + ["controls must be an array"]

    seen = set()
    for item in controls:
        if not isinstance(item, dict):
            errors.append("every control record must be an object")
            continue
        cid = item.get("control_id")
        if not isinstance(cid, str) or not cid:
            errors.append("control_id is required")
            continue
        if cid in seen:
            errors.append(f"duplicate control_id: {cid}")
        seen.add(cid)

        status = item.get("status")
        if status not in STATUSES:
            errors.append(f"{cid}: invalid status {status!r}")
            continue

        artifacts = item.get("artifacts", [])
        if not isinstance(artifacts, list):
            errors.append(f"{cid}: artifacts must be an array")
            continue

        for artifact in artifacts:
            if not isinstance(artifact, dict):
                errors.append(f"{cid}: artifact must be an object")
                continue
            rel = artifact.get("path")
            digest = artifact.get("sha256")
            if not isinstance(rel, str) or not rel:
                errors.append(f"{cid}: artifact path is required")
                continue
            if rel.startswith("/") or ".." in pathlib.PurePosixPath(rel).parts:
                errors.append(f"{cid}: artifact path must remain inside repository")
                continue
            full = repo_root / rel
            if not full.is_file():
                errors.append(f"{cid}: artifact missing: {rel}")
                continue
            if digest:
                actual = file_sha256(full)
                if actual.lower() != str(digest).lower():
                    errors.append(f"{cid}: digest mismatch for {rel}")

        verifier = item.get("verification")
        if status == "verified":
            if not artifacts:
                errors.append(f"{cid}: verified status requires evidence artifacts")
            if not isinstance(verifier, dict):
                errors.append(f"{cid}: verified status requires verification metadata")
            elif verifier.get("type") not in VERIFIER_TYPES:
                errors.append(
                    f"{cid}: verification.type must be one of {sorted(VERIFIER_TYPES)}"
                )
        elif verifier and not isinstance(verifier, dict):
            errors.append(f"{cid}: verification must be an object when present")

        if status == "not_applicable" and not item.get("rationale"):
            errors.append(f"{cid}: not_applicable requires rationale")

    return errors


def summarize(index: dict) -> dict:
    counts = {status: 0 for status in sorted(STATUSES)}
    for item in index.get("controls", []):
        status = item.get("status")
        if status in counts:
            counts[status] += 1
    total = sum(counts.values())
    verified = counts["verified"]
    assessed = total - counts["not_assessed"]
    return {
        "total_controls": total,
        "assessed_controls": assessed,
        "verified_controls": verified,
        "verified_percent": round((verified / total * 100.0) if total else 0.0, 1),
        "status_counts": counts,
        "certification_claim": False,
    }


def markdown(summary: dict) -> str:
    rows = "\n".join(
        f"| `{status}` | {count} |"
        for status, count in summary["status_counts"].items()
    )
    return (
        "# XUNIA Cyber Control Evidence Status\n\n"
        "> Internal evidence status only. This report is **not** a government "
        "certification, authorization, ATO, CMMC assessment, or FedRAMP status.\n\n"
        f"- Total controls: **{summary['total_controls']}**\n"
        f"- Assessed controls: **{summary['assessed_controls']}**\n"
        f"- Verified controls: **{summary['verified_controls']}**\n"
        f"- Verified percentage: **{summary['verified_percent']}%**\n\n"
        "| Status | Count |\n|---|---:|\n"
        f"{rows}\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--index",
        default="governance/usg-cyber/evidence-index.json",
        help="evidence index JSON",
    )
    parser.add_argument("--report-json", help="optional summary JSON output")
    parser.add_argument("--report-md", help="optional markdown output")
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args()

    repo_root = pathlib.Path(args.repo_root).resolve()
    index_path = (repo_root / args.index).resolve()

    try:
        index = load_json(index_path)
        errors = validate_index(index, repo_root)
    except EvidenceError as exc:
        print(f"Evidence validation failed: {exc}", file=sys.stderr)
        return 2

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 2

    summary = summarize(index)
    if args.report_json:
        out = repo_root / args.report_json
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.report_md:
        out = repo_root / args.report_md
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(markdown(summary), encoding="utf-8")

    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
