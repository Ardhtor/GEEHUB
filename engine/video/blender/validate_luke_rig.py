"""Validate a generated GEEHUB Luke rig and render diagnostic stills.

Run after luke_rig_scaffold.py:
  blender --background Luke_Rig_Scaffold.blend --python validate_luke_rig.py

The script fails loudly on missing rig components. It does not claim visual likeness
or source-footage accuracy; those still require frame-by-frame fitting.
"""
import bpy
import json
from pathlib import Path

scene = bpy.context.scene
report = {
    "project": bpy.data.filepath,
    "checks": {},
    "diagnostic_frames": [],
    "limitations": [
        "Structural validation only; no visual likeness score.",
        "Source-video proportions, camera and timing remain unmeasured.",
        "Phase-four growth is a scaffold control, not a fitted transformation."
    ],
}

def check(name, condition, detail=""):
    report["checks"][name] = {"passed": bool(condition), "detail": detail}
    if not condition:
        raise RuntimeError("GEEHUB rig validation failed: " + name + " — " + detail)

body = bpy.data.objects.get("Luke_Body_Surface")
rig = bpy.data.objects.get("Luke_Rig")
check("body_mesh_exists", body is not None and body.type == "MESH")
check("armature_exists", rig is not None and rig.type == "ARMATURE")

arm_mods = [m for m in body.modifiers if m.type == "ARMATURE" and m.object == rig]
check("body_deforms_from_rig", bool(arm_mods), "Expected Armature modifier targeting Luke_Rig.")
check("body_origin_normalized", body.location.length < 1e-5,
      "Body object origin should be at world origin so shape-key envelopes align.")
bbox = [body.matrix_world @ __import__("mathutils").Vector(corner) for corner in body.bound_box]
z_min = min(v.z for v in bbox)
z_max = max(v.z for v in bbox)
check("body_world_height", z_min < 0.20 and z_max > 2.50,
      "Expected a full-height world-space mesh; bounds z=[%.3f, %.3f]." % (z_min, z_max))

required_bones = [
    "root", "pelvis", "spine", "chest", "neck", "head",
    "clavicle.L", "clavicle.R", "upper_arm.L", "upper_arm.R",
    "forearm.L", "forearm.R", "hand.L", "hand.R",
    "thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R",
]
missing = [name for name in required_bones if name not in rig.data.bones]
check("core_skeleton", not missing, "Missing: " + ", ".join(missing))

check("phase_four_key_exists",
      body.data.shape_keys is not None and
      body.data.shape_keys.key_blocks.get("PHASE_04_GROWTH") is not None)
check("phase_four_cap", int(rig.get("growth_stage_max", 0)) == 4,
      "growth_stage_max must equal 4; higher stages are not permitted.")

ik_constraints = [
    (pb.name, c.name) for pb in rig.pose.bones for c in pb.constraints
    if c.type == "IK"
]
check("limb_ik_present", len(ik_constraints) >= 4,
      "Expected arm and leg IK constraints; found %d." % len(ik_constraints))

action = rig.animation_data.action if rig.animation_data else None
check("sanity_action_exists", action is not None,
      "Expected a rig sanity action for deformation checks.")

check("camera_exists", scene.camera is not None and scene.camera.type == "CAMERA")
check("render_engine_configured", scene.render.engine in {"BLENDER_EEVEE_NEXT", "CYCLES"})

out_dir = Path(bpy.path.abspath("//GEEHUB_DIAGNOSTICS"))
out_dir.mkdir(parents=True, exist_ok=True)
original_path = scene.render.filepath
original_format = scene.render.image_settings.file_format
frames = [1, 90, 110, 180]
for frame in frames:
    scene.frame_set(frame)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(out_dir / ("luke_phase4_%04d.png" % frame))
    bpy.ops.render.render(write_still=True)
    report["diagnostic_frames"].append({
        "frame": frame,
        "file": scene.render.filepath,
        "growth_value": round(float(body.data.shape_keys.key_blocks["PHASE_04_GROWTH"].value), 4),
    })

scene.render.filepath = original_path
scene.render.image_settings.file_format = original_format
report["status"] = "PASS"
report_path = out_dir / "rig_validation.json"
report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
print("GEEHUB structural rig validation: PASS")
print("Diagnostic renders and report:", out_dir)
