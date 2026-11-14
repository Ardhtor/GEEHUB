#!/usr/bin/env python3
"""Validate the browser atlas against its single machine-readable registry."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_RE = re.compile(r"^[^/\s]+/[^/\s]+$")


def load_projects(path: Path) -> list[dict]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, str):
        raw = json.loads(raw)
    if not isinstance(raw, list):
        raise ValueError("projects registry must contain an array")
    return raw


def main() -> int:
    root = Path(__file__).resolve().parent
    projects_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "projects.json"
    index_path = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "index.html"
    projects = load_projects(projects_path)
    html = index_path.read_text(encoding="utf-8")
    failures: list[str] = []

    # The browser must load the registry at runtime; no second project tuple
    # array is permitted in the page.
    if "fetch('./projects.json'" not in html:
        failures.append("hub/index.html must fetch ./projects.json at runtime")
    if "P=records.map" not in html or "buildEco();render();renderAtlas();jam();" not in html:
        failures.append("browser does not normalize and render the loaded registry")
    if "const P=[" in html:
        failures.append("embedded project registry remains in hub/index.html")

    seen: set[str] = set()
    for index, project in enumerate(projects):
        if not isinstance(project, dict):
            failures.append(f"entry {index} is not an object")
            continue
        project_id = project.get("id")
        if not isinstance(project_id, str) or not project_id.strip():
            failures.append(f"entry {index} has no stable id")
        elif project_id in seen:
            failures.append(f"duplicate project id: {project_id}")
        else:
            seen.add(project_id)

        for field in ("name", "group", "status", "summary"):
            value = project.get(field)
            if not isinstance(value, str) or not value.strip():
                failures.append(f"{project_id or index}: missing or invalid {field}")

        project_path = project.get("path")
        if project_path is not None and (not isinstance(project_path, str) or not project_path.strip()):
            failures.append(f"{project_id or index}: path must be a non-empty string or null")

        tags = project.get("tags")
        if not isinstance(tags, list) or not tags:
            failures.append(f"{project_id or index}: tags must be a non-empty array")

        repo = project.get("repo")
        if repo is not None and (not isinstance(repo, str) or not REPO_RE.fullmatch(repo)):
            failures.append(f"{project_id}: repo must be an owner/name selector")

    if failures:
        print("UI registry validation failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"UI registry valid: {len(projects)} records loaded from one source; "
          f"{sum(1 for p in projects if p.get('repo'))} repository destinations checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
