"""Institute event adapter for the canonical Tractus inscription stream.

This module adds Institute-specific validation while delegating durable writes,
locking, idempotency, artifact creation, and outbox projection to inscription.py.
It deliberately does not create a second event database.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

try:
    from .inscription import inscribe_event
except ImportError:  # direct execution from the repository root
    from inscription import inscribe_event


ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,95}$")
KINDS = {
    "training", "recovery", "meal", "residence", "class", "workshop",
    "maintenance", "social", "visit", "research", "performance",
    "body-development", "campus-change",
}
PLACES = {
    "institute-gymnasium", "institute-locker-room", "institute-dining-hall",
    "institute-residences", "institute-lecture-room", "institute-workshops",
    "institute-library", "institute-courtyard", "institute-gardens",
    "institute-baseball-field", "northgate-university", "dad-convent",
}


def _require_id(value: Any, field: str) -> str:
    if not isinstance(value, str) or not ID_PATTERN.fullmatch(value):
        raise ValueError(f"{field} must be a lowercase stable identifier")
    return value


def _require_timestamp(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("occurred_at must be an ISO-8601 timestamp")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("occurred_at must be an ISO-8601 timestamp") from exc
    return value


def record_institute_event(event: dict[str, Any]) -> dict[str, Any]:
    """Validate and inscribe one Institute occurrence through Tractus."""
    if not isinstance(event, dict):
        raise ValueError("An Institute event object is required")

    event_id = _require_id(event.get("event_id"), "event_id")
    occurred_at = _require_timestamp(event.get("occurred_at"))
    kind = event.get("kind")
    if kind not in KINDS:
        raise ValueError(f"kind must be one of: {', '.join(sorted(KINDS))}")

    place_id = _require_id(event.get("place_id"), "place_id")
    if place_id not in PLACES:
        raise ValueError(f"Unknown Institute/partner place: {place_id}")

    participants = event.get("participants")
    if not isinstance(participants, list) or not participants:
        raise ValueError("participants must be a non-empty list of character IDs")
    clean_participants = [_require_id(item, "participant") for item in participants]
    if len(set(clean_participants)) != len(clean_participants):
        raise ValueError("participants must not contain duplicate IDs")

    description = event.get("description")
    if not isinstance(description, str) or not description.strip():
        raise ValueError("description must be a non-empty first-person-neutral event description")

    payload = event.get("payload", {})
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")

    record = {
        "id": event_id,
        "at": occurred_at,
        "type": "institute_occurrence",
        "artifact_kind": "institute-event",
        "title": str(event.get("title") or kind.replace("-", " ").title()),
        "world": "INSTITUTE OF BECOMING",
        "region": place_id,
        "place_id": place_id,
        "kind": kind,
        "participants": clean_participants,
        "description": description.strip(),
        "payload": payload,
        "canon": event.get("canon", "unclassified"),
        "parent_event_id": event.get("parent_event_id"),
    }
    return inscribe_event(record, source="institute-event-adapter")
