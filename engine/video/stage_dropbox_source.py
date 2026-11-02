#!/usr/bin/env python3
"""Stage an original video from a locally synced Dropbox folder into a GEEHUB project.

Dropbox remains the source of truth. This utility makes a verified working copy;
it never edits, moves, renames, or deletes the Dropbox original.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}


def dropbox_roots() -> list[Path]:
    roots: list[Path] = []
    configured = os.environ.get("GEEHUB_DROPBOX_ROOT")
    if configured:
        roots.append(Path(configured).expanduser())
    home = Path.home()
    roots.extend([
        home / "Dropbox",
        home / "Library/CloudStorage/Dropbox",
        home / "Library/CloudStorage/Dropbox (Personal)",
        home / "Library/CloudStorage/Dropbox (Team)",
    ])
    # Preserve order while removing duplicates.
    return list(dict.fromkeys(p.resolve() for p in roots if p.exists()))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_source(value: str) -> tuple[Path, Path | None]:
    candidate = Path(value).expanduser()
    if candidate.is_absolute():
        source = candidate.resolve()
        for root in dropbox_roots():
            try:
                return source, root
            except OSError:
                pass
        return source, None

    roots = dropbox_roots()
    if not roots:
        raise FileNotFoundError(
            "No locally synced Dropbox folder was found. Install/sign in to the "
            "Dropbox desktop app, or set GEEHUB_DROPBOX_ROOT to its folder."
        )
    for root in roots:
        source = (root / candidate).resolve()
        if source.exists():
            return source, root
    raise FileNotFoundError(
        f"'{value}' was not found under the detected Dropbox folders: "
        + ", ".join(str(p) for p in roots)
        + ". Make the video available offline in Dropbox, then retry."
    )


def unique_destination(folder: Path, filename: str) -> Path:
    target = folder / filename
    if not target.exists():
        return target
    stem, suffix = target.stem, target.suffix
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = folder / f"{stem}__{stamp}{suffix}"
    counter = 2
    while target.exists():
        target = folder / f"{stem}__{stamp}-{counter}{suffix}"
        counter += 1
    return target


def wait_until_stable(path: Path, timeout: int = 30) -> None:
    deadline = time.time() + timeout
    previous = None
    stable = 0
    while time.time() < deadline:
        current = path.stat().st_size
        if current > 0 and current == previous:
            stable += 1
            if stable >= 2:
                return
        else:
            stable = 0
        previous = current
        time.sleep(1)
    raise TimeoutError("The Dropbox file is still syncing or changing. Retry when sync completes.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", help="Path relative to Dropbox root, or absolute synced Dropbox path")
    parser.add_argument("--project", required=True, help="GEEHUB project directory")
    args = parser.parse_args()

    source, root = resolve_source(args.video)
    if not source.is_file():
        raise FileNotFoundError(f"Source is not a file: {source}")
    if source.suffix.lower() not in VIDEO_EXTENSIONS:
        raise ValueError(f"Unsupported video extension: {source.suffix}")
    wait_until_stable(source)

    project = Path(args.project).expanduser().resolve()
    source_dir = project / "01_SOURCE"
    source_dir.mkdir(parents=True, exist_ok=True)
    destination = unique_destination(source_dir, source.name)

    before = source.stat()
    shutil.copy2(source, destination)
    source_hash = sha256_file(source)
    staged_hash = sha256_file(destination)
    if source_hash != staged_hash:
        destination.unlink(missing_ok=True)
        raise IOError("Staged copy failed SHA-256 verification; incomplete copy removed.")

    try:
        relative = source.relative_to(root).as_posix() if root else None
    except ValueError:
        relative = None

    record = {
        "schema": "geehub.dropbox-source.v1",
        "source_of_truth": "dropbox",
        "source_path": str(source),
        "dropbox_root": str(root) if root else None,
        "dropbox_relative_path": relative,
        "source_filename": source.name,
        "source_size_bytes": before.st_size,
        "source_mtime_utc": datetime.fromtimestamp(before.st_mtime, timezone.utc).isoformat(),
        "sha256": source_hash,
        "staged_path": str(destination),
        "staged_at_utc": datetime.now(timezone.utc).isoformat(),
        "original_modified": False,
    }
    record_path = destination.with_suffix(destination.suffix + ".source.json")
    record_path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "status": "staged",
        "source": str(source),
        "staged_video": str(destination),
        "provenance": str(record_path),
        "sha256": source_hash,
        "verified": True,
        "original_preserved": True,
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"GEEHUB Dropbox staging error: {exc}", file=sys.stderr)
        raise SystemExit(2)
