#!/usr/bin/env python3
"""Stage a selected image-library reference without altering its original."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import struct
import sys
import tempfile
from pathlib import Path

DEFAULT_PROJECT = Path(__file__).resolve().parents[2] / "production" / "projects" / "hulums-lab-serum-60s"
SAFE_ASSET_ID = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
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
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if header.startswith(b"\xff\xd8"):
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


def _validate_library_asset(item: object, label: str, seen_ids: set[str], seen_files: set[str], seen_library_ids: set[str]) -> list[str]:
    errors = []
    if not isinstance(item, dict):
        return [f"{label} must be an object"]
    asset_id = item.get("asset_id")
    if not isinstance(asset_id, str) or not SAFE_ASSET_ID.fullmatch(asset_id):
        errors.append(f"{label} needs a safe lowercase asset_id (letters, digits and hyphens only)")
    elif asset_id in seen_ids:
        errors.append(f"duplicate image-library asset_id: {asset_id}")
    else:
        seen_ids.add(asset_id)
    for field in ("file_id", "library_file_id", "filename", "mime_type", "role"):
        if not isinstance(item.get(field), str) or not item[field].strip():
            errors.append(f"{label}: {field} is required")
    for field, seen in (("file_id", seen_files), ("library_file_id", seen_library_ids)):
        value = item.get(field)
        if isinstance(value, str) and value:
            if value in seen:
                errors.append(f"{label}: duplicate {field} {value}")
            seen.add(value)
    mime = item.get("mime_type")
    if isinstance(mime, str) and not mime.startswith("image/"):
        errors.append(f"{label}: mime_type must be an image MIME type")
    size = item.get("size_bytes")
    if not isinstance(size, int) or isinstance(size, bool) or size <= 0:
        errors.append(f"{label}: size_bytes must be a positive integer")
    if not isinstance(item.get("model_generated"), bool):
        errors.append(f"{label}: model_generated must be boolean")
    return errors


def validate_image_library_index(data: object) -> list[str]:
    if not isinstance(data, dict):
        return ["image library index must be a JSON object"]
    errors = []
    if data.get("schema") != "geehub.image-library-index/1":
        errors.append("image library index schema must be geehub.image-library-index/1")
    source = data.get("source_of_truth")
    if not isinstance(source, dict):
        errors.append("image library index source_of_truth is required")
    else:
        for field in ("provider", "path", "file_id", "revision"):
            if not isinstance(source.get(field), str) or not source[field].strip():
                errors.append(f"image library index source_of_truth.{field} is required")
    collections = data.get("collections")
    if not isinstance(collections, list) or not collections:
        errors.append("image library index collections must be a non-empty array")
        return errors
    seen_collections = set()
    seen_ids: set[str] = set()
    seen_files: set[str] = set()
    seen_library_ids: set[str] = set()
    for index, collection in enumerate(collections):
        if not isinstance(collection, dict):
            errors.append(f"image library collection[{index}] must be an object")
            continue
        collection_id = collection.get("id")
        if not isinstance(collection_id, str) or not collection_id.strip():
            errors.append(f"image library collection[{index}] needs an id")
        elif collection_id in seen_collections:
            errors.append(f"duplicate image library collection id: {collection_id}")
        else:
            seen_collections.add(collection_id)
        assets = collection.get("assets")
        if not isinstance(assets, list) or not assets:
            errors.append(f"image library collection {collection_id or index} needs an assets array")
            continue
        for asset_index, asset in enumerate(assets):
            errors.extend(_validate_library_asset(asset, f"{collection_id or index}.assets[{asset_index}]", seen_ids, seen_files, seen_library_ids))
    supplemental = data.get("supplemental_candidates", [])
    if not isinstance(supplemental, list):
        errors.append("supplemental_candidates must be an array")
    else:
        for index, asset in enumerate(supplemental):
            errors.extend(_validate_library_asset(asset, f"supplemental_candidates[{index}]", seen_ids, seen_files, seen_library_ids))
    return errors


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
    collections = data.get("collections")
    if not isinstance(collections, list) or not collections:
        errors.append("reference library collections must be a non-empty array")
        return errors
    collection_ids = set()
    for index, collection in enumerate(collections):
        if not isinstance(collection, dict) or not isinstance(collection.get("id"), str) or not collection["id"].strip():
            errors.append(f"reference library collection[{index}] needs an id")
        elif collection["id"] in collection_ids:
            errors.append(f"duplicate reference collection id: {collection['id']}")
        else:
            collection_ids.add(collection["id"])
    assets = data.get("assets")
    if not isinstance(assets, list) or not assets:
        errors.append("reference library assets must be a non-empty array")
        return errors
    seen_ids = set()
    seen_files = set()
    seen_library_ids = set()
    mime_by_extension = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
    for index, item in enumerate(assets):
        if not isinstance(item, dict):
            errors.append(f"reference asset[{index}] must be an object")
            continue
        asset_id = item.get("asset_id")
        label = f"reference asset {asset_id or index}"
        if not isinstance(asset_id, str) or not SAFE_ASSET_ID.fullmatch(asset_id):
            errors.append(f"{label} needs a safe lowercase asset_id (letters, digits and hyphens only)")
        elif asset_id in seen_ids:
            errors.append(f"duplicate reference asset_id: {asset_id}")
        else:
            seen_ids.add(asset_id)
        for field in ("file_name", "file_id", "library_file_id", "mime_type", "visual_role", "rights_status"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                errors.append(f"{label}: {field} is required")
        for field, seen in (("file_id", seen_files), ("library_file_id", seen_library_ids)):
            value = item.get(field)
            if isinstance(value, str) and value:
                if value in seen:
                    errors.append(f"{label}: duplicate {field} {value}")
                seen.add(value)
        if isinstance(item.get("mime_type"), str) and item.get("mime_type") != mime_by_extension.get(Path(item.get("file_name", "")).suffix.lower()):
            errors.append(f"{label}: mime_type does not match file_name extension")
        if not isinstance(item.get("mime_type"), str) or not item["mime_type"].startswith("image/"):
            errors.append(f"{label}: mime_type must be an image MIME type")
        if not isinstance(item.get("model_generated"), bool):
            errors.append(f"{label}: model_generated must be boolean")
        size = item.get("size_bytes")
        if not isinstance(size, int) or isinstance(size, bool) or size <= 0:
            errors.append(f"{label}: size_bytes must be a positive integer")
        collection_id = item.get("collection_id")
        if collection_id is not None and (not isinstance(collection_id, str) or collection_id not in collection_ids):
            errors.append(f"{label}: unknown collection_id {collection_id}")
    return errors

def load_reference(manifest_path: Path, asset_id: str) -> tuple[dict, dict]:
    if not isinstance(asset_id, str) or not SAFE_ASSET_ID.fullmatch(asset_id):
        raise ValueError("asset_id must contain only lowercase letters, digits and hyphens")
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
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    parent = path.parent.absolute()
    if path.is_symlink() or parent.resolve() != parent:
        raise ValueError(f"Refusing to write through a symlink: {path}")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=path.parent,
            prefix=path.name + ".", suffix=".tmp", delete=False,
        ) as handle:
            temporary = Path(handle.name)
            json.dump(data, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def stage_reference_image(project: Path, asset_id: str, source: Path, manifest_path: Path | None = None) -> dict:
    if not isinstance(asset_id, str) or not SAFE_ASSET_ID.fullmatch(asset_id):
        raise ValueError("asset_id must contain only lowercase letters, digits and hyphens")
    project = project.expanduser().resolve(strict=True)
    source = source.expanduser().resolve(strict=True)
    manifest_path = (manifest_path or project / "07_MANIFESTS" / "reference_library.json").expanduser().resolve(strict=True)
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
    if size != reference.get("size_bytes"):
        raise ValueError("Source file size does not match the selected image-library record")
    expected_mime = {"png": "image/png", "jpeg": "image/jpeg", "webp": "image/webp"}[actual_format]
    if reference.get("mime_type") != expected_mime:
        raise ValueError(f"Reference manifest MIME type {reference.get('mime_type')!r} does not match source format {expected_mime}")
    if not reference["mime_type"].startswith("image/"):
        raise ValueError("Manifest entry is not an image reference")

    digest = sha256_file(source)
    if reference.get("sha256") and reference["sha256"].lower() != digest:
        raise ValueError("Source SHA-256 does not match the selected image-library record")
    if reference.get("width") is not None and reference["width"] != width:
        raise ValueError("Source width does not match the selected image-library record")
    if reference.get("height") is not None and reference["height"] != height:
        raise ValueError("Source height does not match the selected image-library record")
    source_dir = project / "01_SOURCE" / "REFERENCE_IMAGES"
    source_parent = project / "01_SOURCE"
    if source_parent.is_symlink() or source_dir.is_symlink():
        raise ValueError("Reference staging directories must not be symlinks")
    source_dir.mkdir(parents=True, exist_ok=True)
    resolved_source_dir = source_dir.resolve(strict=True)
    if not resolved_source_dir.is_relative_to(project):
        raise ValueError("Reference staging directory resolves outside the project")
    destination = resolved_source_dir / f"{asset_id}{source.suffix.lower()}"
    if not destination.resolve().is_relative_to(resolved_source_dir) or destination.is_symlink():
        raise ValueError("Refusing an unsafe reference destination")
    sidecar = destination.with_suffix(destination.suffix + ".source.json")
    if sidecar.is_symlink():
        raise ValueError("Refusing a symlinked reference provenance sidecar")

    if destination.exists():
        if not destination.is_file() or destination.stat().st_size != size or sha256_file(destination) != digest:
            raise FileExistsError(f"Refusing to overwrite a different staged asset: {destination}")
        status = "already-staged"
    else:
        temporary = None
        try:
            with source.open("rb") as incoming, tempfile.NamedTemporaryFile(
                mode="wb", dir=resolved_source_dir, prefix=asset_id + ".", suffix=".stage", delete=False
            ) as outgoing:
                temporary = Path(outgoing.name)
                shutil.copyfileobj(incoming, outgoing, length=1024 * 1024)
                outgoing.flush()
                os.fsync(outgoing.fileno())
            shutil.copystat(source, temporary)
            if temporary.stat().st_size != size or sha256_file(temporary) != digest or sha256_file(source) != digest:
                raise OSError("Source or staged copy changed during reference import")
            if destination.exists() or destination.is_symlink():
                raise FileExistsError(f"Reference destination appeared during staging: {destination}")
            temporary.replace(destination)
            temporary = None
            status = "staged"
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

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
        if (
            existing.get("schema") != record["schema"]
            or existing.get("source", {}).get("sha256") != digest
            or existing.get("staged", {}).get("sha256") != digest
            or existing.get("library", {}).get("file_id") != reference.get("file_id")
            or existing.get("library", {}).get("library_file_id") != reference.get("library_file_id")
            or existing.get("source", {}).get("original_modified") is not False
        ):
            raise FileExistsError(f"Existing provenance sidecar conflicts with selected source: {sidecar}")
    else:
        write_json_atomic(sidecar, record)

    manifests_dir = project / "07_MANIFESTS"
    if manifests_dir.is_symlink() or not manifests_dir.resolve().is_relative_to(project):
        raise ValueError("Project manifest directory must be a real directory inside the project")
    registry_path = manifests_dir / "reference_imports.json"
    if registry_path.is_symlink():
        raise ValueError("Refusing a symlinked reference import registry")
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        if (
            registry.get("schema") != "geehub.reference-imports/1"
            or registry.get("project_id") != library.get("project_id")
            or not isinstance(registry.get("assets"), list)
        ):
            raise ValueError("Existing reference import registry has an unsupported schema or project ID")
    else:
        registry = {"schema": "geehub.reference-imports/1", "project_id": library.get("project_id"), "assets": []}
    if any(not isinstance(item, dict) or not isinstance(item.get("asset_id"), str) for item in registry["assets"]):
        raise ValueError("Reference import registry contains a malformed asset record")
    registry_ids = [item["asset_id"] for item in registry["assets"]]
    if len(registry_ids) != len(set(registry_ids)):
        raise ValueError("Reference import registry contains duplicate asset IDs")
    existing_records = [item for item in registry["assets"] if item.get("asset_id") == asset_id]
    if len(existing_records) > 1:
        raise ValueError(f"Registry contains duplicate entries for {asset_id}")
    registry_record = {
        "asset_id": asset_id,
        "path": str(destination.relative_to(project)),
        "sidecar": str(sidecar.relative_to(project)),
        "sha256": digest,
        "size_bytes": size,
        "width": width,
        "height": height,
        "visual_role": reference.get("visual_role"),
        "rights_status": reference.get("rights_status", "unverified-reference-only"),
    }
    if existing_records:
        if existing_records[0] != registry_record:
            raise FileExistsError(f"Registry provenance conflicts with the staged source for {asset_id}")
    else:
        registry["assets"].append(registry_record)
        write_json_atomic(registry_path, registry)

    if sha256_file(source) != digest or sha256_file(destination) != digest:
        raise OSError("Final source/staged checksum verification failed")
    return {
        "status": status,
        "asset_id": asset_id,
        "staged_path": str(destination),
        "sidecar": str(sidecar),
        "sha256": digest,
        "size_bytes": size,
        "width": width,
        "height": height,
        "original_preserved": True,
    }

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path(os.environ.get("GEEHUB_PROJECT_ROOT", str(DEFAULT_PROJECT))).expanduser())
    parser.add_argument("--manifest", type=Path, help="Reference library manifest (defaults to project/07_MANIFESTS/reference_library.json)")
    parser.add_argument("--asset-id", required=True, help="asset_id from reference_library.json")
    parser.add_argument("--source", type=Path, required=True, help="Exported image in the local Dropbox sync folder")
    args = parser.parse_args(argv)
    try:
        result = stage_reference_image(args.project, args.asset_id, args.source, args.manifest)
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"REFERENCE IMAGE STAGING FAILED: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
