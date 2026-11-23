"""Build and render a one-frame preview of the real Hulum's Lab Serum scene."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bpy
import bmesh
from mathutils import Vector
from blender_scene import build_scene


def main():
    repo_root = Path(__file__).resolve().parents[3]
    project = repo_root / "production" / "projects" / "hulums-lab-serum-60s"
    manifests = project / "07_MANIFESTS"
    manifest = json.loads((project / "production.json").read_text(encoding="utf-8"))
    timeline = json.loads((manifests / "timeline.json").read_text(encoding="utf-8"))
    profile = json.loads((manifests / "growth_profile.json").read_text(encoding="utf-8"))

    output_dir = Path(__file__).resolve().parent / "output" / "blender-smoke"
    shutil.rmtree(output_dir, ignore_errors=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    video_path = output_dir / "preview.mp4"
    blend_path = output_dir / "preview.blend"
    image_path = output_dir / "preview.png"

    bpy.ops.wm.read_factory_settings(use_empty=True)
    build_scene(
        manifest,
        video_path,
        timeline=timeline,
        growth_profile=profile,
        preview_seconds=1.0 / int(timeline.get("timebase", {}).get("fps", 24)),
        save_blend_path=blend_path,
    )
    body = bpy.data.objects.get("GEEHUB / rigged base / fused skin")
    if body is None or body.type != "MESH":
        raise AssertionError("The unified rigged skin mesh was not created")
    bm = bmesh.new()
    bm.from_mesh(body.data)
    unvisited = set(bm.verts)
    components = 0
    while unvisited:
        components += 1
        stack = [unvisited.pop()]
        while stack:
            vertex = stack.pop()
            for edge in vertex.link_edges:
                neighbour = edge.other_vert(vertex)
                if neighbour in unvisited:
                    unvisited.remove(neighbour)
                    stack.append(neighbour)
    bm.free()
    if components != 1:
        raise AssertionError(f"Unified body must be one connected mesh; found {components} components")
    if len(body.data.vertices) < 5000:
        raise AssertionError(f"Unified body mesh is under-detailed: {len(body.data.vertices)} vertices")
    if len(body.data.materials) < 2 or not any(poly.material_index == 1 for poly in body.data.polygons):
        raise AssertionError("The image-library chest-hair surface material was not assigned")
    top = bpy.data.objects.get("WARDROBE / fitted low-cut tank alternate")
    shorts = bpy.data.objects.get("WARDROBE / denim cutoff shorts")
    if top is None or shorts is None:
        raise AssertionError("Primary denim and alternate tank wardrobe objects were not created")
    if not top.hide_render:
        raise AssertionError("Primary image-library look must be shirtless; tank is an alternate")
    if not blend_path.is_file() or blend_path.stat().st_size < 100_000:
        raise AssertionError("Blender did not save the assembled production scene")
    if not video_path.is_file() or video_path.stat().st_size == 0:
        raise AssertionError("Blender did not render the smoke-test MP4")

    scene = bpy.context.scene
    if hasattr(scene.render.image_settings, "media_type"):
        scene.render.image_settings.media_type = "IMAGE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(image_path)
    scene.frame_set(1)
    bpy.ops.render.render(write_still=True)
    if not image_path.is_file() or image_path.stat().st_size < 1024:
        raise AssertionError("Blender did not render a reviewable PNG frame")

    # Review the actual final growth state from matched orthographic angles.
    fps = int(timeline.get("timebase", {}).get("fps", 24))
    final_frame = int(round(float(timeline.get("duration_seconds", 60)) * fps))
    scene.frame_end = final_frame
    scene.frame_set(final_frame)
    shape_keys = body.data.shape_keys.key_blocks
    for key_name in (
        "GROWTH / pectorals - forward projection",
        "GROWTH / pectorals - sternal groove",
    ):
        if shape_keys[key_name].value < 0.9:
            raise AssertionError(f"Final frame did not reach the intended chest state: {key_name}")

    review_data = bpy.data.cameras.new("GEEHUB / chest review camera")
    review_camera = bpy.data.objects.new("GEEHUB / chest review camera", review_data)
    scene.collection.objects.link(review_camera)
    review_data.type = "ORTHO"
    review_data.ortho_scale = 3.2
    review_data.lens = 70
    review_data.clip_end = 100
    scene.camera = review_camera
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 50
    target = Vector((0.0, 0.0, 2.28))
    views = {
        "chest-front.png": Vector((0.0, -5.0, 2.28)),
        "chest-three-quarter.png": Vector((3.2, -4.5, 2.28)),
        "chest-side.png": Vector((5.0, -0.05, 2.28)),
    }
    for filename, location in views.items():
        review_camera.location = location
        review_camera.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(output_dir / filename)
        bpy.ops.render.render(write_still=True)
        rendered = output_dir / filename
        if not rendered.is_file() or rendered.stat().st_size < 1024:
            raise AssertionError(f"Blender did not render the {filename} review angle")

    # Render the secondary graphite tank look separately; the primary look stays shirtless.
    top.hide_render = False
    for obj in bpy.data.objects:
        if obj.name.startswith("WARDROBE / left tank strap") or obj.name.startswith("WARDROBE / right tank strap"):
            obj.hide_render = False
    review_camera.location = views["chest-three-quarter.png"]
    review_camera.rotation_euler = (target - review_camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(output_dir / "chest-tank-alternate.png")
    bpy.ops.render.render(write_still=True)
    tank_review = output_dir / "chest-tank-alternate.png"
    if not tank_review.is_file() or tank_review.stat().st_size < 1024:
        raise AssertionError("Blender did not render the alternate tank review")
    top.hide_render = True
    for obj in bpy.data.objects:
        if obj.name.startswith("WARDROBE / left tank strap") or obj.name.startswith("WARDROBE / right tank strap"):
            obj.hide_render = True

    print(
        "GEEHUB_SCENE_RENDER_OK "
        f"blender={bpy.app.version_string} "
        f"blend_bytes={blend_path.stat().st_size} "
        f"preview_mp4_bytes={video_path.stat().st_size} "
        f"preview_png_bytes={image_path.stat().st_size} "
        f"review_angles={len(views) + 1}"
    )


if __name__ == "__main__":
    main()
