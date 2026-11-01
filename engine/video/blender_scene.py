"""Procedural Blender scene builder for GEEHUB's first local render engine."""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def material(name, color, metallic=0.0, roughness=0.48, subsurface=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
    return mat


def ellipsoid(name, location, scale, mat, collection=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    if collection:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def limb(name, start, end, radius, mat):
    a, b = Vector(start), Vector(end)
    direction = b - a
    obj = ellipsoid(name, (a + b) / 2, (radius, radius, direction.length / 2 + radius * 0.4), mat)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    return obj


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area_light(name, location, energy, color, size, target=(0, 0, 1.8)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)
    return obj


def build_character(growth_ceiling, start_frame, end_frame):
    skin = material("SUBJECT / warm stone skin", (0.37, 0.43, 0.45), metallic=0.06, roughness=0.34, subsurface=0.04)
    shadow = material("SUBJECT / shadow definition", (0.17, 0.22, 0.25), metallic=0.08, roughness=0.42)
    cloth = material("WARDROBE / graphite textile", (0.035, 0.075, 0.09), metallic=0.12, roughness=0.58)
    objects = []

    def part(name, loc, scale, mat=skin, factor=1.0, length=1.0):
        obj = ellipsoid(name, loc, scale, mat)
        objects.append((obj, factor, length))
        return obj

    # A neutral adult anatomical base: recognizable human proportions, no facial identity.
    part("Pelvis", (0, 0, 1.00), (0.43, 0.29, 0.32), cloth, 1.10)
    part("Lower torso", (0, 0, 1.48), (0.43, 0.27, 0.52), skin, 1.16)
    part("Upper torso / chest", (0, 0, 2.05), (0.70, 0.34, 0.48), skin, 1.30)
    part("Left pectoral", (-0.34, -0.255, 2.13), (0.38, 0.16, 0.25), skin, 1.35)
    part("Right pectoral", (0.34, -0.255, 2.13), (0.38, 0.16, 0.25), skin, 1.35)
    part("Neck", (0, 0, 2.58), (0.18, 0.18, 0.28), skin, 1.06)
    part("Head", (0, 0, 2.98), (0.24, 0.23, 0.34), skin, 1.025)
    part("Left shoulder", (-0.75, 0, 2.32), (0.29, 0.29, 0.30), skin, 1.38)
    part("Right shoulder", (0.75, 0, 2.32), (0.29, 0.29, 0.30), skin, 1.38)

    for side, label in [(-1, "Left"), (1, "Right")]:
        shoulder = (side * 0.78, 0, 2.28)
        elbow = (side * 1.02, -0.01, 1.70)
        wrist = (side * 1.10, -0.02, 1.16)
        objects.append((limb(label + " upper arm", shoulder, elbow, 0.19, skin), 1.38, 1.08))
        objects.append((limb(label + " forearm", elbow, wrist, 0.145, skin), 1.24, 1.06))
        part(label + " hand", (side * 1.10, -0.03, 1.02), (0.14, 0.10, 0.19), skin, 1.15)
        hip = (side * 0.25, 0, 0.92)
        knee = (side * 0.31, 0.015, 0.49)
        ankle = (side * 0.33, -0.015, 0.12)
        objects.append((limb(label + " thigh", hip, knee, 0.255, skin), 1.30, 1.08))
        objects.append((limb(label + " calf", knee, ankle, 0.16, skin), 1.20, 1.05))
        part(label + " foot", (side * 0.33, -0.18, 0.09), (0.18, 0.34, 0.10), shadow, 1.12)

    for obj, radial, length in objects:
        base = obj.scale.copy()
        obj.scale = base
        obj.keyframe_insert(data_path="scale", frame=start_frame)
        obj.scale = (base.x * (1 + (radial - 1) * (growth_ceiling - 1) / 2.8),
                     base.y * (1 + (radial - 1) * (growth_ceiling - 1) / 2.8),
                     base.z * (1 + (length - 1) * (growth_ceiling - 1) / 2.8))
        obj.keyframe_insert(data_path="scale", frame=end_frame)
        if obj.animation_data and obj.animation_data.action:
            for curve in obj.animation_data.action.fcurves:
                for key in curve.keyframe_points:
                    key.interpolation = "BEZIER"


def build_scene(manifest, output_path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights, bpy.data.materials):
        pass

    fmt = manifest.get("format", {})
    duration = max(10, min(600, int(fmt.get("duration_seconds", 45))))
    fps = int(fmt.get("fps", 24))
    ceiling = max(1.1, min(4.8, float(fmt.get("growth_ceiling", 3.8))))
    total_frames = duration * fps
    start_frame = int(total_frames * 0.3556)
    end_frame = int(total_frames * 0.7111)
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = total_frames
    scene.render.fps = fps
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.filepath = str(output_path)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGB"
    available_engines = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}\n    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in available_engines else "BLENDER_EEVEE"
    scene.render.filepath = str(output_path)
    scene.render.use_file_extension = True
    scene.view_settings.view_transform = "AgX"
    scene.world.color = (0.018, 0.026, 0.035)

    floor_mat = material("ROOM / graphite floor", (0.025, 0.043, 0.055), metallic=0.25, roughness=0.4)
    wall_mat = material("ROOM / blue-grey architecture", (0.035, 0.075, 0.095), metallic=0.18, roughness=0.52)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.035))
    floor = bpy.context.object
    floor.name = "Infinite graphite floor"
    floor.data.materials.append(floor_mat)

    # Architectural uprights and a deliberately sparse observation room.
    for x in (-3.8, -2.2, 2.2, 3.8):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 1.8, 2.2))
        pillar = bpy.context.object
        pillar.name = "Observation room / vertical beam"
        pillar.dimensions = (0.08, 0.10, 4.4)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        pillar.data.materials.append(wall_mat)

    build_character(ceiling, start_frame, end_frame)
    area_light("Key / cold softbox", ( -3.5, -4.5, 6.5), 1250, (0.62, 0.82, 1.0), 5)
    area_light("Rim / ice blue", (3.8, 1.8, 4.6), 1650, (0.30, 0.68, 1.0), 3)
    area_light("Warm contour", (2.0, -3.0, 2.2), 420, (1.0, 0.68, 0.42), 2.4)

    camera_data = bpy.data.cameras.new("Director camera")
    camera = bpy.data.objects.new("Director camera", camera_data)
    scene.collection.objects.link(camera)
    camera_mode = manifest.get("direction", {}).get("camera", "medium")
    if camera_mode == "low":
        camera.location = (3.0, -9.5, 1.95)
        camera_data.lens = 45
    elif camera_mode == "close":
        camera.location = (2.0, -7.0, 2.7)
        camera_data.lens = 55
    else:
        camera.location = (3.0, -10.0, 3.2)
        camera_data.lens = 48
    aim(camera, (0, 0, 1.65))
    scene.camera = camera
    camera.keyframe_insert(data_path="location", frame=1)
    camera.keyframe_insert(data_path="rotation_euler", frame=1)
    camera.location = (camera.location.x * 0.88, camera.location.y * 0.91, camera.location.z - 0.12)
    aim(camera, (0, 0, 1.65))
    camera.keyframe_insert(data_path="location", frame=total_frames)
    camera.keyframe_insert(data_path="rotation_euler", frame=total_frames)

    # The final third holds the phase-four form; no further scaling keys are added.
    scene.frame_set(1)
    scene.render.image_settings.color_mode = "RGB"
    scene.camera.data.dof.use_dof = True
    scene.camera.data.dof.focus_distance = 9.8
    scene.camera.data.dof.aperture_fstop = 8.0
    scene.render.filepath = str(output_path)
    bpy.ops.render.render(animation=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args(argv)
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    build_scene(manifest, Path(args.output))


if __name__ == "__main__":
    main()
