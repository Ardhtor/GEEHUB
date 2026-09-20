#!/usr/bin/env python3
"""Check that the browser registry exposes the declared constellation links.

The hub keeps a machine-readable registry in projects.json and a deliberately
self-contained browser surface in index.html. This check does not require the
browser to run; it prevents the two files from silently drifting on the small
set of fields that affect project discovery and cross-repository navigation.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def load_projects(path: Path) -> list[dict]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    # projects.json currently stores the array as a JSON string for the simple
    # static host. Accept both that shape and a direct array for future cleanup.
    if isinstance(raw, str):
        raw = json.loads(raw)
    if not isinstance(raw, list):
        raise ValueError("projects registry must contain an array")
    return raw


def js_quote(value: str) -> str:
    return re.escape(value).replace("\\ ", " ")


def main() -> int:
    root = Path(__file__).resolve().parent
    projects_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "projects.json"
    index_path = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "index.html"

    projects = load_projects(projects_path)
    html = index_path.read_text(encoding="utf-8")
    failures: list[str] = []

    for project in projects:
        project_id = project.get("id", "<unknown>")
        name = project.get("name")
        group = project.get("group")
        status = project.get("status")
        summary = project.get("summary")
        if not all(isinstance(value, str) and value for value in (name, group, status, summary)):
            failures.append(f"{project_id}: missing name, group, status, or summary")
            continue

        # The embedded P array stores the first five fields in this order.
        # Match the exact tuple so a stale card cannot pass merely because its
        # name happens to appear elsewhere in the page.
        tuple_pattern = (
            rf"\['{js_quote(name)}','{js_quote(group)}','{js_quote(status)}',"
            rf"'{js_quote(summary)}',"
        )
        if not re.search(tuple_pattern, html):
            failures.append(f"{project_id}: embedded project tuple is missing or stale")

        repo = project.get("repo")
        if not repo:
            continue
        expected_url = f"https://github.com/{repo}"
        if project.get("path") != expected_url:
            failures.append(
                f"{project_id}: registry path must equal {expected_url}"
            )
        if expected_url not in html:
            failures.append(
                f"{project_id}: {expected_url} is missing from index.html"
            )

    if failures:
        print("UI registry validation failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"UI registry valid: {len(projects)} project records checked; "
          f"{sum(1 for p in projects if p.get('repo'))} repository links checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
