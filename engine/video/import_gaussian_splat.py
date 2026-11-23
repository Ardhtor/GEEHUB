#!/usr/bin/env python3
"""Import and verify a native Blender 5.3 Gaussian-splat PLY capture."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
        if "--" in argv:
            argv = argv[argv.index("--") + 1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Gaussian-splat PLY source file")
    parser.add_argument("--output", type=Path, required=True, help="Output .blend file")
    parser.add_argument("--name", default="GEEHUB / Gaussian Splat Capture")
    args = parser.parse_args(argv)

    source = args.source.expanduser().resolve()
    output = args.output.expanduser().resolve()
    if source.suffix.lower() != ".ply" or not source.is_file():
        print("SOURCE ERROR: provide an existing .ply Gaussian-splat file.", file=sys.stderr)
        return 2
    if bpy.app.version < (5, 3, 0):
        print("BLENDER VERSION ERROR: native Gaussian Splat import requires Blender 5.3+.", file=sys.stderr)
        return 2
    if not hasattr(bpy.ops.wm, "ply_import"):
        print("IMPORTER ERROR: bpy.ops.wm.ply_import is unavailable in this Blender build.", file=sys.stderr)
        return 2

    before = set(bpy.context.scene.objects)
    result = bpy.ops.wm.ply_import(filepath=str(source), import_attributes=True)
    if "FINISHED" not in result:
        print("IMPORT FAILED: Blender's PLY importer did not finish.", file=sys.stderr)
        return 3

    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    splats = []
    for obj in imported:
        if obj.type != "POINTCLOUD":
            continue
        attributes = {attribute.name for attribute in obj.data.attributes}
        required = {"scale", "rotation", "radiance:base"}
        if required.issubset(attributes):
            splats.append((obj, sorted(attributes)))

    if not splats:
        print(
            "NOT A VERIFIED GAUSSIAN SPLAT: Blender imported no point cloud with "
            "scale, rotation, and radiance:base attributes. No .blend was written.",
            file=sys.stderr,
        )
        return 4

    collection_name = "GEEHUB / SOURCE CAPTURES"
    collection = bpy.data.collections.get(collection_name)
    if collection is None:
        collection = bpy.data.collections.new(collection_name)
        bpy.context.scene.collection.children.link(collection)

    records = []
    for index, (obj, attributes) in enumerate(splats, start=1):
        obj.name = f"{args.name} {index:02d}"
        for old_collection in list(obj.users_collection):
            old_collection.objects.unlink(obj)
        collection.objects.link(obj)
        obj["geehub_asset_type"] = "gaussian_splat"
        obj["geehub_source_file"] = source.name
        obj["geehub_source_sha256"] = sha256_file(source)
        obj["geehub_source_preserved"] = True
        records.append({"object": obj.name, "attributes": attributes, "point_count": len(obj.data.points)})

    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    manifest = {
        "schema": "geehub.gaussian-splat-import/1",
        "source": {
            "filename": source.name,
            "path_at_import": str(source),
            "size_bytes": source.stat().st_size,
            "sha256": sha256_file(source),
            "source_modified": False,
        },
        "import": {
            "status": "verified-gaussian-splat",
            "blender_version": bpy.app.version_string,
            "imported_at": datetime.now(timezone.utc).isoformat(),
            "objects": records,
        },
        "output_blend": str(output),
    }
    sidecar = output.with_suffix(".source.json")
    sidecar.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"blend": str(output), "sidecar": str(sidecar), **manifest["import"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
