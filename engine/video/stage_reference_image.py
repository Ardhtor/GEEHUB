#!/usr/bin/env python3
"""Stage a selected image-library reference without altering its original."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import struct
import sys
from pathlib import Path

DEFAULT_PROJECT = Path(__file__).resolve().parents[2] / "production" / "projects" / "hulums-lab-serum-60s"
MAX_IMAGE_BYTES = 100 * 1024 * 1024
SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def image_format(path: Path) -> str:
    with path.open("rb") as handle:
        header = handle.read(12)
    if header.startswith(b"\\x89PNG\\r\\n\\x1a\\n"):
        return "png"
    if header.startswith(b"\\xff\\xd8"):
        return "jpeg"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "webp"
    raise ValueError("Unsupported image format; use PNG, JPEG, or WebP")


def image_dimensions(path: Path) -> tuple[int, int]:
    """Read dimensions from PNG, JPEG, or WebP headers without decoding pixels."""
    with path.open("rb") as handle:
        header = handle.read(30)
        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            if len(header) < 24 or header[12:16] != b"IHDR":
                raise ValueError("Invalid PNG header")
            width, height = struct.unpack(">II", header[16:24])
        elif header.startswith(b"RIFF") and header[8:12] == b"WEBP":
            chunk = header[12:16]
            if chunk == b"VP8X" and len(header) >= 30:
                width = 1 + int.from_bytes(header[24:27], "little")
                height = 1 + int.from_bytes(header[27:30], "little")
            elif chunk == b"VP8L" and len(header) >= 25 and header[20] == 0x2F:
                b1, b2, b3, b4 = header[21:25]
                width = 1 + (((b2 & 0x3F) << 8) | b1)
                height = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6))
            elif chunk == b"VP8 " and len(header) >= 30 and header[23:26] == b"\x9d\x01\x2a":
                width = struct.unpack("<H", header[26:28])[0] & 0x3FFF
                height = struct.unpack("<H", header[28:30])[0] & 0x3FFF
            else:
                raise ValueError("Unsupported or incomplete WebP header")
        elif header.startswith(b"\xff\xd8"):
            width = height = 0
            handle.seek(2)
            while True:
                byte = handle.read(1)
                if not byte:
                    break
                if byte != b"\xff":
                    continue
                marker_byte = handle.read(1)
                while marker_byte == b"\xff":
                    marker_byte = handle.read(1)
                if not marker_byte:
                    break
                marker = marker_byte[0]
                if marker in (0xD8, 0xD9, 0x01) or 0xD0 <= marker <= 0xD7:
                    continue
                raw_length = handle.read(2)
                if len(raw_length) != 2:
                    break
                segment_length = struct.unpack(">H", raw_length)[0]
                if segment_length < 2:
                    raise ValueError("Invalid JPEG segment length")
                if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                    segment = handle.read(min(segment_length - 2, 8))
                    if len(segment) < 5:
                        break
                    height, width = struct.unpack(">HH", segment[1:5])
                    break
                handle.seek(segment_length - 2, 1)
            if not width or not height:
                raise ValueError("JPEG dimensions could not be read")
        else:
            raise ValueError("Unsupported image format; use PNG, JPEG, or WebP")
    if width <= 0 or height <= 0:
        raise ValueError("Image dimensions must be positive")
    return width, height


def validate_reference_library(data: object) -> list[str]:
    errors = []
    if not isinstance(data, dict):
        return ["reference library must be a JSON object"]
    if data.get("schema") != "geehub.reference-library/1":
        errors.append("reference library schema must be geehub.reference-library/1")
    if not isinstance(data.get("project_id"), str) or not data["project_id"].strip():
        errors.append("reference library project_id must be a non-empty string")
    source = data.get("source_of_truth")
    if not isinstance(source, dict) or not isinstance(source.get("provider"), str) or not source["provider"].strip():
        errors.append("reference library source_of_truth.provider is required")
    assets = data.get("assets")
    if not isinstance(assets, list) or not assets:
        errors.append("reference library assets must be a non-empty array")
        return errors
    seen = set()
    for index, item in enumerate(assets):
        if not isinstance(item, dict):
            errors.append(f"reference asset[{index}] must be an object")
            continue
        asset_id = item.get("asset_id")
        if not isinstance(asset_id, str) or not asset_id.strip():
            errors.append(f"reference asset[{index}] needs a non-empty asset_id")
        elif asset_id in seen:
            errors.append(f"duplicate reference asset_id: {asset_id}")
        seen.add(asset_id)
        for field in ("file_name", "library_file_id", "mime_type", "visual_role", "rights_status"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                errors.append(f"reference asset {asset_id or index}: {field} is required")
        if not isinstance(item.get("mime_type"), str) or not item["mime_type"].startswith("image/"):
            errors.append(f"reference asset {asset_id or index}: mime_type must be an image MIME type")
        if not isinstance(item.get("model_generated"), bool):
            errors.append(f"reference asset {asset_id or index}: model_generated must be boolean")
        size = item.get("size_bytes")
        if not isinstance(size, int) or isinstance(size, bool) or size <= 0:
            errors.append(f"reference asset {asset_id or index}: size_bytes must be a positive integer")
    return errors


def load_reference(manifest_path: Path, asset_id: str) -> tuple[dict, dict]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors = validate_reference_library(data)
    if errors:
        raise ValueError("Invalid reference library: " + "; ".join(errors))
    assets = data["assets"]
    matches = [item for item in assets if item.get("asset_id") == asset_id]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one manifest entry for asset_id {asset_id!r}; found {len(matches)}")
    return data, matches[0]


def write_json_atomic(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def stage_reference_image(project: Path, asset_id: str, source: Path, manifest_path: Path | None = None) -> dict:
    project = project.expanduser().resolve()
    source = source.expanduser().resolve(strict=True)
    manifest_path = (manifest_path or project / "07_MANIFESTS" / "reference_library.json").expanduser().resolve()
    if not source.is_file():
        raise ValueError("Source must be a regular image file")
    if source.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError("Supported reference formats are PNG, JPEG, and WebP")
    size = source.stat().st_size
    if size <= 0 or size > MAX_IMAGE_BYTES:
        raise ValueError("Image must be between 1 byte and 100 MB")
    actual_format = image_format(source)
    expected_format = {".png": "png", ".jpg": "jpeg", ".jpeg": "jpeg", ".webp": "webp"}[source.suffix.lower()]
    if actual_format != expected_format:
        raise ValueError(f"File extension {source.suffix} does not match its {actual_format} image header")
    width, height = image_dimensions(source)
    library, reference = load_reference(manifest_path, asset_id)
    expected_mime = {"png": "image/png", "jpeg": "image/jpeg", "webp": "image/webp"}[actual_format]
    if reference.get("mime_type") != expected_mime:
        raise ValueError(f"Reference manifest MIME type {reference.get('mime_type')!r} does not match source format {expected_mime}")
    if reference.get("mime_type") and not reference["mime_type"].startswith("image/"):
        raise ValueError("Manifest entry is not an image reference")

    digest = sha256_file(source)
    source_dir = project / "01_SOURCE" / "REFERENCE_IMAGES"
    source_dir.mkdir(parents=True, exist_ok=True)
    destination = source_dir / f"{asset_id}{source.suffix.lower()}"
    sidecar = destination.with_suffix(destination.suffix + ".source.json")
    if destination.exists():
        if not destination.is_file() or sha256_file(destination) != digest:
            raise FileExistsError(f"Refusing to overwrite a different staged asset: {destination}")
        status = "already-staged"
    else:
        with source.open("rb") as incoming, destination.open("xb") as outgoing:
            shutil.copyfileobj(incoming, outgoing, length=1024 * 1024)
        shutil.copystat(source, destination)
        status = "staged"

    record = {
        "schema": "geehub.reference-image-source/1",
        "asset_id": asset_id,
        "project_id": library.get("project_id"),
        "library": {
            "provider": library.get("source_of_truth", {}).get("provider"),
            "library_file_id": reference.get("library_file_id"),
            "file_id": reference.get("file_id"),
            "file_name": reference.get("file_name"),
            "model_generated": reference.get("model_generated"),
            "visual_role": reference.get("visual_role"),
            "rights_status": reference.get("rights_status", "unverified-reference-only"),
        },
        "source": {
            "path_at_import": str(source),
            "filename": source.name,
            "size_bytes": size,
            "sha256": digest,
            "original_modified": False,
        },
        "staged": {
            "path": str(destination.relative_to(project)),
            "size_bytes": destination.stat().st_size,
            "sha256": digest,
            "width": width,
            "height": height,
        },
        "integrity": {"verified": True, "copy_matches_source": True},
    }
    if sidecar.exists():
        existing = json.loads(sidecar.read_text(encoding="utf-8"))
        if existing.get("source", {}).get("sha256") != digest:
            raise FileExistsError(f"Existing provenance sidecar conflicts with source: {sidecar}")
    else:
        write_json_atomic(sidecar, record)

    registry_path = project / "07_MANIFESTS" / "reference_imports.json"
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        if registry.get("schema") != "geehub.reference-imports/1" or not isinstance(registry.get("assets"), list):
            raise ValueError("Existing reference import registry has an unsupported schema")
    else:
        registry = {"schema": "geehub.reference-imports/1", "project_id": library.get("project_id"), "assets": []}
    existing_records = [item for item in registry["assets"] if item.get("asset_id") == asset_id]
    if existing_records and any(item.get("sha256") != digest for item in existing_records):
        raise FileExistsError(f"Registry already contains a different source for {asset_id}")
    if not existing_records:
        registry["assets"].append({
            "asset_id": asset_id,
            "path": str(destination.relative_to(project)),
            "sidecar": str(sidecar.relative_to(project)),
            "sha256": digest,
            "size_bytes": size,
            "width": width,
            "height": height,
            "visual_role": reference.get("visual_role"),
            "rights_status": reference.get("rights_status", "unverified-reference-only"),
        })
        write_json_atomic(registry_path, registry)

    return {"status": status, "asset_id": asset_id, "staged_path": str(destination), "sidecar": str(sidecar), "sha256": digest, "size_bytes": size, "width": width, "height": height, "original_preserved": True}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=DEFAULT_PROJECT)
    parser.add_argument("--manifest", type=Path, help="Reference library manifest (defaults to project/07_MANIFESTS/reference_library.json)")
    parser.add_argument("--asset-id", required=True, help="asset_id from reference_library.json")
    parser.add_argument("--source", type=Path, required=True, help="Exported image in the local Dropbox sync folder")
    args = parser.parse_args(argv)
    try:
        result = stage_reference_image(args.project, args.asset_id, args.source, args.manifest)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"REFERENCE IMAGE STAGING FAILED: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
