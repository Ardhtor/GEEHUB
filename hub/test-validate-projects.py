#!/usr/bin/env python3
"""Regression tests for the constellation registry's local-path contract."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


VALID = {
    "id": "demo",
    "name": "Demo Project",
    "group": "tool",
    "status": "active",
    "summary": "A test project.",
    "path": "../docs/demo/README.md",
    "tags": ["demo"],
}


def run_validator(projects: list[dict]) -> subprocess.CompletedProcess[str]:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "projects.json"
        path.write_text(json.dumps(projects), encoding="utf-8")
        return subprocess.run(
            [sys.executable, "hub/validate-projects.py", str(path)],
            capture_output=True,
            text=True,
            check=False,
        )


def expect_pass(projects: list[dict], message: str) -> None:
    result = run_validator(projects)
    if result.returncode != 0:
        raise AssertionError(message + ": " + result.stdout + result.stderr)


def expect_fail(projects: list[dict], expected: str, message: str) -> None:
    result = run_validator(projects)
    if result.returncode == 0 or expected not in result.stderr:
        raise AssertionError(message + ": " + result.stdout + result.stderr)


def main() -> int:
    expect_pass([VALID], "a local project entry should pass")
    expect_pass([{**VALID, "path": None}], "an intentionally unlinked project should pass")
    expect_pass(
        [{**VALID, "path": "../hub/memory-bridge.html", "repo": "Ardhtor/GEEHUB"}],
        "a local project entry with a repository fallback should pass",
    )
    expect_fail([{**VALID, "path": " "}], "invalid path", "a blank path should fail")
    expect_fail([{**VALID, "repo": "not a repository"}], "invalid repo selector", "an invalid repository selector should fail")
    print("Constellation registry path regression tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
