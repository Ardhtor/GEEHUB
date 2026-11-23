"""Build and render a one-frame preview of the real Hulum's Lab Serum scene."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bpy
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

    print(
        "GEEHUB_SCENE_RENDER_OK "
        f"blender={bpy.app.version_string} "
        f"blend_bytes={blend_path.stat().st_size} "
        f"preview_mp4_bytes={video_path.stat().st_size} "
        f"preview_png_bytes={image_path.stat().st_size}"
    )


if __name__ == "__main__":
    main()
