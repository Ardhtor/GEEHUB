"""Frame-accurate regional deformation for GEEHUB Blender scenes.

The renderer consumes explicit per-region curves from growth_curves.py. Every
rendered frame receives a deterministic shape-key value; semantic timeline
stages remain descriptive and never cause step changes in the body.
"""
from __future__ import annotations

import math
import bpy
from mathutils import Vector

from growth_curves import DEFAULT_PROFILE, sample_profile, validate_profile

# Ellipsoidal influence fields localise each shape key to an anatomical region.
# Factors are the full-strength deformation at a normalised profile value of 1.
REGIONS = {
    "pectorals": ((0.0, -0.02, 2.28), (1.02, 0.76, 0.60), (1.62, 1.46, 1.30)),
    "deltoids": ((0.0, 0.0, 2.60), (1.22, 0.82, 0.66), (1.42, 1.36, 1.34)),
    "traps": ((0.0, 0.02, 2.76), (0.76, 0.62, 0.42), (1.46, 1.34, 1.40)),
    "arms": ((0.0, 0.0, 1.93), (1.34, 0.72, 1.12), (1.48, 1.42, 1.38)),
    "lats": ((0.0, 0.08, 2.05), (1.08, 0.72, 0.86), (1.52, 1.38, 1.34)),
    "back": ((0.0, 0.18, 2.10), (1.10, 0.68, 0.94), (1.48, 1.40, 1.38)),
    "torso": ((0.0, 0.02, 1.93), (0.82, 0.62, 1.08), (1.36, 1.32, 1.38)),
    "quadriceps": ((0.0, 0.0, 0.58), (0.72, 0.70, 0.92), (1.48, 1.40, 1.42)),
    "calves": ((0.0, 0.0, -0.43), (0.68, 0.66, 0.72), (1.36, 1.34, 1.40)),
    "whole_body": ((0.0, 0.0, 1.20), (1.65, 1.0, 2.45), (1.24, 1.20, 1.28)),
}


def _make_region_key(mesh, name, centre, radius, factors):
    if mesh.data.shape_keys is None:
        mesh.shape_key_add(name="Basis", from_mix=False)
    key = mesh.shape_key_add(name="GROWTH / " + name, from_mix=False)
    c, r, f = Vector(centre), Vector(radius), Vector(factors)
    for source, point in zip(mesh.data.vertices, key.data):
        delta = source.co - c
        q = (delta.x / r.x) ** 2 + (delta.y / r.y) ** 2 + (delta.z / r.z) ** 2
        # Gaussian falloff avoids a hard boundary around each muscle group.
        weight = math.exp(-2.4 * q)
        # Preserve the head/face as an identity anchor during whole-body scaling.
        if name == "whole_body" and source.co.z > 2.92:
            weight *= max(0.0, 1.0 - (source.co.z - 2.92) / 0.30)
        target = c + Vector((delta.x * f.x, delta.y * f.y, delta.z * f.z))
        point.co = source.co.lerp(target, weight)
    return key


def animate_timeline_growth(mesh, timeline, profile=None):
    """Build regional shape keys and key every rendered frame from growth curves."""
    if not timeline or not timeline.get("stages"):
        raise ValueError("A timeline with stages is required")
    fps = int(timeline.get("timebase", {}).get("fps", bpy.context.scene.render.fps))
    duration = float(timeline["duration_seconds"])
    frame_count = int(timeline.get("timebase", {}).get("frame_count", round(duration * fps)))
    if frame_count != round(duration * fps):
        raise ValueError("Timeline frame_count must equal duration_seconds × fps")
    if profile and profile.get("schema") == "geehub.growth-profile/1":
        selected_profile = {name: entry["knots"] for name, entry in profile.get("regions", {}).items()}
        if profile.get("project_id") != timeline.get("project_id"):
            raise ValueError("Growth profile project_id does not match timeline")
        if int(profile.get("timebase", {}).get("fps", fps)) != fps:
            raise ValueError("Growth profile fps does not match timeline")
    else:
        selected_profile = profile or DEFAULT_PROFILE
    errors = validate_profile(selected_profile)
    if errors:
        raise ValueError("Invalid growth profile: " + "; ".join(errors))
    missing = set(REGIONS) - set(selected_profile)
    if missing:
        raise ValueError("Growth profile missing regions: " + ", ".join(sorted(missing)))

    scene = bpy.context.scene
    scene.render.fps = fps
    scene.frame_start, scene.frame_end = 1, frame_count
    keys = {
        region: _make_region_key(mesh, region, centre, radius, factors)
        for region, (centre, radius, factors) in REGIONS.items()
    }
    for frame, values in sample_profile(selected_profile, duration, fps):
        for region, key in keys.items():
            key.value = values[region]
            key.keyframe_insert(data_path="value", frame=frame, group="Continuous growth / " + region)

    # The curve evaluator already supplies smoothstep values. Linear interpolation
    # between adjacent frame samples preserves those values exactly at render time.
    shape_keys = mesh.data.shape_keys
    if shape_keys and shape_keys.animation_data and shape_keys.animation_data.action:
        for curve in shape_keys.animation_data.action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = "LINEAR"
    return keys


def animate_timeline_camera(camera, timeline, profile=None, target=(0.0, 0.0, 1.25)):
    """Maintain a continuous orbit while gradually widening for the changing silhouette."""
    from growth_curves import evaluate_profile

    fps = int(timeline.get("timebase", {}).get("fps", 24))
    duration = float(timeline["duration_seconds"])
    total = int(round(duration * fps))
    if profile and profile.get("schema") == "geehub.growth-profile/1":
        curves = {name: entry["knots"] for name, entry in profile.get("regions", {}).items()}
    else:
        curves = DEFAULT_PROFILE

    # Use every authored curve knot plus the timeline endpoints. This lets the
    # camera respond to anatomical onset without changing lens or cutting away.
    times = {0.0, max(0.0, (total - 1) / fps)}
    for knots in curves.values():
        times.update(float(knot[0]) for knot in knots
                     if 0.0 <= float(knot[0]) <= (total - 1) / fps)
    for stage in timeline.get("stages", []):
        for field in ("start_seconds", "end_seconds"):
            value = float(stage[field])
            if 0.0 <= value <= (total - 1) / fps:
                times.add(value)

    for seconds in sorted(times):
        values = evaluate_profile(curves, seconds)
        intensity = max(values.values(), default=0.0)
        phase = seconds / duration if duration else 0.0
        angle = -0.12 + phase * 0.34
        # Widen by moving the camera back, not by changing focal length. The
        # movement is gradual and keyed on the same timeline as the deformation.
        radius = 9.0 + 1.8 * intensity
        camera.location = (
            math.sin(angle) * radius,
            -math.cos(angle) * radius,
            2.35 + 0.45 * intensity,
        )
        focus = Vector((target[0], target[1], target[2] + 0.20 * intensity))
        camera.rotation_euler = (focus - camera.location).to_track_quat("-Z", "Y").to_euler()
        frame = min(total, max(1, int(round(seconds * fps)) + 1))
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)

    if camera.animation_data and camera.animation_data.action:
        for curve in camera.animation_data.action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = "BEZIER"
                point.handle_left_type = "AUTO_CLAMPED"
                point.handle_right_type = "AUTO_CLAMPED"
