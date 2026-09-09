#!/usr/bin/env python3
"""Small dependency-free regression checks for the portable jam validator.

The browser and command-line validator intentionally share the same boundary:
portable records need title, brief, createdAt, and from. These checks keep that
contract executable without introducing a test framework or package install.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "validate-jams.py"

VALID = [
    {
        "title": "Example / Test — Tiny Study",
        "brief": "Build a tiny study.",
        "createdAt": "2026-09-09T20:00:00Z",
        "from": ["example", "test"],
    }
]


def run(payload):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
        json.dump(payload, handle)
        path = handle.name
    try:
        return subprocess.run(
            [sys.executable, str(VALIDATOR), path],
            capture_output=True,
            text=True,
            check=False,
        )
    finally:
        Path(path).unlink(missing_ok=True)


def main():
    valid = run(VALID)
    assert valid.returncode == 0, valid.stderr or valid.stdout

    missing_brief = [dict(VALID[0], brief="")]
    rejected = run(missing_brief)
    assert rejected.returncode != 0, "validator accepted an empty brief"

    malformed_from = [dict(VALID[0], **{"from": "not-a-list"})]
    rejected = run(malformed_from)
    assert rejected.returncode != 0, "validator accepted a non-list from field"

    print("portable jam validator checks passed")


if __name__ == "__main__":
    main()
