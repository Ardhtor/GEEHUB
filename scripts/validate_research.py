#!/usr/bin/env python3
"""Validate GEEHUB research records without third-party dependencies."""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CREATORS = ROOT / "research/creators/ACTIVE_CREATORS.json"
SCHEMA = ROOT / "research/creators/CREATOR_SCHEMA.json"
LINEAGE = ROOT / "research/relationships/TEAL_TITAN_LINEAGE.json"
WORKS = ROOT / "research/hulums-cave/works.json"
POSTS = ROOT / "research/hulums-cave/post-index.json"


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ValueError(f"missing file: {path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON in {path.relative_to(ROOT)}: {exc}")


def valid_date(value) -> bool:
    try:
        date.fromisoformat(value)
        return True
    except (TypeError, ValueError):
        return False


def valid_url(value) -> bool:
    parsed = urlparse(value or "")
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def validate_creators(records, schema):
    errors = []
    required = schema.get("required", [])
    statuses = set(schema["properties"]["status"]["enum"])
    verifications = set(schema["properties"]["verification"]["enum"])
    ids = set()
    for i, record in enumerate(records):
        label = f"creator[{i}]"
        for field in required:
            if field not in record:
                errors.append(f"{label}: missing {field}")
        identifier = record.get("id", "")
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", identifier):
            errors.append(f"{label}: id must be kebab-case")
        if identifier in ids:
            errors.append(f"{label}: duplicate id {identifier}")
        ids.add(identifier)
        if record.get("status") not in statuses:
            errors.append(f"{label}: invalid status")
        if record.get("verification") not in verifications:
            errors.append(f"{label}: invalid verification")
        for field in ("first_seen", "last_verified"):
            if not valid_date(record.get(field)):
                errors.append(f"{label}: {field} must be YYYY-MM-DD")
        for source in record.get("sources", []):
            if source.get("type") not in {"primary", "archive", "mirror", "reference"}:
                errors.append(f"{label}: invalid source type")
            if not valid_url(source.get("url")):
                errors.append(f"{label}: invalid source URL {source.get('url')}")
            if not valid_date(source.get("accessed")):
                errors.append(f"{label}: invalid source accessed date")
        for platform in record.get("platforms", []):
            if platform.get("url") and not valid_url(platform["url"]):
                errors.append(f"{label}: invalid platform URL")
    return errors, ids


def main():
    errors = []
    schema = read_json(SCHEMA)
    creators = read_json(CREATORS)
    lineage = read_json(LINEAGE)
    works = read_json(WORKS)
    posts = read_json(POSTS)

    creator_errors, creator_ids = validate_creators(creators, schema)
    errors.extend(creator_errors)

    if lineage.get("id") != "teal-titan":
        errors.append("lineage: expected id teal-titan")
    if not lineage.get("source_sequence"):
        errors.append("lineage: source_sequence is empty")
    source_ids = set()
    for item in lineage.get("source_sequence", []):
        if item.get("id") in source_ids:
            errors.append(f"lineage: duplicate source id {item.get('id')}")
        source_ids.add(item.get("id"))
        if item.get("sequence") is None:
            errors.append(f"lineage: source {item.get('id')} has no sequence number")
    if lineage.get("creator_relationships"):
        for relation in lineage["creator_relationships"]:
            if relation.get("entity_id") not in creator_ids and relation.get("entity_id") != "joey-prever":
                errors.append(f"lineage: unresolved creator entity {relation.get('entity_id')}")

    if not isinstance(works, dict) or not works:
        errors.append("Hulum's Cave works catalogue must be a non-empty object")
    if not isinstance(posts, dict) or not posts:
        errors.append("Hulum's Cave post index must be a non-empty object")

    if errors:
        print("\n".join(f"ERROR: {item}" for item in errors), file=sys.stderr)
        return 1
    print(
        f"Research validation passed: {len(creators)} creators, "
        f"{len(lineage['source_sequence'])} Teal Titan source entries, "
        f"{len(works)} catalogue groups, {len(posts)} post-index groups."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
