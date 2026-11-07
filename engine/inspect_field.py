#!/usr/bin/env python3
"""Inspect GEEHUB's registered interlocutive field without overstating access.

This is a local registry validator, not a network crawler. Remote observations
remain evidence records from the last real contact; this script never turns
them into claims of current connectivity.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "engine" / "interlocutive-field.json"
VALID_STATES = {
    "verified_now",
    "connected_tool",
    "permission_required",
    "not_implemented",
    "imagined",
}


def load_registry() -> dict:
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    if data.get("id") != "geehub-interlocutive-field":
        raise ValueError("unexpected field registry identity")
    if not isinstance(data.get("participants"), list):
        raise ValueError("participants must be a list")
    seen = set()
    for item in data["participants"]:
        identity = item.get("id")
        if not identity or identity in seen:
            raise ValueError(f"missing or duplicate participant id: {identity}")
        seen.add(identity)
        if item.get("status") not in VALID_STATES:
            raise ValueError(f"invalid capability status for {identity}")
        if not isinstance(item.get("affordances"), list):
            raise ValueError(f"affordances must be a list for {identity}")
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit the validated registry")
    args = parser.parse_args()
    data = load_registry()
    counts = {state: 0 for state in sorted(VALID_STATES)}
    for item in data["participants"]:
        counts[item["status"]] += 1
    if args.json:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"FIELD PASS | {data['id']} | participants={len(data['participants'])}")
        for item in data["participants"]:
            print(f"{item['status'].upper():20} | {item['id']} | {item['name']}")
        print("CAPABILITY COUNTS | " + " | ".join(f"{key}={value}" for key, value in counts.items()))
        print("NOTE | registry validation does not re-check remote services; contact observations retain their own provenance.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
