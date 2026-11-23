#!/usr/bin/env python3
"""Cost-gated xAI Grok Imagine Video adapter for continuous GEEHUB sequences.

Estimate/check never make API calls. Paid generation requires an explicit
project approval record, generation_enabled=true, XAI_API_KEY, and staged
reference images. Credentials are read only from the environment.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

API_BASE = "https://api.x.ai/v1"
VIDEO_MODEL = "grok-imagine-video-1.5"
MAX_REFERENCE_IMAGES = 14
MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
# Reference-to-video is limited to 720p; 1080p is image-to-video only.
ALLOWED_RESOLUTIONS = {"480p", "720p"}
ALLOWED_ASPECT_RATIOS = {"1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "5:2"}
PRICE_PER_SECOND_USD = {
    "grok-imagine-video-1.5": {"480p": 0.08, "720p": 0.14},
    "grok-imagine-video-1.5-lite": {"480p": 0.02, "720p": 0.03},
    "grok-imagine-video": {"480p": 0.05, "720p": 0.07},
}
PRICING_SOURCE = "https://docs.x.ai/developers/model-capabilities/video/overview"
PRICING_CHECKED_AT = "2026-11-23"
DEFAULT_REFERENCE_ASSETS = [
    "car-bearded-base",
    "car-bearded-variation-01",
    "car-bearded-variation-02",
    "doorway-scale-reference",
    "bedroom-scale-reference",
    "denim-cutoffs-reference",
]
DEFAULT_SEGMENT_PROMPTS = [
    "Segment 1 of 4. Establish one clearly adult fictional male subject in the clinical observation room, medium-wide front three-quarter composition, head through upper thighs visible, calm neutral expression, subtle breathing, cool white and blue industrial laboratory light. The subject begins at a balanced athletic baseline. Use <IMAGE_0>, <IMAGE_1> and <IMAGE_2> only for the primary paired pectoral shape, chest-hair distribution and chest surface; use <IMAGE_3>, <IMAGE_4> and <IMAGE_5> only for overall scale, room scale and denim garment behavior. Do not copy any reference person's identity, face or environment. Keep one coherent subject, camera, lighting and room. A restrained serum activation begins near the end. No cuts, no sudden morph, no extra limbs, no text, no logo, non-explicit adult presentation.",
    "Segment 2 of 4. Continue from the exact pinned final frame of the previous segment. Preserve the same fictional adult face, beard, hairline, skin tone, body position, lens, camera side, room, lighting and denim cutoffs. A gradual transformation develops the paired pectoralis major: fuller rounded lobes, clear but natural medial cleft, forward projection, upper-chest fullness and a stronger lower shelf, with a smooth transition into the deltoids. Keep the sternum and ribcage coherent. No identity drift, no cuts, no sudden size jump, no extra limbs, no text, no logo, non-explicit adult presentation.",
    "Segment 3 of 4. Continue from the exact pinned final frame of the previous segment with uninterrupted identity and spatial continuity. The shoulders, deltoids, arms, traps, lats and upper back gain proportionate mass around the already-developed chest. Preserve the chest's paired rounded shape, medial separation, chest-hair pattern and forward projection. Keep the waist and ribcage connected and believable; maintain the same camera movement, laboratory geometry, lighting and wardrobe. No cuts, no melting textures, no extra limbs, no text, no logo, non-explicit adult presentation.",
    "Segment 4 of 4. Continue from the exact pinned final frame of the previous segment. Complete the balanced full-body transformation with coherent torso, arm and leg proportions while preserving the established face and chest shape. The subject settles into a stable final baseline; hold the completed form steadily for the final five seconds. Maintain the same room, lens, camera side, lighting and denim cutoffs. No cuts, no identity drift, no extra limbs, no text, no logo, non-explicit adult presentation.",
]


class XAIError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return data


def write_json_atomic(path: Path, data: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    absolute_parent = path.parent.absolute()
    if path.is_symlink() or absolute_parent.resolve() != absolute_parent:
        raise ValueError(f"Refusing to write through a symlink: {path}")
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False
    ) as handle:
        temporary = Path(handle.name)
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    temporary.replace(path)


def plan_segments(total_seconds: int = 60, segment_seconds: int = 15) -> list[dict]:
    if isinstance(total_seconds, bool) or not isinstance(total_seconds, int) or not 1 <= total_seconds <= 300:
        raise ValueError("total_seconds must be an integer between 1 and 300")
    if isinstance(segment_seconds, bool) or not isinstance(segment_seconds, int) or not 1 <= segment_seconds <= 15:
        raise ValueError("segment_seconds must be an integer between 1 and 15")
    result = []
    start = 0
    while start < total_seconds:
        duration = min(segment_seconds, total_seconds - start)
        result.append({
            "sequence_order": len(result) + 1,
            "start_seconds": start,
            "end_seconds": start + duration,
            "duration_seconds": duration,
        })
        start += duration
    return result


def estimate_video_cost(model: str, resolution: str, duration_seconds: int | float) -> float:
    if model not in PRICE_PER_SECOND_USD or resolution not in PRICE_PER_SECOND_USD[model]:
        raise ValueError(f"Unsupported model/resolution pricing combination: {model} / {resolution}")
    if isinstance(duration_seconds, bool) or not isinstance(duration_seconds, (int, float)) or not math.isfinite(duration_seconds) or duration_seconds <= 0:
        raise ValueError("duration_seconds must be a positive finite number")
    return round(float(duration_seconds) * PRICE_PER_SECOND_USD[model][resolution], 2)


def estimate_continuous_sequence(
    total_seconds: int = 60, segment_seconds: int = 15, resolution: str = "720p"
) -> dict:
    segments = plan_segments(total_seconds, segment_seconds)
    cost = sum(estimate_video_cost(VIDEO_MODEL, resolution, item["duration_seconds"]) for item in segments)
    return {
        "provider": "xAI",
        "model": VIDEO_MODEL,
        "mode": "reference-to-video with pinned first frame on continuation segments",
        "resolution": resolution,
        "total_duration_seconds": total_seconds,
        "segment_count": len(segments),
        "segments": segments,
        "price_per_second_usd": PRICE_PER_SECOND_USD[VIDEO_MODEL][resolution],
        "estimated_cost_usd": round(cost, 2),
        "pricing_source": PRICING_SOURCE,
        "pricing_checked_at": PRICING_CHECKED_AT,
        "note": "Estimate only; excludes taxes, retries, image generation, storage and post-production services.",
    }


def prompt_with_reference_slots(prompt: str, pinned_first_frame: bool, reference_count: int = 6) -> str:
    """Shift reference-image tokens when the pinned first frame occupies IMAGE_0."""
    if not pinned_first_frame:
        return prompt
    for index in reversed(range(MAX_REFERENCE_IMAGES)):
        prompt = prompt.replace(f"<IMAGE_{index}>", f"__GEEHUB_IMAGE_{index}__")
    for index in range(MAX_REFERENCE_IMAGES):
        prompt = prompt.replace(f"__GEEHUB_IMAGE_{index}__", f"<IMAGE_{index + 1}>")
    reference_end = max(1, min(reference_count, MAX_REFERENCE_IMAGES))
    return (
        "The pinned first frame is <IMAGE_0>; preserve it as the exact opening frame. "
        f"The selected image-library references occupy <IMAGE_1> through <IMAGE_{reference_end}>; "
        "use them only for the approved physique, scale and garment references, never to copy a real person's identity. "
        + prompt
    )


def build_generation_payload(
    prompt: str,
    reference_file_ids: list[str],
    duration_seconds: int,
    filename: str,
    first_frame_file_id: str | None = None,
    resolution: str = "720p",
    aspect_ratio: str = "16:9",
) -> dict:
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 10000:
        raise ValueError("prompt must contain 1–10,000 characters")
    if isinstance(duration_seconds, bool) or not isinstance(duration_seconds, int) or not 1 <= duration_seconds <= 15:
        raise ValueError("grok-imagine-video-1.5 duration must be an integer from 1 to 15 seconds")
    if resolution not in ALLOWED_RESOLUTIONS:
        raise ValueError(f"Reference-to-video does not support this resolution: {resolution}")
    if aspect_ratio not in ALLOWED_ASPECT_RATIOS:
        raise ValueError(f"Unsupported aspect ratio: {aspect_ratio}")
    if not isinstance(reference_file_ids, list) or not 1 <= len(reference_file_ids) <= MAX_REFERENCE_IMAGES:
        raise ValueError(f"Provide between 1 and {MAX_REFERENCE_IMAGES} reference image file IDs")
    if any(not isinstance(value, str) or not value.strip() for value in reference_file_ids):
        raise ValueError("Reference file IDs must be non-empty strings")
    if not isinstance(filename, str) or Path(filename).name != filename:
        raise ValueError("Output filename must be a simple filename, not a path")
    safe_filename = filename
    if not safe_filename or safe_filename in {".", ".."} or any(ch in safe_filename for ch in ("\r", "\n", "\\", '"')):
        raise ValueError("Output filename contains unsupported characters")
    payload = {
        "model": VIDEO_MODEL,
        "prompt": prompt.strip(),
        "duration": duration_seconds,
        "resolution": resolution,
        "aspect_ratio": aspect_ratio,
        "reference_images": [{"file_id": value} for value in reference_file_ids],
        "generate_audio": False,
        "storage_options": {"filename": safe_filename, "expires_after": 604800},
    }
    if first_frame_file_id:
        payload["image"] = {"file_id": first_frame_file_id}
    return payload


def validate_generation_authorization(
    provider: dict, approval: dict, estimate: dict, project_id: str,
    reference_asset_ids: list[str] | None = None,
) -> None:
    if not isinstance(provider, dict) or not isinstance(approval, dict):
        raise ValueError("Provider and cost-approval manifests must be JSON objects")
    if provider.get("provider_id") != "xai-grok-imagine-video":
        raise ValueError("Provider manifest does not select xAI Grok Imagine Video")
    if provider.get("api_adapter_status") != "implemented":
        raise ValueError("xAI adapter is not marked implemented in video_provider.json")
    if provider.get("connection_status") != "connected":
        raise ValueError("xAI connection is not marked connected; configure XAI_API_KEY first")
    if provider.get("generation_enabled") is not True:
        raise ValueError("Paid generation is disabled in video_provider.json")
    if provider.get("cost_approval_required") is not True or provider.get("cost_approval_status") != "approved":
        raise ValueError("Explicit provider cost approval has not been granted")
    if provider.get("data_transfer_approval_status") != "approved":
        raise ValueError("Reference-image transfer to xAI has not been explicitly approved")
    if provider.get("reference_rights_clearance_status") != "cleared":
        raise ValueError("Reference-image usage rights have not been cleared")
    if approval.get("schema") != "geehub.provider-cost-approval/1" or approval.get("status") != "approved":
        raise ValueError("A valid approved cost_approval.json record is required")
    if approval.get("project_id") != project_id or approval.get("provider_id") != "xai-grok-imagine-video":
        raise ValueError("Cost approval does not match this project and provider")
    if not isinstance(approval.get("approved_by"), str) or not approval["approved_by"].strip():
        raise ValueError("Cost approval must identify the approving user")
    if not isinstance(approval.get("approved_at"), str) or not approval["approved_at"].strip():
        raise ValueError("Cost approval must include an approval timestamp")
    maximum = approval.get("max_usd")
    if isinstance(maximum, bool) or not isinstance(maximum, (int, float)) or not math.isfinite(maximum):
        raise ValueError("Cost approval max_usd must be a finite number")
    if maximum < estimate["estimated_cost_usd"]:
        raise ValueError(
            f"Approved maximum USD {maximum:.2f} is below estimated USD {estimate['estimated_cost_usd']:.2f}"
        )
    if approval.get("model") != estimate["model"] or approval.get("resolution") != estimate["resolution"]:
        raise ValueError("Cost approval model/resolution does not match the requested generation plan")
    if approval.get("total_duration_seconds") != estimate["total_duration_seconds"]:
        raise ValueError("Cost approval duration does not match the requested generation plan")
    if approval.get("segment_duration_seconds") != estimate["segments"][0]["duration_seconds"]:
        raise ValueError("Cost approval segment duration does not match the requested generation plan")
    if approval.get("estimated_cost_usd") != estimate["estimated_cost_usd"]:
        raise ValueError("Cost approval estimate does not match the current provider price estimate")
    if approval.get("reference_data_transfer_approved") is not True:
        raise ValueError("Cost approval does not authorize transfer of the selected reference images")
    if approval.get("reference_rights_cleared") is not True:
        raise ValueError("Cost approval does not confirm rights to use the selected reference images")
    if reference_asset_ids is not None and approval.get("reference_asset_ids") != reference_asset_ids:
        raise ValueError("Cost approval reference asset IDs do not match the selected image-library assets")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class _AllowlistedRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        host = urllib.parse.urlparse(newurl).hostname
        if host not in {"vidgen.x.ai", "files-cdn.x.ai"}:
            raise XAIError("Video download redirected to an unapproved host")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class XAIClient:
    def __init__(
        self,
        api_key: str | None = None,
        timeout: int = 60,
        opener=None,
        download_opener=None,
    ):
        self.api_key = api_key or os.environ.get("XAI_API_KEY")
        if not self.api_key:
            raise XAIError("XAI_API_KEY is not configured; no request was sent")
        if not isinstance(self.api_key, str) or "\n" in self.api_key or "\r" in self.api_key:
            raise XAIError("XAI_API_KEY has an invalid format")
        self.timeout = timeout
        self.opener = opener or urllib.request.build_opener(_NoRedirect()).open
        self.download_opener = download_opener or urllib.request.build_opener(_AllowlistedRedirects()).open

    def request_json(self, method: str, path: str, payload: dict | None = None, body: bytes | None = None, content_type: str | None = None) -> dict:
        if not path.startswith("/") or "://" in path or ".." in path:
            raise ValueError("API path must be a fixed path below /v1")
        if payload is not None and body is not None:
            raise ValueError("Provide either JSON payload or raw body, not both")
        data = body
        headers = {"Authorization": f"Bearer {self.api_key}", "Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif content_type:
            headers["Content-Type"] = content_type
        request = urllib.request.Request(API_BASE + path, data=data, headers=headers, method=method)
        try:
            with self.opener(request, timeout=self.timeout) as response:
                status = getattr(response, "status", response.getcode())
                raw = response.read()
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            message = raw.decode("utf-8", "replace")[:1200]
            raise XAIError(f"xAI API returned HTTP {exc.code}: {message}", exc.code) from exc
        except urllib.error.URLError as exc:
            raise XAIError(f"xAI API connection failed: {exc.reason}") from exc
        if status < 200 or status >= 300:
            raise XAIError(f"xAI API returned HTTP {status}: {raw.decode('utf-8', 'replace')[:1200]}", status)
        if not raw:
            return {}
        try:
            result = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise XAIError("xAI API returned invalid JSON") from exc
        if not isinstance(result, dict):
            raise XAIError("xAI API response must be a JSON object")
        return result

    def upload_file(self, path: Path) -> dict:
        path = Path(path).expanduser().resolve(strict=True)
        if not path.is_file():
            raise ValueError("Only regular files can be uploaded to xAI Files API")
        size = path.stat().st_size
        if size <= 0 or size > MAX_FILE_BYTES:
            raise ValueError("xAI Files API accepts files up to 50 MB")
        filename = path.name.replace('"', "").replace("\r", "").replace("\n", "")
        mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        boundary = "----GEEHUB" + uuid.uuid4().hex
        body = b"".join([
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"expires_after\"\r\n\r\n604800\r\n".encode("ascii"),
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\nassistants\r\n".encode("ascii"),
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n".encode("utf-8"),
            f"Content-Type: {mime}\r\n\r\n".encode("ascii"),
            path.read_bytes(),
            f"\r\n--{boundary}--\r\n".encode("ascii"),
        ])
        result = self.request_json("POST", "/files", body=body, content_type=f"multipart/form-data; boundary={boundary}")
        if not isinstance(result.get("id"), str) or not result["id"].strip():
            raise XAIError("xAI Files API upload response did not include a file ID")
        if result.get("bytes") is not None and result["bytes"] != size:
            raise XAIError("xAI Files API upload size does not match the local source")
        return result

    def get_file(self, file_id: str) -> dict:
        if not isinstance(file_id, str) or not re.fullmatch(r"file[-_][A-Za-z0-9_-]+", file_id):
            raise ValueError("Invalid xAI file ID")
        return self.request_json("GET", "/files/" + urllib.parse.quote(file_id, safe=""))

    def submit_generation(self, payload: dict) -> dict:
        if payload.get("model") != VIDEO_MODEL:
            raise ValueError("Continuous reference workflow requires grok-imagine-video-1.5")
        result = self.request_json("POST", "/videos/generations", payload=payload)
        if not isinstance(result.get("request_id"), str) or not result["request_id"].strip():
            raise XAIError("xAI video generation response did not include request_id")
        return result

    def poll_video(
        self,
        request_id: str,
        timeout_seconds: int = 600,
        poll_interval: float = 5.0,
        sleep_fn: Callable[[float], None] = time.sleep,
        clock_fn: Callable[[], float] = time.monotonic,
    ) -> dict:
        if not isinstance(request_id, str) or not re.fullmatch(r"[A-Za-z0-9-]{8,128}", request_id):
            raise ValueError("Invalid xAI video request ID")
        deadline = clock_fn() + timeout_seconds
        while clock_fn() <= deadline:
            result = self.request_json("GET", "/videos/" + urllib.parse.quote(request_id, safe=""))
            status = result.get("status")
            if status == "done":
                if not isinstance(result.get("video"), dict) or not result["video"].get("url"):
                    raise XAIError("Completed xAI video response has no video URL")
                return result
            if status in {"failed", "expired"}:
                raise XAIError(f"xAI video request {request_id} ended with status {status}: {result.get('error', '')}")
            sleep_fn(poll_interval)
        raise XAIError(f"Timed out waiting for xAI video request {request_id}")

    def download_video(self, url: str, destination: Path) -> dict:
        parsed = urllib.parse.urlparse(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in {"vidgen.x.ai", "files-cdn.x.ai"}
            or parsed.username or parsed.password
            or parsed.port not in {None, 443}
        ):
            raise ValueError("Refusing video download from an unapproved URL host")
        destination = Path(destination)
        if destination.exists() or destination.is_symlink():
            raise FileExistsError(f"Refusing to overwrite an existing provider output: {destination}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(destination.name + "." + uuid.uuid4().hex + ".tmp")
        request = urllib.request.Request(url, headers={"User-Agent": "GEEHUB-xAI-Adapter/1.0"})
        digest = hashlib.sha256()
        total = 0
        try:
            with self.download_opener(request, timeout=max(self.timeout, 120)) as response, temporary.open("xb") as output:
                content_type = response.headers.get("Content-Type", "")
                if content_type and not (content_type.startswith("video/") or content_type == "application/octet-stream"):
                    raise XAIError(f"Unexpected video download content type: {content_type}")
                while True:
                    block = response.read(1024 * 1024)
                    if not block:
                        break
                    total += len(block)
                    if total > MAX_VIDEO_BYTES:
                        raise XAIError("Video download exceeded the 2 GB safety limit")
                    output.write(block)
                    digest.update(block)
                output.flush()
                os.fsync(output.fileno())
            if total <= 0:
                raise XAIError("xAI video download was empty")
            temporary.replace(destination)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise
        return {"path": str(destination), "size_bytes": total, "sha256": digest.hexdigest()}


def load_staged_reference_assets(project: Path, asset_ids: list[str]) -> list[dict]:
    project = Path(project).expanduser().resolve(strict=True)
    manifests = project / "07_MANIFESTS"
    library = load_json(manifests / "reference_library.json")
    registry_path = manifests / "reference_imports.json"
    if not registry_path.is_file() or registry_path.is_symlink():
        raise ValueError("Reference images have not been staged; run stage_reference_image.py first")
    registry = load_json(registry_path)
    if registry.get("schema") != "geehub.reference-imports/1" or not isinstance(registry.get("assets"), list):
        raise ValueError("Reference import registry is invalid")
    library_assets = {
        item["asset_id"]: item for item in library.get("assets", [])
        if isinstance(item, dict) and isinstance(item.get("asset_id"), str)
    }
    registry_assets = {}
    for item in registry["assets"]:
        if not isinstance(item, dict) or not isinstance(item.get("asset_id"), str):
            raise ValueError("Reference import registry contains an invalid asset record")
        if item["asset_id"] in registry_assets:
            raise ValueError("Reference import registry contains duplicate asset IDs")
        registry_assets[item["asset_id"]] = item
    result = []
    for asset_id in asset_ids:
        reference = library_assets.get(asset_id)
        record = registry_assets.get(asset_id)
        if reference is None or record is None:
            raise ValueError(f"Required staged reference is missing: {asset_id}")
        relative_path, relative_sidecar = record.get("path"), record.get("sidecar")
        if not isinstance(relative_path, str) or not isinstance(relative_sidecar, str):
            raise ValueError(f"Staged reference paths are invalid: {asset_id}")
        staged_candidate = project / relative_path
        sidecar_candidate = project / relative_sidecar
        if staged_candidate.is_symlink() or sidecar_candidate.is_symlink():
            raise ValueError(f"Staged reference or provenance sidecar must not be a symlink: {asset_id}")
        staged = staged_candidate.resolve(strict=True)
        sidecar_path = sidecar_candidate.resolve(strict=True)
        if not staged.is_relative_to(project) or not sidecar_path.is_relative_to(project):
            raise ValueError(f"Staged reference path escapes the project: {asset_id}")
        if not staged.is_file() or not sidecar_path.is_file():
            raise ValueError(f"Staged reference or provenance sidecar is missing: {asset_id}")
        sidecar = load_json(sidecar_path)
        library_record = sidecar.get("library")
        staged_record = sidecar.get("staged")
        source_record = sidecar.get("source")
        integrity = sidecar.get("integrity")
        if not all(isinstance(item, dict) for item in (library_record, staged_record, source_record, integrity)):
            raise ValueError(f"Reference provenance sidecar is malformed: {asset_id}")
        digest = sha256_file(staged)
        if (
            digest != record.get("sha256")
            or digest != staged_record.get("sha256")
            or digest != source_record.get("sha256")
            or (reference.get("sha256") and digest != reference.get("sha256"))
        ):
            raise ValueError(f"Staged reference checksum mismatch: {asset_id}")
        if sidecar.get("asset_id") != asset_id or sidecar.get("project_id") != library.get("project_id"):
            raise ValueError(f"Staged reference sidecar identity mismatch: {asset_id}")
        if staged_record.get("path") != relative_path:
            raise ValueError(f"Staged reference sidecar path mismatch: {asset_id}")
        if integrity.get("verified") is not True or integrity.get("copy_matches_source") is not True:
            raise ValueError(f"Staged reference integrity record is not verified: {asset_id}")
        if library_record.get("file_id") != reference.get("file_id"):
            raise ValueError(f"Staged reference Library file ID mismatch: {asset_id}")
        if library_record.get("library_file_id") != reference.get("library_file_id"):
            raise ValueError(f"Staged reference Library ID mismatch: {asset_id}")
        if library_record.get("file_name") != reference.get("file_name"):
            raise ValueError(f"Staged reference filename mismatch: {asset_id}")
        if library_record.get("rights_status") != reference.get("rights_status"):
            raise ValueError(f"Staged reference rights provenance mismatch: {asset_id}")
        if source_record.get("original_modified") is not False:
            raise ValueError(f"Original source preservation is not verified: {asset_id}")
        if (
            staged.stat().st_size != reference.get("size_bytes")
            or staged_record.get("size_bytes") != reference.get("size_bytes")
            or source_record.get("size_bytes") != reference.get("size_bytes")
            or record.get("size_bytes") != reference.get("size_bytes")
        ):
            raise ValueError(f"Staged reference size does not match Library metadata: {asset_id}")
        if (
            reference.get("width") is not None
            and (staged_record.get("width") != reference.get("width") or record.get("width") != reference.get("width"))
        ) or (
            reference.get("height") is not None
            and (staged_record.get("height") != reference.get("height") or record.get("height") != reference.get("height"))
        ):
            raise ValueError(f"Staged reference dimensions do not match Library metadata: {asset_id}")
        if record.get("rights_status") != reference.get("rights_status"):
            raise ValueError(f"Staged reference registry rights status mismatch: {asset_id}")
        result.append({
            "asset_id": asset_id,
            "path": staged,
            "filename": staged.name,
            "size_bytes": staged.stat().st_size,
            "sha256": digest,
            "mime_type": reference["mime_type"],
            "rights_status": reference.get("rights_status"),
        })
    return result


def upload_reference_assets(client: XAIClient, project: Path, assets: list[dict]) -> dict:
    cache_path = project / "01_SOURCE" / "REFERENCE_IMAGES" / ".xai_file_cache.json"
    if cache_path.is_symlink():
        raise ValueError("Refusing to read an xAI cache through a symlink")
    cache = {"schema": "geehub.xai-file-cache/1", "assets": []}
    if cache_path.is_file():
        cache = load_json(cache_path)
        if cache.get("schema") != "geehub.xai-file-cache/1" or not isinstance(cache.get("assets"), list):
            raise ValueError("xAI reference cache is invalid")
    cached_by_id = {item.get("asset_id"): item for item in cache["assets"] if isinstance(item, dict)}
    updated = []
    for asset in assets:
        cached = cached_by_id.get(asset["asset_id"])
        reusable = (
            cached
            and cached.get("sha256") == asset["sha256"]
            and isinstance(cached.get("file_id"), str)
            and re.fullmatch(r"file[-_][A-Za-z0-9_-]+", cached["file_id"])
        )
        if reusable:
            try:
                remote = client.get_file(cached["file_id"])
                if remote.get("bytes") == asset["size_bytes"]:
                    updated.append(cached)
                    continue
            except XAIError as exc:
                if exc.status_code != 404:
                    raise
        uploaded = client.upload_file(asset["path"])
        updated.append({
            "asset_id": asset["asset_id"],
            "file_id": uploaded["id"],
            "filename": uploaded.get("filename", asset["filename"]),
            "bytes": uploaded.get("bytes", asset["size_bytes"]),
            "sha256": asset["sha256"],
            "uploaded_at": utc_now(),
        })
    write_json_atomic(cache_path, {"schema": "geehub.xai-file-cache/1", "assets": updated})
    return {item["asset_id"]: item["file_id"] for item in updated}


def probe_video(path: Path) -> dict:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise RuntimeError("ffprobe is required to validate provider-generated video")
    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe rejected {path.name}: {result.stderr[-1200:]}")
    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    video = next((item for item in streams if item.get("codec_type") == "video"), None)
    if video is None:
        raise ValueError(f"{path.name} contains no video stream")
    audio = next((item for item in streams if item.get("codec_type") == "audio"), None)
    duration_value = data.get("format", {}).get("duration", video.get("duration", 0))
    duration = float(duration_value)
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError(f"{path.name} has invalid duration")
    return {
        "duration_seconds": duration,
        "frame_rate": video.get("avg_frame_rate") or video.get("r_frame_rate"),
        "width": int(video.get("width", 0)),
        "height": int(video.get("height", 0)),
        "video_codec": video.get("codec_name"),
        "audio_codec": audio.get("codec_name") if audio else "none",
    }


def extract_frame(ffmpeg: str, video_path: Path, destination: Path, last: bool = False) -> dict:
    destination.parent.mkdir(parents=True, exist_ok=True)
    seek_args = ["-sseof", "-0.08"] if last else ["-ss", "0"]
    command = [ffmpeg, "-v", "error", *seek_args, "-i", str(video_path), "-frames:v", "1", "-y", str(destination)]
    result = subprocess.run(command, capture_output=True, text=True, timeout=60)
    if result.returncode != 0 or not destination.is_file() or destination.stat().st_size == 0:
        raise RuntimeError(f"Could not extract {'last' if last else 'first'} frame from {video_path.name}: {result.stderr[-1000:]}")
    return {"path": str(destination), "sha256": sha256_file(destination), "size_bytes": destination.stat().st_size}


def generate_continuous_sequence(
    project: Path,
    client: XAIClient,
    provider: dict,
    approval: dict,
    asset_ids: list[str] | None = None,
    total_seconds: int = 60,
    segment_seconds: int = 15,
    resolution: str = "720p",
    prompts: list[str] | None = None,
    poll_interval: float = 5.0,
    poll_timeout: int = 600,
) -> dict:
    project = Path(project).expanduser().resolve(strict=True)
    project_id = project.name
    plan = estimate_continuous_sequence(total_seconds, segment_seconds, resolution)
    shots_path = project / "07_MANIFESTS" / "shots.json"
    shots_manifest = load_json(shots_path)
    if shots_manifest.get("project_id") != project_id or shots_manifest.get("provider_id") != provider.get("provider_id"):
        raise ValueError("Shot manifest project/provider identity does not match the selected xAI project")
    shot_list = sorted(
        shots_manifest.get("shots", []),
        key=lambda item: item.get("sequence_order", 0) if isinstance(item, dict) else 0,
    )
    if len(shot_list) != len(plan["segments"]):
        raise ValueError("The shot manifest must define exactly one shot for each planned video segment")
    if prompts is not None:
        raise ValueError("Production prompts are controlled by shots.json; edit that manifest instead of overriding prompts")
    if not shot_list or not isinstance(shot_list[0], dict):
        raise ValueError("The shot manifest contains no valid segment records")
    first_refs = shot_list[0].get("reference_assets", [])
    expected_asset_ids = [item.get("asset_id") for item in first_refs if isinstance(item, dict)]
    if not expected_asset_ids:
        raise ValueError("The shot manifest must select reference assets for the continuous sequence")
    assets_requested = asset_ids or expected_asset_ids
    if assets_requested != expected_asset_ids:
        raise ValueError("Requested reference assets do not match the approved shot manifest")
    continuity_key = shot_list[0].get("continuity_key")
    for shot, segment in zip(shot_list, plan["segments"]):
        if not isinstance(shot, dict):
            raise ValueError("Every shot manifest entry must be an object")
        if shot.get("duration_seconds") != segment["duration_seconds"]:
            raise ValueError("Shot duration does not match the provider segment plan")
        if shot.get("timeline_range_seconds") != [segment["start_seconds"], segment["end_seconds"]]:
            raise ValueError("Shot timeline range is not contiguous with the provider segment plan")
        if shot.get("continuity_key") != continuity_key:
            raise ValueError("All continuous master segments must share one continuity_key")
        shot_refs = [item.get("asset_id") for item in shot.get("reference_assets", []) if isinstance(item, dict)]
        if shot_refs != expected_asset_ids:
            raise ValueError("All continuous master segments must use the same ordered reference set")
        if shot.get("generation", {}).get("status") != "not-started":
            raise ValueError(f"{shot.get('shot_id')} is not in not-started state; refusing to risk duplicate provider charges")
        if not isinstance(shot.get("prompt"), str) or not shot["prompt"].strip():
            raise ValueError(f"{shot.get('shot_id')} has no production prompt")
    validate_generation_authorization(provider, approval, plan, project_id, assets_requested)

    # Keep the shot-level policy synchronized with the separately approved provider record.
    policy = shots_manifest.get("generation_policy", {})
    if not isinstance(policy, dict):
        raise ValueError("Shot generation_policy must be an object")
    for field in (
        "connection_status", "api_adapter_status", "generation_enabled",
        "cost_approval_status", "data_transfer_approval_status",
        "reference_rights_clearance_status",
    ):
        policy[field] = provider.get(field)
    shots_manifest["generation_policy"] = policy

    assets = load_staged_reference_assets(project, assets_requested)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    segment_dir = project / "03_GROWTH_PASSES" / "PROVIDER_SEGMENTS" / run_id
    frame_dir = project / "02_FRAMES" / "PROVIDER_SEGMENTS" / run_id
    segment_dir.mkdir(parents=True, exist_ok=False)
    frame_dir.mkdir(parents=True, exist_ok=False)
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required for pinned-frame continuity checks")
    run_path = project / "07_MANIFESTS" / "provider_runs" / f"continuous-{run_id}.json"
    run_manifest = {
        "schema": "geehub.xai-continuous-generation/1",
        "project_id": project_id,
        "run_id": run_id,
        "status": "preparing",
        "provider_id": "xai-grok-imagine-video",
        "model_id": VIDEO_MODEL,
        "resolution": resolution,
        "total_duration_seconds": total_seconds,
        "estimated_cost_usd": plan["estimated_cost_usd"],
        "pricing_source": PRICING_SOURCE,
        "pricing_checked_at": PRICING_CHECKED_AT,
        "reference_asset_ids": assets_requested,
        "segments": [],
        "continuity_checks": [],
        "shots_manifest_path": str(shots_path.relative_to(project)),
        "started_at": utc_now(),
        "reference_data_transfer_approved": True,
        "reference_rights_cleared": True,
    }
    write_json_atomic(run_path, run_manifest)
    try:
        uploaded_references = upload_reference_assets(client, project, assets)
        reference_file_ids = [uploaded_references[asset_id] for asset_id in assets_requested]
        run_manifest["reference_file_ids"] = reference_file_ids
        run_manifest["status"] = "references-uploaded"
        run_manifest["updated_at"] = utc_now()
        write_json_atomic(run_path, run_manifest)
        previous_frame_file_id = None
        previous_last_frame_sha256 = None
        for segment, shot in zip(plan["segments"], shot_list):
            order = segment["sequence_order"]
            expected_previous_frame = previous_last_frame_sha256
            filename = f"segment-{order:02d}.mp4"
            template_prompt = shot["prompt"]
            prompt = prompt_with_reference_slots(template_prompt, bool(previous_frame_file_id), len(reference_file_ids))
            payload = build_generation_payload(
                prompt=prompt,
                reference_file_ids=reference_file_ids,
                duration_seconds=segment["duration_seconds"],
                filename=filename,
                first_frame_file_id=previous_frame_file_id,
                resolution=resolution,
            )
            submitted_at = utc_now()
            submitted = client.submit_generation(payload)
            request_id = submitted["request_id"]
            submitted_record = {
                **segment,
                "shot_id": shot["shot_id"],
                "status": "submitted",
                "provider_id": provider["provider_id"],
                "provider_job_id": request_id,
                "model_id": VIDEO_MODEL,
                "prompt_revision": shot.get("revision"),
                "prompt_sha256": hashlib.sha256(template_prompt.encode("utf-8")).hexdigest(),
                "submitted_prompt": prompt,
                "submitted_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                "reference_asset_ids": assets_requested,
                "reference_file_ids": reference_file_ids,
                "pinned_first_frame_file_id": previous_frame_file_id,
                "submitted_at": submitted_at,
            }
            run_manifest["segments"].append(submitted_record)
            shot["status"] = "submitted"
            shot["generation"] = {
                **submitted_record,
                "output_path": None,
                "output_sha256": None,
                "dropbox_file_id": None,
                "dropbox_path": None,
                "reopened_from_dropbox": False,
                "metadata_verified": False,
            }
            write_json_atomic(shots_path, shots_manifest)
            run_manifest["updated_at"] = utc_now()
            write_json_atomic(run_path, run_manifest)

            completed = client.poll_video(
                request_id,
                timeout_seconds=poll_timeout,
                poll_interval=poll_interval,
            )
            video = completed["video"]
            output_path = segment_dir / filename
            downloaded = client.download_video(video["url"], output_path)
            media = probe_video(output_path)
            if abs(media["duration_seconds"] - segment["duration_seconds"]) > 0.75:
                raise ValueError(f"{filename} duration differs from the requested segment length")
            if resolution == "720p" and (media["width"], media["height"]) != (1280, 720):
                raise ValueError(f"{filename} did not return the requested 1280x720 output")
            first_frame = extract_frame(ffmpeg, output_path, frame_dir / f"segment-{order:02d}-first.png")
            last_frame = extract_frame(ffmpeg, output_path, frame_dir / f"segment-{order:02d}-last.png", last=True)
            if expected_previous_frame and first_frame["sha256"] != expected_previous_frame:
                raise ValueError(
                    f"Segment {order} first frame does not match the pinned last frame of segment {order - 1}"
                )
            last_frame_upload = client.upload_file(Path(last_frame["path"]))
            provider_output_id = video.get("file_output", {}).get("file_id")
            if not isinstance(provider_output_id, str) or not provider_output_id:
                raise XAIError("xAI completed output did not return a stored provider file ID")
            generation = {
                **submitted_record,
                "status": "generated-local",
                "provider_output_id": provider_output_id,
                "provider_output_file_id": provider_output_id,
                "first_frame_file_id": previous_frame_file_id,
                "last_frame_file_id": last_frame_upload["id"],
                "continuity_status": "initial" if order == 1 else "passed",
                "completed_at": utc_now(),
                "duration_seconds": media["duration_seconds"],
                "frame_rate": media["frame_rate"],
                "width": media["width"],
                "height": media["height"],
                "video_codec": media["video_codec"],
                "audio_codec": media["audio_codec"],
                "output_path": str(output_path.relative_to(project)),
                "output_sha256": downloaded["sha256"],
                "output_size_bytes": downloaded["size_bytes"],
                "media_metadata": media,
                "first_frame_sha256": first_frame["sha256"],
                "last_frame_sha256": last_frame["sha256"],
                "next_segment_first_frame_file_id": last_frame_upload["id"],
                "provider_usage": completed.get("usage"),
                "dropbox_file_id": None,
                "dropbox_path": None,
                "reopened_from_dropbox": False,
                "metadata_verified": False,
            }
            run_manifest["segments"][-1] = generation
            shot["status"] = "generated-local"
            shot["generation"] = generation
            if expected_previous_frame:
                run_manifest["continuity_checks"].append({
                    "boundary_before_segment": order,
                    "expected_first_frame_sha256": expected_previous_frame,
                    "actual_first_frame_sha256": first_frame["sha256"],
                    "status": "passed",
                })
            run_manifest["updated_at"] = utc_now()
            previous_frame_file_id = last_frame_upload["id"]
            previous_last_frame_sha256 = last_frame["sha256"]
            write_json_atomic(shots_path, shots_manifest)
            write_json_atomic(run_path, run_manifest)

        run_manifest["status"] = "segments-generated-continuity-verified"
        run_manifest["completed_at"] = utc_now()
        run_manifest["run_manifest_path"] = str(run_path.relative_to(project))
        shots_manifest["last_generation_run_id"] = run_id
        shots_manifest["last_generation_run_path"] = str(run_path.relative_to(project))
        write_json_atomic(shots_path, shots_manifest)
        write_json_atomic(run_path, run_manifest)
        return run_manifest
    except Exception as exc:
        run_manifest["status"] = "failed"
        run_manifest["error"] = str(exc)
        run_manifest["updated_at"] = utc_now()
        write_json_atomic(run_path, run_manifest)
        raise

def default_project_path() -> Path:
    configured = os.environ.get("GEEHUB_PROJECT_ROOT")
    if configured:
        return Path(configured).expanduser()
    return Path(__file__).resolve().parents[2] / "production" / "projects" / "hulums-lab-serum-60s"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    estimate_parser = sub.add_parser("estimate", help="Estimate a continuous reference-to-video sequence; no API calls")
    estimate_parser.add_argument("--duration", type=int, default=60)
    estimate_parser.add_argument("--segment-duration", type=int, default=15)
    estimate_parser.add_argument("--resolution", choices=sorted(ALLOWED_RESOLUTIONS), default="720p")
    check_parser = sub.add_parser("check", help="Check local connection and approval state without API calls")
    check_parser.add_argument("--project", type=Path, default=default_project_path())
    generate_parser = sub.add_parser("generate", help="Generate only after explicit provider and cost approval")
    generate_parser.add_argument("--project", type=Path, default=default_project_path())
    generate_parser.add_argument("--duration", type=int, default=60)
    generate_parser.add_argument("--segment-duration", type=int, default=15)
    generate_parser.add_argument("--resolution", choices=sorted(ALLOWED_RESOLUTIONS), default="720p")
    args = parser.parse_args(argv)

    try:
        if args.command == "estimate":
            print(json.dumps(estimate_continuous_sequence(args.duration, args.segment_duration, args.resolution), indent=2))
            return 0
        project = args.project.expanduser().resolve()
        provider = load_json(project / "07_MANIFESTS" / "video_provider.json")
        approval_path = project / "07_MANIFESTS" / "cost_approval.json"
        approval = load_json(approval_path) if approval_path.is_file() else {}
        if args.command == "check":
            estimate = estimate_continuous_sequence()
            result = {
                "api_adapter_status": provider.get("api_adapter_status"),
                "generation_enabled": provider.get("generation_enabled"),
                "connection_status": provider.get("connection_status"),
                "xai_api_key_configured": bool(os.environ.get("XAI_API_KEY")),
                "cost_approval_status": provider.get("cost_approval_status"),
                "data_transfer_approval_status": provider.get("data_transfer_approval_status"),
                "reference_rights_clearance_status": provider.get("reference_rights_clearance_status"),
                "cost_approval_file_present": approval_path.is_file(),
                "cost_approval_record_status": approval.get("status"),
                "approved_max_usd": approval.get("max_usd"),
                "reference_data_transfer_approved": approval.get("reference_data_transfer_approved"),
                "reference_rights_cleared": approval.get("reference_rights_cleared"),
                "approved_reference_asset_ids": approval.get("reference_asset_ids"),
                "estimated_60s_720p_usd": estimate["estimated_cost_usd"],
                "generation_submitted": False,
            }
            print(json.dumps(result, indent=2))
            return 0
        estimate = estimate_continuous_sequence(args.duration, args.segment_duration, args.resolution)
        shot_manifest = load_json(project / "07_MANIFESTS" / "shots.json")
        shot_list = shot_manifest.get("shots", [])
        if not shot_list or not isinstance(shot_list[0], dict):
            raise ValueError("Shot manifest contains no selected reference assets")
        reference_asset_ids = [
            item.get("asset_id") for item in shot_list[0].get("reference_assets", [])
            if isinstance(item, dict)
        ]
        validate_generation_authorization(provider, approval, estimate, project.name, reference_asset_ids)
        client = XAIClient()
        result = generate_continuous_sequence(
            project, client, provider, approval,
            total_seconds=args.duration,
            segment_seconds=args.segment_duration,
            resolution=args.resolution,
        )
        print(json.dumps(result, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError, XAIError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"GEEHUB xAI VIDEO ADAPTER: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
