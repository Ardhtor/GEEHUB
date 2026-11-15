#!/usr/bin/env python3
"""Fail-closed integrity checks for changed GEEHUB files.

This validator is intentionally conservative: it checks changed text/JSON files,
protects critical continuity records from deletion, and flags common credential
formats. It does not replace review, secret scanning, branch rules, or backups.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable

PROTECTED_PATHS = {
    "README.md",
    "docs/TRACTUS_CONTINUITY_CONTRACT.md",
    "docs/TRACTUS_ADAPTIVE_MEMORY_SPEC.md",
    "docs/TRACTUS_PROTECTION_ARCHITECTURE.md",
    "engine/activity.jsonl",
    "engine/canon_versions.jsonl",
    "artifacts/index.json",
    "projects.json",
    "hub/projects.json",
}

SECRET_PATTERNS = (
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)

def changed_paths(base_ref: str, head_ref: str = "HEAD") -> list[tuple[str, str]]:
    """Return (status, path) entries from a three-dot git diff."""
    result = subprocess.run(
        ["git", "diff", "--name-status", "-z", f"{base_ref}...{head_ref}"],
        check=True, capture_output=True, text=True,
    )
    fields = result.stdout.split("\0")
    changes: list[tuple[str, str]] = []
    i = 0
    while i < len(fields) and fields[i]:
        status = fields[i]
        i += 1
        # Rename/copy records contain old and new paths; validate the new path.
        if status.startswith(("R", "C")):
            if i + 1 >= len(fields):
                raise ValueError("Malformed git diff name-status output")
            i += 1
            path = fields[i]
            i += 1
            changes.append((status[0], path))
        else:
            if i >= len(fields):
                raise ValueError("Malformed git diff name-status output")
            path = fields[i]
            i += 1
            changes.append((status[0], path))
    return changes

def validate_changes(changes: Iterable[tuple[str, str]], root: Path) -> list[str]:
    errors: list[str] = []
    root = root.resolve()
    for status, raw_path in changes:
        path_text = raw_path.replace("\\", "/")
        candidate = (root / path_text).resolve()
        try:
            candidate.relative_to(root)
        except ValueError:
            errors.append(f"Path escapes repository root: {raw_path}")
            continue

        if status == "D":
            if path_text in PROTECTED_PATHS:
                errors.append(f"Protected continuity record cannot be deleted: {path_text}")
            continue

        path = root / path_text
        if path.is_symlink():
            errors.append(f"Changed file is a symbolic link; review explicitly: {path_text}")
            continue
        if not path.exists() or not path.is_file():
            errors.append(f"Changed path is missing or not a regular file: {path_text}")
            continue

        try:
            data = path.read_bytes()
        except OSError as exc:
            errors.append(f"Cannot read {path_text}: {exc}")
            continue

        if b"\x00" in data:
            # Binary media are outside this text validator's scope.
            continue

        text = data.decode("utf-8", errors="replace")
        if path.suffix.lower() == ".json":
            try:
                json.loads(text)
            except json.JSONDecodeError as exc:
                errors.append(f"Invalid JSON in {path_text}:{exc.lineno}:{exc.colno}: {exc.msg}")

        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                errors.append(f"Possible credential or private key detected in {path_text}")
                break

    return errors

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-ref", help="Base ref for a three-dot diff; omit to validate explicit paths.")
    parser.add_argument("--head-ref", default="HEAD")
    parser.add_argument("paths", nargs="*", help="Changed paths to validate when no base ref is supplied.")
    args = parser.parse_args(argv)

    root = Path(__file__).resolve().parents[1]
    try:
        if args.base_ref:
            changes = changed_paths(args.base_ref, args.head_ref)
        else:
            changes = [("M", item) for item in args.paths]
        if not changes:
            print("No changed paths to validate.")
            return 0
        errors = validate_changes(changes, root)
    except (OSError, subprocess.CalledProcessError, ValueError) as exc:
        print(f"Protection validation could not complete: {exc}", file=sys.stderr)
        return 2

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Protection validation passed for {len(changes)} changed path(s).")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
