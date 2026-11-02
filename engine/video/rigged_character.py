"""Unified, armature-driven adult humanoid blockout for GEEHUB.

This is the next geometry layer beyond the original separate-ellipsoid blocking
mesh: metaball anatomy is fused into one smooth surface, then bound to a
deformable skeleton with distance-based normalized weights. It is deliberately
a neutral production base; approved character meshes can replace it later.
Run inside Blender's Python environment.
"""
from __future__ import annotations

import math
from mathutils import Vector
import bpy


def _mat(name, color, roughness=0.48, subsurface=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
    return mat


def _segment_distance(point, start, end):
    axis = end - start
    denom = axis.length_squared
    if denom < 1e-10:
        return (point - start).length
    t = max(0.0, min(1.0, (point - start).dot(axis) / denom))
    return (point - (start + axis * t)).length


def _add_blob(meta, name, center, radius, scale):
    element = meta.elements.new()
    element.co = center
    element.radius = radius
    element.size_x, element.size_y, element.size_z = scale


def _anatomy_surface(name="GEEHUB / unified humanoid"):
    meta = bpy.data.metaballs.new(name + " / fused anatomy")
    meta.resolution = 0.075
    meta.render_resolution = 0.045
    meta.threshold = 0.62
    obj = bpy.data.objects.new(name + " / fused mesh", meta)
    bpy.context.collection.objects.link(obj)

    # Coordinates are in metres, Z-up, with the subject facing -Y.
    blobs = [
        ("pelvis", (0, 0, 1.02), .60, (.78, .54, .62)),
        ("abdomen", (0, 0, 1.62), .57, (.68, .48, .86)),
        ("chest", (0, -.015, 2.28), .72, (1.00, .54, .65)),
        ("neck", (0, 0, 2.91), .32, (.32, .32, .52)),
        ("head", (0, 0, 3.38), .39, (.43, .40, .57)),
    ]
    for name_, center, radius, scale in blobs:
        _add_blob(meta, name_, center, radius, scale)

    for side in (-1, 1):
        tag = "L" if side < 0 else "R"
        _add_blob(meta, "shoulder." + tag, (side * .78, 0, 2.60), .43, (.78, .66, .70))
        _add_blob(meta, "upperarm." + tag, (side * .96, 0, 2.13), .32, (.55, .52, 1.35))
        _add_blob(meta, "elbow." + tag, (side * 1.04, 0, 1.72), .22, (.72, .68, .72))
        _add_blob(meta, "forearm." + tag, (side * 1.10, -.015, 1.34), .27, (.58, .52, 1.35))
        _add_blob(meta, "hand." + tag, (side * 1.13, -.04, .94), .19, (.60, .48, .88))
        _add_blob(meta, "thigh." + tag, (side * .34, 0, .60), .43, (.78, .72, 1.62))
        _add_blob(meta, "knee." + tag, (side * .36, 0, .08), .24, (.78, .72, .78))
        _add_blob(meta, "calf." + tag, (side * .37, .01, -.46), .30, (.60, .62, 1.42))
        _add_blob(meta, "ankle." + tag, (side * .38, -.01, -.91), .16, (.62, .62, .76))
        _add_blob(meta, "foot." + tag, (side * .38, -.20, -1.02), .20, (.66, 1.55, .48))

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    mesh = bpy.context.object
    mesh.name = name + " / unified skin"
    for poly in mesh.data.polygons:
        poly.use_smooth = True
    smooth = mesh.modifiers.new("Surface relaxation", "SMOOTH")
    smooth.factor = 1.25
    smooth.iterations = 3
    sub = mesh.modifiers.new("Production subdivision", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 2
    mesh.data.materials.append(_mat("GEEHUB / living skin", (.36, .23, .18), .42, .055))
    return mesh


def _bone_specs():
    specs = {
        "root": ((0, 0, .95), (0, 0, 1.10), None),
        "pelvis": ((0, 0, 1.10), (0, 0, 1.55), "root"),
        "spine": ((0, 0, 1.45), (0, 0, 2.18), "pelvis"),
        "chest": ((0, 0, 2.18), (0, 0, 2.65), "spine"),
        "neck": ((0, 0, 2.65), (0, 0, 3.08), "chest"),
        "head": ((0, 0, 3.08), (0, 0, 3.72), "neck"),
    }
    for side, tag in ((-1, "L"), (1, "R")):
        specs["clavicle." + tag] = ((0, 0, 2.58), (side * .78, 0, 2.60), "chest")
        specs["upper_arm." + tag] = ((side * .78, 0, 2.60), (side * 1.04, 0, 1.76), "clavicle." + tag)
        specs["forearm." + tag] = ((side * 1.04, 0, 1.76), (side * 1.13, 0, 1.08), "upper_arm." + tag)
        specs["hand." + tag] = ((side * 1.13, 0, 1.08), (side * 1.13, -.08, .78), "forearm." + tag)
        specs["thigh." + tag] = ((side * .28, 0, 1.10), (side * .36, 0, .08), "pelvis")
        specs["shin." + tag] = ((side * .36, 0, .08), (side * .38, 0, -.91), "thigh." + tag)
        specs["foot." + tag] = ((side * .38, 0, -.91), (side * .38, -.38, -1.02), "shin." + tag)
    return specs


def _make_armature(mesh, name):
    specs = _bone_specs()
    arm_data = bpy.data.armatures.new(name + " / skeleton")
    rig = bpy.data.objects.new(name + " / rig", arm_data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    mesh.select_set(False)
    bpy.ops.object.mode_set(mode="EDIT")
    bones = {}
    for bone_name, (head, tail, parent_name) in specs.items():
        bone = arm_data.edit_bones.new(bone_name)
        bone.head, bone.tail = head, tail
        bone.use_deform = bone_name != "root"
        bones[bone_name] = bone
    for bone_name, (_, _, parent_name) in specs.items():
        if parent_name:
            bones[bone_name].parent = bones[parent_name]
            bones[bone_name].use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")

    groups = {bone_name: mesh.vertex_groups.new(name=bone_name)
              for bone_name, (_, _, _) in specs.items() if bone_name != "root"}
    deform_segments = {
        key: (Vector(head), Vector(tail))
        for key, (head, tail, _) in specs.items() if key != "root"
    }
    # Smoothly blend each vertex across its three nearest bone segments.
    for vertex in mesh.data.vertices:
        distances = sorted(
            ((max(.035, _segment_distance(vertex.co, a, b)), key)
             for key, (a, b) in deform_segments.items())
        )[:3]
        raw = [(key, 1.0 / (distance ** 3.2)) for distance, key in distances]
        total = sum(weight for _, weight in raw)
        for key, weight in raw:
            groups[key].add([vertex.index], weight / total, "REPLACE")

    modifier = mesh.modifiers.new("Deformation / GEEHUB skeleton", "ARMATURE")
    modifier.object = rig
    modifier.use_deform_preserve_volume = True
    mesh.parent = rig
    return rig


def build_rigged_character(name="GEEHUB / rigged base", animate=False):
    """Create and return (unified_mesh, armature); safe to call in a clean scene."""
    mesh = _anatomy_surface(name)
    rig = _make_armature(mesh, name)
    if animate:
        scene = bpy.context.scene
        scene.frame_start = 1
        scene.frame_end = 120
        for frame, amount in ((1, 1.0), (48, 1.12), (84, 1.22), (120, 1.22)):
            scene.frame_set(frame)
            for bone_name in ("chest", "spine", "pelvis"):
                bone = rig.pose.bones.get(bone_name)
                if bone:
                    bone.scale = (amount, amount, amount)
                    bone.keyframe_insert(data_path="scale", frame=frame)
            for side in ("L", "R"):
                for bone_name in ("upper_arm." + side, "forearm." + side, "thigh." + side, "shin." + side):
                    bone = rig.pose.bones.get(bone_name)
                    if bone:
                        bone.scale = (1.0 + (amount - 1.0) * .72,) * 3
                        bone.keyframe_insert(data_path="scale", frame=frame)
        if rig.animation_data and rig.animation_data.action:
            for curve in rig.animation_data.action.fcurves:
                for key in curve.keyframe_points:
                    key.interpolation = "BEZIER"
    return mesh, rig


if __name__ == "__main__":
    build_rigged_character(animate=True)
