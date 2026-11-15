#!/usr/bin/env python3
"""Create, verify, and restore versioned GEEHUB repository snapshots.

Snapshots cover tracked repository files only. They are not an independent
off-site backup and do not capture Dropbox, local media, or external services.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

DEFAULT_INCLUDE = (
    "artifacts/", "archive/", "corpus/", "lore/",
    "projects.json", "hub/projects.json",
    "docs/TRACTUS_CONTINUITY_CONTRACT.md",
    "docs/TRACTUS_ADAPTIVE_MEMORY_SPEC.md",
    "docs/TRACTUS_PROTECTION_ARCHITECTURE.md",
)
MANIFEST_VERSION = 1


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\\0" + data).hexdigest()


def canonical_manifest_bytes(manifest: dict[str, Any]) -> bytes:
    unsigned = {key: value for key, value in manifest.items() if key != "manifest_sha256"}
    return json.dumps(unsigned, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def manifest_digest(manifest: dict[str, Any]) -> str:
    return sha256(canonical_manifest_bytes(manifest))


def safe_relative_path(value: str) -> Path:
    pure = PurePosixPath(value)
    if pure.is_absolute() or not pure.parts or any(part in ("", ".", "..") for part in pure.parts):
        raise ValueError(f"Unsafe repository-relative path: {value}")
    if "\\\\" in value:
        raise ValueError(f"Backslash is not permitted in manifest path: {value}")
    return Path(*pure.parts)


def git_bytes(root: Path, revision: str, path: str) -> bytes:
    return subprocess.run(
        ["git", "show", f"{revision}:{path}"], cwd=root,
        check=True, capture_output=True,
    ).stdout


def git_text(root: Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=root, check=True, capture_output=True, text=True,
    ).stdout.strip()


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot read valid manifest {path}: {exc}") from exc
    if not isinstance(value, dict) or value.get("schema_version") != MANIFEST_VERSION:
        raise ValueError("Unsupported or malformed snapshot manifest")
    if not isinstance(value.get("entries"), list) or not value["entries"]:
        raise ValueError("Snapshot manifest must contain at least one entry")
    if not isinstance(value.get("source_commit"), str) or not value["source_commit"]:
        raise ValueError("Snapshot manifest has no source_commit")
    seen: set[str] = set()
    for entry in value["entries"]:
        if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
            raise ValueError("Every snapshot entry must have a path")
        safe_relative_path(entry["path"])
        if entry["path"] in seen:
            raise ValueError(f"Duplicate snapshot path: {entry['path']}")
        seen.add(entry["path"])
        if not isinstance(entry.get("size"), int) or entry["size"] < 0:
            raise ValueError(f"Invalid size for {entry['path']}")
        if not entry.get("sha256") and not entry.get("git_blob_sha1"):
            raise ValueError(f"Entry has no supported digest: {entry['path']}")
    expected = value.get("manifest_sha256")
    if expected and expected != manifest_digest(value):
        raise ValueError("Snapshot manifest self-checksum does not match")
    return value


def verify_manifest(manifest: dict[str, Any], root: Path, source: str) -> list[str]:
    errors: list[str] = []
    if source not in ("working", "git"):
        raise ValueError("source must be 'working' or 'git'")
    for entry in manifest["entries"]:
        relative = safe_relative_path(entry["path"])
        target = (root / relative).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError:
            errors.append(f"Path escapes repository root: {entry['path']}")
            continue
        try:
            data = target.read_bytes() if source == "working" else git_bytes(root, manifest["source_commit"], entry["path"])
        except (OSError, subprocess.CalledProcessError) as exc:
            errors.append(f"Cannot read {entry['path']} from {source}: {exc}")
            continue
        if len(data) != entry["size"]:
            errors.append(f"Size mismatch: {entry['path']} expected {entry['size']}, found {len(data)}")
        if entry.get("sha256") and sha256(data) != entry["sha256"]:
            errors.append(f"SHA-256 mismatch: {entry['path']}")
        if entry.get("git_blob_sha1") and git_blob_sha1(data) != entry["git_blob_sha1"]:
            errors.append(f"Git blob hash mismatch: {entry['path']}")
    return errors


def tracked_scope(root: Path, includes: tuple[str, ...]) -> list[str]:
    listing = git_text(root, "ls-files", "-z")
    paths = [item for item in listing.split("\0") if item]
    selected = [p for p in paths if any(p == inc or p.startswith(inc) for inc in includes)]
    selected = [p for p in selected if not p.startswith("recovery/snapshots/")]
    return sorted(selected)


def create_snapshot(root: Path, output: Path, includes: tuple[str, ...]) -> dict[str, Any]:
    root = root.resolve()
    output = output.resolve()
    try:
        output.relative_to(root)
    except ValueError as exc:
        raise ValueError("Snapshot output must be inside the repository") from exc
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing snapshot: {output}")
    status = git_text(root, "status", "--porcelain", "--untracked-files=all", "--", *includes)
    if status:
        raise ValueError("Included paths have uncommitted or untracked changes; commit or resolve them before snapshotting")
    paths = tracked_scope(root, includes)
    if not paths:
        raise ValueError("No tracked files matched the snapshot scope")
    entries = []
    for item in paths:
        data = (root / safe_relative_path(item)).read_bytes()
        entries.append({
            "path": item,
            "size": len(data),
            "sha256": sha256(data),
            "git_blob_sha1": git_blob_sha1(data),
        })
    manifest: dict[str, Any] = {
        "schema_version": MANIFEST_VERSION,
        "snapshot_id": datetime.now(timezone.utc).strftime("geehub-%Y%m%dT%H%M%SZ"),
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "repository": git_text(root, "remote", "get-url", "origin"),
        "source_commit": git_text(root, "rev-parse", "HEAD"),
        "scope": list(includes),
        "entry_count": len(entries),
        "entries": entries,
    }
    manifest["manifest_sha256"] = manifest_digest(manifest)
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    fd, temporary = tempfile.mkstemp(prefix=output.name + ".", dir=output.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return manifest


def restore_snapshot(manifest: dict[str, Any], root: Path, destination: Path, in_place: bool, overwrite: bool) -> list[str]:
    restored: list[str] = []
    base = root if in_place else (root / destination)
    for entry in manifest["entries"]:
        relative = safe_relative_path(entry["path"])
        data = git_bytes(root, manifest["source_commit"], entry["path"])
        if len(data) != entry["size"]:
            raise ValueError(f"Source size mismatch; refusing restore: {entry['path']}")
        if entry.get("sha256") and sha256(data) != entry["sha256"]:
            raise ValueError(f"Source SHA-256 mismatch; refusing restore: {entry['path']}")
        if entry.get("git_blob_sha1") and git_blob_sha1(data) != entry["git_blob_sha1"]:
            raise ValueError(f"Source Git hash mismatch; refusing restore: {entry['path']}")
        target = (base / relative).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError as exc:
            raise ValueError(f"Restore destination escapes repository: {target}") from exc
        if target.exists() and not overwrite:
            raise FileExistsError(f"Refusing to overwrite {target}; pass --overwrite explicitly")
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=target.name + ".", dir=target.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, target)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        restored.append(str(target.relative_to(root.resolve())))
    return restored


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create", help="Create a new immutable snapshot manifest")
    create.add_argument("--output", required=True)
    create.add_argument("--include", action="append", dest="includes")
    verify = sub.add_parser("verify", help="Verify a snapshot against working files or its Git source revision")
    verify.add_argument("manifest")
    verify.add_argument("--source", choices=("working", "git"), default="working")
    restore = sub.add_parser("restore", help="Restore files from the manifest's recorded Git revision")
    restore.add_argument("manifest")
    restore.add_argument("--destination", default="recovery/restored")
    restore.add_argument("--in-place", action="store_true")
    restore.add_argument("--overwrite", action="store_true")
    args = parser.parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    try:
        if args.command == "create":
            includes = tuple(args.includes or DEFAULT_INCLUDE)
            manifest = create_snapshot(root, root / args.output, includes)
            print(f"Created {manifest['snapshot_id']} with {manifest['entry_count']} files.")
            print(f"Manifest SHA-256: {manifest['manifest_sha256']}")
            return 0
        manifest = load_manifest(root / args.manifest)
        if args.command == "verify":
            errors = verify_manifest(manifest, root, args.source)
            if errors:
                for error in errors:
                    print(f"ERROR: {error}", file=sys.stderr)
                return 1
            print(f"Verified {len(manifest['entries'])} files against {args.source} source.")
            return 0
        restored = restore_snapshot(manifest, root, Path(args.destination), args.in_place, args.overwrite)
        print(f"Restored {len(restored)} files: " + (", ".join(restored[:5]) if restored else "none"))
        return 0
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"Recovery operation stopped safely: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
