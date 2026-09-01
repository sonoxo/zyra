#!/usr/bin/env python3
"""Offline structural validation for the XUNIA public-government cyber baseline.

This validator intentionally performs no network access and does not download
standards. It checks that the governance bundle is present, fail-closed source
policy is enabled, authoritative source IDs are registered, URLs are HTTPS, and
obvious secret material has not been committed into the baseline directory.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    ROOT / "docs/government-cyber/README.md",
    ROOT / "docs/government-cyber/SAFETY-BOUNDARIES.md",
    ROOT / "docs/government-cyber/IMPLEMENTATION-BASELINE.md",
    ROOT / "docs/government-cyber/SOURCE-PROVENANCE.md",
    ROOT / "governance/usg-cyber/sources.yaml",
    ROOT / "governance/usg-cyber/control-map.yaml",
    ROOT / "governance/usg-cyber/agent-policy.yaml",
    ROOT / "governance/usg-cyber/workforce-schema.json",
    ROOT / "governance/usg-cyber/model-governance.yaml",
]

REQUIRED_SOURCE_IDS = {
    "nist-csf-2.0",
    "nist-sp800-53r5",
    "nist-sp800-171r3",
    "nist-sp800-61r3",
    "nist-sp800-207",
    "nist-sp800-218",
    "nist-oscal",
    "nist-ai-rmf-1.0",
    "nist-ai-600-1",
    "cisa-kev",
    "cisa-cpg",
    "nsa-zig-2026",
    "disa-stig-srg",
    "dcwf",
    "dodm-8140.03",
    "platform-one-bigbang",
}

SECRET_PATTERNS = [
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9_]{20,}"),
]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    missing = [str(p.relative_to(ROOT)) for p in REQUIRED_FILES if not p.is_file()]
    if missing:
        fail("missing required files: " + ", ".join(missing))

    source_text = (ROOT / "governance/usg-cyber/sources.yaml").read_text(encoding="utf-8")

    required_policy_fragments = [
        "authoritative_public_only: true",
        "allow_authenticated_sources: false",
        "allow_cui_or_classified: false",
        "allow_personnel_rosters: false",
        "fail_closed_on_uncertain_provenance: true",
    ]
    for fragment in required_policy_fragments:
        if fragment not in source_text:
            fail(f"source registry safety policy missing or weakened: {fragment}")

    registered_ids = set(re.findall(r"^\s*- id:\s*([^\s#]+)", source_text, flags=re.MULTILINE))
    missing_ids = sorted(REQUIRED_SOURCE_IDS - registered_ids)
    if missing_ids:
        fail("required authoritative source IDs are missing: " + ", ".join(missing_ids))

    urls = re.findall(r"^\s*(?:url|content_url|downloads_url):\s*(\S+)", source_text, flags=re.MULTILINE)
    insecure_urls = [url for url in urls if not url.startswith("https://")]
    if insecure_urls:
        fail("non-HTTPS source URL(s): " + ", ".join(insecure_urls))

    schema_path = ROOT / "governance/usg-cyber/workforce-schema.json"
    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid workforce schema JSON: {exc}")

    if schema.get("additionalProperties") is not False:
        fail("workforce schema must remain closed to undeclared top-level fields")

    forbidden_personnel_fields = {
        "dod_id",
        "cac_identifier",
        "home_address",
        "private_phone",
        "private_email",
        "nonpublic_location",
        "nonpublic_schedule",
    }
    schema_text = json.dumps(schema)
    absent_guards = sorted(field for field in forbidden_personnel_fields if field not in schema_text)
    if absent_guards:
        fail("workforce schema lost personnel-data guards: " + ", ".join(absent_guards))

    governed_files = [p for p in REQUIRED_FILES if p.suffix in {".md", ".yaml", ".json"}]
    for path in governed_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                fail(f"possible secret/private key committed in {path.relative_to(ROOT)}")

    print(f"USG cyber baseline validation passed: {len(REQUIRED_FILES)} required files, "
          f"{len(registered_ids)} registered sources, {len(urls)} HTTPS source URLs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
