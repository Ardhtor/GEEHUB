#!/usr/bin/env python3
"""Small deterministic helpers for Tractus adaptive memory."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(value: datetime | None = None) -> str:
    return (value or utc_now()).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


INTERVAL_LADDER = (1, 3, 7, 21)


def due_threads(schedule: dict[str, Any], now: datetime | None = None) -> list[dict[str, Any]]:
    current = now or utc_now()
    due = []
    for thread in schedule.get("threads", []):
        if thread.get("status", "open") != "open":
            continue
        due_at = thread.get("next_due_at")
        if due_at and parse_time(due_at) <= current:
            due.append(thread)
    return sorted(due, key=lambda item: (item["next_due_at"], int(item.get("retrieval_successes", item.get("successful_recalls", 0)))))


def pick_next(schedule: dict[str, Any], now: datetime | None = None, limit: int = 1) -> list[dict[str, Any]]:
    if limit < 1:
        raise ValueError("limit must be at least 1")
    return due_threads(schedule, now)[:limit]


def next_interval(current_days: int, recall_score: float, intervals: tuple[int, ...] = INTERVAL_LADDER) -> int:
    if not 0.0 <= recall_score <= 1.0:
        raise ValueError("recall_score must be between 0 and 1")
    if current_days not in intervals:
        current_days = intervals[0]
    index = intervals.index(current_days)
    if recall_score < 0.5:
        return current_days
    return intervals[min(index + 1, len(intervals) - 1)]


def advance_thread(
    thread: dict[str, Any],
    retrieved_at: datetime,
    recall_score: float,
    intervals: tuple[int, ...] = INTERVAL_LADDER,
) -> dict[str, Any]:
    if not 0.0 <= recall_score <= 1.0:
        raise ValueError("recall_score must be between 0 and 1")
    result = dict(thread)
    attempts = int(thread.get("retrieval_attempts", 0)) + 1
    failures = int(thread.get("retrieval_failures", 0)) + (1 if recall_score < 0.5 else 0)
    current = int(thread.get("interval_days", 1))
    if recall_score >= 0.5:
        interval = next_interval(current, recall_score, intervals)
        failures = 0
    elif failures >= 2:
        interval = intervals[0]
        result["needs_repair"] = True
    else:
        interval = current if current in intervals else intervals[0]
    result.update({
        "last_retrieved_at": iso_utc(retrieved_at),
        "next_due_at": iso_utc(retrieved_at + timedelta(days=interval)),
        "interval_days": interval,
        "retrieval_attempts": attempts,
        "retrieval_failures": failures,
        "successful_recalls": int(thread.get("successful_recalls", 0)) + (1 if recall_score >= 0.5 else 0),
        "retrieval_successes": int(thread.get("retrieval_successes", thread.get("successful_recalls", 0))) + (1 if recall_score >= 0.5 else 0),
        "last_recall_score": round(recall_score, 3),
        "last_retrieval": {
            "score": round(recall_score, 3),
            "result": "success" if recall_score >= 0.5 else "needs_repair",
        },
    })
    return result


def sha256_text(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    records = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected object at {path}:{line_number}")
            records.append(value)
    return records


def parent_revision(records: list[dict[str, Any]], canon_path: str) -> str | None:
    for record in reversed(records):
        if record.get("canon_path") == canon_path and record.get("status") == "CANON_REVISION":
            return record.get("revision_id")
    return None
