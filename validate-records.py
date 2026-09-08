#!/usr/bin/env python3
"""Validate GEEHUB's canonical records.json without third-party packages.

The runtime index is intentionally small and human-editable. This validator keeps
its contract executable while remaining usable in a fresh checkout.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
REQUIRED = {
    "id", "title", "creator", "labels", "year", "source_type", "url",
    "archive_url", "adult", "description", "provenance", "status"
}
SOURCE_TYPES = {"blog", "forum", "archive", "video", "other"}
STATUSES = {"verified", "archived", "unverified", "dead"}


def is_http_url(value):
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"cannot parse {path}: {exc}"]

    if not isinstance(data, list):
        return ["top-level value must be an array"]

    seen_ids: set[str] = set()
    for index, record in enumerate(data):
        prefix = f"record {index}"
        if not isinstance(record, dict):
            errors.append(f"{prefix}: must be an object")
            continue
        missing = sorted(REQUIRED - record.keys())
        if missing:
            errors.append(f"{prefix}: missing fields: {', '.join(missing)}")
        record_id = record.get("id")
        if not isinstance(record_id, str) or not record_id.strip():
            errors.append(f"{prefix}: id must be a non-empty string")
        elif record_id in seen_ids:
            errors.append(f"{prefix}: duplicate id {record_id!r}")
        else:
            seen_ids.add(record_id)
        for field in ("title", "description", "provenance"):
            if not isinstance(record.get(field), str) or not record[field].strip():
                errors.append(f"{prefix}: {field} must be a non-empty string")
        if record.get("creator") is not None and not isinstance(record.get("creator"), str):
            errors.append(f"{prefix}: creator must be a string or null")
        labels = record.get("labels")
        if not isinstance(labels, list) or any(not isinstance(x, str) or not x.strip() for x in labels):
            errors.append(f"{prefix}: labels must be an array of non-empty strings")
        year = record.get("year")
        if year is not None and (not isinstance(year, int) or isinstance(year, bool)):
            errors.append(f"{prefix}: year must be an integer or null")
        if record.get("source_type") not in SOURCE_TYPES:
            errors.append(f"{prefix}: source_type must be one of {sorted(SOURCE_TYPES)}")
        if not is_http_url(record.get("url", "")):
            errors.append(f"{prefix}: url must be an http(s) URL")
        archive_url = record.get("archive_url")
        if archive_url is not None and not is_http_url(archive_url):
            errors.append(f"{prefix}: archive_url must be an http(s) URL or null")
        if not isinstance(record.get("adult"), bool):
            errors.append(f"{prefix}: adult must be boolean")
        if record.get("status") not in STATUSES:
            errors.append(f"{prefix}: status must be one of {sorted(STATUSES)}")
    return errors


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "records.json"
    errors = validate(path)
    if errors:
        print("records validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    count = len(json.loads(path.read_text(encoding="utf-8")))
    print(f"records validation passed: {count} records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
