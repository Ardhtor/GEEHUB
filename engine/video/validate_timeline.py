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


def validate_timeline(data: dict) -> list[str]:
    errors = []
    if data.get("schema") != "geehub.video-timeline/1":
        errors.append("timeline schema identifier is not geehub.video-timeline/1")
    duration = data.get("duration_seconds")
    fps = data.get("timebase", {}).get("fps")
    frames = data.get("timebase", {}).get("frame_count")
    if not isinstance(duration, (int, float)) or duration <= 0:
        errors.append("duration_seconds must be positive")
        return errors
    if not isinstance(fps, (int, float)) or fps <= 0:
        errors.append("timebase.fps must be positive")
    elif isinstance(frames, int) and frames > 0 and round(duration * fps) != frames:
        errors.append("frame_count does not match duration_seconds × fps")

    stages = data.get("stages", [])
    if not stages:
        errors.append("stages must contain at least one stage")
        return errors
    seen = set()
    ordered = sorted(stages, key=lambda stage: stage.get("start_seconds", -1))
    if ordered[0].get("start_seconds") != 0:
        errors.append("first stage must begin at 0 seconds")
    previous_end = 0.0
    for index, stage in enumerate(ordered):
        sid = stage.get("id")
        if not sid:
            errors.append(f"stage[{index}] has no id")
        elif sid in seen:
            errors.append(f"duplicate stage id: {sid}")
        seen.add(sid)
        start, end = stage.get("start_seconds"), stage.get("end_seconds")
        if not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
            errors.append(f"stage {sid}: start_seconds and end_seconds must be numeric")
            continue
        if end <= start:
            errors.append(f"stage {sid}: end must be after start")
        if abs(start - previous_end) > 0.001:
            errors.append(f"stage {sid}: timeline gap/overlap at {start:.3f}s; expected {previous_end:.3f}s")
        previous_end = end
        if not stage.get("function"):
            errors.append(f"stage {sid}: missing dramatic function")
    if abs(previous_end - duration) > 0.001:
        errors.append(f"last stage ends at {previous_end:.3f}s, expected {duration:.3f}s")

    if data.get("continuity_policy", {}).get("continuous_event") is True:
        if data.get("continuity_policy", {}).get("cuts_allowed") is True:
            errors.append("continuous_event cannot declare cuts_allowed=true")
    return errors


def validate_provenance(data: dict) -> list[str]:
    errors = []
    if data.get("schema") != "geehub.provenance/1":
        errors.append("provenance schema identifier is invalid")
    ids = set()
    for asset in data.get("assets", []):
        aid = asset.get("id")
        if not aid:
            errors.append("provenance asset has no id")
        elif aid in ids:
            errors.append(f"duplicate provenance asset id: {aid}")
        ids.add(aid)
        origin = asset.get("origin", {})
        if not origin.get("provider") or not origin.get("filename"):
            errors.append(f"asset {aid}: origin.provider and origin.filename are required")
        integrity = asset.get("integrity", {})
        digest = integrity.get("digest")
        if digest and not re.fullmatch(r"[a-fA-F0-9]{64}", digest):
            errors.append(f"asset {aid}: invalid SHA-256 digest")
        if asset.get("verification_status") == "checksum-verified" and not digest:
            errors.append(f"asset {aid}: checksum-verified requires a SHA-256 digest")
        if asset.get("verification_status") == "media-inspected" and not digest:
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

    errors = validate_timeline(timeline) + validate_provenance(provenance)
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
