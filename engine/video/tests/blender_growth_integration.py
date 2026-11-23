"""Headless Blender integration test for the real growth shape-key pipeline.

Run with Blender 5.3's Python module or:
    blender --background --python engine/video/tests/blender_growth_integration.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bpy
from timeline_growth import REGIONS, _iter_action_fcurves, animate_timeline_growth


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mesh_data = bpy.data.meshes.new("GEEHUB integration test mesh")
    mesh_data.from_pydata(
        [
            (-0.36, -0.29, 2.27),
            (0.36, -0.29, 2.27),
            (0.0, 0.0, 1.0),
            (0.0, 0.0, 3.0),
        ],
        [],
        [],
    )
    mesh = bpy.data.objects.new("GEEHUB integration test subject", mesh_data)
    bpy.context.scene.collection.objects.link(mesh)

    fps = 24
    duration = 2.0
    regions = set(REGIONS) | {
        "pectorals",
        "pectorals_projection",
        "pectorals_upper",
        "pectorals_outer",
        "pectorals_sternal",
        "pectorals_lower_shelf",
    }
    profile = {
        "schema": "geehub.growth-profile/1",
        "project_id": "blender-ci-growth-test",
        "timebase": {"fps": fps},
        "regions": {
            region: {"knots": [[0.0, 0.0], [duration, 1.0]]}
            for region in sorted(regions)
        },
        "deformation": {
            "pectorals": {
                "geometry": {
                    "projection": {
                        "centre": [0.36, -0.29, 2.27],
                        "radius": [0.43, 0.42, 0.32],
                        "offset": [0.045, -0.205, 0.0],
                    }
                }
            }
        },
    }
    timeline = {
        "project_id": "blender-ci-growth-test",
        "duration_seconds": duration,
        "timebase": {"fps": fps, "frame_count": int(duration * fps)},
        "stages": [{"start_seconds": 0.0, "end_seconds": duration}],
    }

    keys = animate_timeline_growth(mesh, timeline, profile)
    shape_keys = mesh.data.shape_keys
    if shape_keys is None:
        raise AssertionError("Blender did not create a shape-key datablock")

    required = {
        "GROWTH / pectorals - forward projection",
        "GROWTH / pectorals - upper fullness",
        "GROWTH / pectorals - outer sweep",
        "GROWTH / pectorals - sternal separation",
        "GROWTH / pectorals - lower shelf",
        *{f"GROWTH / {region}" for region in REGIONS},
    }
    available = {key.name for key in shape_keys.key_blocks}
    missing = required - available
    if missing:
        raise AssertionError("Missing Blender shape keys: " + ", ".join(sorted(missing)))

    projection = shape_keys.key_blocks["GROWTH / pectorals - forward projection"]
    basis = shape_keys.key_blocks["Basis"]
    left_delta = projection.data[0].co - basis.data[0].co
    right_delta = projection.data[1].co - basis.data[1].co
    if not (left_delta.y < 0 and right_delta.y < 0):
        raise AssertionError("Pectoral projection must move both sides toward the camera")
    if not (left_delta.x < 0 and right_delta.x > 0):
        raise AssertionError("Pectoral projection must remain bilaterally mirrored")

    bpy.context.scene.frame_set(int(duration * fps))
    bpy.context.view_layer.update()
    if projection.value < 0.95:
        raise AssertionError(f"Final-frame pectoral curve did not reach its plateau: {projection.value}")
    if shape_keys.animation_data is None or shape_keys.animation_data.action is None:
        raise AssertionError("Blender did not create an animation action for the shape keys")
    curves = list(_iter_action_fcurves(shape_keys.animation_data))
    if len(curves) < len(required):
        raise AssertionError(f"Expected at least {len(required)} shape-key F-curves, found {len(curves)}")
    if any(point.interpolation != "LINEAR" for curve in curves for point in curve.keyframe_points):
        raise AssertionError("Shape-key frame samples must use linear interpolation between exact sampled values")

    print(
        "GEEHUB_BLENDER_INTEGRATION_OK "
        f"blender={bpy.app.version_string} shape_keys={len(shape_keys.key_blocks)} "
        f"final_pectorals={projection.value:.4f}"
    )


if __name__ == "__main__":
    main()
