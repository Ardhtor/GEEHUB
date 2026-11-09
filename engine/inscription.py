#!/usr/bin/env python3
"""Shared event inscription: occurrence and durable memory are one operation.

Every engine calls inscribe_event with the event it has just enacted. The
append-only activity stream is the canonical event history; artifacts, logs,
and engine-specific state files are projections of that same event identity.
"""
from __future__ import annotations

import fcntl
import json
import os
import re
import sys
import tempfile
from contextlib import contextmanager
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
    """Replace a JSON projection atomically so interrupted writes leave no partial file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        try:
            directory_fd = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        except OSError:
            pass
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


@contextmanager
def _activity_lock():
    """Serialize inscription projections across processes and concurrent autosaves."""
    ACTIVITY_LOG.parent.mkdir(parents=True, exist_ok=True)
    lock_path = ACTIVITY_LOG.with_name(ACTIVITY_LOG.name + ".lock")
    with lock_path.open("a+", encoding="utf-8") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def _ensure_json(path: Path, value: dict) -> None:
    if path.is_file():
        try:
            if _read_json(path, {}) == value:
                return
        except (OSError, json.JSONDecodeError):
            pass
    _write_json(path, value)



def validate_event(event: dict) -> list[str]:
    """Validate the additive Tractus v2 canon-update contract."""
    try:
        from .tractus_science import validate_event as validate_v2_event
    except ImportError:
        from tractus_science import validate_event as validate_v2_event
    return validate_v2_event(event)


def inscribe(event: dict, source: str) -> dict:
    """Validate and inscribe a v2 event; downgrade invalid canon updates safely."""
    if not isinstance(event, dict):
        raise ValueError("An event object is required")
    candidate = dict(event)
    errors = validate_event(candidate)
    if errors:
        candidate["type"] = "observation"
        candidate["downgraded_from"] = "canon_update"
        candidate["downgrade_reasons"] = errors
    candidate["id"] = candidate.get("event_id") or candidate.get("id")
    candidate["at"] = candidate.get("timestamp") or candidate.get("at")
    return inscribe_event(candidate, source=source)

def _inscribe_event_locked(event: dict, source: str) -> dict:
    """Persist an occurred event once while the activity lock is held."""
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

    existing_records = {}
    if ACTIVITY_LOG.exists():
        with ACTIVITY_LOG.open("r", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, 1):
                if not line.strip():
                    continue
                try:
                    previous = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Corrupt activity log at line {line_number}: {exc}") from exc
                if isinstance(previous, dict) and previous.get("id"):
                    existing_records[previous["id"]] = previous

    if event_id in existing_records:
        if existing_records[event_id] != record:
            raise ValueError(f"Event ID conflict: {event_id} already exists with different content")
        record = existing_records[event_id]
    else:
        with ACTIVITY_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            handle.flush()
            os.fsync(handle.fileno())

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
    _ensure_json(artifact_path, artifact)

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
    _ensure_json(OUTBOX / f"{event_id}.json", artifact)
    return record


def inscribe_event(event: dict, source: str) -> dict:
    """Lock the append-only event stream and all of its derived projections."""
    with _activity_lock():
        return _inscribe_event_locked(event, source)


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
