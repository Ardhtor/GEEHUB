"""GEEHUB Growth Study 001 — procedural Blender scene generator.

Test target: Blender 4.x. Run from Blender's Scripting workspace or with:
    blender --background --python geehub_growth_study_v2.py

This V2.4 pass fuses overlapping anatomical volumes into one continuous skin
blockout and assigns blended weights from the nearest bone segments. The
armature's growth custom property still drives staged transverse expansion.
It remains a prototype: no corrective shapes, muscle sliding, or skinning pass.
"""

import bpy
import math
import os
from mathutils import Vector

PROJECT_NAME = "GEEHUB_Growth_Study_001_V2_4"
VIDEO6_START_FRAME = 216
VIDEO6_END_FRAME = 360
VIDEO6_FPS = 24
RUN_START_FRAME = 108
RUN_CYCLE_START = 112
RUN_CYCLE_END = 208
RUN_RETREAT_DISTANCE = 9.0
USE_VOLUME = True
RENDER_PREVIEWS = True
PREVIEW_RESOLUTION = 100
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


def add_bone(arm_data, name, head, tail, parent=None, connected=False, deform=True):
    bone = arm_data.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.use_deform = deform
    if parent:
        bone.parent = arm_data.edit_bones.get(parent)
        bone.use_connect = connected
    return bone


def create_empty_control(name, rig, collection, location, display='SPHERE', size=0.12):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.parent = rig
    obj.location = location
    obj.empty_display_type = display
    obj.empty_display_size = size
    obj.show_in_front = True
    obj.hide_render = True
    obj["rig_control"] = True
    return obj


def drive_control_location(control, driver_object, property_prefix):
    for axis, suffix in enumerate(("x", "y", "z")):
        prop = f"{property_prefix}_{suffix}"
        curve = control.driver_add("location", axis)
        driver = curve.driver
        driver.type = 'SCRIPTED'
        variable = driver.variables.new()
        variable.name = "target_value"
        variable.type = 'SINGLE_PROP'
        target = variable.targets[0]
        target.id = driver_object
        target.data_path = f'["{prop}"]'
        driver.expression = "target_value"


def drive_ik_influence(constraint, rig, property_name):
    curve = constraint.driver_add("influence")
    driver = curve.driver
    driver.type = 'SCRIPTED'
    variable = driver.variables.new()
    variable.name = "ik_blend"
    variable.type = 'SINGLE_PROP'
    target = variable.targets[0]
    target.id = rig
    target.data_path = f'["{property_name}"]'
    driver.expression = "ik_blend"


def build_ik_control_objects(rig):
    collection = bpy.data.collections.new("RIG_CONTROLS — IK targets and video motion")
    bpy.context.scene.collection.children.link(collection)

    video_driver = bpy.data.objects.new("CTRL_VIDEO6_DRIVER", None)
    collection.objects.link(video_driver)
    video_driver.parent = rig
    video_driver.empty_display_type = 'PLAIN_AXES'
    video_driver.empty_display_size = 0.16
    video_driver.hide_render = True
    video_driver.hide_set(True)
    video_driver["purpose"] = "single action source for Video 6 hand and elbow target curves"

    for side, sign in (("L", -1), ("R", 1)):
        for label, prefix, location, display in (
            ("Hand_IK", f"hand_{side}", (sign * 0.60, -0.02, 0.82), "SPHERE"),
            ("Elbow_Pole", f"pole_{side}", (sign * 0.88, -0.78, 1.30), "CIRCLE"),
        ):
            control = create_empty_control(
                f"CTRL_{label}.{side}", rig, collection, location,
                display, 0.13 if label == "Hand_IK" else 0.10)
            drive_control_location(control, video_driver, prefix)

        foot = create_empty_control(
            f"CTRL_Foot_IK.{side}", rig, collection,
            (sign * 0.23, -0.22, 0.07), "CUBE", 0.12)
        foot["pivot_note"] = "ankle-to-toe endpoint; preserve planted sole contact"

        knee = create_empty_control(
            f"CTRL_Knee_Pole.{side}", rig, collection,
            (sign * 0.46, -0.72, 0.43), "CIRCLE", 0.11)
        knee["pivot_note"] = "knee bend direction; adjust after Blender pose review"

        heel = create_empty_control(
            f"CTRL_Heel_Pivot.{side}", rig, collection,
            (sign * 0.23, 0.105, 0.065), "CIRCLE", 0.075)
        heel["pivot_note"] = "heel roll reference pivot; separate from IK endpoint"

        toe = create_empty_control(
            f"CTRL_Toe_Pivot.{side}", rig, collection,
            (sign * 0.23, -0.235, 0.065), "CIRCLE", 0.075)
        toe["pivot_note"] = "toe roll reference pivot; separate from IK endpoint"

    rig["ik_control_collection"] = collection.name
    rig["video6_driver_object"] = video_driver.name
    rig["ik_control_objects"] = 13


