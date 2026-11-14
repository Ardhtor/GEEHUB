#!/usr/bin/env python3
"""Regression tests for the single-source browser project registry."""
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
        "path": "../docs/demo/README.md",
        "repo": "example/demo",
        "summary": "A test project.",
        "tags": ["demo"],
    }
]

VALID_HTML = """<script>
async function loadProjects(){
  const response=await fetch('./projects.json');
  const records=await response.json();
  P=records.map(p=>({...p}));
  buildEco();render();renderAtlas();jam();
}
</script>"""


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
        raise AssertionError("single-source registry should pass")

    missing_loader = run_validator(VALID_PROJECTS, "<script>const P=[]</script>")
    if missing_loader.returncode == 0 or "must fetch ./projects.json" not in missing_loader.stdout:
        print(missing_loader.stdout + missing_loader.stderr)
        raise AssertionError("missing runtime registry loader should fail")

    pathless_entry = run_validator(
        [{**VALID_PROJECTS[0], "path": None, "repo": None}],
        VALID_HTML,
    )
    if pathless_entry.returncode != 0:
        print(pathless_entry.stdout + pathless_entry.stderr)
        raise AssertionError("an explicitly pathless registry entry should pass")

    local_entry_with_repo_fallback = run_validator(
        [{**VALID_PROJECTS[0], "path": "../hub/memory-bridge.html"}],
        VALID_HTML,
    )
    if local_entry_with_repo_fallback.returncode != 0:
        print(local_entry_with_repo_fallback.stdout + local_entry_with_repo_fallback.stderr)
        raise AssertionError("a local project path and separate repository fallback should pass")

    blank_path = run_validator(
        [{**VALID_PROJECTS[0], "path": "  "}],
        VALID_HTML,
    )
    if blank_path.returncode == 0 or "path must be a non-empty string or null" not in blank_path.stdout:
        print(blank_path.stdout + blank_path.stderr)
        raise AssertionError("a blank path should fail")

    invalid_repo = run_validator(
        [{**VALID_PROJECTS[0], "repo": "not a repository"}],
        VALID_HTML,
    )
    if invalid_repo.returncode == 0 or "repo must be an owner/name selector" not in invalid_repo.stdout:
        print(invalid_repo.stdout + invalid_repo.stderr)
        raise AssertionError("an invalid repository selector should fail")

    print("UI single-source registry regression tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
