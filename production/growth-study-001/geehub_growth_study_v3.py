"""GEEHUB Growth Study 001 V3 — Growth Club Blender scene generator.

Test target: Blender 4.x. Run from Blender's Scripting workspace or with:
    blender --background --python geehub_growth_study_v3.py

V3 turns the V2 connected-body blockout into a colorful training-club showcase.
It adds replaceable gym props, a neon-style sign, four stage lamps, an animated
halo, hero and close-up cameras, and a club_energy lighting control. Blender
execution and visual validation are still required.
"""

import bpy
import math
import os
from mathutils import Vector

PROJECT_NAME = "GEEHUB_Growth_Study_001_V3_Growth_Club"
USE_VOLUME = True
RENDER_PREVIEWS = True
PREVIEW_RESOLUTION = 100
CLUB_NAME = "GROWTH CLUB"
BODY_VOXEL_SIZE = 0.022
GROWTH_KEYS = ((1, 0.0), (36, 0.28), (72, 0.62), (108, 1.0))
GROWTH_GAINS = {
    "spine": 0.16, "pelvis": 0.10,
    "upper_arm.L": 0.34, "upper_arm.R": 0.34,
    "forearm.L": 0.20, "forearm.R": 0.20,
    "thigh.L": 0.23, "thigh.R": 0.23,
    "calf.L": 0.15, "calf.R": 0.15,
}


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.armatures):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def set_active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def make_principled(name, base_color, roughness=0.5, metallic=0.0,
                    noise_scale=None, bump_strength=0.0, bump_distance=0.01,
                    color_variation=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = base_color
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if noise_scale is not None:
        noise = nodes.new("ShaderNodeTexNoise")
        noise.name = name + " — surface variation"
        noise.inputs["Scale"].default_value = noise_scale
        noise.inputs["Detail"].default_value = 3.0
        noise.inputs["Roughness"].default_value = 0.68
        if color_variation:
            ramp = nodes.new("ShaderNodeValToRGB")
            ramp.name = name + " — tonal range"
            ramp.color_ramp.elements[0].position = 0.22
            ramp.color_ramp.elements[0].color = color_variation[0]
            ramp.color_ramp.elements[1].position = 0.78
            ramp.color_ramp.elements[1].color = color_variation[1]
            links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
            links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        if bump_strength > 0.0:
            bump = nodes.new("ShaderNodeBump")
            bump.name = name + " — micro surface"
            bump.inputs["Strength"].default_value = bump_strength
            bump.inputs["Distance"].default_value = bump_distance
            links.new(noise.outputs["Fac"], bump.inputs["Height"])
            links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def add_uv_form(name, location, scale, material, bone_name, rig,
                segments=32, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    set_active(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.materials.append(material)
    group = obj.vertex_groups.new(name=bone_name)
    if len(obj.data.vertices):
        group.add([v.index for v in obj.data.vertices], 1.0, 'REPLACE')
    arm_mod = obj.modifiers.new("Rig Deformation", 'ARMATURE')
    arm_mod.object = rig
    arm_mod.use_vertex_groups = True
    return obj


def add_bone(arm_data, name, head, tail, parent=None, connected=False):
    bone = arm_data.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    if parent:
        bone.parent = arm_data.edit_bones.get(parent)
        bone.use_connect = connected
    return bone


def build_rig():
    arm_data = bpy.data.armatures.new("Growth Study — Control Skeleton")
    rig = bpy.data.objects.new("GROWTH_RIG — master control", arm_data)
    bpy.context.collection.objects.link(rig)
    set_active(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    add_bone(arm_data, "root", (0, 0, 0.02), (0, 0, 0.88))
    add_bone(arm_data, "pelvis", (0, 0, 0.82), (0, 0, 1.06), "root")
    add_bone(arm_data, "spine", (0, 0, 0.98), (0, 0, 1.58), "pelvis")
    add_bone(arm_data, "neck", (0, 0, 1.55), (0, 0, 1.83), "spine")
    add_bone(arm_data, "head", (0, 0, 1.80), (0, 0, 2.12), "neck")
    for side, sign in (("L", -1), ("R", 1)):
        add_bone(arm_data, f"upper_arm.{side}",
                 (sign * 0.34, 0, 1.57), (sign * 0.49, 0, 1.25), "spine")
        add_bone(arm_data, f"forearm.{side}",
                 (sign * 0.49, 0, 1.25), (sign * 0.57, 0, 0.98),
                 f"upper_arm.{side}", True)
        add_bone(arm_data, f"hand.{side}",
                 (sign * 0.57, 0, 0.98), (sign * 0.60, -0.02, 0.82),
                 f"forearm.{side}", True)
        add_bone(arm_data, f"thigh.{side}",
                 (sign * 0.18, 0, 0.88), (sign * 0.22, 0, 0.47), "pelvis")
        add_bone(arm_data, f"calf.{side}",
                 (sign * 0.22, 0, 0.47), (sign * 0.23, 0, 0.10),
                 f"thigh.{side}", True)
        add_bone(arm_data, f"foot.{side}",
                 (sign * 0.23, 0, 0.10), (sign * 0.23, -0.22, 0.07),
                 f"calf.{side}", True)
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front = True
    rig.data.display_type = 'OCTAHEDRAL'
    rig["growth"] = 0.0
    rig["club_energy"] = 1.0
    rig.id_properties_ui("club_energy").update(min=0.0, max=2.0, soft_min=0.0, soft_max=2.0, description="Training-club lighting intensity control")
    rig["study"] = "001 V2 — continuous surface and blended weights"
    rig.id_properties_ui("growth").update(
        min=0.0, max=1.0, soft_min=0.0, soft_max=1.0,
        description="Master growth control: 0 = rest, 1 = full study stage")
    for bone_name, gain in GROWTH_GAINS.items():
        pose_bone = rig.pose.bones.get(bone_name)
        if pose_bone is None:
            continue
        for axis in (0, 2):
            curve = pose_bone.driver_add("scale", axis)
            driver = curve.driver
            driver.type = 'SCRIPTED'
            variable = driver.variables.new()
            variable.name = "growth"
            variable.type = 'SINGLE_PROP'
            target = variable.targets[0]
            target.id = rig
            target.data_path = '["growth"]'
            driver.expression = f"1.0 + ({gain:.4f} * growth)"
    rig["instructions"] = "Adjust custom property 'growth' from 0 to 1. Timeline keys are staged."
    return rig


def make_unrigged_skin_volume(name, location, scale, material,
                              segments=40, rings=28):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    set_active(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.materials.append(material)
    return obj


def point_segment_distance(point, start, end):
    segment = end - start
    length_sq = segment.length_squared
    if length_sq <= 1e-12:
        return (point - start).length
    t = max(0.0, min(1.0, (point - start).dot(segment) / length_sq))
    closest = start + t * segment
    return (point - closest).length


def weight_connected_surface(body, rig):
    deform_bones = [bone for bone in rig.data.bones
                    if bone.name != "root" and bone.use_deform]
    groups = {bone.name: body.vertex_groups.new(name=bone.name)
              for bone in deform_bones}
    rig_inverse = rig.matrix_world.inverted()
    for vertex in body.data.vertices:
        world_point = body.matrix_world @ vertex.co
        point = rig_inverse @ world_point
        distances = []
        for bone in deform_bones:
            distance = point_segment_distance(
                point, bone.head_local, bone.tail_local)
            distances.append((distance, bone.name))
        distances.sort(key=lambda item: item[0])
        nearest = distances[:3]
        raw = [(name, 1.0 / ((distance + 0.045) ** 2.4))
               for distance, name in nearest]
        total = sum(value for _, value in raw) or 1.0
        for name, value in raw:
            groups[name].add([vertex.index], value / total, 'REPLACE')
    arm_mod = body.modifiers.new("Armature — blended anatomical weights", 'ARMATURE')
    arm_mod.object = rig
    arm_mod.use_vertex_groups = True
    if hasattr(arm_mod, "use_deform_preserve_volume"):
        arm_mod.use_deform_preserve_volume = True


def build_character(rig):
    skin = make_principled(
        "MAT_Skin — warm neutral study", (0.43, 0.22, 0.15, 1),
        roughness=0.43, noise_scale=54, bump_strength=0.10,
        bump_distance=0.008,
        color_variation=((0.31, 0.13, 0.085, 1), (0.53, 0.30, 0.21, 1)))
    cloth = make_principled(
        "MAT_Training Trunks — deep petrol", (0.018, 0.075, 0.085, 1),
        roughness=0.62, noise_scale=170, bump_strength=0.16,
        bump_distance=0.003,
        color_variation=((0.012, 0.045, 0.054, 1), (0.035, 0.12, 0.13, 1)))
    hair = make_principled("MAT_Hair — charcoal", (0.025, 0.022, 0.021, 1), 0.72)
    eye = make_principled("MAT_Eyes — dark umber", (0.012, 0.008, 0.006, 1), 0.18)

    volumes = []
    def v(name, loc, size, seg=40, rings=28):
        volumes.append(make_unrigged_skin_volume(name, loc, size, skin, seg, rings))

    v("TMP_Chest", (0, 0.0, 1.45), (0.385, 0.235, 0.285))
    v("TMP_UpperBack", (0, 0.075, 1.48), (0.36, 0.19, 0.255))
    v("TMP_Abdomen", (0, -0.005, 1.18), (0.285, 0.19, 0.275))
    v("TMP_Pelvis", (0, 0.015, 0.91), (0.33, 0.215, 0.225))
    v("TMP_Neck", (0, 0.0, 1.70), (0.115, 0.12, 0.19))
    v("TMP_Head", (0, -0.015, 1.99), (0.155, 0.16, 0.205))
    v("TMP_Nose", (0, -0.164, 1.98), (0.036, 0.045, 0.065), 24, 18)

    for side, sign in (("L", -1), ("R", 1)):
        v(f"TMP_Deltoid_{side}", (sign * 0.365, 0.0, 1.55),
          (0.145, 0.155, 0.16))
        v(f"TMP_Pectoral_{side}", (sign * 0.178, -0.205, 1.505),
          (0.205, 0.075, 0.135))
        v(f"TMP_Biceps_{side}", (sign * 0.435, -0.005, 1.405),
          (0.112, 0.12, 0.185))
        v(f"TMP_Triceps_{side}", (sign * 0.445, 0.085, 1.405),
          (0.10, 0.105, 0.17))
        v(f"TMP_Forearm_{side}", (sign * 0.535, -0.005, 1.105),
          (0.085, 0.095, 0.16))
        v(f"TMP_Hand_{side}", (sign * 0.592, -0.025, 0.865),
          (0.072, 0.055, 0.10))
        for row, z in enumerate((1.285, 1.205, 1.125), start=1):
            v(f"TMP_Ab_{row}_{side}", (sign * 0.078, -0.178, z),
              (0.071, 0.025, 0.042), 28, 20)
        v(f"TMP_Oblique_{side}", (sign * 0.255, -0.105, 1.20),
          (0.075, 0.075, 0.19))
        v(f"TMP_Quadriceps_{side}", (sign * 0.205, -0.105, 0.675),
          (0.145, 0.15, 0.235))
        v(f"TMP_Thigh_{side}", (sign * 0.20, 0.01, 0.68),
          (0.15, 0.155, 0.245))
        v(f"TMP_Calf_{side}", (sign * 0.23, 0.025, 0.285),
          (0.105, 0.12, 0.19))
        v(f"TMP_Foot_{side}", (sign * 0.23, -0.115, 0.075),
          (0.105, 0.22, 0.075))

    set_active(volumes[0])
    for obj in volumes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = volumes[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "BODY_ContinuousSurface — voxel fused"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    body.data.remesh_voxel_size = BODY_VOXEL_SIZE
    bpy.ops.object.voxel_remesh()
    relax = body.modifiers.new("Surface Relax — low pass", 'SMOOTH')
    relax.factor = 0.8
    relax.iterations = 3
    set_active(body)
    bpy.ops.object.modifier_apply(modifier=relax.name)
    for polygon in body.data.polygons:
        polygon.use_smooth = True
    weight_connected_surface(body, rig)
    body["component_type"] = "connected_anatomy_blockout"
    body["construction"] = "overlapping anatomical volumes fused with voxel remesh"
    body["voxel_size"] = BODY_VOXEL_SIZE
    body["weighting"] = "three-nearest-bone inverse-distance blend"
    body["known_limitations"] = "anatomical blockout only; no corrective shapes, muscle sliding, or skin simulation"

    add_uv_form("BODY_HairCap", (0, 0.005, 2.115),
                (0.158, 0.16, 0.10), hair, "head", rig)
    for side, sign in (("L", -1), ("R", 1)):
        add_uv_form(f"BODY_Ear.{side}", (sign * 0.153, 0.0, 1.99),
                    (0.035, 0.045, 0.065), skin, "head", rig, 20, 16)
        add_uv_form(f"BODY_Eye.{side}", (sign * 0.064, -0.155, 2.025),
                    (0.022, 0.012, 0.018), eye, "head", rig, 20, 16)
    add_uv_form("CLOTH_TrainingTrunks", (0, -0.012, 0.865),
                (0.345, 0.23, 0.205), cloth, "pelvis", rig)
    trim = make_principled("MAT_Seam — muted steel", (0.10, 0.20, 0.21, 1), 0.48, 0.22)
    add_uv_form("CLOTH_Waistband", (0, -0.018, 0.995),
                (0.348, 0.235, 0.035), trim, "pelvis", rig)
    rig["study"] = "001 V2 — continuous surface and blended weights"
    rig["geometry_mode"] = "voxel_fused_body"
    rig["body_object"] = body.name


def aim_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def add_area_light(name, location, target, power, color, size, shape='DISK', size_y=None):
    data = bpy.data.lights.new(name=name, type='AREA')
    data.energy, data.color = power, color
    data.shape, data.size = shape, size
    if shape == 'RECTANGLE' and size_y is not None:
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim_at(obj, target)
    return obj




def make_emission(name, color, strength=2.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = color
    emission.inputs["Strength"].default_value = strength
    mat.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return mat


def add_box(name, location, dimensions, material, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    set_active(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    if bevel > 0:
        mod = obj.modifiers.new("Rounded manufactured edges", 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new("Weighted normals", 'WEIGHTED_NORMAL')
    return obj


def add_torus(name, location, major_radius, minor_radius, material):
    bpy.ops.mesh.primitive_torus_add(major_segments=96, minor_segments=16,
        major_radius=major_radius, minor_radius=minor_radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_club_text(name, body, location, size, material):
    bpy.ops.object.text_add(location=location, rotation=(math.radians(90), 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.size = size
    obj.data.align_x = 'CENTER'
    obj.data.extrude = 0.0015
    obj.data.bevel_depth = 0.0008
    obj.data.materials.append(material)
    return obj


def add_driver(obj, data_path, rig, expression):
    curve = obj.driver_add(data_path)
    driver = curve.driver
    driver.type = 'SCRIPTED'
    variable = driver.variables.new()
    variable.name = "club_energy"
    variable.type = 'SINGLE_PROP'
    variable.targets[0].id = rig
    variable.targets[0].data_path = '["club_energy"]'
    driver.expression = expression


def add_club_camera(name, location, target, ortho_scale):
    data = bpy.data.cameras.new(name)
    camera = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(camera)
    camera.location = location
    aim_at(camera, target)
    data.type = 'ORTHO'
    data.ortho_scale = ortho_scale
    return camera


def build_environment(rig):
    """Colorful, prop-filled training club instead of an empty dark studio."""
    floor_mat = make_principled("MAT_Club Floor — midnight teal", (0.014, 0.055, 0.062, 1), 0.66)
    wall_mat = make_principled("MAT_Club Wall — deep blue", (0.018, 0.035, 0.075, 1), 0.82)
    panel_mat = make_principled("MAT_Club Panels — blue steel", (0.035, 0.10, 0.13, 1), 0.42, 0.28)
    metal = make_principled("MAT_Club Equipment — brushed steel", (0.16, 0.22, 0.25, 1), 0.34, 0.72)
    upholstery = make_principled("MAT_Bench Upholstery — petrol", (0.018, 0.22, 0.23, 1), 0.58)
    orange = make_principled("MAT_Accent — warm orange", (0.95, 0.24, 0.055, 1), 0.36, 0.15)
    cyan_glow = make_emission("EMIT_Club Cyan", (0.035, 0.82, 1.0, 1), 3.0)
    orange_glow = make_emission("EMIT_Club Amber", (1.0, 0.25, 0.045, 1), 2.4)
    lime_glow = make_emission("EMIT_Club Lime", (0.44, 1.0, 0.16, 1), 2.4)
    white_glow = make_emission("EMIT_Club White", (0.72, 0.9, 1.0, 1), 1.8)

    bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 0, -0.02))
    floor = bpy.context.object
    floor.name = "ENV_GrowthClub_Floor"
    floor.data.materials.append(floor_mat)
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 3.1, 2.65),
                                     rotation=(math.radians(90), 0, 0))
    wall = bpy.context.object
    wall.name = "ENV_GrowthClub_BackWall"
    wall.data.materials.append(wall_mat)

    for side in (-1, 1):
        add_box(f"ENV_WallBay_{side}", (side * 2.22, 2.93, 2.25),
                (0.92, 0.12, 2.65), panel_mat, 0.10)
        add_box(f"ENV_WallInset_{side}", (side * 2.22, 2.84, 2.35),
                (0.68, 0.035, 1.85), wall_mat, 0.06)
        add_box(f"ENV_WallStripe_{side}", (side * 1.82, 2.78, 2.30),
                (0.035, 0.035, 2.25), orange, 0.01)

    platform = bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.88,
        depth=0.11, location=(0, 0, 0.035))
    podium = bpy.context.object
    podium.name = "ENV_GrowthClub_Turntable"
    podium.data.materials.append(metal)
    bevel = podium.modifiers.new("Soft machined edge", 'BEVEL')
    bevel.width = 0.035
    bevel.segments = 3
    podium.modifiers.new("Weighted normals", 'WEIGHTED_NORMAL')
    add_torus("ENV_Platform_Ring_Cyan", (0, 0, 0.095), 0.82, 0.018, cyan_glow)
    add_torus("ENV_Platform_Ring_Amber", (0, 0, 0.10), 0.69, 0.012, orange_glow)
    add_torus("ENV_Floor_Marking", (0, 0, 0.008), 1.18, 0.012, white_glow)
    halo = add_torus("ENV_Animated_Halo", (0, 0, 0.13), 0.96, 0.009, lime_glow)
    halo.keyframe_insert(data_path="rotation_euler", index=2, frame=1)
    halo.rotation_euler[2] = math.tau
    halo.keyframe_insert(data_path="rotation_euler", index=2, frame=108)
    if halo.animation_data and halo.animation_data.action:
        for fc in halo.animation_data.action.fcurves:
            for key in fc.keyframe_points:
                key.interpolation = 'LINEAR'

    # Bench, rack, and dumbbells are simple replaceable set pieces.
    add_box("PROP_Bench_Pad", (-1.42, 0.62, 0.42), (1.0, 0.34, 0.12), upholstery, 0.07)
    for dx in (-0.37, 0.37):
        add_box(f"PROP_Bench_Leg_{dx}", (-1.42 + dx, 0.62, 0.20),
                (0.075, 0.25, 0.40), metal, 0.025)
    add_box("PROP_Dumbbell_Rack_Base", (1.48, 0.72, 0.19), (0.92, 0.34, 0.10), metal, 0.035)
    for x in (1.13, 1.83):
        add_box(f"PROP_Dumbbell_Rack_Post_{x}", (x, 0.72, 0.43),
                (0.07, 0.08, 0.48), metal, 0.018)
    for idx, x in enumerate((1.25, 1.48, 1.71), start=1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.025,
            depth=0.24, location=(x, 0.68, 0.55), rotation=(0, math.radians(90), 0))
        bar = bpy.context.object
        bar.name = f"PROP_Dumbbell_{idx}_Bar"
        bar.data.materials.append(metal)
        for sign in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.085 + idx*0.008,
                depth=0.065, location=(x + sign*0.09, 0.68, 0.55),
                rotation=(0, math.radians(90), 0))
            plate = bpy.context.object
            plate.name = f"PROP_Dumbbell_{idx}_Plate_{sign}"
            plate.data.materials.append(orange if idx == 2 else panel_mat)

    add_box("ENV_SignBacking", (0, 2.82, 3.13), (2.65, 0.12, 0.54), panel_mat, 0.09)
    add_club_text("SIGN_GrowthClub", CLUB_NAME, (0, 2.745, 3.11), 0.34, cyan_glow)
    add_club_text("SIGN_Subtitle", "TRAIN  /  PLAY  /  REPEAT",
                  (0, 2.74, 2.78), 0.105, white_glow)
    add_club_text("SIGN_LeftBay", "WARM UP", (-2.22, 2.73, 3.00), 0.11, orange_glow)
    add_club_text("SIGN_RightBay", "LEVEL UP", (2.22, 2.73, 3.00), 0.11, lime_glow)

    for idx, (x, label, material) in enumerate([
        (-1.32, "REST", orange_glow), (-0.44, "WARM", white_glow),
        (0.44, "BUILD", cyan_glow), (1.32, "MAX", lime_glow)], start=1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16,
            radius=0.074, location=(x, 2.60, 2.37))
        lamp = bpy.context.object
        lamp.name = f"ENV_StageLamp_{idx}"
        lamp.data.materials.append(material)
        for poly in lamp.data.polygons:
            poly.use_smooth = True
        add_club_text(f"ENV_StageLabel_{idx}", label, (x, 2.56, 2.18), 0.075, white_glow)

    for side in (-1, 1):
        add_box(f"ENV_Practical_{side}", (side * 2.62, 2.70, 1.28),
                (0.06, 0.055, 1.42), cyan_glow if side < 0 else orange_glow, 0.02)

    key = add_area_light("LIGHT_Key — warm club softbox", (-3.2, -4.0, 3.8), (0, 0, 1.15),
                         520, (1.0, 0.72, 0.52), 3.2, 'DISK')
    fill = add_area_light("LIGHT_Fill — cool club bounce", (3.2, -2.5, 2.4), (0, 0, 1.15),
                          250, (0.42, 0.72, 1.0), 3.8, 'DISK')
    rim = add_area_light("LIGHT_Rim — cyan separation", (0.4, 2.1, 3.2), (0, 0, 1.25),
                         680, (0.25, 0.82, 1.0), 2.0, 'DISK')
    top = add_area_light("LIGHT_TopStrip — warm strip", (-0.5, -0.2, 4.1), (0, 0, 1.25),
                         280, (1.0, 0.88, 0.68), 2.4, 'RECTANGLE', 0.75)
    add_driver(key.data, "energy", rig, "520 * club_energy")
    add_driver(fill.data, "energy", rig, "250 * club_energy")
    add_driver(rim.data, "energy", rig, "680 * club_energy")
    add_driver(top.data, "energy", rig, "280 * club_energy")

    for x, color, name in ((-2.55, (0.05, 0.55, 1.0), "LIGHT_Practical_Cyan"),
                           (2.55, (1.0, 0.20, 0.04), "LIGHT_Practical_Amber")):
        data = bpy.data.lights.new(name, type='POINT')
        data.energy = 65
        data.color = color
        data.shadow_soft_size = 0.65
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = (x, 2.2, 1.7)
        add_driver(data, "energy", rig, "65 * club_energy")

    world = bpy.data.worlds.new("WORLD — Growth Club evening") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.035, 0.06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32

    if USE_VOLUME:
        volume_mat = bpy.data.materials.new("MAT_Atmosphere — club haze")
        volume_mat.use_nodes = True
        nodes = volume_mat.node_tree.nodes
        nodes.clear()
        output = nodes.new("ShaderNodeOutputMaterial")
        volume = nodes.new("ShaderNodeVolumePrincipled")
        volume.inputs["Density"].default_value = 0.0035
        volume.inputs["Color"].default_value = (0.32, 0.52, 0.68, 1)
        volume.inputs["Anisotropy"].default_value = 0.22
        volume_mat.node_tree.links.new(volume.outputs["Volume"], output.inputs["Volume"])
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.5, 1.8))
        fog = bpy.context.object
        fog.name = "ENV_AtmosphereVolume — optional club haze"
        fog.scale = (7, 6, 4.5)
        fog.data.materials.append(volume_mat)
        fog.display_type = 'WIRE'
        fog["note"] = "Disable to compare the clean studio version with club haze."

    hero = add_club_camera("CAM_GrowthClub_Hero", (3.55, -8.2, 3.05), (0, 0.45, 1.45), 4.0)
    close = add_club_camera("CAM_GrowthClub_Closeup", (2.4, -5.6, 2.1), (0, 0.0, 1.42), 2.5)
    bpy.context.scene.camera = hero

def animate_growth(rig):
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = GROWTH_KEYS[0][0], GROWTH_KEYS[-1][0]
    for frame, value in GROWTH_KEYS:
        rig["growth"] = value
        rig.keyframe_insert(data_path='["growth"]', frame=frame, group="Growth Stages")
    if rig.animation_data and rig.animation_data.action:
        for fcurve in rig.animation_data.action.fcurves:
            for key in fcurve.keyframe_points:
                key.interpolation = 'BEZIER'
    for frame, label in ((1, "REST"), (36, "WARM"),
                         (72, "BUILD"), (108, "MAX")):
        scene.timeline_markers.new(label, frame=frame)


def configure_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
    except Exception:
        try:
            scene.render.engine = 'BLENDER_EEVEE'
        except Exception:
            scene.render.engine = 'CYCLES'
    scene.render.resolution_x, scene.render.resolution_y = 1080, 1350
    scene.render.resolution_percentage = PREVIEW_RESOLUTION
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = "//renders/"


def save_and_render():
    scene = bpy.context.scene
    if bpy.data.filepath:
        base_dir = bpy.path.abspath("//")
    else:
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        except NameError:
            base_dir = os.path.join(os.path.expanduser("~"), PROJECT_NAME)
    render_dir = os.path.join(base_dir, "renders")
    os.makedirs(render_dir, exist_ok=True)
    blend_path = os.path.join(base_dir, PROJECT_NAME + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    if RENDER_PREVIEWS:
        for frame, filename in ((1, "growth_club_rest.png"),
                                (108, "growth_club_max.png")):
            scene.frame_set(frame)
            scene.render.filepath = os.path.join(render_dir, filename)
            bpy.ops.render.render(write_still=True)
    scene.frame_set(1)
    scene.render.filepath = os.path.join(render_dir, "")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)


def main():
    clear_scene()
    rig = build_rig()
    build_character(rig)
    build_environment(rig)
    animate_growth(rig)
    configure_render()
    bpy.context.scene.frame_set(1)
    save_and_render()


if __name__ == "__main__":
    main()
