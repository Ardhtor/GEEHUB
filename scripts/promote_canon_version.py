#!/usr/bin/env python3
"""Explicitly promote a reviewed Tractus experiment to canon.

Every promotion is backed by existing activity event IDs and a new
canon_promotion event. No model or automation can silently promote an experiment.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.inscription import inscribe_event

VERSIONS = ROOT / "engine/canon_versions.jsonl"
ACTIVITY = ROOT / "engine/activity.jsonl"


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    records = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSONL at {path}:{number}: {exc}")
        if not isinstance(item, dict):
            raise SystemExit(f"Expected an object at {path}:{number}")
        records.append(item)
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version_id")
    parser.add_argument("--reviewer", required=True)
    parser.add_argument("--reason", required=True)
    parser.add_argument("--evidence-event-id", action="append", required=True)
    args = parser.parse_args()

    versions = read_jsonl(VERSIONS)
    matches = [item for item in versions if item.get("canon_version_id") == args.version_id]
    if len(matches) != 1:
        raise SystemExit("Version ID must match exactly one ledger record.")
    version = matches[0]
    if version.get("status") != "experiment":
        raise SystemExit("Only an experiment can be promoted.")
    activity = read_jsonl(ACTIVITY)
    event_by_id = {item.get("id") or item.get("event_id"): item for item in activity}
    missing = [event_id for event_id in args.evidence_event_id if event_id not in event_by_id]
    if missing:
        raise SystemExit("Unknown evidence event IDs: " + ", ".join(missing))
    event_id = "tractus-promotion-" + hashlib.sha256(
        (args.version_id + args.reviewer + args.reason + "|".join(args.evidence_event_id)).encode("utf-8")
    ).hexdigest()[:16]
    if event_id in event_by_id:
        raise SystemExit("This promotion event already exists.")
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    inscribe_event({
        "id": event_id,
        "at": now,
        "type": "canon_promotion",
        "title": "Explicit Tractus canon promotion",
        "description": args.reason,
        "version_id": args.version_id,
        "reviewer": args.reviewer,
        "evidence_event_ids": args.evidence_event_id,
        "action": "Promote reviewed experiment to canon.",
    }, source="scripts/promote_canon_version.py")
    version.update({
        "status": "canon",
        "promotion_event_id": event_id,
        "promoted_by": args.reviewer,
        "promotion_reason": args.reason,
        "evidence_event_ids": args.evidence_event_id,
    })
    VERSIONS.write_text(
        "".join(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n" for item in versions),
        encoding="utf-8",
    )
    print(f"Promoted {args.version_id} to canon via {event_id}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