def add_limb_ik_constraints(rig):
    for side in ("L", "R"):
        hand = rig.pose.bones.get(f"hand.{side}")
        hand_target = bpy.data.objects.get(f"CTRL_Hand_IK.{side}")
        elbow_pole = bpy.data.objects.get(f"CTRL_Elbow_Pole.{side}")
        if hand is not None and hand_target is not None and elbow_pole is not None:
            ik = hand.constraints.new('IK')
            ik.name = f"IK_Arm.{side} — clavicle to hand"
            ik.target = hand_target
            ik.pole_target = elbow_pole
            ik.chain_count = 4
            ik.iterations = 128
            ik.use_stretch = False
            ik.use_tail = True
            ik.pole_angle = 0.0
            drive_ik_influence(ik, rig, "arm_ik")

        foot = rig.pose.bones.get(f"foot.{side}")
        foot_target = bpy.data.objects.get(f"CTRL_Foot_IK.{side}")
        knee_pole = bpy.data.objects.get(f"CTRL_Knee_Pole.{side}")
        if foot is not None and foot_target is not None and knee_pole is not None:
            ik = foot.constraints.new('IK')
            ik.name = f"IK_Leg.{side} — thigh to foot"
            ik.target = foot_target
            ik.pole_target = knee_pole
            ik.chain_count = 3
            ik.iterations = 128
            ik.use_stretch = False
            ik.use_tail = True
            ik.pole_angle = 0.0
            drive_ik_influence(ik, rig, "leg_ik")

    rig["ik_system"] = (
        "hand IK targets with elbow poles; foot IK targets with knee poles; "
        "independent arm_ik and leg_ik influence switches"
    )


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
        add_bone(arm_data, f"clavicle.{side}",
                 (sign * 0.10, 0, 1.60), (sign * 0.34, 0, 1.57),
                 "spine", False, True)
        add_bone(arm_data, f"upper_arm.{side}",
                 (sign * 0.34, 0, 1.57), (sign * 0.49, 0, 1.25),
                 f"clavicle.{side}", True)
        add_bone(arm_data, f"forearm.{side}",
                 (sign * 0.49, 0, 1.25), (sign * 0.57, 0, 0.98),
                 f"upper_arm.{side}", True)
        add_bone(arm_data, f"hand.{side}",
                 (sign * 0.57, 0, 0.98), (sign * 0.60, -0.02, 0.82),
                 f"forearm.{side}", True)
        # Five independently controllable finger chains per hand.
        # The palm remains part of the continuous body; digit meshes are
        # separate replaceable objects built after the fused surface exists.
        hand_digits = (
            ("thumb", (0.54, -0.050, 0.825), (0.49, -0.070, 0.775), (0.465, -0.075, 0.735), 0.026, 0.018),
            ("index", (0.555, -0.060, 0.825), (0.558, -0.068, 0.755), (0.556, -0.070, 0.705), 0.021, 0.014),
            ("middle", (0.585, -0.062, 0.825), (0.588, -0.070, 0.748), (0.588, -0.072, 0.690), 0.022, 0.014),
            ("ring", (0.615, -0.060, 0.825), (0.620, -0.068, 0.758), (0.624, -0.070, 0.705), 0.020, 0.013),
            ("pinky", (0.642, -0.052, 0.825), (0.651, -0.060, 0.772), (0.660, -0.062, 0.730), 0.017, 0.011),
        )
        for digit, base, mid, tip, base_radius, tip_radius in hand_digits:
            mirrored = tuple((sign * p[0], p[1], p[2]) for p in (base, mid, tip))
            add_bone(arm_data, f"{digit}_01.{side}", mirrored[0], mirrored[1],
                     f"hand.{side}", False, True)
            add_bone(arm_data, f"{digit}_02.{side}", mirrored[1], mirrored[2],
                     f"{digit}_01.{side}", True, True)
        add_bone(arm_data, f"thigh.{side}",
                 (sign * 0.18, 0, 0.88), (sign * 0.22, 0, 0.47), "pelvis")
        add_bone(arm_data, f"calf.{side}",
                 (sign * 0.22, 0, 0.47), (sign * 0.23, 0, 0.10),
                 f"thigh.{side}", True)
        add_bone(arm_data, f"foot.{side}",
                 (sign * 0.23, 0, 0.10), (sign * 0.23, -0.22, 0.07),
                 f"calf.{side}", True)
        foot_digits = (
            ("big_toe", -0.040, 0.145, 0.030, 0.020),
            ("toe_02", -0.014, 0.132, 0.024, 0.016),
            ("toe_03", 0.012, 0.116, 0.022, 0.015),
            ("toe_04", 0.037, 0.098, 0.019, 0.013),
            ("toe_05", 0.060, 0.078, 0.016, 0.011),
        )
        for digit, x_offset, length, base_radius, tip_radius in foot_digits:
            base = (sign * (0.23 + x_offset), -0.235, 0.066)
            mid = (sign * (0.23 + x_offset), -0.235 - length * 0.55, 0.058)
            tip = (sign * (0.23 + x_offset), -0.235 - length, 0.050)
            add_bone(arm_data, f"{digit}_01.{side}", base, mid,
                     f"foot.{side}", False, True)
            add_bone(arm_data, f"{digit}_02.{side}", mid, tip,
                     f"{digit}_01.{side}", True, True)
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front = True
    rig.data.display_type = 'OCTAHEDRAL'
    rig["growth"] = 0.0
    rig["study"] = "001 V2.4 — IK/FK controls, articulated appendages, and Video6 pose match"
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
    # Independent IK switches. FK is available by setting a channel to zero.
    rig["arm_ik"] = 0.0
    rig["leg_ik"] = 0.0
    rig.id_properties_ui("arm_ik").update(
        min=0.0, max=1.0, description="Arm IK blend: 1 = hand/pole controls, 0 = FK")
    rig.id_properties_ui("leg_ik").update(
        min=0.0, max=1.0, description="Leg IK blend: 1 = planted foot controls, 0 = FK")
    build_ik_control_objects(rig)
    add_limb_ik_constraints(rig)

    rig["instructions"] = (
        "Adjust growth 0–1. Use CTRL_Hand_IK and CTRL_Foot_IK targets. "
        "arm_ik and leg_ik switch between IK and FK."
    )
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


