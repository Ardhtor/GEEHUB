#!/usr/bin/env python3
"""Regression tests for the dependency-free UI registry validator."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


VALID_PROJECTS = [
    {
        "id": "demo",
        "name": "Demo Project",
        "group": "tool",
        "status": "active",
        "path": "https://github.com/example/demo",
        "repo": "example/demo",
    }
]

VALID_HTML = "<script>const P=[['Demo Project','tool','active','summary',['demo'],'https://github.com/example/demo']]</script>"


def run_validator(projects: list[dict], html: str) -> subprocess.CompletedProcess[str]:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        projects_path = root / "projects.json"
        html_path = root / "index.html"
        projects_path.write_text(json.dumps(projects), encoding="utf-8")
        html_path.write_text(html, encoding="utf-8")
        return subprocess.run(
            [sys.executable, "hub/validate-ui-registry.py", str(projects_path), str(html_path)],
            capture_output=True,
            text=True,
            check=False,
        )


def main() -> int:
    passed = run_validator(VALID_PROJECTS, VALID_HTML)
    if passed.returncode != 0:
        print(passed.stdout + passed.stderr)
        raise AssertionError("valid registry should pass")

    missing_tuple = run_validator(VALID_PROJECTS, "<script>const P=[]</script>")
    if missing_tuple.returncode == 0 or "embedded project tuple" not in missing_tuple.stdout:
        print(missing_tuple.stdout + missing_tuple.stderr)
        raise AssertionError("missing embedded tuple should fail")

    wrong_repo_url = run_validator(
        [{**VALID_PROJECTS[0], "path": "https://github.com/example/other"}],
        VALID_HTML,
    )
    if wrong_repo_url.returncode == 0 or "registry path must equal" not in wrong_repo_url.stdout:
        print(wrong_repo_url.stdout + wrong_repo_url.stderr)
        raise AssertionError("wrong repository path should fail")

    print("UI registry validator regression tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
