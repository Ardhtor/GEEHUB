"""GEEHUB Growth Study 001 — procedural Blender scene generator.

Test target: Blender 4.x. Run from Blender's Scripting workspace or with:
    blender --background --python geehub_growth_study.py

This is a deliberately modular blockout, not a finished anatomical asset.
Each body volume is a separate mesh weighted to one named control bone. The
armature's `growth` custom property drives transverse bone scale so the
silhouette can be staged without stretching the whole character vertically.
"""

import bpy
import math
import os
from mathutils import Vector

PROJECT_NAME = "GEEHUB_Growth_Study_001"
USE_VOLUME = True
RENDER_PREVIEWS = True
PREVIEW_RESOLUTION = 100
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
    """Create an ellipsoid volume and weight every vertex to one control bone."""
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
    obj["component_type"] = "modular_anatomy_volume"
    obj["control_bone"] = bone_name
    return obj


def add_bone(arm_data, name, head, tail, parent=None, connected=False):
    bone = arm_data.edit_bones.new(name)
    bone.head, bone.tail = head, tail
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
    rig["study"] = "001 — transverse volume progression"
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

    add_uv_form("BODY_Chest", (0, 0.0, 1.45), (0.385, 0.235, 0.285), skin, "spine", rig)
    add_uv_form("BODY_UpperBack", (0, 0.075, 1.48), (0.36, 0.19, 0.255), skin, "spine", rig)
    add_uv_form("BODY_Abdomen", (0, -0.005, 1.18), (0.285, 0.19, 0.275), skin, "spine", rig)
    add_uv_form("BODY_Pelvis", (0, 0.015, 0.91), (0.33, 0.215, 0.225), skin, "pelvis", rig)
    add_uv_form("BODY_Neck", (0, 0.0, 1.70), (0.115, 0.12, 0.19), skin, "neck", rig)
    add_uv_form("BODY_Head", (0, -0.015, 1.99), (0.155, 0.16, 0.205), skin, "head", rig)
    add_uv_form("BODY_HairCap", (0, 0.005, 2.115), (0.158, 0.16, 0.10), hair, "head", rig)
    add_uv_form("BODY_Nose", (0, -0.164, 1.98), (0.036, 0.045, 0.065), skin, "head", rig, 20, 16)

    for side, sign in (("L", -1), ("R", 1)):
        add_uv_form(f"BODY_Ear.{side}", (sign * 0.153, 0.0, 1.99),
                    (0.035, 0.045, 0.065), skin, "head", rig, 20, 16)
        add_uv_form(f"BODY_Eye.{side}", (sign * 0.064, -0.155, 2.025),
                    (0.022, 0.012, 0.018), eye, "head", rig, 20, 16)
        add_uv_form(f"MUSCLE_Pectoral.{side}", (sign * 0.178, -0.205, 1.505),
                    (0.205, 0.075, 0.135), skin, "spine", rig)
        add_uv_form(f"MUSCLE_Deltoid.{side}", (sign * 0.365, 0.0, 1.55),
                    (0.145, 0.155, 0.16), skin, f"upper_arm.{side}", rig)
        add_uv_form(f"MUSCLE_Biceps.{side}", (sign * 0.435, -0.005, 1.405),
                    (0.112, 0.12, 0.185), skin, f"upper_arm.{side}", rig)
        add_uv_form(f"MUSCLE_Triceps.{side}", (sign * 0.445, 0.085, 1.405),
                    (0.10, 0.105, 0.17), skin, f"upper_arm.{side}", rig)
        add_uv_form(f"MUSCLE_Forearm.{side}", (sign * 0.535, -0.005, 1.105),
                    (0.085, 0.095, 0.16), skin, f"forearm.{side}", rig)
        add_uv_form(f"BODY_Hand.{side}", (sign * 0.592, -0.025, 0.865),
                    (0.072, 0.055, 0.10), skin, f"hand.{side}", rig)
        for row, z in enumerate((1.285, 1.205, 1.125), start=1):
            add_uv_form(f"MUSCLE_Ab_{row}.{side}", (sign * 0.078, -0.178, z),
                        (0.071, 0.025, 0.042), skin, "spine", rig, 24, 16)
        add_uv_form(f"MUSCLE_Oblique.{side}", (sign * 0.255, -0.105, 1.20),
                    (0.075, 0.075, 0.19), skin, "spine", rig)
        add_uv_form(f"MUSCLE_Quadriceps.{side}", (sign * 0.205, -0.105, 0.675),
                    (0.145, 0.15, 0.235), skin, f"thigh.{side}", rig)
        add_uv_form(f"BODY_Thigh.{side}", (sign * 0.20, 0.01, 0.68),
                    (0.15, 0.155, 0.245), skin, f"thigh.{side}", rig)
        add_uv_form(f"MUSCLE_Calf.{side}", (sign * 0.23, 0.025, 0.285),
                    (0.105, 0.12, 0.19), skin, f"calf.{side}", rig)
        add_uv_form(f"BODY_Foot.{side}", (sign * 0.23, -0.115, 0.075),
                    (0.105, 0.22, 0.075), skin, f"foot.{side}", rig)

    add_uv_form("CLOTH_TrainingTrunks", (0, -0.012, 0.865),
                (0.345, 0.23, 0.205), cloth, "pelvis", rig)
    trim = make_principled("MAT_Seam — muted steel", (0.10, 0.20, 0.21, 1), 0.48, 0.22)
    add_uv_form("CLOTH_Waistband", (0, -0.018, 0.995),
                (0.348, 0.235, 0.035), trim, "pelvis", rig)


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
    bpy.ops.mesh.primitive_plane_add(
        size=200, location=(0, 3.0, 3.0), rotation=(math.radians(90), 0, 0))
    wall = bpy.context.object
    wall.name = "ENV_Backdrop"
    wall.data.materials.append(wall_mat)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=96, radius=0.78, depth=0.08, location=(0, 0, 0.035))
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
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 2.75
    bpy.context.scene.camera = camera


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
        base_dir = os.path.join(os.path.expanduser("~"), PROJECT_NAME)
    render_dir = os.path.join(base_dir, "renders")
    os.makedirs(render_dir, exist_ok=True)
    blend_path = os.path.join(base_dir, PROJECT_NAME + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    if RENDER_PREVIEWS:
        for frame, filename in ((1, "growth_stage_00_rest.png"),
                                (108, "growth_stage_03_full.png")):
            scene.frame_set(frame)
            scene.render.filepath = os.path.join(render_dir, filename)
            bpy.ops.render.render(write_still=True)
    scene.frame_set(1)
    scene.render.filepath = os.path.join(render_dir, "")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print("GEEHUB Growth Study generated:", blend_path)
    print("Select GROWTH_RIG — master control and adjust custom property 'growth'.")


def main():
    clear_scene()
    rig = build_rig()
    build_character(rig)
    build_environment()
    animate_growth(rig)
    configure_render()
    bpy.context.scene.frame_set(1)
    save_and_render()


if __name__ == "__main__":
    main()