def make_digit_mesh(name, points, base_radius, tip_radius, bone_a,
                    bone_b, material, rig, collection, ring_count=12):
    """Create a tapered, two-bone appendage mesh with blended joint weights."""
    p0, p1, p2 = (Vector(point) for point in points)
    path = ((0.0, p0), (0.52, p1), (1.0, p2))
    vertices = []
    faces = []
    ring_params = (0.0, 0.12, 0.28, 0.43, 0.52, 0.61, 0.76, 0.90, 1.0)

    def sample(t):
        if t <= 0.52:
            local = t / 0.52
            return p0.lerp(p1, local)
        local = (t - 0.52) / 0.48
        return p1.lerp(p2, local)

    for t in ring_params:
        center = sample(t)
        tangent = (sample(min(1.0, t + 0.015)) -
                   sample(max(0.0, t - 0.015))).normalized()
        reference = Vector((0.0, 1.0, 0.0))
        if abs(tangent.dot(reference)) > 0.92:
            reference = Vector((1.0, 0.0, 0.0))
        axis_u = tangent.cross(reference).normalized()
        axis_v = tangent.cross(axis_u).normalized()
        radius = base_radius * (1.0 - t) + tip_radius * t
        if 0.38 <= t <= 0.66:
            radius *= 0.97
        for j in range(ring_count):
            angle = (2.0 * math.pi * j) / ring_count
            offset = axis_u * math.cos(angle) + axis_v * math.sin(angle)
            vertices.append(tuple(center + offset * radius))

    for ring in range(len(ring_params) - 1):
        for j in range(ring_count):
            a = ring * ring_count + j
            b = ring * ring_count + (j + 1) % ring_count
            c = (ring + 1) * ring_count + (j + 1) % ring_count
            d = (ring + 1) * ring_count + j
            faces.append((a, b, c, d))

    start_center = len(vertices)
    vertices.append(tuple(p0))
    end_center = len(vertices)
    vertices.append(tuple(p2))
    for j in range(ring_count):
        nxt = (j + 1) % ring_count
        faces.append((start_center, nxt, j))
        last = (len(ring_params) - 1) * ring_count
        faces.append((end_center, last + j, last + nxt))

    mesh = bpy.data.meshes.new(name + " — mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    proximal = obj.vertex_groups.new(name=bone_a)
    distal = obj.vertex_groups.new(name=bone_b)
    for ring, t in enumerate(ring_params):
        if t <= 0.42:
            wa, wb = 1.0, 0.0
        elif t >= 0.62:
            wa, wb = 0.0, 1.0
        else:
            wb = (t - 0.42) / 0.20
            wa = 1.0 - wb
        indices = list(range(ring * ring_count, (ring + 1) * ring_count))
        if wa > 0.0:
            proximal.add(indices, wa, 'REPLACE')
        if wb > 0.0:
            distal.add(indices, wb, 'REPLACE')
    proximal.add([start_center], 1.0, 'REPLACE')
    distal.add([end_center], 1.0, 'REPLACE')

    armature = obj.modifiers.new("Appendage Rig — two segment", 'ARMATURE')
    armature.object = rig
    armature.use_vertex_groups = True
    obj["component_type"] = "replaceable_appendage_digit"
    obj["joint_weights"] = "blended across proximal and distal segment"
    obj["source"] = "GEEHUB Library proportion references"
    return obj


def build_appendage_digits(rig, skin):
    """Build ten articulated hand digits and ten articulated toes."""
    collection = bpy.data.collections.new("APPENDAGE_DIGITS — replaceable geometry")
    bpy.context.scene.collection.children.link(collection)
    profiles = {
        "L": {
            "hand": [
                ("thumb", (0.54, -0.050, 0.825), (0.49, -0.070, 0.775), (0.465, -0.075, 0.735), 0.026, 0.018),
                ("index", (0.555, -0.060, 0.825), (0.558, -0.068, 0.755), (0.556, -0.070, 0.705), 0.021, 0.014),
                ("middle", (0.585, -0.062, 0.825), (0.588, -0.070, 0.748), (0.588, -0.072, 0.690), 0.022, 0.014),
                ("ring", (0.615, -0.060, 0.825), (0.620, -0.068, 0.758), (0.624, -0.070, 0.705), 0.020, 0.013),
                ("pinky", (0.642, -0.052, 0.825), (0.651, -0.060, 0.772), (0.660, -0.062, 0.730), 0.017, 0.011),
            ],
            "foot": [
                ("big_toe",  -0.040, 0.145, 0.030, 0.020),
                ("toe_02",   -0.014, 0.132, 0.024, 0.016),
                ("toe_03",    0.012, 0.116, 0.022, 0.015),
                ("toe_04",    0.037, 0.098, 0.019, 0.013),
                ("toe_05",    0.060, 0.078, 0.016, 0.011),
            ],
        },
        "R": {
            "hand": [
                ("thumb", (0.54, -0.050, 0.825), (0.49, -0.070, 0.775), (0.465, -0.075, 0.735), 0.026, 0.018),
                ("index", (0.555, -0.060, 0.825), (0.558, -0.068, 0.755), (0.556, -0.070, 0.705), 0.021, 0.014),
                ("middle", (0.585, -0.062, 0.825), (0.588, -0.070, 0.748), (0.588, -0.072, 0.690), 0.022, 0.014),
                ("ring", (0.615, -0.060, 0.825), (0.620, -0.068, 0.758), (0.624, -0.070, 0.705), 0.020, 0.013),
                ("pinky", (0.642, -0.052, 0.825), (0.651, -0.060, 0.772), (0.660, -0.062, 0.730), 0.017, 0.011),
            ],
            "foot": [
                ("big_toe",  -0.040, 0.145, 0.030, 0.020),
                ("toe_02",   -0.014, 0.132, 0.024, 0.016),
                ("toe_03",    0.012, 0.116, 0.022, 0.015),
                ("toe_04",    0.037, 0.098, 0.019, 0.013),
                ("toe_05",    0.060, 0.078, 0.016, 0.011),
            ],
        },
    }
    for side, sign in (("L", -1), ("R", 1)):
        for digit, base, mid, tip, radius0, radius1 in profiles[side]["hand"]:
            points = [(sign * point[0], point[1], point[2])
                      for point in (base, mid, tip)]
            make_digit_mesh(
                f"APPENDAGE_Hand_{digit}.{side}", points, radius0, radius1,
                f"{digit}_01.{side}", f"{digit}_02.{side}",
                skin, rig, collection)
        for digit, x_offset, length, radius0, radius1 in profiles[side]["foot"]:
            base = (sign * (0.23 + x_offset), -0.235, 0.066)
            mid = (sign * (0.23 + x_offset), -0.235 - length * 0.55, 0.058)
            tip = (sign * (0.23 + x_offset), -0.235 - length, 0.050)
            make_digit_mesh(
                f"APPENDAGE_Foot_{digit}.{side}", (base, mid, tip),
                radius0, radius1, f"{digit}_01.{side}", f"{digit}_02.{side}",
                skin, rig, collection)
    rig["appendage_collection"] = collection.name
    rig["appendage_digit_mesh_count"] = 20
    rig["appendage_geometry"] = "10 separate hand and 10 separate toe meshes"


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

    # Preserve every named anatomy source as a hidden, replaceable build module.
    # The visible body is still fused for silhouette continuity; the source kit
    # remains available for per-region edits and later appendage replacement.
    source_collection = bpy.data.collections.new("SOURCE_ANATOMY_MODULES — replaceable kit")
    bpy.context.scene.collection.children.link(source_collection)
    for source_obj in volumes:
        module = source_obj.copy()
        module.data = source_obj.data.copy()
        module.name = "SRC_" + source_obj.name.replace("TMP_", "")
        source_collection.objects.link(module)
        module.hide_render = True
        module.hide_set(True)
        module["component_type"] = "replaceable_anatomy_source"
        module["source_name"] = source_obj.name

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
    build_appendage_digits(rig, skin)
    body["component_type"] = "connected_anatomy_blockout"
    body["construction"] = "overlapping anatomical volumes fused with voxel remesh"
    body["voxel_size"] = BODY_VOXEL_SIZE
    body["weighting"] = "three-nearest-bone inverse-distance blend"
    body["known_limitations"] = "anatomical blockout only; digit geometry, corrective shapes, muscle sliding, and skin simulation remain pending"

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
    rig["study"] = "001 V2.4 — continuous surface, IK/FK rig, and Video6 pose match"
    rig["appendage_controls"] = "deforming two-segment finger and toe chains weighted to individual digit meshes"
    rig["geometry_mode"] = "voxel_fused_body_with_hidden_source_modules_and_separate_digit_meshes"
    rig["body_object"] = body.name
    rig["appendage_digit_mesh_count"] = 20


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


def build_environment():
    floor_mat = make_principled("MAT_Studio Floor — graphite", (0.018, 0.027, 0.033, 1), 0.72)
    wall_mat = make_principled("MAT_Backdrop — blue graphite", (0.012, 0.023, 0.032, 1), 0.84)
    metal_mat = make_principled("MAT_Platform — satin dark metal", (0.025, 0.045, 0.05, 1), 0.38, 0.48)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.01))
    floor = bpy.context.object
    floor.name = "ENV_StudioFloor"
    floor.data.materials.append(floor_mat)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 14.0, 3.0), rotation=(math.radians(90), 0, 0))
    wall = bpy.context.object
    wall.name = "ENV_Backdrop"
    wall.data.materials.append(wall_mat)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.78, depth=0.08, location=(0, 0, 0.035))
    platform = bpy.context.object
    platform.name = "ENV_LowTurntable"
    platform.data.materials.append(metal_mat)
    bevel = platform.modifiers.new("Soft machined edge", 'BEVEL')
    bevel.width, bevel.segments = 0.035, 3
    platform.modifiers.new("Weighted corner normals", 'WEIGHTED_NORMAL')

    add_area_light("LIGHT_Key — large softbox", (-3.2, -4.0, 3.6), (0, 0, 1.15),
                   520, (1.0, 0.78, 0.64), 3.2)
    add_area_light("LIGHT_Fill — cool bounce", (3.2, -2.5, 2.1), (0, 0, 1.15),
                   250, (0.54, 0.72, 1.0), 3.8)
    add_area_light("LIGHT_Rim — rear separation", (0.4, 2.1, 3.1), (0, 0, 1.25),
                   680, (0.38, 0.75, 0.86), 2.0)
    add_area_light("LIGHT_TopStrip — specular control", (-0.5, -0.2, 4.1), (0, 0, 1.25),
                   280, (1.0, 0.9, 0.78), 2.4, 'RECTANGLE', 0.75)

    world = bpy.data.worlds.new("WORLD — quiet blue-black studio") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.02, 0.03, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.24

    if USE_VOLUME:
        volume_mat = bpy.data.materials.new("MAT_Atmosphere — subtle volume")
        volume_mat.use_nodes = True
        nodes = volume_mat.node_tree.nodes
        nodes.clear()
        output = nodes.new("ShaderNodeOutputMaterial")
        volume = nodes.new("ShaderNodeVolumePrincipled")
        volume.inputs["Density"].default_value = 0.006
        volume.inputs["Color"].default_value = (0.42, 0.53, 0.62, 1)
        volume.inputs["Anisotropy"].default_value = 0.18
        volume_mat.node_tree.links.new(volume.outputs["Volume"], output.inputs["Volume"])
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.8))
        fog = bpy.context.object
        fog.name = "ENV_AtmosphereVolume — optional"
        fog.scale = (8, 8, 5)
        fog.data.materials.append(volume_mat)
        fog.display_type = 'WIRE'
        fog["note"] = "Disable this object to compare a clean no-volume render."

    camera_data = bpy.data.cameras.new("CAM_GrowthStudy")
    camera = bpy.data.objects.new("CAM_GrowthStudy", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (3.1, -6.7, 2.4)
    aim_at(camera, (0, 0, 1.08))
    # Preserve the original orthographic studio camera and use a
    # separate perspective camera only for the retreat sequence.
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 2.75
    scene = bpy.context.scene
    scene.camera = camera

    run_camera_data = bpy.data.cameras.new("CAM_RunAway")
    run_camera = bpy.data.objects.new("CAM_RunAway", run_camera_data)
    bpy.context.collection.objects.link(run_camera)
    run_camera.location = (0.0, -7.5, 2.6)
    aim_at(run_camera, (0.0, 0.0, 1.1))
    run_camera_data.type = 'PERSP'
    run_camera_data.sensor_fit = 'VERTICAL'
    run_camera_data.lens = 100.0
    run_camera["purpose"] = "fixed perspective view down the retreat lane"

    video_camera_data = bpy.data.cameras.new("CAM_Video6")
    video_camera = bpy.data.objects.new("CAM_Video6", video_camera_data)
    bpy.context.collection.objects.link(video_camera)
    video_camera.location = (0.0, -6.8, 1.45)
    aim_at(video_camera, (0.0, 0.0, 1.08))
    video_camera_data.type = 'PERSP'
    video_camera_data.sensor_fit = 'VERTICAL'
    video_camera_data.lens = 55.0
    video_camera["purpose"] = "low frontal perspective matched to Library Video 6"

    runway_mat = make_principled(
        "MAT_RunwayGuide — muted teal", (0.025, 0.16, 0.17, 1),
        roughness=0.42, metallic=0.28)
    for side, x in (("L", -1.15), ("R", 1.15)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 5.7, 0.006))
        guide = bpy.context.object
        guide.name = f"ENV_RunAwayGuide.{side}"
        guide.scale = (0.018, 15.5, 0.008)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        guide.data.materials.append(runway_mat)
    # A distant threshold gives the retreat an actual destination.
    frame_parts = (
        ("Left", (-1.28, 12.0, 1.50), (0.07, 0.10, 3.0)),
        ("Right", (1.28, 12.0, 1.50), (0.07, 0.10, 3.0)),
        ("Header", (0.0, 12.0, 3.0), (2.63, 0.10, 0.08)),
    )
    for label, location, scale in frame_parts:
        bpy.ops.mesh.primitive_cube_add(size=1, location=location)
        part = bpy.context.object
        part.name = f"ENV_RunAwayThreshold_{label}"
        part.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        part.data.materials.append(metal_mat)


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
    for frame, label in ((1, "REST"), (36, "STAGE_01 — activation"),
                         (72, "STAGE_02 — expansion"), (108, "STAGE_03 — full study")):
        scene.timeline_markers.new(label, frame=frame)



