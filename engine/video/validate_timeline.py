#!/usr/bin/env python3
"""Validate GEEHUB long-form timeline and provenance manifests."""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PROJECT = ROOT / "production/projects/teal-titan-golds-on-5th"


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path}: {exc}") from exc


def _finite_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_timeline(data: dict) -> list[str]:
    errors = []
    if not isinstance(data, dict):
        return ["timeline manifest must be a JSON object"]
    if data.get("schema") != "geehub.video-timeline/1":
        errors.append("timeline schema identifier is not geehub.video-timeline/1")

    timebase = data.get("timebase")
    if not isinstance(timebase, dict):
        timebase = {}
        errors.append("timebase must be an object")
    duration = data.get("duration_seconds")
    fps = timebase.get("fps")
    frames = timebase.get("frame_count")
    if not _finite_number(duration) or duration <= 0:
        errors.append("duration_seconds must be a finite positive number")
        return errors
    if not _finite_number(fps) or fps <= 0:
        errors.append("timebase.fps must be a finite positive number")
    if frames is not None:
        if not isinstance(frames, int) or isinstance(frames, bool) or frames <= 0:
            errors.append("timebase.frame_count must be a positive integer")
        elif _finite_number(fps) and fps > 0 and round(duration * fps) != frames:
            errors.append("frame_count does not match duration_seconds × fps")

    stages = data.get("stages")
    if not isinstance(stages, list) or not stages:
        errors.append("stages must be a non-empty array")
        return errors
    indexed = [(index, stage) for index, stage in enumerate(stages) if isinstance(stage, dict)]
    if len(indexed) != len(stages):
        errors.append("every stage must be an object")
    ordered = sorted(indexed, key=lambda pair: (
        pair[1].get("start_seconds") if _finite_number(pair[1].get("start_seconds")) else float("-inf"),
        pair[0],
    ))
    if not ordered or ordered[0][1].get("start_seconds") != 0:
        errors.append("first stage must begin at 0 seconds")

    seen = set()
    previous_end = 0.0
    for index, stage in ordered:
        sid = stage.get("id")
        if not isinstance(sid, str) or not sid.strip():
            errors.append(f"stage[{index}] has no id")
            sid = f"stage[{index}]"
        elif sid in seen:
            errors.append(f"duplicate stage id: {sid}")
        seen.add(sid)

        start, end = stage.get("start_seconds"), stage.get("end_seconds")
        if not _finite_number(start) or not _finite_number(end):
            errors.append(f"stage {sid}: start_seconds and end_seconds must be finite numbers")
            continue
        if start < 0:
            errors.append(f"stage {sid}: start_seconds cannot be negative")
        if end > duration:
            errors.append(f"stage {sid}: end_seconds exceeds timeline duration")
        if end <= start:
            errors.append(f"stage {sid}: end must be after start")
            continue
        if abs(start - previous_end) > 0.001:
            errors.append(f"stage {sid}: timeline gap/overlap at {start:.3f}s; expected {previous_end:.3f}s")
        previous_end = end
        if not isinstance(stage.get("function"), str) or not stage["function"].strip():
            errors.append(f"stage {sid}: missing dramatic function")

    if abs(previous_end - duration) > 0.001:
        errors.append(f"last stage ends at {previous_end:.3f}s, expected {duration:.3f}s")

    continuity = data.get("continuity_policy", {})
    if not isinstance(continuity, dict):
        errors.append("continuity_policy must be an object")
    elif continuity.get("continuous_event") is True and continuity.get("cuts_allowed") is True:
        errors.append("continuous_event cannot declare cuts_allowed=true")
    return errors


def validate_provenance(data: dict) -> list[str]:
    errors = []
    if not isinstance(data, dict):
        return ["provenance manifest must be a JSON object"]
    if data.get("schema") != "geehub.provenance/1":
        errors.append("provenance schema identifier is invalid")
    assets = data.get("assets", [])
    if not isinstance(assets, list):
        return errors + ["provenance assets must be an array"]

    ids = set()
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            errors.append(f"provenance asset[{index}] must be an object")
            continue
        aid = asset.get("id")
        if not isinstance(aid, str) or not aid.strip():
            errors.append(f"provenance asset[{index}] has no id")
            aid = f"asset[{index}]"
        elif aid in ids:
            errors.append(f"duplicate provenance asset id: {aid}")
        ids.add(aid)

        origin = asset.get("origin", {})
        if not isinstance(origin, dict):
            errors.append(f"asset {aid}: origin must be an object")
            origin = {}
        if not origin.get("provider") or not (origin.get("filename") or (origin.get("url") and origin.get("title"))):
            errors.append(f"asset {aid}: origin.provider and either filename or URL/title are required")
        integrity = asset.get("integrity", {})
        if not isinstance(integrity, dict):
            errors.append(f"asset {aid}: integrity must be an object")
            integrity = {}
        digest = integrity.get("digest")
        if digest and (not isinstance(digest, str) or not re.fullmatch(r"[a-fA-F0-9]{64}", digest)):
            errors.append(f"asset {aid}: invalid SHA-256 digest")
        status = asset.get("verification_status")
        if status == "checksum-verified" and not digest:
            errors.append(f"asset {aid}: checksum-verified requires a SHA-256 digest")
        if status == "media-inspected" and not digest:
            errors.append(f"asset {aid}: media-inspected requires a SHA-256 digest and source identity")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=DEFAULT_PROJECT)
    args = parser.parse_args()
    project = args.project.resolve()
    timeline_path = project / "07_MANIFESTS/timeline.json"
    provenance_path = project / "07_MANIFESTS/provenance.json"
    production_path = project / "production.json"
    try:
        timeline = load(timeline_path)
        provenance = load(provenance_path)
        production = load(production_path)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if not isinstance(production, dict):
        print("ERROR: production.json must be a JSON object", file=sys.stderr)
        return 1
    errors = validate_timeline(timeline) + validate_provenance(provenance)
    if not isinstance(timeline, dict) or not isinstance(provenance, dict):
        print("\n".join("ERROR: " + item for item in errors), file=sys.stderr)
        return 1

    if production.get("timelineManifest") != "07_MANIFESTS/timeline.json":
        errors.append("production.json timelineManifest does not point to 07_MANIFESTS/timeline.json")
    if production.get("provenanceManifest") != "07_MANIFESTS/provenance.json":
        errors.append("production.json provenanceManifest does not point to 07_MANIFESTS/provenance.json")
    if timeline.get("project_id") != production.get("id"):
        errors.append("timeline project_id does not match production.json id")
    if provenance.get("project_id") != production.get("id"):
        errors.append("provenance project_id does not match production.json id")

    if errors:
        print("\n".join("ERROR: " + item for item in errors), file=sys.stderr)
        return 1
    print(
        f"Timeline valid: {len(timeline['stages'])} contiguous stages, "
        f"{timeline['duration_seconds']}s at {timeline['timebase']['fps']}fps; "
        f"{len(provenance.get('assets', []))} provenance assets."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
