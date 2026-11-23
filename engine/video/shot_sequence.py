"""Assemble verified provider-generated shots into an OpenTimelineIO sequence."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

import opentimelineio as otio

from production_validation import (
    _safe_project_file,
    validate_provider_manifest,
    validate_shot_manifest,
)


def parse_frame_rate(value) -> Fraction:
    if isinstance(value, bool):
        raise ValueError("frame rate cannot be boolean")
    try:
        rate = Fraction(str(value)).limit_denominator(100000)
    except (ValueError, ZeroDivisionError) as exc:
        raise ValueError(f"invalid frame rate: {value!r}") from exc
    if rate <= 0:
        raise ValueError("frame rate must be positive")
    return rate


def probe_media(path: Path) -> dict:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise RuntimeError("ffprobe is required to assemble verified provider video")
    result = subprocess.run(
        [
            ffprobe, "-v", "error", "-show_streams", "-show_format",
            "-of", "json", str(path),
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe rejected {path.name}: {result.stderr[-1200:]}")
    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if video is None:
        raise ValueError(f"{path.name} contains no video stream")
    audio = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
    duration = float(data.get("format", {}).get("duration", video.get("duration", 0)))
    if duration <= 0:
        raise ValueError(f"{path.name} has no valid duration")
    return {
        "duration_seconds": duration,
        "frame_rate": video.get("avg_frame_rate") or video.get("r_frame_rate"),
        "width": int(video.get("width", 0)),
        "height": int(video.get("height", 0)),
        "video_codec": video.get("codec_name"),
        "audio_codec": audio.get("codec_name") if audio else "none",
    }


def compare_probe_metadata(expected: dict, actual: dict, shot_id: str) -> list[str]:
    errors = []
    try:
        expected_rate = parse_frame_rate(expected.get("frame_rate"))
        actual_rate = parse_frame_rate(actual.get("frame_rate"))
        if abs(float(expected_rate - actual_rate)) > 0.01:
            errors.append(f"{shot_id}: FFprobe frame rate differs from registered metadata")
    except ValueError as exc:
        errors.append(f"{shot_id}: {exc}")
    if abs(float(expected.get("duration_seconds", 0)) - actual["duration_seconds"]) > 0.25:
        errors.append(f"{shot_id}: FFprobe duration differs from registered metadata")
    for field in ("width", "height", "video_codec", "audio_codec"):
        if expected.get(field) != actual.get(field):
            errors.append(f"{shot_id}: FFprobe {field} differs from registered metadata")
    return errors


def build_otio_sequence(project_root: Path, output_path: Path) -> dict:
    manifests = project_root / "07_MANIFESTS"
    shots = json.loads((manifests / "shots.json").read_text(encoding="utf-8"))
    provider = json.loads((manifests / "video_provider.json").read_text(encoding="utf-8"))
    references = json.loads((manifests / "reference_library.json").read_text(encoding="utf-8"))

    errors = validate_provider_manifest(provider)
    errors.extend(validate_shot_manifest(shots, references, provider, project_root))
    if errors:
        raise ValueError("Invalid shot/provider manifests: " + "; ".join(errors))

    completed = sorted(
        (shot for shot in shots["shots"] if shot["generation"]["status"] == "completed"),
        key=lambda shot: shot["sequence_order"],
    )
    if len(completed) < 2:
        raise ValueError("At least two verified provider-generated shots are required before OTIO assembly")

    timeline = otio.schema.Timeline(name=shots.get("sequence_id", project_root.name))
    track = otio.schema.Track(name="GEEHUB Verified Generated Shots", kind=otio.schema.TrackKind.Video)
    report_shots = []

    for shot in completed:
        generation = shot["generation"]
        media_path = _safe_project_file(project_root, generation["output_path"])
        if media_path is None:
            raise ValueError(f"{shot['shot_id']}: generated media path is missing or outside the project")
        actual = probe_media(media_path)
        metadata_errors = compare_probe_metadata(generation["media_metadata"], actual, shot["shot_id"])
        if metadata_errors:
            raise ValueError("; ".join(metadata_errors))

        rate = parse_frame_rate(actual["frame_rate"])
        rate_value = float(rate)
        frame_count = round(actual["duration_seconds"] * rate_value)
        duration = otio.opentime.RationalTime(frame_count, rate_value)
        source_range = otio.opentime.TimeRange(otio.opentime.RationalTime(0, rate_value), duration)
        reference = otio.schema.ExternalReference(
            target_url=media_path.as_uri(),
            available_range=source_range,
        )
        clip = otio.schema.Clip(
            name=shot["shot_id"],
            media_reference=reference,
            source_range=source_range,
        )
        clip.metadata["GEEHUB"] = {
            "project_id": shots["project_id"],
            "shot_id": shot["shot_id"],
            "shot_revision": shot["revision"],
            "provider_id": generation["provider_id"],
            "provider_job_id": generation["provider_job_id"],
            "provider_output_id": generation["provider_output_id"],
            "model_id": generation["model_id"],
            "prompt_sha256": generation["prompt_sha256"],
            "reference_asset_ids": generation["reference_asset_ids"],
            "output_sha256": generation["output_sha256"],
            "dropbox_file_id": generation["dropbox_file_id"],
            "dropbox_path": generation["dropbox_path"],
        }
        track.append(clip)
        report_shots.append({
            "shot_id": shot["shot_id"],
            "duration_seconds": actual["duration_seconds"],
            "frame_rate": str(rate),
            "width": actual["width"],
            "height": actual["height"],
            "video_codec": actual["video_codec"],
            "audio_codec": actual["audio_codec"],
            "sha256": generation["output_sha256"],
        })

    timeline.tracks.append(track)
    timeline.metadata["GEEHUB"] = {
        "project_id": shots["project_id"],
        "sequence_id": shots.get("sequence_id"),
        "provider": provider["display_name"],
        "shot_count": len(report_shots),
        "assembly_policy": "verified provider-generated media only; no placeholders",
    }
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    otio.adapters.write_to_file(timeline, str(output_path))

    reopened = otio.adapters.read_from_file(str(output_path))
    reopened_clips = [item for item in reopened.tracks[0] if isinstance(item, otio.schema.Clip)] if reopened.tracks else []
    expected_names = [shot["shot_id"] for shot in completed]
    actual_names = [clip.name for clip in reopened_clips]
    if actual_names != expected_names:
        raise RuntimeError("OTIO round-trip validation changed shot order or clip identity")

    return {
        "sequence_path": str(output_path),
        "sequence_id": shots.get("sequence_id"),
        "shot_count": len(report_shots),
        "duration_seconds": sum(item["duration_seconds"] for item in report_shots),
        "shots": report_shots,
        "otio_round_trip": "passed",
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path(__file__).resolve().parents[2] / "production" / "projects" / "hulums-lab-serum-60s")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        report = build_otio_sequence(args.project, args.output)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(json.dumps({"assembled": False, "error": str(exc)}, indent=2))
        return 2
    print(json.dumps({"assembled": True, **report}, indent=2))
    return 0


if __name__ == "__main__":
    child_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else None
    raise SystemExit(main(child_args))