def animate_run_away(rig):
    """Add a separate NLA locomotion layer that turns and runs away from camera.

    Growth and locomotion are kept on independent NLA tracks. The growth track
    holds its last selected stage while the run action animates object motion
    and pose bones, so the two systems can be edited independently.
    """
    scene = bpy.context.scene
    anim_data = rig.animation_data_create()
    growth_action = anim_data.action
    if growth_action is None:
        raise RuntimeError("Growth action must exist before run-away animation is built.")

    # Stash the growth action on its own NLA track before creating locomotion.
    anim_data.action = None
    growth_track = anim_data.nla_tracks.new()
    growth_track.name = "01_GROWTH — independent stage control"
    growth_strip = growth_track.strips.new(
        "GROWTH_STAGES — REST to FULL", GROWTH_KEYS[0][0], growth_action)
    growth_strip.blend_type = 'REPLACE'
    growth_strip.extrapolation = 'HOLD_FORWARD'
    growth_strip.influence = 1.0

    run_action = bpy.data.actions.new("RUN_AWAY — turn, gait, and retreat")
    anim_data.action = run_action
    rig.rotation_mode = 'XYZ'

    # Locomotion retains its current FK gait. Video6 later restores IK for the
    # posed upper body and planted feet.
    rig["arm_ik"] = 0.0
    rig.keyframe_insert(data_path='["arm_ik"]', frame=RUN_START_FRAME,
                        group="IK-FK Switches")
    rig["leg_ik"] = 0.0
    rig.keyframe_insert(data_path='["leg_ik"]', frame=RUN_START_FRAME,
                        group="IK-FK Switches")

    # Turn the character away from the fixed camera, then travel down the lane.
    rig.location = (0.0, 0.0, 0.0)
    rig.rotation_euler = (0.0, 0.0, 0.0)
    rig.keyframe_insert(data_path="rotation_euler", frame=RUN_START_FRAME,
                        group="Run Root Motion")
    rig.rotation_euler.z = math.pi
    rig.keyframe_insert(data_path="rotation_euler", frame=RUN_CYCLE_START,
                        group="Run Root Motion")
    rig.keyframe_insert(data_path="rotation_euler", frame=RUN_CYCLE_END,
                        group="Run Root Motion")

    # Four complete 24-frame gait cycles. Opposed arms and legs alternate;
    # knees flex during recovery, wrists stay loose, and digits retain a light
    # running grip. The character's identity and scale are not camera-animated.
    frame = RUN_CYCLE_START
    while frame <= RUN_CYCLE_END:
        progress = (frame - RUN_CYCLE_START) / (RUN_CYCLE_END - RUN_CYCLE_START)
        phase = ((frame - RUN_CYCLE_START) / 24.0) * (2.0 * math.pi)
        swing = math.sin(phase)
        recovery = max(0.0, swing)
        opposite_recovery = max(0.0, -swing)

        rig.location = (
            0.0,
            RUN_RETREAT_DISTANCE * progress,
            0.035 * max(0.0, math.sin(phase * 2.0))
        )
        rig.keyframe_insert(data_path="location", frame=frame,
                            group="Run Root Motion")

        pose = rig.pose.bones
        rotations = {
            "thigh.L": (0.58 * swing, 0.0, 0.0),
            "thigh.R": (-0.58 * swing, 0.0, 0.0),
            "calf.L": (0.12 + 0.58 * opposite_recovery, 0.0, 0.0),
            "calf.R": (0.12 + 0.58 * recovery, 0.0, 0.0),
            "foot.L": (-0.18 * recovery + 0.10 * opposite_recovery, 0.0, 0.0),
            "foot.R": (0.18 * opposite_recovery - 0.10 * recovery, 0.0, 0.0),
            "upper_arm.L": (-0.48 * swing, 0.0, 0.0),
            "upper_arm.R": (0.48 * swing, 0.0, 0.0),
            "forearm.L": (0.62 + 0.12 * opposite_recovery, 0.0, 0.0),
            "forearm.R": (0.62 + 0.12 * recovery, 0.0, 0.0),
            "hand.L": (0.06, 0.0, 0.0),
            "hand.R": (0.06, 0.0, 0.0),
            "pelvis": (0.055 * math.cos(phase * 2.0), 0.0, 0.0),
            "spine": (-0.11 + 0.035 * math.cos(phase * 2.0), 0.0, 0.0),
            "neck": (0.025 * math.sin(phase), 0.0, 0.0),
            "head": (-0.025 * math.sin(phase), 0.0, 0.0),
        }
        for bone_name, rotation in rotations.items():
            bone = pose.get(bone_name)
            if bone is None:
                continue
            bone.rotation_mode = 'XYZ'
            bone.rotation_euler = rotation
            bone.keyframe_insert(
                data_path="rotation_euler", frame=frame, group="Run Cycle")

        # Keep the hands slightly closed while running; every finger remains
        # its own articulated control, not a single rigid mitten.
        for side in ("L", "R"):
            for digit in ("thumb", "index", "middle", "ring", "pinky"):
                proximal = pose.get(f"{digit}_01.{side}")
                distal = pose.get(f"{digit}_02.{side}")
                if proximal:
                    proximal.rotation_mode = 'XYZ'
                    proximal.rotation_euler[0] = 0.12 + 0.025 * recovery
                    proximal.keyframe_insert(
                        data_path="rotation_euler", frame=frame,
                        group="Run Finger Grip")
                if distal:
                    distal.rotation_mode = 'XYZ'
                    distal.rotation_euler[0] = 0.16 + 0.02 * recovery
                    distal.keyframe_insert(
                        data_path="rotation_euler", frame=frame,
                        group="Run Finger Grip")
            for digit in ("big_toe", "toe_02", "toe_03", "toe_04", "toe_05"):
                proximal = pose.get(f"{digit}_01.{side}")
                distal = pose.get(f"{digit}_02.{side}")
                if proximal:
                    proximal.rotation_mode = 'XYZ'
                    proximal.rotation_euler[0] = 0.035 + 0.04 * recovery
                    proximal.keyframe_insert(
                        data_path="rotation_euler", frame=frame,
                        group="Run Toe Articulation")
                if distal:
                    distal.rotation_mode = 'XYZ'
                    distal.rotation_euler[0] = 0.025 + 0.03 * recovery
                    distal.keyframe_insert(
                        data_path="rotation_euler", frame=frame,
                        group="Run Toe Articulation")
        frame += 6

    # Keep translation at constant speed and use smooth curves for body motion.
    for fcurve in run_action.fcurves:
        for key in fcurve.keyframe_points:
            if fcurve.data_path == "location" and fcurve.array_index == 1:
                key.interpolation = 'LINEAR'
            else:
                key.interpolation = 'BEZIER'

    # Place the run action on its own NLA track. Growth is a different track
    # with only a custom-property curve, so both can operate at the same time.
    anim_data.action = None
    run_track = anim_data.nla_tracks.new()
    run_track.name = "02_LOCOMOTION — run away"
    run_strip = run_track.strips.new(
        "RUN_AWAY — turn, four strides, and retreat",
        RUN_START_FRAME, run_action)
    run_strip.blend_type = 'REPLACE'
    run_strip.extrapolation = 'HOLD_FORWARD'
    run_strip.influence = 1.0

    rig["locomotion_action"] = run_action.name
    rig["locomotion_mode"] = "RUN_AWAY"
    rig["locomotion_direction"] = "world +Y, away from fixed camera"
    rig["run_distance"] = RUN_RETREAT_DISTANCE
    rig["run_cycle_frames"] = 24
    rig["run_cycle_count"] = 4
    rig["movement_instructions"] = (
        "NLA Editor: enable 02_LOCOMOTION — run away. "
        "Mute this track to disable retreat; growth remains independently controlled."
    )

    scene.frame_end = RUN_CYCLE_END
    run_camera = bpy.data.objects.get("CAM_RunAway")
    for frame, label in (
        (RUN_START_FRAME, "RUN_AWAY — turn away"),
        (RUN_CYCLE_START, "RUN_AWAY — gait begins"),
        (RUN_CYCLE_END, "RUN_AWAY — retreat endpoint"),
    ):
        marker = scene.timeline_markers.new(label, frame=frame)
        if frame == RUN_START_FRAME and run_camera is not None:
            marker.camera = run_camera


