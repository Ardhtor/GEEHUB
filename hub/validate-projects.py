#!/usr/bin/env python3
"""Validate the GEEHUB constellation registry without network access.

The registry is a deliberately small handoff surface between the hub UI and
other repositories. This validator checks the local contract only: it does not
probe URLs, infer missing repositories, or turn an experiment into canon.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_RE = re.compile(r"^[^/\\s]+/[^/\\s]+$")
REQUIRED = {"id", "name", "group", "status", "summary", "path", "tags"}
ALLOWED_STATUS = {"active", "incubating", "dormant"}


def fail(message: str) -> None:
    raise ValueError(message)


def validate(path: Path) -> int:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing registry: {path}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON: {exc}")

    if not isinstance(data, list):
        fail("registry root must be a JSON array")

    seen = set()
    for index, project in enumerate(data):
        if not isinstance(project, dict):
            fail(f"entry {index} must be an object")
        missing = REQUIRED - project.keys()
        if missing:
            fail(f"entry {index} missing fields: {', '.join(sorted(missing))}")

        project_id = project["id"]
        if not isinstance(project_id, str) or not project_id.strip():
            fail(f"entry {index} has an invalid id")
        if project_id in seen:
            fail(f"duplicate id: {project_id}")
        seen.add(project_id)

        for field in ("name", "group", "summary", "path"):
            if not isinstance(project[field], str) or not project[field].strip():
                fail(f"entry {project_id!r} has an invalid {field}")

        if project["status"] not in ALLOWED_STATUS:
            fail(f"entry {project_id!r} has unsupported status: {project['status']!r}")

        tags = project["tags"]
        if not isinstance(tags, list) or not tags or any(not isinstance(tag, str) or not tag.strip() for tag in tags):
            fail(f"entry {project_id!r} must have a non-empty string tag list")

        repo = project.get("repo")
        if repo is not None:
            if not isinstance(repo, str) or not REPO_RE.fullmatch(repo):
                fail(f"entry {project_id!r} has invalid repo selector: {repo!r}")
            expected_path = f"https://github.com/{repo}"
            if project["path"] != expected_path:
                fail(f"entry {project_id!r} repo/path mismatch: {repo!r} vs {project['path']!r}")

    print(f"validated {len(data)} constellation entries")
    return 0


if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "hub/projects.json")
    try:
        raise SystemExit(validate(target))
    except ValueError as exc:
        print(f"validation error: {exc}", file=sys.stderr)
        raise SystemExit(1)
