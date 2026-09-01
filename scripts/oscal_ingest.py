#!/usr/bin/env python3
"""Safe OSCAL manifest ingester for the XUNIA public-source governance baseline.

The tool validates OSCAL JSON and writes a compact manifest containing metadata,
control identifiers and cryptographic provenance. It intentionally does not
vendor full government control prose into this repository.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

ALLOWED_HOSTS = {
    "github.com",
    "raw.githubusercontent.com",
    "api.github.com",
    "pages.nist.gov",
    "csrc.nist.gov",
    "www.nist.gov",
}
ALLOWED_ROOTS = {
    "catalog",
    "profile",
    "component-definition",
    "system-security-plan",
    "assessment-plan",
    "assessment-results",
    "plan-of-action-and-milestones",
}
MAX_BYTES = 50 * 1024 * 1024


class IngestError(RuntimeError):
    pass


def read_source(locator: str) -> tuple[bytes, str]:
    parsed = urllib.parse.urlparse(locator)
    if parsed.scheme:
        if parsed.scheme != "https":
            raise IngestError("remote OSCAL sources must use HTTPS")
        if parsed.hostname not in ALLOWED_HOSTS:
            raise IngestError(f"remote host is not allowlisted: {parsed.hostname}")
        req = urllib.request.Request(locator, headers={"User-Agent": "xunia-oscal-ingest/1"})
        with urllib.request.urlopen(req, timeout=20) as response:
            data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise IngestError("OSCAL source exceeds 50 MiB limit")
        return data, locator

    path = pathlib.Path(locator)
    if not path.is_file():
        raise IngestError(f"local source does not exist: {path}")
    data = path.read_bytes()
    if len(data) > MAX_BYTES:
        raise IngestError("OSCAL source exceeds 50 MiB limit")
    return data, str(path)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def iter_control_ids(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key in {"id", "control-id"} and isinstance(value, str):
                yield value.lower()
            yield from iter_control_ids(value)
    elif isinstance(node, list):
        for value in node:
            yield from iter_control_ids(value)


def validate_oscal(document: dict) -> tuple[str, dict]:
    roots = [key for key in ALLOWED_ROOTS if key in document]
    if len(roots) != 1:
        raise IngestError(
            "expected exactly one supported OSCAL root "
            f"({', '.join(sorted(ALLOWED_ROOTS))})"
        )
    root_name = roots[0]
    root = document[root_name]
    if not isinstance(root, dict):
        raise IngestError("OSCAL root must be an object")
    if not isinstance(root.get("uuid"), str) or not root["uuid"].strip():
        raise IngestError("OSCAL root uuid is required")
    metadata = root.get("metadata")
    if not isinstance(metadata, dict):
        raise IngestError("OSCAL metadata is required")
    required_metadata = ("title", "last-modified", "version", "oscal-version")
    missing = [key for key in required_metadata if not metadata.get(key)]
    if missing:
        raise IngestError("missing OSCAL metadata: " + ", ".join(missing))
    return root_name, root


def build_manifest(data: bytes, locator: str, expected_sha256: str | None) -> dict:
    digest = sha256_hex(data)
    if expected_sha256 and digest.lower() != expected_sha256.lower():
        raise IngestError(
            f"SHA-256 mismatch: expected {expected_sha256.lower()}, got {digest}"
        )
    try:
        document = json.loads(data)
    except json.JSONDecodeError as exc:
        raise IngestError(f"invalid JSON: {exc}") from exc
    if not isinstance(document, dict):
        raise IngestError("OSCAL document must be a JSON object")

    root_name, root = validate_oscal(document)
    metadata = root["metadata"]
    controls = sorted(set(iter_control_ids(root)))

    return {
        "schema_version": 1,
        "source": {
            "locator": locator,
            "sha256": digest,
            "verified_digest": bool(expected_sha256),
        },
        "oscal": {
            "model": root_name,
            "document_uuid": root["uuid"],
            "title": metadata["title"],
            "document_version": metadata["version"],
            "oscal_version": metadata["oscal-version"],
            "last_modified": metadata["last-modified"],
        },
        "index": {
            "control_id_count": len(controls),
            "control_ids": controls,
        },
        "privacy": {
            "full_document_vendored": False,
            "party_records_copied": False,
            "control_prose_copied": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", help="local OSCAL JSON file or allowlisted HTTPS URL")
    parser.add_argument("--sha256", help="expected source SHA-256")
    parser.add_argument("--out", required=True, help="output manifest JSON path")
    args = parser.parse_args()

    try:
        data, locator = read_source(args.source)
        manifest = build_manifest(data, locator, args.sha256)
    except (IngestError, OSError, urllib.error.URLError) as exc:
        print(f"OSCAL ingest failed: {exc}", file=sys.stderr)
        return 2

    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(
        f"OSCAL manifest written: {out} "
        f"({manifest['index']['control_id_count']} control identifiers)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
