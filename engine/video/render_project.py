#!/usr/bin/env python3
"""Render a GEEHUB project folder through the local Blender timeline pipeline."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from growth_curves import validate_profile
from growth_geometry import validate_pectorals_geometry
from stage_reference_image import validate_reference_library

HERE = Path(__file__).resolve().parent
DEFAULT_PROJECT = HERE.parent.parent / "production" / "projects" / "hulums-lab-serum-60s"


def find_blender(override: str | None) -> str | None:
    if override:
        return override if Path(override).exists() else shutil.which(override)
    configured = os.environ.get("GEEHUB_BLENDER")
    if configured and Path(configured).exists():
        return configured
    found = shutil.which("blender")
    if found:
        return found
    for candidate in (
        "/Applications/Blender.app/Contents/MacOS/Blender",
        "/opt/homebrew/bin/blender",
        "/usr/local/bin/blender",
    ):
        if Path(candidate).exists():
            return candidate
    return None


def validate(project: Path) -> tuple[dict, dict]:
    manifest_path = project / "production.json"
    timeline_path = project / "07_MANIFESTS" / "timeline.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    timeline = json.loads(timeline_path.read_text(encoding="utf-8"))
    profile_path = project / "07_MANIFESTS" / "growth_profile.json"
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    reference_path = project / "07_MANIFESTS" / "reference_library.json"
    reference_library = json.loads(reference_path.read_text(encoding="utf-8"))
    reference_errors = validate_reference_library(reference_library)
    if reference_errors:
        raise ValueError("Invalid reference library: " + "; ".join(reference_errors))
    if reference_library.get("project_id") != timeline.get("project_id"):
        raise ValueError("Reference library project_id does not match timeline")
    pectorals = profile.get("deformation", {}).get("pectorals", {})
    pectoral_geometry = pectorals.get("geometry")
    if not isinstance(pectoral_geometry, dict):
        raise ValueError("Growth profile must define project-specific pectoral geometry")
    geometry_errors = validate_pectorals_geometry(pectoral_geometry)
    if geometry_errors:
        raise ValueError("Invalid pectoral geometry: " + "; ".join(geometry_errors))
    library_asset_ids = {asset["asset_id"] for asset in reference_library["assets"]}
    reference_asset_ids = pectorals.get("reference_assets")
    if not isinstance(reference_asset_ids, list) or not reference_asset_ids or any(not isinstance(item, str) or not item for item in reference_asset_ids):
        raise ValueError("Pectoral geometry must identify source image-library asset IDs as strings")
    missing_references = sorted(set(reference_asset_ids) - library_asset_ids)
    if missing_references:
        raise ValueError("Pectoral geometry references missing library assets: " + ", ".join(missing_references))
    fmt = manifest["format"]
    fps = int(timeline["timebase"]["fps"])
    duration = float(timeline["duration_seconds"])
    expected_frames = int(round(duration * fps))
    if int(timeline["timebase"]["frame_count"]) != expected_frames:
        raise ValueError("Timeline frame_count does not equal duration_seconds × fps")
    if int(fmt.get("fps", fmt.get("frameRate", fps))) != fps:
        raise ValueError("Project and timeline frame rates differ")
    if abs(float(fmt.get("duration_seconds", fmt.get("masterDurationSeconds", duration))) - duration) > 0.001:
        raise ValueError("Project and timeline durations differ")
    previous = 0.0
    for stage in timeline["stages"]:
        start, end = float(stage["start_seconds"]), float(stage["end_seconds"])
        if abs(start - previous) > 0.001 or end <= start:
            raise ValueError(f"Timeline gap, overlap, or invalid interval at stage {stage.get('id')}")
        previous = end
    if abs(previous - duration) > 0.001:
        raise ValueError("Last stage does not end at project duration")
    if manifest.get("character_model") != "rigged":
        raise ValueError("This project is configured for the unified rigged character")
    if profile.get("schema") != "geehub.growth-profile/1":
        raise ValueError("Growth profile schema is invalid")
    if profile.get("project_id") != timeline.get("project_id"):
        raise ValueError("Growth profile project_id does not match timeline")
    if float(profile.get("duration_seconds", -1)) != duration:
        raise ValueError("Growth profile duration does not match timeline")
    if int(profile.get("timebase", {}).get("fps", -1)) != fps:
        raise ValueError("Growth profile fps does not match timeline")
    if int(profile.get("timebase", {}).get("frame_count", -1)) != expected_frames:
        raise ValueError("Growth profile frame_count does not match timeline")
    curves = {name: entry["knots"] for name, entry in profile.get("regions", {}).items()}
    curve_errors = validate_profile(curves)
    if curve_errors:
        raise ValueError("Invalid growth profile: " + "; ".join(curve_errors))
    required_regions = {"pectorals", "deltoids", "traps", "arms", "lats", "back", "torso", "quadriceps", "calves", "whole_body"}
    optional_pectorals = {"pectorals_projection", "pectorals_upper", "pectorals_outer", "pectorals_sternal", "pectorals_lower_shelf"}
    if not required_regions.issubset(curves):
        missing = sorted(required_regions - set(curves))
        raise ValueError("Growth profile is missing required renderer channels: " + ", ".join(missing))
    unexpected = set(curves) - required_regions - optional_pectorals
    if unexpected:
        raise ValueError("Growth profile contains unsupported channels: " + ", ".join(sorted(unexpected)))
    return manifest, timeline


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=DEFAULT_PROJECT)
    parser.add_argument("--blender", help="Blender executable path (or command name)")
    parser.add_argument("--output", type=Path, help="Override MP4 output path")
    parser.add_argument("--preview-seconds", type=float, default=60.0,
                        help="Render a low-resolution full-duration preview; use 0 for the full-resolution master")
    parser.add_argument("--validate-only", action="store_true",
                        help="Validate project manifests without requiring Blender")
    args = parser.parse_args()
    project = args.project.resolve()
    try:
        manifest, timeline = validate(project)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"PROJECT VALIDATION FAILED: {exc}", file=sys.stderr)
        return 2

    print("Validated project:", manifest.get("title"))
    print("Timeline:", len(timeline["stages"]), "stages;", timeline["timebase"]["frame_count"], "frames")
    if args.validate_only:
        return 0

    blender = find_blender(args.blender)
    if not blender:
        print("BLENDER NOT FOUND. Install Blender 5.3+ (recommended) or pass --blender /path/to/blender.", file=sys.stderr)
        return 3

    exports = project / "05_EXPORTS"
    composites = project / "04_COMPOSITES"
    exports.mkdir(parents=True, exist_ok=True)
    composites.mkdir(parents=True, exist_ok=True)
    preview = args.preview_seconds if args.preview_seconds and args.preview_seconds > 0 else None
    default_name = f"Laboratory-Serum-preview-{preview:g}s.mp4" if preview else "Laboratory-Serum-60s.mp4"
    output = args.output.resolve() if args.output else exports / default_name
    blend = composites / "Laboratory-Serum-60s.blend"
    command = [
        blender, "--background", "--python", str(HERE / "blender_scene.py"), "--",
        "--manifest", str(project / "production.json"),
        "--timeline", str(project / "07_MANIFESTS" / "timeline.json"),
        "--growth-profile", str(project / "07_MANIFESTS" / "growth_profile.json"),
        "--output", str(output),
        "--save-blend", str(blend),
    ]
    if preview:
        command.extend(["--preview-seconds", str(preview)])
    print("Blender:", blender)
    print("Mode:", f"{preview:g}-second low-resolution preview" if preview else "full master render")
    print("Output:", output)
    print("Scene file:", blend)
    return subprocess.run(command, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
