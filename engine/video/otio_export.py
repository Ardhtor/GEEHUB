#!/usr/bin/env python3
"""Export a GEEHUB semantic timeline to OpenTimelineIO.

Run with Blender 5.3+'s bundled Python or any Python environment containing
OpenTimelineIO. Stages are represented as markers over one continuous picture
track; they are not converted into editorial cuts.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from validate_timeline import load, validate_timeline


def export_timeline(timeline_data: dict, output: Path, media: Path | None = None) -> dict:
    try:
        import opentimelineio as otio
    except ImportError as exc:
        raise RuntimeError(
            "OpenTimelineIO is unavailable. Run this with Blender 5.3+'s bundled "
            "Python or install the opentimelineio Python package."
        ) from exc

    errors = validate_timeline(timeline_data)
    if errors:
        raise ValueError("Invalid GEEHUB timeline: " + "; ".join(errors))

    fps = int(timeline_data["timebase"]["fps"])
    frame_count = int(timeline_data["timebase"]["frame_count"])
    full_range = otio.opentime.TimeRange(
        otio.opentime.RationalTime(0, fps),
        otio.opentime.RationalTime(frame_count, fps),
    )
    timeline = otio.schema.Timeline(name=timeline_data.get("project_id", "GEEHUB"))
    track = otio.schema.Track(
        name="GEEHUB / continuous picture",
        kind=otio.schema.TrackKind.Video,
    )

    if media is not None:
        media = media.expanduser().resolve()
        if not media.is_file():
            raise FileNotFoundError(f"Media file does not exist: {media}")
        reference = otio.schema.ExternalReference(target_url=media.as_uri())
        track.append(otio.schema.Clip(
            name=media.name,
            media_reference=reference,
            source_range=full_range,
        ))
    else:
        track.append(otio.schema.Gap(
            name="Picture placeholder — no source media linked",
            source_range=full_range,
        ))

    for stage in timeline_data["stages"]:
        start = round(float(stage["start_seconds"]) * fps)
        end = round(float(stage["end_seconds"]) * fps)
        marker_range = otio.opentime.TimeRange(
            otio.opentime.RationalTime(start, fps),
            otio.opentime.RationalTime(end - start, fps),
        )
        marker = otio.schema.Marker(
            name=str(stage.get("label") or stage["id"]),
            marked_range=marker_range,
            metadata={"geehub": {
                "stage_id": stage["id"],
                "function": stage.get("function", ""),
                "notes": stage.get("notes", ""),
                "required_visible": stage.get("required_visible", []),
                "camera": stage.get("camera", {}),
                "growth": stage.get("growth", {}),
                "sound_cues": stage.get("sound_cues", []),
            }},
        )
        track.markers.append(marker)

    timeline.tracks.append(track)
    timeline.metadata["geehub"] = {
        "source_schema": timeline_data["schema"],
        "project_id": timeline_data.get("project_id", ""),
        "fps": fps,
        "frame_count": frame_count,
        "duration_seconds": timeline_data["duration_seconds"],
        "continuous_event": timeline_data.get("continuity_policy", {}).get("continuous_event", False),
        "cuts_allowed": timeline_data.get("continuity_policy", {}).get("cuts_allowed", True),
        "exporter": "GEEHUB OpenTimelineIO adapter",
    }
    output = output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    otio.adapters.write_to_file(timeline, str(output))
    return {
        "output": str(output),
        "project_id": timeline_data.get("project_id"),
        "fps": fps,
        "frame_count": frame_count,
        "markers": len(timeline_data["stages"]),
        "media_linked": media is not None,
        "continuous_event": timeline_data.get("continuity_policy", {}).get("continuous_event", False),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeline", type=Path, required=True, help="GEEHUB timeline.json")
    parser.add_argument("--output", type=Path, required=True, help="Output .otio file")
    parser.add_argument("--media", type=Path, help="Optional source video to place on the continuous picture track")
    args = parser.parse_args()
    try:
        result = export_timeline(load(args.timeline), args.output, args.media)
    except (OSError, ValueError, RuntimeError, KeyError) as exc:
        print(f"OTIO EXPORT FAILED: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
