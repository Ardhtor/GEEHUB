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

    event = state["events"][-1]
    pulse = int(state.get("pulse", 0))
    require(pulse > 0 and int(event.get("pulse", -1)) == pulse,
            "world pulse and latest event do not agree")
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
    require(campus_event.get("status") == "OCCURRED", "latest campus event was not performed")
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
    exchange_event = next((item for item in exchange.get("events", [])
                           if item.get("id") == f"scheduled-long-play-{cycle:05d}"), None)
    require(exchange_event is not None, "current cycle is absent from shared exchange")

    queued = sum(1 for job in [image, *renders] if job.get("status") == "QUEUED")
    completed = sum(1 for job in [image, *renders] if job.get("status") == "COMPLETED")
    print(f"LONG PLAY PASS | cycle={cycle} | recording={recording_id} | exchange=present")
    print(f"MEDIA PIPELINE | queued={queued} | completed={completed} | total={1 + len(renders)}")
    if queued:
        print("MEDIA NOTE | queued jobs are requests, not rendered media; a worker must complete them.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("world", "long-play", "all"))
    args = parser.parse_args()
    try:
        if args.mode in ("world", "all"):
            check_world()
        if args.mode in ("long-play", "all"):
            check_long_play()
    except Exception as exc:
        print(f"GEEHUB PERFORMANCE FAIL | {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
