#!/usr/bin/env python3
"""Validate a geehub-jams.json export without modifying it.

The browser intentionally keeps persistence local-first. This small validator makes
portable exports inspectable before they are archived, merged, or handed to another
workflow. It accepts the current array format and reports row-level problems.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED = {"title", "brief", "createdAt", "from"}


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate-jams.py geehub-jams.json", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"error: file not found: {path}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as exc:
        print(f"error: invalid JSON at line {exc.lineno}, column {exc.colno}", file=sys.stderr)
        return 1

    if not isinstance(data, list):
        print("error: export root must be an array")
        return 1

    errors = []
    for index, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            errors.append(f"#{index}: item must be an object")
            continue
        missing = sorted(REQUIRED - item.keys())
        if missing:
            errors.append(f"#{index}: missing {', '.join(missing)}")
        if "title" in item and not isinstance(item["title"], str):
            errors.append(f"#{index}: title must be a string")
        if "brief" in item and not isinstance(item["brief"], str):
            errors.append(f"#{index}: brief must be a string")
        if "from" in item and not isinstance(item["from"], list):
            errors.append(f"#{index}: from must be an array of project ids")

    if errors:
        print(f"invalid: {len(errors)} problem(s)")
        print("\n".join(errors))
        return 1

    print(f"valid: {len(data)} saved jam(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
