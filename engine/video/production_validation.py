"""Validate real-shot provenance and non-mock production acceptance gates."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path


def _nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def _safe_project_file(project_root: Path, relative_path: str) -> Path | None:
    if not _nonempty(relative_path):
        return None
    root = project_root.resolve()
    path = (root / relative_path).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        return None
    return path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_provider_manifest(provider: object) -> list[str]:
    if not isinstance(provider, dict):
        return ["video provider manifest must be an object"]
    errors = []
    if provider.get("schema") != "geehub.video-provider/1":
        errors.append("video provider schema must be geehub.video-provider/1")
    for field in ("provider_id", "display_name", "connection_status", "api_adapter_status", "fallback_policy"):
        if not _nonempty(provider.get(field)):
            errors.append(f"video provider {field} is required")
    if provider.get("mock_mode") is not False:
        errors.append("mock_mode must remain false")
    if provider.get("cost_approval_required") is not True:
        errors.append("cost_approval_required must be true")
    if provider.get("generation_enabled") is True:
        if provider.get("connection_status") != "connected":
            errors.append("generation cannot be enabled while the provider is disconnected")
        if provider.get("api_adapter_status") != "implemented":
            errors.append("generation cannot be enabled before a real provider adapter is implemented")
        if provider.get("cost_approval_status") != "approved":
            errors.append("generation cannot be enabled without explicit cost approval")
    if provider.get("fallback_policy", "").lower().find("never substitute") < 0:
        errors.append("provider fallback policy must explicitly prohibit mock or placeholder media")
    return errors


def validate_shot_manifest(shots: object, reference_library: object, provider: object, project_root: Path) -> list[str]:
    if not isinstance(shots, dict):
        return ["shot manifest must be an object"]
    errors = []
    if shots.get("schema") != "geehub.shot-manifest/1":
        errors.append("shot manifest schema must be geehub.shot-manifest/1")
    if not isinstance(reference_library, dict) or shots.get("project_id") != reference_library.get("project_id"):
        errors.append("shot manifest project_id must match the project reference library")
    if not isinstance(provider, dict) or shots.get("provider") != provider.get("display_name"):
        errors.append("shot manifest provider must match the provider manifest")
    policy = shots.get("generation_policy")
    if not isinstance(policy, dict):
        errors.append("shot manifest generation_policy is required")
    else:
        if policy.get("cost_approval_required") is not True:
            errors.append("shot generation must require explicit cost approval")
        if policy.get("mock_or_placeholder_media_allowed") is not False:
            errors.append("shot manifest must prohibit mock and placeholder media")
    refs = {item.get("asset_id") for item in reference_library.get("assets", []) if isinstance(item, dict)} if isinstance(reference_library, dict) else set()
    shot_list = shots.get("shots")
    if not isinstance(shot_list, list) or len(shot_list) < 2:
        errors.append("at least two independent shot instances must be defined")
        return errors
    ids = set()
    orders = set()
    for index, shot in enumerate(shot_list):
        label = f"shot[{index}]"
        if not isinstance(shot, dict):
            errors.append(f"{label} must be an object")
            continue
        shot_id = shot.get("shot_id")
        if not _nonempty(shot_id):
            errors.append(f"{label} needs a shot_id")
        elif shot_id in ids:
            errors.append(f"duplicate shot_id: {shot_id}")
        ids.add(shot_id)
        order = shot.get("sequence_order")
        if not isinstance(order, int) or isinstance(order, bool) or order < 1 or order in orders:
            errors.append(f"{label} sequence_order must be a unique positive integer")
        orders.add(order)
        if not _nonempty(shot.get("continuity_key")):
            errors.append(f"{label} needs a continuity_key")
        if not _nonempty(shot.get("prompt")):
            errors.append(f"{label} needs a production prompt")
        duration = shot.get("duration_seconds")
        if isinstance(duration, bool) or not isinstance(duration, (int, float)) or (isinstance(duration, float) and not math.isfinite(duration)) or duration <= 0 or duration > 600:
            errors.append(f"{label} duration_seconds must be finite and between 0 and 600")
        time_range = shot.get("timeline_range_seconds")
        if not isinstance(time_range, list) or len(time_range) != 2 or any(
            isinstance(value, bool) or not isinstance(value, (int, float)) or (isinstance(value, float) and not math.isfinite(value)) for value in time_range
        ):
            errors.append(f"{label} needs a two-value timeline_range_seconds")
        elif isinstance(duration, (int, float)) and not isinstance(duration, bool) and abs((time_range[1] - time_range[0]) - duration) > 0.001:
            errors.append(f"{label} timeline range must equal duration_seconds")
        asset_refs = shot.get("reference_assets")
        if not isinstance(asset_refs, list) or not asset_refs:
            errors.append(f"{label} needs source reference asset IDs")
        else:
            for ref in asset_refs:
                if not isinstance(ref, dict) or ref.get("asset_id") not in refs or not _nonempty(ref.get("use")):
                    errors.append(f"{label} contains an unknown or unannotated reference asset")
        generation = shot.get("generation")
        if not isinstance(generation, dict):
            errors.append(f"{label} generation record is required")
            continue
        state = generation.get("status")
        if state not in {"not-started", "submitted", "completed", "failed"}:
            errors.append(f"{label} has an unsupported generation status")
            continue
        if state in {"submitted", "completed"}:
            if provider.get("connection_status") != "connected" or provider.get("api_adapter_status") != "implemented":
                errors.append(f"{label} cannot claim a provider job without a connected, implemented adapter")
            if provider.get("generation_enabled") is not True or provider.get("cost_approval_status") != "approved":
                errors.append(f"{label} cannot claim a provider job without explicit generation and cost approval")
            if generation.get("provider_id") != provider.get("provider_id"):
                errors.append(f"{label} provider_id must match the connected provider manifest")
        if state == "not-started":
            for field in ("provider_job_id", "model_id", "output_path", "output_sha256", "dropbox_file_id", "dropbox_path"):
                if generation.get(field) is not None:
                    errors.append(f"{label} must not claim {field} before generation")
            if generation.get("reopened_from_dropbox") is not False:
                errors.append(f"{label} cannot claim Dropbox verification before generation")
        elif state == "completed":
            required_fields = (
                "provider_id", "provider_job_id", "provider_output_id", "model_id",
                "prompt_revision", "prompt_sha256", "reference_asset_ids",
                "submitted_at", "completed_at", "output_path", "output_sha256",
                "dropbox_file_id", "dropbox_path",
            )
            for field in required_fields:
                if generation.get(field) is None or generation.get(field) == "":
                    errors.append(f"{label} completed output requires {field}")
            if generation.get("provider_id") != provider.get("provider_id"):
                errors.append(f"{label} provider_id does not match provider manifest")
            prompt_hash = hashlib.sha256(shot.get("prompt", "").encode("utf-8")).hexdigest()
            if generation.get("prompt_sha256") != prompt_hash:
                errors.append(f"{label} prompt_sha256 does not match the exact prompt text")
            if generation.get("prompt_revision") != shot.get("revision"):
                errors.append(f"{label} prompt_revision must match the shot revision")
            expected_refs = [item.get("asset_id") for item in shot.get("reference_assets", []) if isinstance(item, dict)]
            if generation.get("reference_asset_ids") != expected_refs:
                errors.append(f"{label} generation reference_asset_ids do not match the approved shot references")
            if not re.fullmatch(r"[a-fA-F0-9]{64}", str(generation.get("output_sha256", ""))):
                errors.append(f"{label} output_sha256 must be a 64-character hex digest")
            media = _safe_project_file(project_root, generation.get("output_path", ""))
            if media is None:
                errors.append(f"{label} output file is missing or escapes the project directory")
            elif _sha256(media) != generation.get("output_sha256"):
                errors.append(f"{label} output SHA-256 does not match the registered file")
            metadata = generation.get("media_metadata")
            if not isinstance(metadata, dict):
                errors.append(f"{label} completed output requires ffprobe media_metadata")
            else:
                for field in ("duration_seconds", "frame_rate", "width", "height", "video_codec", "audio_codec"):
                    if metadata.get(field) is None:
                        errors.append(f"{label} media_metadata requires {field}")
                media_duration = metadata.get("duration_seconds")
                if isinstance(media_duration, (int, float)) and not isinstance(media_duration, bool) and abs(media_duration - duration) > 0.25:
                    errors.append(f"{label} probed media duration does not match the shot duration")
            verification = generation.get("dropbox_verification")
            if not isinstance(verification, dict) or verification.get("reopened") is not True:
                errors.append(f"{label} requires a recorded Dropbox reopen verification")
            else:
                if verification.get("sha256") != generation.get("output_sha256") or verification.get("file_id") != generation.get("dropbox_file_id"):
                    errors.append(f"{label} Dropbox reopen verification does not match the generated output")
                if verification.get("path") != generation.get("dropbox_path") or not _nonempty(verification.get("reopened_at")):
                    errors.append(f"{label} Dropbox verification requires matching path and reopened_at timestamp")
                if verification.get("metadata_verified") is not True:
                    errors.append(f"{label} Dropbox media metadata must be rechecked after reopen")
        elif state == "submitted" and (not _nonempty(generation.get("provider_job_id")) or not _nonempty(generation.get("model_id"))):
            errors.append(f"{label} submitted state requires provider_job_id and model_id")
    if shots.get("sequence_policy", {}).get("no_mock_fallback") is not True:
        errors.append("sequence policy must prohibit mock fallback")
    return errors


def _verify_delivery_file(project_root: Path, relative_path: str, expected_sha: str, dropbox_verification: object, label: str) -> list[str]:
    errors = []
    path = _safe_project_file(project_root, relative_path)
    if path is None:
        return [f"{label} file is missing or escapes the project directory"]
    actual_sha = _sha256(path)
    if not re.fullmatch(r"[a-fA-F0-9]{64}", str(expected_sha or "")) or actual_sha != expected_sha:
        errors.append(f"{label} SHA-256 does not match the registered file")
    if not isinstance(dropbox_verification, dict) or dropbox_verification.get("reopened") is not True:
        errors.append(f"{label} has not been reopened from Dropbox")
    else:
        if dropbox_verification.get("sha256") != actual_sha:
            errors.append(f"{label} Dropbox SHA-256 does not match the local file")
        if not _nonempty(dropbox_verification.get("file_id")) or not _nonempty(dropbox_verification.get("path")) or not _nonempty(dropbox_verification.get("reopened_at")):
            errors.append(f"{label} Dropbox verification requires file ID, path, and reopen timestamp")
        if dropbox_verification.get("metadata_verified") is not True:
            errors.append(f"{label} Dropbox metadata was not rechecked after reopen")
    return errors


def evaluate_acceptance(shots: dict, acceptance: dict, project_root: Path) -> dict:
    blockers = []
    completed = []
    for shot in shots.get("shots", []):
        generation = shot.get("generation", {}) if isinstance(shot, dict) else {}
        if generation.get("status") == "completed":
            completed.append(shot)
    minimum = acceptance.get("minimum_independent_generated_shots", 2)
    if len(completed) < minimum:
        blockers.append(f"requires {minimum} verified provider-generated shots; found {len(completed)}")
    evidence = acceptance.get("evidence", {}) if isinstance(acceptance.get("evidence"), dict) else {}
    sequence = evidence.get("sequence_otio")
    if not sequence:
        blockers.append("verified OTIO shot sequence is missing")
    else:
        blockers.extend(_verify_delivery_file(project_root, sequence, evidence.get("sequence_otio_sha256"), evidence.get("sequence_dropbox_verification"), "OTIO sequence"))
    master = evidence.get("master_mp4")
    if not master:
        blockers.append("final MP4 master is missing")
    else:
        blockers.extend(_verify_delivery_file(project_root, master, evidence.get("master_sha256"), evidence.get("master_dropbox_verification"), "Final MP4 master"))
    metadata = evidence.get("master_ffprobe_metadata")
    if not isinstance(metadata, dict) or any(metadata.get(field) is None for field in ("duration_seconds", "frame_rate", "width", "height", "video_codec", "audio_codec")):
        blockers.append("final master FFprobe metadata is missing or incomplete")
    if acceptance.get("no_mock_or_placeholder_acceptance") is not True:
        blockers.append("acceptance policy must prohibit mock and placeholder media")
    return {
        "accepted": not blockers,
        "status": "accepted" if not blockers else "blocked-preproduction",
        "completed_shots": len(completed),
        "required_shots": minimum,
        "blockers": blockers,
    }

def load_and_validate(project_root: Path) -> tuple[list[str], dict]:
    manifests = project_root / "07_MANIFESTS"
    try:
        shots = json.loads((manifests / "shots.json").read_text(encoding="utf-8"))
        provider = json.loads((manifests / "video_provider.json").read_text(encoding="utf-8"))
        acceptance = json.loads((manifests / "production_acceptance.json").read_text(encoding="utf-8"))
        references = json.loads((manifests / "reference_library.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"could not load production manifests: {exc}"], {}
    errors = validate_provider_manifest(provider)
    errors.extend(validate_shot_manifest(shots, references, provider, project_root))
    if acceptance.get("schema") != "geehub.video-production-acceptance/1" or acceptance.get("project_id") != shots.get("project_id"):
        errors.append("production acceptance manifest schema or project_id is invalid")
    report = evaluate_acceptance(shots, acceptance, project_root)
    return errors, {"provider": provider.get("display_name"), "shot_count": len(shots.get("shots", [])), "acceptance": report}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path(__file__).resolve().parents[2] / "production" / "projects" / "hulums-lab-serum-60s")
    parser.add_argument("--require-accepted", action="store_true", help="Return exit code 3 unless real-shot and Dropbox delivery gates pass")
    args = parser.parse_args(argv)
    errors, report = load_and_validate(args.project)
    output = {"valid": not errors, **report, "errors": errors}
    print(json.dumps(output, indent=2))
    if errors:
        return 2
    if args.require_accepted and not report["acceptance"]["accepted"]:
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
