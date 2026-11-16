#!/usr/bin/env python3
"""Validate the Tractus protection register against the repository it describes.

The register is an inventory, not a badge generator: evidence paths must exist,
and higher assurance states require their corresponding evidence references.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
REGISTER = ROOT / "engine" / "protection-register.json"
ALLOWED_STATUSES = {
    "specified", "implemented", "tested", "verified", "deferred", "superseded"
}
EVIDENCE_FIELDS = ("specification", "implementation", "tests", "verification")


def _repository_file(root: Path, value: Any, control_id: str, field: str, errors: list[str]) -> None:
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{control_id}: {field} entries must be non-empty repository paths")
        return
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        errors.append(f"{control_id}: unsafe evidence path: {value}")
        return
    target = (root / path).resolve()
    try:
        target.relative_to(root.resolve())
    except ValueError:
        errors.append(f"{control_id}: evidence path escapes repository: {value}")
        return
    if not target.is_file():
        errors.append(f"{control_id}: missing {field} evidence: {value}")


def validate_register(data: Any, root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["register must be a JSON object"]
    if data.get("schema_version") != 1:
        errors.append("schema_version must equal 1")
    if data.get("register_id") != "tractus-protection-register":
        errors.append("register_id must equal tractus-protection-register")
    if not isinstance(data.get("governing_principle"), str) or not data["governing_principle"].strip():
        errors.append("governing_principle is required")
    controls = data.get("controls")
    if not isinstance(controls, list) or not controls:
        return errors + ["controls must be a non-empty array"]

    seen: set[str] = set()
    for index, control in enumerate(controls):
        prefix = f"control[{index}]"
        if not isinstance(control, dict):
            errors.append(f"{prefix} must be an object")
            continue
        control_id = control.get("id")
        if not isinstance(control_id, str) or not control_id.strip():
            errors.append(f"{prefix} requires a non-empty id")
            control_id = prefix
        elif control_id in seen:
            errors.append(f"duplicate control id: {control_id}")
        seen.add(control_id)

        for field in ("title", "foundation", "scope"):
            if not isinstance(control.get(field), str) or not control[field].strip():
                errors.append(f"{control_id}: {field} is required")

        status = control.get("status")
        if not isinstance(status, str) or status not in ALLOWED_STATUSES:
            errors.append(f"{control_id}: invalid status: {status}")
        for field in EVIDENCE_FIELDS:
            entries = control.get(field, [])
            if not isinstance(entries, list):
                errors.append(f"{control_id}: {field} must be an array")
                continue
            for entry in entries:
                _repository_file(root, entry, control_id, field, errors)

        if status in {"specified", "deferred"} and not control.get("specification"):
            errors.append(f"{control_id}: {status} requires specification evidence")
        if isinstance(status, str) and status in {"implemented", "tested", "verified"} and not control.get("implementation"):
            errors.append(f"{control_id}: {status} requires implementation evidence")
        if isinstance(status, str) and status in {"tested", "verified"} and not control.get("tests"):
            errors.append(f"{control_id}: {status} requires test evidence")
        if status == "verified" and not control.get("verification"):
            errors.append(f"{control_id}: verified requires verification evidence")
        if status == "superseded" and not control.get("superseded_by"):
            errors.append(f"{control_id}: superseded requires superseded_by")
        limitations = control.get("limitations", [])
        if not isinstance(limitations, list) or any(not isinstance(item, str) for item in limitations):
            errors.append(f"{control_id}: limitations must be an array of strings")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--register", default=str(REGISTER), help="Register JSON path")
    args = parser.parse_args(argv)
    register_path = Path(args.register)
    if not register_path.is_absolute():
        register_path = ROOT / register_path
    try:
        data = json.loads(register_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Protection register could not be read: {exc}", file=sys.stderr)
        return 2

    errors = validate_register(data, ROOT)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    counts = Counter(item["status"] for item in data["controls"])
    summary = " | ".join(f"{status}={counts.get(status, 0)}" for status in sorted(ALLOWED_STATUSES))
    print(f"TRACTUS PROTECTION REGISTER PASS | controls={len(data['controls'])} | {summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
