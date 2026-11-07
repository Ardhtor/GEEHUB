#!/usr/bin/env python3
"""One-time/idempotent backfill of retained world and campus history."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / "engine" / "activity.jsonl"


def read(relative):
    path = ROOT / relative
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def main():
    records = {}
    if LOG.exists():
        for line in LOG.read_text(encoding="utf-8").splitlines():
            try:
                item = json.loads(line)
                if item.get("id"):
                    records[item["id"]] = item
            except json.JSONDecodeError:
                continue

    world = read("engine/state.json")
    for event in world.get("events", []):
        pulse = event.get("pulse")
        if pulse is None:
            continue
        event_id = f"world-pulse-{int(pulse):06d}"
        record = dict(event)
        record.update({
            "id": event_id,
            "occurred_at": event.get("time"),
            "inscription": "historical-backfill",
            "inscription_source": "engine/state.json",
            "status": "OCCURRED_AND_INSCRIBED",
        })
        records.setdefault(event_id, record)

    campus = read("engine/campus-life.json")
    campus_events = list(campus.get("events", []))
    last = campus.get("last_event")
    if last and not any(item.get("id") == last.get("id") for item in campus_events):
        campus_events.append(last)
    for event in campus_events:
        event_id = event.get("id")
        if not event_id:
            continue
        record = dict(event)
        record.update({
            "occurred_at": event.get("at"),
            "inscription": "historical-backfill",
            "inscription_source": "engine/campus-life.json",
            "status": "OCCURRED_AND_INSCRIBED",
        })
        records.setdefault(event_id, record)

    ordered = sorted(
        records.values(),
        key=lambda item: (item.get("occurred_at") or item.get("time") or item.get("at") or "", item.get("id", "")),
    )
    LOG.parent.mkdir(parents=True, exist_ok=True)
    LOG.write_text(
        "".join(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n" for item in ordered),
        encoding="utf-8",
    )
    print(f"ACTIVITY / INSCRIPTION PASS | events={len(ordered)} | one chronological stream")


if __name__ == "__main__":
    main()
