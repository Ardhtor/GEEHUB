#!/usr/bin/env python3
"""GEEHUB Discovery Engine: local research-run intake and validation.

This script deliberately does not pretend to search the web. It validates the
creator index and creates provenance-bearing run folders for reviewed research
candidates. Network adapters can be added later behind the same record shape.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CREATORS_PATH = ROOT / "research" / "creators" / "ACTIVE_CREATORS.json"
SCHEMA_PATH = ROOT / "research" / "creators" / "CREATOR_SCHEMA.json"
RUNS_DIR = ROOT / "research" / "discovery" / "RESEARCH_RUNS"
STATUSES = {"active", "inactive", "historical", "unknown", "archived"}
VERIFICATIONS = {"observed", "independently_verified", "archived", "inferred", "unverified"}
SOURCE_TYPES = {"primary", "archive", "mirror", "reference"}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate_creator(record: dict) -> list[str]:
    errors = []
    for field in ("id", "display_name", "status", "verification", "sources", "first_seen", "last_verified"):
        if field not in record:
            errors.append(f"missing required field: {field}")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", str(record.get("id", ""))):
        errors.append("id must be lowercase kebab-case")
    if record.get("status") not in STATUSES:
        errors.append(f"invalid status: {record.get('status')}")
    if record.get("verification") not in VERIFICATIONS:
        errors.append(f"invalid verification: {record.get('verification')}")
    for date_field in ("first_seen", "last_verified"):
        value = record.get(date_field, "")
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except (TypeError, ValueError):
            errors.append(f"{date_field} must be YYYY-MM-DD")
    for source in record.get("sources", []):
        if source.get("type") not in SOURCE_TYPES:
            errors.append(f"invalid source type: {source.get('type')}")
        parsed = urlparse(source.get("url", ""))
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            errors.append(f"source URL is not absolute HTTP(S): {source.get('url')}")
        try:
            datetime.strptime(source.get("accessed", ""), "%Y-%m-%d")
        except (TypeError, ValueError):
            errors.append(f"source accessed date must be YYYY-MM-DD: {source.get('url')}")
    for platform in record.get("platforms", []):
        if platform.get("url"):
            parsed = urlparse(platform["url"])
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                errors.append(f"platform URL is not absolute HTTP(S): {platform['url']}")
    return errors


def validate_index(records: list[dict]) -> list[str]:
    errors = []
    seen = set()
    for index, record in enumerate(records):
        prefix = f"record[{index}]"
        for error in validate_creator(record):
            errors.append(f"{prefix}: {error}")
        identifier = record.get("id")
        if identifier in seen:
            errors.append(f"{prefix}: duplicate id {identifier}")
        seen.add(identifier)
    return errors


def create_run(candidates: list[dict], notes: str, dry_run: bool) -> Path | None:
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")
    run_dir = RUNS_DIR / stamp
    if dry_run:
        print(f"DRY RUN: would create {run_dir.relative_to(ROOT)}")
        print(json.dumps(candidates, indent=2, ensure_ascii=False))
        return None
    run_dir.mkdir(parents=True, exist_ok=False)
    (run_dir / "candidates.json").write_text(
        json.dumps(candidates, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (run_dir / "notes.md").write_text(notes.rstrip() + "\n", encoding="utf-8")
    manifest = {
        "run_id": stamp,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mode": "manual_intake",
        "connectors": [],
        "candidate_count": len(candidates),
        "evidence_boundary": "No live search connectors were run by this script."
    }
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return run_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="GEEHUB Discovery Engine intake runner")
    parser.add_argument("--validate", action="store_true", help="validate the creator index")
    parser.add_argument("--dry-run", action="store_true", help="show a run without writing files")
    parser.add_argument("--notes", default="Manual research intake. Add source URLs and evidence notes before promotion.")
    parser.add_argument("--candidate", action="append", default=[], metavar="JSON", help="candidate record as inline JSON; repeatable")
    args = parser.parse_args()

    if not CREATORS_PATH.exists() or not SCHEMA_PATH.exists():
        print("Creator index or schema is missing.", file=sys.stderr)
        return 2
    creators = load_json(CREATORS_PATH)
    errors = validate_index(creators)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {len(creators)} creator records.")

    if args.validate and not args.candidate:
        return 0

    candidates = []
    for raw in args.candidate:
        try:
            record = json.loads(raw)
        except json.JSONDecodeError as exc:
            print(f"Invalid candidate JSON: {exc}", file=sys.stderr)
            return 2
        record_errors = validate_creator(record)
        if record_errors:
            print(f"Candidate {record.get('id', '<unknown>')}: " + "; ".join(record_errors), file=sys.stderr)
            return 1
        candidates.append(record)

    run_dir = create_run(candidates, args.notes, args.dry_run)
    if run_dir:
        print(f"Research run written to {run_dir.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
