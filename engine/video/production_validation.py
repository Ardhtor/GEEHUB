"""Validate real-shot provenance and non-mock production acceptance gates."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
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
    fallback = provider.get("fallback_policy")
    if not isinstance(fallback, str) or "never substitute" not in fallback.lower():
        errors.append("provider fallback policy must explicitly prohibit mock or placeholder media")
    if provider.get("provider_id") == "xai-grok-imagine-video":
        if provider.get("api_adapter_status") != "implemented":
            errors.append("xAI provider requires the implemented GEEHUB API adapter")
        if provider.get("data_transfer_approval_required") is not True:
            errors.append("xAI reference-image transfer must require explicit approval")
        if provider.get("reference_rights_clearance_required") is not True:
            errors.append("xAI reference-image rights must require explicit clearance")
        if provider.get("data_transfer_approval_status") not in {"not-granted", "approved"}:
            errors.append("xAI data-transfer approval status is invalid")
        if provider.get("reference_rights_clearance_status") not in {"not-verified", "cleared"}:
            errors.append("xAI reference-rights clearance status is invalid")
        api = provider.get("api")
        workflow = provider.get("generation_workflow")
        pricing = provider.get("pricing")
        if not isinstance(api, dict) or api.get("base_url") != "https://api.x.ai/v1":
            errors.append("xAI API base URL must be the official API endpoint")
        if not isinstance(workflow, dict) or workflow.get("model_id") != "grok-imagine-video-1.5":
            errors.append("xAI generation workflow must select grok-imagine-video-1.5")
        if not isinstance(workflow, dict) or workflow.get("total_duration_seconds") != 60 or workflow.get("segment_duration_seconds") != 15:
            errors.append("xAI production workflow must define four 15-second segments")
        if not isinstance(pricing, dict) or pricing.get("estimated_total_usd") != 8.4:
            errors.append("xAI 60-second 720p estimate must be recorded as USD 8.40")
    if provider.get("generation_enabled") is True:
        if provider.get("connection_status") != "connected":
            errors.append("generation cannot be enabled while the provider is disconnected")
        if provider.get("api_adapter_status") != "implemented":
            errors.append("generation cannot be enabled before a real provider adapter is implemented")
        if provider.get("cost_approval_status") != "approved":
            errors.append("generation cannot be enabled without explicit cost approval")
        if provider.get("provider_id") == "xai-grok-imagine-video":
            if provider.get("data_transfer_approval_status") != "approved":
                errors.append("generation cannot be enabled before reference-image transfer approval")
            if provider.get("reference_rights_clearance_status") != "cleared":
                errors.append("generation cannot be enabled before reference-image rights are cleared")
    return errors

def validate_shot_manifest(shots: object, reference_library: object, provider: object, project_root: Path) -> list[str]:
    if not isinstance(shots, dict):
        return ["shot manifest must be an object"]
    errors = []
    if shots.get("schema") != "geehub.shot-manifest/1":
        errors.append("shot manifest schema must be geehub.shot-manifest/1")
    if not isinstance(reference_library, dict) or shots.get("project_id") != reference_library.get("project_id"):
        errors.append("shot manifest project_id must match the project reference library")
    provider_config = provider if isinstance(provider, dict) else {}
    if not isinstance(provider, dict) or shots.get("provider") != provider_config.get("display_name"):
        errors.append("shot manifest provider must match the provider manifest")
    if isinstance(provider, dict) and shots.get("provider_id") != provider_config.get("provider_id"):
        errors.append("shot manifest provider_id must match the provider manifest")
    policy = shots.get("generation_policy")
    if not isinstance(policy, dict):
        errors.append("shot manifest generation_policy is required")
    else:
        if policy.get("cost_approval_required") is not True:
            errors.append("shot generation must require explicit cost approval")
        if policy.get("mock_or_placeholder_media_allowed") is not False:
            errors.append("shot manifest must prohibit mock and placeholder media")
        for field in ("connection_status", "api_adapter_status", "generation_enabled", "cost_approval_status"):
            if policy.get(field) != provider_config.get(field):
                errors.append(f"shot generation policy {field} must match the provider manifest")
        for field in ("data_transfer_approval_status", "reference_rights_clearance_status"):
            if policy.get(field) != provider_config.get(field):
                errors.append(f"shot generation policy {field} must match the provider manifest")
    refs = {item.get("asset_id") for item in reference_library.get("assets", []) if isinstance(item, dict)} if isinstance(reference_library, dict) else set()
    shot_list = shots.get("shots")
    if not isinstance(shot_list, list) or len(shot_list) < 2:
        errors.append("at least two shot instances must be defined")
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
        if not isinstance(order, int) or isinstance(order, bool) or order < 1:
            errors.append(f"{label} sequence_order must be a positive integer")
        elif order in orders:
            errors.append(f"{label} sequence_order must be unique")
        else:
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
        if not isinstance(state, str) or state not in {"not-started", "submitted", "generated-local", "completed", "failed"}:
            errors.append(f"{label} has an unsupported generation status")
            continue
        if state in {"submitted", "generated-local", "completed"}:
            if provider_config.get("connection_status") != "connected" or provider_config.get("api_adapter_status") != "implemented":
                errors.append(f"{label} cannot claim a provider job without a connected, implemented adapter")
            if provider_config.get("generation_enabled") is not True or provider_config.get("cost_approval_status") != "approved":
                errors.append(f"{label} cannot claim a provider job without explicit generation and cost approval")
            if provider_config.get("provider_id") == "xai-grok-imagine-video":
                if provider_config.get("data_transfer_approval_status") != "approved" or provider_config.get("reference_rights_clearance_status") != "cleared":
                    errors.append(f"{label} cannot use xAI references without transfer and rights approval")
            if generation.get("provider_id") != provider_config.get("provider_id"):
                errors.append(f"{label} provider_id must match the connected provider manifest")
        if state == "not-started":
            for field in ("provider_job_id", "model_id", "output_path", "output_sha256", "dropbox_file_id", "dropbox_path"):
                if generation.get(field) is not None:
                    errors.append(f"{label} must not claim {field} before generation")
            if generation.get("reopened_from_dropbox") is not False:
                errors.append(f"{label} cannot claim Dropbox verification before generation")
        elif state == "generated-local":
            required_fields = (
                "provider_id", "provider_job_id", "provider_output_id", "provider_output_file_id",
                "model_id", "prompt_revision", "prompt_sha256",
                "submitted_prompt", "submitted_prompt_sha256", "reference_asset_ids",
                "submitted_at", "completed_at", "output_path", "output_sha256",
                "first_frame_sha256", "last_frame_sha256", "continuity_status", "media_metadata",
                "first_frame_file_id", "last_frame_file_id",
            )
            for field in required_fields:
                if generation.get(field) is None or generation.get(field) == "":
                    errors.append(f"{label} generated-local output requires {field}")
            if shot.get("status") != "generated-local":
                errors.append(f"{label} shot status must be generated-local")
            if generation.get("provider_output_file_id") != generation.get("provider_output_id"):
                errors.append(f"{label} provider output file ID fields must match")
            if generation.get("prompt_revision") != shot.get("revision"):
                errors.append(f"{label} prompt_revision must match the shot revision")
            prompt_hash = hashlib.sha256(shot.get("prompt", "").encode("utf-8")).hexdigest()
            if generation.get("prompt_sha256") != prompt_hash:
                errors.append(f"{label} prompt_sha256 must match the approved prompt template")
            submitted_prompt = generation.get("submitted_prompt")
            if isinstance(submitted_prompt, str):
                submitted_hash = hashlib.sha256(submitted_prompt.encode("utf-8")).hexdigest()
                if generation.get("submitted_prompt_sha256") != submitted_hash:
                    errors.append(f"{label} submitted_prompt_sha256 does not match the exact API prompt")
            source_refs = shot.get("reference_assets", [])
            expected_refs = [item.get("asset_id") for item in source_refs if isinstance(item, dict)] if isinstance(source_refs, list) else []
            if generation.get("reference_asset_ids") != expected_refs:
                errors.append(f"{label} generation reference_asset_ids do not match the approved shot references")
            for field in ("output_sha256", "first_frame_sha256", "last_frame_sha256"):
                if not re.fullmatch(r"[a-fA-F0-9]{64}", str(generation.get(field, ""))):
                    errors.append(f"{label} {field} must be a 64-character hex digest")
            media = _safe_project_file(project_root, generation.get("output_path", ""))
            if media is None:
                errors.append(f"{label} output file is missing or escapes the project directory")
            elif _sha256(media) != generation.get("output_sha256"):
                errors.append(f"{label} output SHA-256 does not match the registered file")
            metadata = generation.get("media_metadata")
            if not isinstance(metadata, dict):
                errors.append(f"{label} generated-local output requires ffprobe media_metadata")
            else:
                for field in ("duration_seconds", "frame_rate", "width", "height", "video_codec", "audio_codec"):
                    if metadata.get(field) is None:
                        errors.append(f"{label} media_metadata requires {field}")
                media_duration = metadata.get("duration_seconds")
                if isinstance(media_duration, (int, float)) and not isinstance(media_duration, bool) and abs(media_duration - duration) > 0.25:
                    errors.append(f"{label} probed media duration does not match the shot duration")
            if generation.get("dropbox_file_id") is not None or generation.get("dropbox_path") is not None:
                errors.append(f"{label} generated-local state must not claim Dropbox verification")
            if generation.get("reopened_from_dropbox") is not False or generation.get("metadata_verified") is not False:
                errors.append(f"{label} generated-local state cannot claim Dropbox verification")
        elif state == "completed":
            required_fields = (
                "provider_id", "provider_job_id", "provider_output_id", "provider_output_file_id", "model_id",
                "prompt_revision", "prompt_sha256", "submitted_prompt", "submitted_prompt_sha256", "reference_asset_ids",
                "submitted_at", "completed_at", "output_path", "output_sha256",
                "first_frame_sha256", "last_frame_sha256", "continuity_status", "media_metadata",
                "dropbox_file_id", "dropbox_path",
            )
            for field in required_fields:
                if generation.get(field) is None or generation.get(field) == "":
                    errors.append(f"{label} completed output requires {field}")
            if shot.get("status") != "completed":
                errors.append(f"{label} shot status must be completed")
            if generation.get("provider_output_file_id") != generation.get("provider_output_id"):
                errors.append(f"{label} provider output file ID fields must match")
            if generation.get("provider_id") != provider.get("provider_id"):
                errors.append(f"{label} provider_id does not match provider manifest")
            prompt_hash = hashlib.sha256(shot.get("prompt", "").encode("utf-8")).hexdigest()
            if generation.get("prompt_sha256") != prompt_hash:
                errors.append(f"{label} prompt_sha256 does not match the approved prompt template")
            submitted_prompt = generation.get("submitted_prompt")
            if isinstance(submitted_prompt, str):
                submitted_hash = hashlib.sha256(submitted_prompt.encode("utf-8")).hexdigest()
                if generation.get("submitted_prompt_sha256") != submitted_hash:
                    errors.append(f"{label} submitted_prompt_sha256 does not match the exact API prompt")
            if generation.get("prompt_revision") != shot.get("revision"):
                errors.append(f"{label} prompt_revision must match the shot revision")
            source_refs = shot.get("reference_assets", [])
            expected_refs = [item.get("asset_id") for item in source_refs if isinstance(item, dict)] if isinstance(source_refs, list) else []
            if generation.get("reference_asset_ids") != expected_refs:
                errors.append(f"{label} generation reference_asset_ids do not match the approved shot references")
            for field in ("output_sha256", "first_frame_sha256", "last_frame_sha256"):
                if not re.fullmatch(r"[a-fA-F0-9]{64}", str(generation.get(field, ""))):
                    errors.append(f"{label} {field} must be a 64-character hex digest")
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
    ordered_shots = sorted(
        [item for item in shot_list if isinstance(item, dict)],
        key=lambda item: item.get("sequence_order", 0) if isinstance(item.get("sequence_order"), int) else 0,
    )
    for index, current in enumerate(ordered_shots):
        current_generation = current.get("generation", {}) if isinstance(current.get("generation"), dict) else {}
        current_state = current_generation.get("status")
        if current_state not in {"generated-local", "completed"}:
            continue
        if index == 0:
            if current_generation.get("continuity_status") != "initial":
                errors.append("first generated segment must record continuity_status=initial")
            continue
        previous = ordered_shots[index - 1]
        previous_generation = previous.get("generation", {}) if isinstance(previous.get("generation"), dict) else {}
        if previous_generation.get("status") not in {"generated-local", "completed"}:
            errors.append(f"segment {current.get('shot_id')} cannot be verified without its previous segment")
            continue
        if current.get("continuity_key") != previous.get("continuity_key"):
            errors.append("continuous sequence segments must share one continuity_key")
        if not _nonempty(current_generation.get("pinned_first_frame_file_id")):
            errors.append(f"segment {current.get('shot_id')} must record the pinned prior-frame file ID")
        if current_generation.get("first_frame_file_id") != current_generation.get("pinned_first_frame_file_id"):
            errors.append(f"segment {current.get('shot_id')} first-frame file ID must match its pinned frame ID")
        if current_generation.get("first_frame_sha256") != previous_generation.get("last_frame_sha256"):
            errors.append(f"segment {current.get('shot_id')} first frame does not match the previous segment final frame")
        if current_generation.get("continuity_status") != "passed":
            errors.append(f"segment {current.get('shot_id')} must record a passed frame-boundary continuity check")
    sequence_policy = shots.get("sequence_policy")
    if not isinstance(sequence_policy, dict) or sequence_policy.get("no_mock_fallback") is not True:
        errors.append("sequence policy must prohibit mock fallback")
    elif sequence_policy.get("segment_count") is not None:
        if sequence_policy.get("segment_count") != len(shot_list):
            errors.append("sequence_policy segment_count must match the shot list")
        if sequence_policy.get("segment_boundary_frame_match_required") is not True:
            errors.append("continuous sequence requires frame-identical segment boundaries")
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
    if not isinstance(minimum, int) or isinstance(minimum, bool) or minimum < 2:
        blockers.append("minimum_independent_generated_shots must be an integer of at least two")
        minimum = 2
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
    visual_review = acceptance.get("visual_review")
    if not isinstance(visual_review, dict) or visual_review.get("status") != "approved":
        blockers.append("final-growth multi-angle visual review has not been approved")
    return {
        "accepted": not blockers,
        "status": "accepted" if not blockers else "blocked-preproduction",
        "completed_shots": len(completed),
        "required_shots": minimum,
        "blockers": blockers,
    }

def validate_staged_references(project_root: Path, required_asset_ids: list[str], reference_library: dict) -> dict:
    registry_path = project_root / "07_MANIFESTS" / "reference_imports.json"
    required = list(dict.fromkeys(required_asset_ids)) if isinstance(required_asset_ids, list) else []
    report = {"verified": False, "required_asset_ids": required, "verified_asset_ids": [], "missing_asset_ids": [], "errors": []}
    if not registry_path.is_file():
        report["missing_asset_ids"] = required
        report["errors"].append("reference_imports.json is missing; no library images have been staged")
        return report
    try:
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        report["missing_asset_ids"] = required
        report["errors"].append(f"reference import registry cannot be read: {exc}")
        return report
    if not isinstance(registry, dict) or registry.get("schema") != "geehub.reference-imports/1" or registry.get("project_id") != reference_library.get("project_id") or not isinstance(registry.get("assets"), list):
        report["missing_asset_ids"] = required
        report["errors"].append("reference import registry schema or project_id is invalid")
        return report
    references = {item.get("asset_id"): item for item in reference_library.get("assets", []) if isinstance(item, dict)}
    imported = {item.get("asset_id"): item for item in registry["assets"] if isinstance(item, dict)}
    for asset_id in required:
        reference = references.get(asset_id)
        record = imported.get(asset_id)
        if reference is None or record is None:
            report["missing_asset_ids"].append(asset_id)
            continue
        staged_path = _safe_project_file(project_root, record.get("path", ""))
        sidecar_path = _safe_project_file(project_root, record.get("sidecar", ""))
        if staged_path is None or sidecar_path is None:
            report["missing_asset_ids"].append(asset_id)
            report["errors"].append(f"{asset_id}: staged image or provenance sidecar is missing/outside the project")
            continue
        try:
            sidecar = json.loads(sidecar_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            report["missing_asset_ids"].append(asset_id)
            report["errors"].append(f"{asset_id}: provenance sidecar cannot be read")
            continue
        actual_hash = _sha256(staged_path)
        if not isinstance(sidecar, dict):
            report["missing_asset_ids"].append(asset_id)
            report["errors"].append(f"{asset_id}: provenance sidecar must be a JSON object")
            continue
        library = sidecar.get("library", {})
        staged = sidecar.get("staged", {})
        integrity = sidecar.get("integrity", {})
        source = sidecar.get("source", {})
        valid = (
            sidecar.get("asset_id") == asset_id
            and sidecar.get("project_id") == reference_library.get("project_id")
            and staged.get("path") == record.get("path")
            and staged.get("sha256") == actual_hash == record.get("sha256")
            and source.get("sha256") == actual_hash
            and library.get("file_id") == reference.get("file_id")
            and library.get("library_file_id") == reference.get("library_file_id")
            and integrity.get("verified") is True
            and integrity.get("copy_matches_source") is True
            and source.get("original_modified") is False
            and record.get("size_bytes") == staged_path.stat().st_size
        )
        if valid:
            report["verified_asset_ids"].append(asset_id)
        else:
            report["missing_asset_ids"].append(asset_id)
            report["errors"].append(f"{asset_id}: staged image provenance or checksum verification failed")
    report["verified"] = not report["missing_asset_ids"] and not report["errors"]
    return report


def validate_cost_approval_manifest(approval: object, provider: object, shots: object) -> list[str]:
    if not isinstance(approval, dict):
        return ["provider cost approval manifest must be an object"]
    if not isinstance(provider, dict) or not isinstance(shots, dict):
        return ["provider and shot manifests are required to validate cost approval"]
    errors = []
    if approval.get("schema") != "geehub.provider-cost-approval/1":
        errors.append("cost approval schema must be geehub.provider-cost-approval/1")
    if approval.get("project_id") != shots.get("project_id"):
        errors.append("cost approval project_id must match the shot manifest")
    if approval.get("provider_id") != provider.get("provider_id"):
        errors.append("cost approval provider_id must match the provider manifest")
    if approval.get("status") not in {"not-granted", "approved"}:
        errors.append("cost approval status must be not-granted or approved")
    if approval.get("status") != provider.get("cost_approval_status"):
        errors.append("cost approval status must match the provider manifest")
    workflow = provider.get("generation_workflow", {}) if isinstance(provider.get("generation_workflow"), dict) else {}
    pricing = provider.get("pricing", {}) if isinstance(provider.get("pricing"), dict) else {}
    for field, expected in (
        ("model", workflow.get("model_id")),
        ("resolution", workflow.get("resolution", pricing.get("resolution"))),
        ("total_duration_seconds", workflow.get("total_duration_seconds")),
    ):
        if approval.get(field) != expected:
            errors.append(f"cost approval {field} must match the provider workflow")
    first_shot = shots.get("shots", [{}])[0] if isinstance(shots.get("shots"), list) and shots.get("shots") else {}
    reference_records = first_shot.get("reference_assets", []) if isinstance(first_shot, dict) else []
    expected_refs = [item.get("asset_id") for item in reference_records if isinstance(item, dict)]
    if approval.get("reference_asset_ids") != expected_refs:
        errors.append("cost approval reference_asset_ids must match the selected shot references")
    if approval.get("status") == "approved":
        if not _nonempty(approval.get("approved_by")) or not _nonempty(approval.get("approved_at")):
            errors.append("approved cost record requires approved_by and approved_at")
        maximum = approval.get("max_usd")
        estimate = pricing.get("estimated_total_usd")
        if isinstance(maximum, bool) or not isinstance(maximum, (int, float)) or not math.isfinite(maximum):
            errors.append("approved cost record requires a finite max_usd")
        elif isinstance(estimate, (int, float)) and maximum < estimate:
            errors.append("approved max_usd is below the provider workflow estimate")
        if approval.get("reference_data_transfer_approved") is not True:
            errors.append("approved cost record must explicitly authorize reference-image transfer")
        if approval.get("reference_rights_cleared") is not True:
            errors.append("approved cost record must confirm reference-image usage rights")
    if provider.get("generation_enabled") is True and approval.get("status") != "approved":
        errors.append("provider generation cannot be enabled without an approved cost record")
    return errors


def load_and_validate(project_root: Path) -> tuple[list[str], dict]:
    manifests = project_root / "07_MANIFESTS"
    try:
        shots = json.loads((manifests / "shots.json").read_text(encoding="utf-8"))
        provider = json.loads((manifests / "video_provider.json").read_text(encoding="utf-8"))
        acceptance = json.loads((manifests / "production_acceptance.json").read_text(encoding="utf-8"))
        cost_approval = json.loads((manifests / "cost_approval.json").read_text(encoding="utf-8"))
        references = json.loads((manifests / "reference_library.json").read_text(encoding="utf-8"))
        growth_profile = json.loads((manifests / "growth_profile.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"could not load production manifests: {exc}"], {}
    errors = validate_provider_manifest(provider)
    errors.extend(validate_shot_manifest(shots, references, provider, project_root))
    errors.extend(validate_cost_approval_manifest(cost_approval, provider, shots))
    if not isinstance(shots, dict) or not isinstance(acceptance, dict):
        errors.append("shot or acceptance manifest must be a JSON object")
        return errors, {}
    if acceptance.get("schema") != "geehub.video-production-acceptance/1" or acceptance.get("project_id") != shots.get("project_id"):
        errors.append("production acceptance manifest schema or project_id is invalid")
    report = evaluate_acceptance(shots, acceptance, project_root)
    required_reference_ids = growth_profile.get("deformation", {}).get("pectorals", {}).get("reference_assets", []) if isinstance(growth_profile, dict) else []
    staging = validate_staged_references(project_root, required_reference_ids, references)
    report["reference_staging"] = staging
    if not staging["verified"]:
        report["blockers"].append("all six canonical image-library references must be staged and checksum-verified")
    provider_record = provider if isinstance(provider, dict) else {}
    report["cost_approval"] = {
        "status": cost_approval.get("status") if isinstance(cost_approval, dict) else None,
        "estimated_cost_usd": provider_record.get("pricing", {}).get("estimated_total_usd") if isinstance(provider_record.get("pricing"), dict) else None,
        "reference_data_transfer_approved": cost_approval.get("reference_data_transfer_approved") if isinstance(cost_approval, dict) else False,
        "reference_rights_cleared": cost_approval.get("reference_rights_cleared") if isinstance(cost_approval, dict) else False,
    }
    if provider_record.get("connection_status") != "connected":
        report["blockers"].append("xAI API key is not configured or the provider is not connected")
    if provider_record.get("cost_approval_status") != "approved":
        report["blockers"].append("explicit model-generation cost approval has not been granted")
    if provider_record.get("data_transfer_approval_status") != "approved":
        report["blockers"].append("selected image-library references have not been approved for transfer to xAI")
    if provider_record.get("reference_rights_clearance_status") != "cleared":
        report["blockers"].append("rights to use and transfer the selected reference images have not been cleared")
    if provider_record.get("generation_enabled") is not True:
        report["blockers"].append("provider generation remains disabled")
    try:
        production = json.loads((project_root / "production.json").read_text(encoding="utf-8"))
        storage_status = production.get("storage", {}).get("status") if isinstance(production, dict) else None
    except (OSError, json.JSONDecodeError):
        storage_status = None
        errors.append("project production.json or storage status is unavailable")
    if storage_status != "provisioned-and-verified":
        report["blockers"].append("canonical Dropbox project folder has not been provisioned and verified")
    report["accepted"] = not report["blockers"]
    report["status"] = "accepted" if report["accepted"] else "blocked-preproduction"
    return errors, {"provider": provider_record.get("display_name"), "shot_count": len(shots.get("shots", [])), "acceptance": report}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path(os.environ.get("GEEHUB_PROJECT_ROOT", str(Path(__file__).resolve().parents[2] / "production" / "projects" / "hulums-lab-serum-60s"))).expanduser())
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
