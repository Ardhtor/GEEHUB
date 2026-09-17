#!/usr/bin/env python3
"""Small dependency-free regression checks for the portable jam validator.

The browser and command-line validator intentionally share the same boundary:
portable records need usable title/brief text, an ISO-8601 createdAt value, and
non-empty project-id lineage. These checks keep that contract executable without
introducing a test framework or package install.
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

    cases = [
        (dict(VALID[0], brief=""), "empty brief"),
        (dict(VALID[0], **{"from": "not-a-list"}), "non-list from"),
        (dict(VALID[0], createdAt="yesterday"), "invalid timestamp"),
        (dict(VALID[0], **{"from": ["  "]}), "blank lineage id"),
    ]
    for payload, label in cases:
        rejected = run([payload])
        assert rejected.returncode != 0, f"validator accepted {label}"

    print("portable jam validator checks passed")


if __name__ == "__main__":
    main()
