#!/usr/bin/env python3
"""Shared event inscription: occurrence and durable memory are one operation.

Every engine calls inscribe_event with the event it has just enacted. The
append-only activity stream is the canonical event history; artifacts, logs,
and engine-specific state files are projections of that same event identity.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACTIVITY_LOG = ROOT / "engine" / "activity.jsonl"
ARTIFACT_DIR = ROOT / "artifacts" / "activity-events"
ARTIFACT_INDEX = ROOT / "artifacts" / "index.json"
OUTBOX = ROOT / "dropbox_outbox"


def _read_json(path: Path, fallback: dict) -> dict:
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def inscribe_event(event: dict, source: str) -> dict:
    """Persist an occurred event once, returning its canonical inscription."""
    if not isinstance(event, dict) or not source:
        raise ValueError("An event object and source are required")

    event_id = event.get("id")
    if not event_id:
        pulse = event.get("pulse")
        cycle = event.get("cycle")
        if pulse is not None:
            event_id = f"world-pulse-{int(pulse):06d}"
        elif cycle is not None:
            event_id = f"northgate-campus-{int(cycle):05d}"
        else:
            raise ValueError("Event requires a stable id, pulse, or cycle")

    if not isinstance(event_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,159}", event_id):
        raise ValueError("Event id must be a safe 1-160 character identifier")

    occurred_at = event.get("at") or event.get("time") or event.get("created_at")
    if not occurred_at:
        raise ValueError("Event requires its occurrence timestamp")

    record = dict(event)
    record.update({
        "id": event_id,
        "occurred_at": occurred_at,
        "inscription": "same-event",
        "inscription_source": source,
        "status": "OCCURRED_AND_INSCRIBED",
    })

    ACTIVITY_LOG.parent.mkdir(parents=True, exist_ok=True)
    existing_ids = set()
    if ACTIVITY_LOG.exists():
        with ACTIVITY_LOG.open("r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    existing_ids.add(json.loads(line).get("id"))
                except json.JSONDecodeError:
                    continue

    if event_id not in existing_ids:
        with ACTIVITY_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")

    artifact = {
        "id": f"activity-{event_id}",
        "created_at": occurred_at,
        "source": source,
        "kind": record.get("artifact_kind") or "activity-event",
        "title": record.get("title") or record.get("world") or record.get("region") or event_id,
        "content": record.get("description") or record.get("action") or record.get("text") or record.get("body") or record.get("utterance") or "",
        "lineage": {"event_id": event_id, "event": record},
        "canon": "unclassified",
        "dreamable": True,
        "next_action": "continue from this event's changed world state",
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    artifact_path = ARTIFACT_DIR / f"{event_id}.json"
    if not artifact_path.exists():
        _write_json(artifact_path, artifact)

    ledger = _read_json(ARTIFACT_INDEX, {
        "version": 2,
        "description": "Durable artifact ledger for The Tractus.",
        "artifacts": [],
    })
    artifacts = ledger.setdefault("artifacts", [])
    if not any(item.get("id") == artifact["id"] for item in artifacts):
        artifacts.append(artifact)
        ledger["artifacts"] = artifacts[-5000:]
        _write_json(ARTIFACT_INDEX, ledger)

    OUTBOX.mkdir(parents=True, exist_ok=True)
    _write_json(OUTBOX / f"{event_id}.json", artifact)
    return record


def main() -> int:
    """Read one event from stdin and inscribe it through the canonical path."""
    source = sys.argv[1] if len(sys.argv) > 1 else "hub-api"
    try:
        event = json.load(sys.stdin)
        record = inscribe_event(event, source=source)
        print(json.dumps({"ok": True, "event": record}, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
