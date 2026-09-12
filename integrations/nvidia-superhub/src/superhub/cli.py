from __future__ import annotations

import argparse
import json
import shutil
import sys
from .core import ROOT, fetch_catalog, load_catalog, plan, sync, graph


def main(argv=None):
    parser = argparse.ArgumentParser(prog="superhub")
    sub = parser.add_subparsers(dest="command", required=True)
    catalog = sub.add_parser("catalog"); catalog.add_argument("--fixture")
    search = sub.add_parser("search"); search.add_argument("query")
    stack = sub.add_parser("plan"); stack.add_argument("stack")
    checkout = sub.add_parser("sync"); checkout.add_argument("stack"); checkout.add_argument("--dry-run", action="store_true"); checkout.add_argument("--allow-unknown-license", action="store_true")
    sub.add_parser("doctor")
    sub.add_parser("graph")
    args = parser.parse_args(argv)
    if args.command == "catalog":
        print(f"Indexed {len(fetch_catalog(args.fixture))} repositories")
    elif args.command == "search":
        q = args.query.lower(); print(json.dumps([r for r in load_catalog() if q in (r["name"] + " " + r["description"]).lower()], indent=2))
    elif args.command == "plan": print(json.dumps(plan(args.stack), indent=2))
    elif args.command == "sync": print("\n".join(sync(args.stack, args.dry_run, args.allow_unknown_license)))
    elif args.command == "graph": print(json.dumps(graph(), indent=2))
    else:
        checks = {"python": sys.version.split()[0], "git": shutil.which("git"), "catalog": (ROOT / "data/catalog.json").exists()}
        print(json.dumps(checks, indent=2)); raise SystemExit(0 if all(checks.values()) else 1)


if __name__ == "__main__": main()