def build_video6_pose_action(rig):
    """Rebuild the observed six-second front bodybuilding pose sequence.

    Source: Library file generated_video6(1).mp4, 448x672, 24 fps,
    6.0417 seconds. Keys follow the visible frontal pose changes. Depth and
    hidden joint motion are inferred because this is not multi-view mocap.
    """
    scene = bpy.context.scene
    driver_object = bpy.data.objects.get("CTRL_VIDEO6_DRIVER")
    if driver_object is None:
        raise RuntimeError("Video6 action requires CTRL_VIDEO6_DRIVER.")

    pose_keys = [
        (216, (-0.66, -0.05, 0.84), (0.66, -0.05, 0.84),
         (-0.82, -0.78, 1.28), (0.82, -0.78, 1.28)),
        (240, (-0.68, -0.06, 0.86), (0.68, -0.06, 0.86),
         (-0.84, -0.78, 1.30), (0.84, -0.78, 1.30)),
        (252, (-0.82, -0.07, 1.12), (0.82, -0.07, 1.12),
         (-0.92, -0.82, 1.40), (0.92, -0.82, 1.40)),
        (264, (-1.06, -0.08, 1.46), (1.06, -0.08, 1.46),
         (-1.02, -0.88, 1.47), (1.02, -0.88, 1.47)),
        (270, (-1.10, -0.08, 1.48), (1.10, -0.08, 1.48),
         (-1.03, -0.90, 1.48), (1.03, -0.90, 1.48)),
        (282, (-0.78, -0.10, 1.73), (0.78, -0.10, 1.73),
         (-1.02, -0.92, 1.56), (1.02, -0.92, 1.56)),
        (294, (-0.76, -0.10, 1.74), (0.76, -0.10, 1.74),
         (-1.02, -0.92, 1.56), (1.02, -0.92, 1.56)),
        (324, (-0.76, -0.10, 1.74), (0.76, -0.10, 1.74),
         (-1.02, -0.92, 1.56), (1.02, -0.92, 1.56)),
        (336, (-1.02, -0.08, 1.53), (1.02, -0.08, 1.53),
         (-0.98, -0.88, 1.48), (0.98, -0.88, 1.48)),
        (348, (-1.11, -0.08, 1.47), (1.11, -0.08, 1.47),
         (-0.98, -0.88, 1.48), (0.98, -0.88, 1.48)),
        (360, (-1.10, -0.08, 1.46), (1.10, -0.08, 1.46),
         (-0.98, -0.88, 1.48), (0.98, -0.88, 1.48)),
    ]

    rig_anim = rig.animation_data_create()
    rig_action = bpy.data.actions.new("VIDEO6_RIG_STATE — front pose and planted feet")
    rig_anim.action = rig_action
    rig.rotation_mode = 'XYZ'
    for frame in (VIDEO6_START_FRAME, VIDEO6_END_FRAME):
        rig.location = (0.0, 0.0, 0.0)
        rig.rotation_euler = (0.0, 0.0, 0.0)
        rig.keyframe_insert(data_path="location", frame=frame, group="Video6 Root Lock")
        rig.keyframe_insert(data_path="rotation_euler", frame=frame, group="Video6 Root Lock")
        rig["arm_ik"] = 1.0
        rig["leg_ik"] = 1.0
        rig.keyframe_insert(data_path='["arm_ik"]', frame=frame, group="Video6 IK Mode")
        rig.keyframe_insert(data_path='["leg_ik"]', frame=frame, group="Video6 IK Mode")

    # Clear FK rotations held by the preceding run-away action so the
    # separate Video6 scene begins from a genuine frontal rest pose.
    for bone_name in ("pelvis", "spine", "neck"):
        bone = rig.pose.bones.get(bone_name)
        if bone is not None:
            bone.rotation_mode = 'XYZ'
            for frame in (VIDEO6_START_FRAME, VIDEO6_END_FRAME):
                bone.rotation_euler = (0.0, 0.0, 0.0)
                bone.keyframe_insert(data_path="rotation_euler", frame=frame,
                                     group="Video6 Torso Reset")

    # The run action also keys toe curl. Return all toe segments to neutral
    # before the pose clip so the wide stance remains relaxed and planted.
    for side in ("L", "R"):
        for digit in ("big_toe", "toe_02", "toe_03", "toe_04", "toe_05"):
            for segment in ("01", "02"):
                toe_bone = rig.pose.bones.get(f"{digit}_{segment}.{side}")
                if toe_bone is not None:
                    toe_bone.rotation_mode = 'XYZ'
                    for frame in (VIDEO6_START_FRAME, VIDEO6_END_FRAME):
                        toe_bone.rotation_euler = (0.0, 0.0, 0.0)
                        toe_bone.keyframe_insert(
                            data_path="rotation_euler", frame=frame,
                            group="Video6 Toe Reset")

    head = rig.pose.bones.get("head")
    if head is not None:
        head.rotation_mode = 'XYZ'
        for frame, angle in ((VIDEO6_START_FRAME, 0.0), (282, -0.035),
                             (324, -0.035), (VIDEO6_END_FRAME, 0.0)):
            head.rotation_euler = (angle, 0.0, 0.0)
            head.keyframe_insert(data_path="rotation_euler", frame=frame,
                                 group="Video6 Head Performance")

    # Fists close during the double-biceps hold and soften on release.
    for side in ("L", "R"):
        for digit in ("thumb", "index", "middle", "ring", "pinky"):
            proximal = rig.pose.bones.get(f"{digit}_01.{side}")
            distal = rig.pose.bones.get(f"{digit}_02.{side}")
            if proximal is None or distal is None:
                continue
            proximal.rotation_mode = 'XYZ'
            distal.rotation_mode = 'XYZ'
            for frame, curl in ((216, 0.08), (264, 0.10), (282, 0.42),
                                (324, 0.44), (348, 0.20), (360, 0.18)):
                proximal.rotation_euler = (curl, 0.0, 0.0)
                distal.rotation_euler = (curl * 0.72, 0.0, 0.0)
                proximal.keyframe_insert(data_path="rotation_euler", frame=frame,
                                         group="Video6 Finger Curl")
                distal.keyframe_insert(data_path="rotation_euler", frame=frame,
                                       group="Video6 Finger Curl")

    rig_anim.action = None
    rig_track = rig_anim.nla_tracks.new()
    rig_track.name = "03_VIDEO6_RIG_STATE — root and IK mode"
    rig_strip = rig_track.strips.new(
        "VIDEO6 — reset to frontal stance", VIDEO6_START_FRAME, rig_action)
    rig_strip.blend_type = 'REPLACE'
    rig_strip.extrapolation = 'HOLD_FORWARD'
    rig_strip.influence = 1.0

    helper_anim = driver_object.animation_data_create()
    helper_action = bpy.data.actions.new("VIDEO6_POSE — hand targets and elbow poles")
    helper_anim.action = helper_action
    for frame, hand_l, hand_r, pole_l, pole_r in pose_keys:
        values = {
            "hand_L_x": hand_l[0], "hand_L_y": hand_l[1], "hand_L_z": hand_l[2],
            "hand_R_x": hand_r[0], "hand_R_y": hand_r[1], "hand_R_z": hand_r[2],
            "pole_L_x": pole_l[0], "pole_L_y": pole_l[1], "pole_L_z": pole_l[2],
            "pole_R_x": pole_r[0], "pole_R_y": pole_r[1], "pole_R_z": pole_r[2],
        }
        for property_name, value in values.items():
            driver_object[property_name] = value
            driver_object.keyframe_insert(
                data_path=f'["{property_name}"]', frame=frame,
                group="Video6 Hand and Elbow Targets")

    helper_anim.action = None
    helper_track = helper_anim.nla_tracks.new()
    helper_track.name = "VIDEO6_POSE — reference matched hand targets"
    helper_strip = helper_track.strips.new(
        "VIDEO6 — arms rise, double biceps, open", VIDEO6_START_FRAME, helper_action)
    helper_strip.blend_type = 'REPLACE'
    helper_strip.extrapolation = 'HOLD_FORWARD'
    helper_strip.influence = 1.0

    video_camera = bpy.data.objects.get("CAM_Video6")
    video_scene = bpy.data.scenes.new("VIDEO6_POSE_STUDY")
    # Link the same character, controls, materials, lighting, and set into a
    # separate scene. Each scene evaluates the shared animation at its own
    # frame range, so the run-away sequence never teleports into the pose clip.
    for obj in list(scene.objects):
        video_scene.collection.objects.link(obj)
    video_scene.camera = video_camera
    video_scene.world = scene.world
    video_scene.frame_start = VIDEO6_START_FRAME
    video_scene.frame_end = VIDEO6_END_FRAME
    video_scene["source_reference"] = "Library: generated_video6(1).mp4"
    video_scene["purpose"] = "isolated frontal pose-reference action; independent of RUN_AWAY"
    for frame, label in (
        (216, "VIDEO6 — neutral stance"),
        (264, "VIDEO6 — arms wide"),
        (282, "VIDEO6 — double biceps"),
        (324, "VIDEO6 — flex hold"),
        (348, "VIDEO6 — open and release"),
        (360, "VIDEO6 — end pose"),
    ):
        video_scene.timeline_markers.new(label, frame=frame)


