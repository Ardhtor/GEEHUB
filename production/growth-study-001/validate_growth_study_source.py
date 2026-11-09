"""Static source checks for the GEEHUB procedural Blender builder.

Run with ordinary CPython. This validates Python syntax and expected rig/action
structure; it does not import bpy or claim Blender runtime validation.
"""
from __future__ import annotations

import ast
from pathlib import Path

SCRIPT = Path(__file__).with_name("geehub_growth_study_v2.py")
source = SCRIPT.read_text(encoding="utf-8")
compile(source, str(SCRIPT), "exec")
tree = ast.parse(source, filename=str(SCRIPT))

functions = {
    node.name
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
required_functions = {
    "build_rig",
    "build_ik_control_objects",
    "add_limb_ik_constraints",
    "build_video6_pose_action",
    "animate_run_away",
    "animate_growth",
    "build_appendage_digits",
    "save_and_render",
    "main",
}
missing = sorted(required_functions - functions)
if missing:
    raise SystemExit(f"Missing required builders: {missing}")

required_source_tokens = (
    "CTRL_Hand_IK.L",
    "CTRL_Hand_IK.R",
    "CTRL_Elbow_Pole.L",
    "CTRL_Elbow_Pole.R",
    "CTRL_Foot_IK.L",
    "CTRL_Foot_IK.R",
    "CTRL_Knee_Pole.L",
    "CTRL_Knee_Pole.R",
    "arm_ik",
    "leg_ik",
    "VIDEO6_POSE — reference matched hand targets",
    "RUN_AWAY — turn, gait, and retreat",
    "APPENDAGE_DIGITS — replaceable geometry",
    "CAM_Video6",
    "AUTO_CLAMPED",
    "VIDEO6_POSE_STUDY",
    "Video6 Torso Reset",
    "Video6 Toe Reset",
)
missing_tokens = [token for token in required_source_tokens if token not in source]
if missing_tokens:
    raise SystemExit(f"Missing required rig/action tokens: {missing_tokens}")

main = next(
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "main"
)
main_calls = {
    node.func.id
    for node in ast.walk(main)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
}
required_calls = {
    "build_rig",
    "build_character",
    "animate_growth",
    "animate_run_away",
    "build_video6_pose_action",
}
if not required_calls.issubset(main_calls):
    raise SystemExit(
        f"main() does not call all build stages: {sorted(required_calls - main_calls)}"
    )

print(f"PASS: {SCRIPT.name} compiles and contains the expected V2.4 rig/action stages.")
print("NOTE: Blender evaluation, pole angles, joint deformation, and render checks are separate.")
