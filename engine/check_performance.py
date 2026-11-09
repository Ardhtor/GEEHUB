#!/usr/bin/env python3
"""Fail-fast health checks for GEEHUB's persistent production cycles.

This checks durable outputs, not just process exit codes. QUEUED media jobs are
reported as queued and are never mistaken for completed renders.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(relative: str):
    path = ROOT / relative
    if not path.is_file():
        raise RuntimeError(f"missing required file: {relative}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"invalid JSON in {relative}: {exc}") from exc


def require(condition: bool, message: str):
    if not condition:
        raise RuntimeError(message)


def check_world():
    world = load("world.json")
    state = load("engine/state.json")
    ledger = load("artifacts/index.json")
    require(bool(world.get("regions")), "world.json has no regions")
    require(bool(state.get("events")), "world state has no events")

    activity_path = ROOT / "engine" / "activity.jsonl"
    require(activity_path.is_file(), "canonical activity stream missing")
    activity_records = [json.loads(line) for line in activity_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    activity_ids = {item.get("id") for item in activity_records}

    event = state["events"][-1]
    pulse = int(state.get("pulse", 0))
    require(pulse > 0 and int(event.get("pulse", -1)) == pulse,
            "world pulse and latest event do not agree")
    require(f"world-pulse-{pulse:06d}" in activity_ids,
            "latest world occurrence is not inscribed in the canonical activity stream")
    region_ids = {item.get("id") for item in world["regions"]}
    require(event.get("region_id") in region_ids,
            f"latest event points to unknown region: {event.get('region_id')}")
    source = event.get("source")
    require(bool(source) and (ROOT / source).is_file(),
            f"latest event source is missing: {source}")

    artifact_id = f"world-production-{pulse:06d}"
    artifact_path = ROOT / "artifacts" / "world-events" / f"{artifact_id}.json"
    require(artifact_path.is_file(), f"missing event artifact: {artifact_id}")
    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    require(artifact.get("id") == artifact_id, "event artifact ID mismatch")
    ledger_ids = {item.get("id") for item in ledger.get("artifacts", [])}
    require(artifact_id in ledger_ids, "latest event artifact is absent from ledger")
    require((ROOT / "lore/AUTONOMOUS_STREAM.md").is_file(), "autonomous stream missing")
    require((ROOT / "novel/WORLDS.md").is_file(), "world manuscript missing")
    require((ROOT / "dropbox_outbox" / f"{artifact_id}.json").is_file(),
            "latest artifact is not staged in the Dropbox outbox")

    campus = load("engine/campus-life.json")
    campus_event = campus.get("last_event") or {}
    require(int(campus.get("cycle", 0)) > 0, "campus life has not advanced")
    require(campus_event.get("status") in ("OCCURRED", "OCCURRED_AND_INSCRIBED"), "latest campus event was not performed")
    require(campus_event.get("id") in activity_ids,
            "latest campus occurrence is not inscribed in the canonical activity stream")
    require((ROOT / "worlds/northgate-university/CAMPUS_LIFE.md").is_file(),
            "campus life manuscript missing")
    require(campus_event.get("region") in region_ids,
            "campus event points to an unknown region")
    require(bool(campus_event.get("participants")),
            "campus event has no participants")
    print(f"CAMPUS PASS | cycle={campus['cycle']} | event={campus_event.get('title')} | participants={len(campus_event['participants'])}")
    print(f"WORLD PASS | pulse={pulse} | region={event['region_id']} | phase={event.get('phase')}")
    print(f"ARTIFACT PASS | {artifact_id} | source={source} | ledger=present | outbox=present")


def check_long_play():
    state = load("hub/long-play-state.json")
    image_jobs = load("hub/image-jobs.json")
    render_jobs = load("hub/render-jobs.json")
    exchange = load("hub/exchange.json")

    cycle = int(state.get("cycle", 0))
    require(cycle > 0, "long-play cycle has not advanced")
    history = state.get("history") or []
    require(bool(history) and int(history[0].get("cycle", -1)) == cycle,
            "long-play history does not contain the current cycle")
    latest = history[0]
    recording_id = latest.get("recording")
    require(bool(recording_id), "latest long-play cycle has no recording ID")
    recording_path = ROOT / "hub" / "recordings" / f"{recording_id}.json"
    require(recording_path.is_file(), f"missing recording: {recording_id}")
    recording = json.loads(recording_path.read_text(encoding="utf-8"))
    require(recording.get("lineage", {}).get("cycle") == cycle,
            "recording lineage does not match current cycle")

    image = next((job for job in image_jobs.get("jobs", [])
                  if job.get("id") == f"scheduled-image-{cycle:05d}"), None)
    require(image is not None, "current cycle has no image job")
    renders = [job for job in render_jobs.get("jobs", [])
               if job.get("id", "").endswith(f"-{cycle:05d}")]
    require(len(renders) == 3, "current cycle does not have SPACE, VIDEO and SOUND jobs")
    activity_path = ROOT / "engine" / "activity.jsonl"
    require(activity_path.is_file(), "canonical activity stream missing for Long Play")
    activity_records = [json.loads(line) for line in activity_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    occurrence_id = f"scheduled-long-play-{cycle:05d}"
    require(any(item.get("id") == occurrence_id for item in activity_records),
            "canonical Long Play occurrence is not inscribed")
    event_artifact_id = f"activity-{occurrence_id}"
    event_artifact = ROOT / "artifacts" / "activity-events" / f"{occurrence_id}.json"
    require(event_artifact.is_file(), f"missing canonical Long Play artifact: {event_artifact_id}")
    artifact_ledger = load("artifacts/index.json")
    ledger_ids = {item.get("id") for item in artifact_ledger.get("artifacts", [])}
    require(event_artifact_id in ledger_ids, "Long Play event artifact is absent from ledger")
    require((ROOT / "dropbox_outbox" / f"{occurrence_id}.json").is_file(),
            "Long Play event is not staged in the Dropbox outbox")

    exchange_event = next((item for item in exchange.get("events", [])
                           if item.get("id") == f"scheduled-long-play-{cycle:05d}"), None)
    require(exchange_event is not None, "current cycle is absent from shared exchange")

    queued = sum(1 for job in [image, *renders] if job.get("status") == "QUEUED")
    completed = sum(1 for job in [image, *renders] if job.get("status") == "COMPLETED")
    print(f"LONG PLAY PASS | cycle={cycle} | recording={recording_id} | exchange=present | inscription=present")
    print(f"MEDIA PIPELINE | queued={queued} | completed={completed} | total={1 + len(renders)}")
    if queued:
        print("MEDIA NOTE | queued jobs are requests, not rendered media; a worker must complete them.")



def load_jsonl(relative: str):
    path = ROOT / relative
    if not path.exists():
        return []
    records = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"invalid JSONL in {relative}:{line_number}: {exc}") from exc
        require(isinstance(value, dict), f"{relative}:{line_number} must contain a JSON object")
        records.append(value)
    return records


def check_tractus_science():
    try:
        from tractus_science import (
            INTERVAL_LADDER, validate_cue, validate_event,
            validate_thread, validate_version_records,
        )
    except ImportError:
        from engine.tractus_science import (
            INTERVAL_LADDER, validate_cue, validate_event,
            validate_thread, validate_version_records,
        )

    schedule = load("engine/retrieval_schedule.json")
    require(tuple(schedule.get("intervals_days", [])) == INTERVAL_LADDER,
            f"retrieval ladder must be {list(INTERVAL_LADDER)}")
    threads = schedule.get("threads", [])
    require(bool(threads), "retrieval schedule has no threads")
    for thread in threads:
        errors = validate_thread(thread)
        require(not errors, f"thread {thread.get('thread_id')}: {'; '.join(errors)}")

    versions = load_jsonl("engine/canon_versions.jsonl")
    version_errors = validate_version_records(versions)
    require(not version_errors, "; ".join(version_errors))
    version_ids = {item.get("canon_version_id") for item in versions if item.get("canon_version_id")}

    activity = load_jsonl("engine/activity.jsonl")
    activity_by_id = {item.get("id") or item.get("event_id"): item for item in activity}
    for version in versions:
        created_id = version.get("created_by_event_id")
        require(created_id in activity_by_id,
                f"version {version.get('canon_version_id')} references a missing creation event")
        promotion_id = version.get("promotion_event_id")
        if promotion_id:
            promotion = activity_by_id.get(promotion_id)
            require(promotion is not None and promotion.get("type") == "canon_promotion",
                    f"version {version.get('canon_version_id')} has no matching promotion event")
            require(promotion.get("version_id") == version.get("canon_version_id"),
                    f"promotion event {promotion_id} targets a different version")
            evidence_ids = version.get("evidence_event_ids", [])
            require(bool(evidence_ids) and all(event_id in activity_by_id for event_id in evidence_ids),
                    f"version {version.get('canon_version_id')} has missing promotion evidence")
    canon_events = [item for item in activity if item.get("type") == "canon_update"]
    for event in canon_events:
        errors = validate_event(event)
        require(not errors, f"event {event.get('event_id') or event.get('id')}: {'; '.join(errors)}")
        require(event.get("prior_version_id") in version_ids,
                f"event {event.get('event_id') or event.get('id')} references an unknown prior version")
        require((event.get("change") or {}).get("canon_version_id") in version_ids,
                f"event {event.get('event_id') or event.get('id')} has no matching canon version")

    cues = load_jsonl("engine/innervation_cues.jsonl")
    for cue in cues:
        errors = validate_cue(cue)
        require(not errors, f"cue {cue.get('cue_id')}: {'; '.join(errors)}")

    print(
        f"TRACTUS SCIENCE PASS | threads={len(threads)} | versions={len(versions)} "
        f"| canon_events={len(canon_events)} | innervation_cues={len(cues)}"
    )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("world", "long-play", "tractus-science", "all"))
    args = parser.parse_args()
    try:
        if args.mode in ("world", "all"):
            check_world()
        if args.mode in ("long-play", "all"):
            check_long_play()
        if args.mode in ("tractus-science", "all"):
            check_tractus_science()
    except Exception as exc:
        print(f"GEEHUB PERFORMANCE FAIL | {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