def configure_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
    except Exception:
        try:
            scene.render.engine = 'BLENDER_EEVEE'
        except Exception:
            scene.render.engine = 'CYCLES'
    scene.render.resolution_x, scene.render.resolution_y = 1080, 1620
    scene.render.resolution_percentage = PREVIEW_RESOLUTION
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = "//renders/"

    video_scene = bpy.data.scenes.get("VIDEO6_POSE_STUDY")
    if video_scene is not None:
        video_scene.render.engine = scene.render.engine
        video_scene.render.resolution_x = scene.render.resolution_x
        video_scene.render.resolution_y = scene.render.resolution_y
        video_scene.render.resolution_percentage = scene.render.resolution_percentage
        video_scene.render.image_settings.file_format = 'PNG'
        video_scene.render.image_settings.color_mode = 'RGBA'
        video_scene.render.film_transparent = scene.render.film_transparent
        video_scene.view_settings.view_transform = scene.view_settings.view_transform
        video_scene.render.filepath = "//renders/video6/"


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
        for frame, filename in (
            (1, "growth_stage_00_rest.png"),
            (108, "growth_stage_03_full.png"),
            (RUN_CYCLE_END, "run_away_retreat_endpoint.png"),
        ):
            scene.frame_set(frame)
            scene.render.filepath = os.path.join(render_dir, filename)
            bpy.ops.render.render(write_still=True, scene=scene.name)

        video_scene = bpy.data.scenes.get("VIDEO6_POSE_STUDY")
        if video_scene is not None:
            video_render_dir = os.path.join(render_dir, "video6")
            os.makedirs(video_render_dir, exist_ok=True)
            for frame, filename in (
                (VIDEO6_START_FRAME, "video6_pose_00_neutral.png"),
                (264, "video6_pose_01_arms_wide.png"),
                (282, "video6_pose_02_double_biceps.png"),
                (324, "video6_pose_03_flex_hold.png"),
                (360, "video6_pose_04_release.png"),
            ):
                video_scene.frame_set(frame)
                video_scene.render.filepath = os.path.join(video_render_dir, filename)
                bpy.ops.render.render(write_still=True, scene=video_scene.name)

    scene.frame_set(1)
    scene.render.filepath = os.path.join(render_dir, "")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)


def main():
    clear_scene()
    rig = build_rig()
    build_character(rig)
    build_environment()
    animate_growth(rig)
    animate_run_away(rig)
    build_video6_pose_action(rig)
    configure_render()
    bpy.context.scene.frame_set(1)
    save_and_render()


if __name__ == "__main__":
    main()
