#!/usr/bin/env python3
"""Deterministic validation for Tractus v2 events, threads, and Innervation cues.

This module is dependency-free. Legacy activity records remain valid; strict
requirements apply only when an event explicitly claims to update canon.
"""
from __future__ import annotations

from typing import Any

INTERVAL_LADDER = (1, 3, 7, 21)
ALLOWED_RESPONSES = {"pause", "step", "turn", "breath", "reach", "stillness"}
ALLOWED_PHASES = {"on_beat", "off_beat", "break", "silence"}


def validate_event(event: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if event.get("type") != "canon_update":
        return errors
    prediction = event.get("prediction") or {}
    observation = event.get("observation") or {}
    prediction_error = event.get("prediction_error") or {}
    change = event.get("change") or {}
    if not prediction.get("expected"):
        errors.append("canon_update missing prediction.expected")
    if not observation.get("happened"):
        errors.append("canon_update missing observation.happened")
    if prediction_error.get("present") is not True:
        errors.append("canon_update requires prediction_error.present=true")
    if prediction_error.get("type") not in {"who", "where", "when", "why", "how"}:
        errors.append("canon_update prediction_error.type is invalid")
    if prediction_error.get("severity") not in {"low", "medium", "high"}:
        errors.append("canon_update prediction_error.severity is invalid")
    if not event.get("prior_version_id"):
        errors.append("canon_update requires prior_version_id")
    if not change.get("canon_version_id"):
        errors.append("canon_update missing change.canon_version_id")
    if not change.get("what_changed"):
        errors.append("canon_update missing change.what_changed")
    if not change.get("what_remains"):
        errors.append("canon_update missing change.what_remains")
    provenance = event.get("provenance") or {}
    if not provenance.get("author"):
        errors.append("canon_update missing provenance.author")
    return errors


def validate_cue(cue: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    bpm = cue.get("bpm")
    if not isinstance(bpm, (int, float)) or isinstance(bpm, bool) or not 30 <= bpm <= 300:
        errors.append("cue bpm must be between 30 and 300")
    if cue.get("phase") not in ALLOWED_PHASES:
        errors.append("cue phase must be on_beat, off_beat, break, or silence")
    if cue.get("target_response") not in ALLOWED_RESPONSES:
        errors.append("cue target_response is not an allowed action")
    if not isinstance(cue.get("duration_beats"), (int, float)) or cue.get("duration_beats", 0) <= 0:
        errors.append("cue duration_beats must be positive")
    state = cue.get("state_change") or {}
    changed = False
    for before_key, after_key in (
        ("tempo_before", "tempo_after"),
        ("routes_before", "routes_after"),
        ("presence_before", "presence_after"),
        ("scale_before", "scale_after"),
    ):
        if before_key in state and after_key in state and state[before_key] != state[after_key]:
            changed = True
    if not changed:
        errors.append("cue state_change must alter tempo, routes, presence, or scale")
    if cue.get("phase") == "break":
        tempo_changed = state.get("tempo_before") != state.get("tempo_after")
        silence_beats = cue.get("silence_beats", 0)
        if not tempo_changed and not (isinstance(silence_beats, (int, float)) and silence_beats >= 2):
            errors.append("break cue requires a tempo change or at least 2 beats of silence")
    return errors


def validate_thread(thread: dict[str, Any], ladder: tuple[int, ...] = INTERVAL_LADDER) -> list[str]:
    errors: list[str] = []
    if thread.get("status", "open") not in {"open", "waiting", "closed"}:
        errors.append("thread status must be open, waiting, or closed")
    if int(thread.get("interval_days", -1)) not in ladder:
        errors.append(f"thread interval_days must be one of {list(ladder)}")
    if thread.get("interval_ladder", list(ladder)) != list(ladder):
        errors.append(f"thread interval_ladder must equal {list(ladder)}")
    attempts = int(thread.get("retrieval_attempts", 0))
    failures = int(thread.get("retrieval_failures", 0))
    if attempts < 0 or failures < 0 or failures > attempts:
        errors.append("thread retrieval counters are inconsistent")
    if failures >= 2 and thread.get("needs_repair") is not True:
        errors.append("thread with two failed retrievals must be flagged needs_repair")
    return errors


def validate_writer_output(output: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    additions = output.get("canon_additions", [])
    if additions and not isinstance(output.get("retrieval"), dict):
        errors.append("canon addition requires a retrieval block")
    if isinstance(additions, list) and len(additions) > 1:
        errors.append("writer output may contain at most one canon addition per cycle")
    for job in output.get("jobs", []):
        if job.get("status") == "QUEUED" and job.get("claimed_completed") is True:
            errors.append("queued media job cannot be claimed as completed")
    return errors


def validate_version_records(records: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    seen: dict[str, dict[str, Any]] = {}
    for index, record in enumerate(records, 1):
        version_id = record.get("canon_version_id")
        # The current writer's detailed revision records are retained as a
        # compatible legacy record shape until their migration is explicit.
        if version_id is None:
            continue
        if version_id in seen:
            errors.append(f"duplicate canon_version_id at record {index}: {version_id}")
        seen[version_id] = record
    for index, record in enumerate(records, 1):
        version_id = record.get("canon_version_id")
        if version_id is None:
            continue
        prior = record.get("prior_version_id")
        if prior and prior not in seen:
            errors.append(f"record {index} references unknown prior_version_id: {prior}")
        if record.get("status") not in {"canon", "experiment", "superseded"}:
            errors.append(f"record {index} has invalid canon version status")
        if record.get("status") == "superseded" and not record.get("superseded_by"):
            errors.append(f"superseded version {version_id} is missing superseded_by")
        if record.get("status") == "canon" and record.get("baseline") is True and not record.get("promotion_event_id"):
            errors.append(f"baseline experiment {version_id} requires an explicit promotion_event_id")
        if not record.get("entity") or not record.get("created_by_event_id"):
            errors.append(f"version {version_id} is missing entity or created_by_event_id")
        prior = record.get("prior_version_id")
        if record.get("status") == "canon" and prior and prior in seen:
            previous = seen[prior]
            if previous.get("status") == "experiment" and not record.get("promotion_event_id"):
                errors.append(f"version {version_id} promotes an experiment without promotion_event_id")
    for version_id, record in seen.items():
        successor = record.get("superseded_by")
        if successor and successor not in seen:
            errors.append(f"version {version_id} points to unknown superseded_by: {successor}")
    return errors
