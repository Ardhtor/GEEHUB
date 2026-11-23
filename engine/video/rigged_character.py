"""Unified, armature-driven adult humanoid blockout for GEEHUB.

Overlapping anatomical volumes are voxel-remeshed into one continuous skin
surface, then bound to a deformable skeleton with distance-based normalized
weights. Bilateral pectoral lobes, upper chest, lower shelf, head, neck, limbs,
and feet are part of the same fused body mesh. It is deliberately
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
    if "skin" in name.lower():
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        texcoord = nodes.new("ShaderNodeTexCoord")
        colour_noise = nodes.new("ShaderNodeTexNoise")
        colour_noise.inputs["Scale"].default_value = 18.0
        colour_noise.inputs["Detail"].default_value = 2.2
        colour_ramp = nodes.new("ShaderNodeValToRGB")
        colour_ramp.color_ramp.elements[0].position = 0.22
        colour_ramp.color_ramp.elements[0].color = (color[0] * .88, color[1] * .88, color[2] * .88, 1.0)
        colour_ramp.color_ramp.elements[1].position = 0.78
        colour_ramp.color_ramp.elements[1].color = (min(color[0] * 1.08, 1.0), min(color[1] * 1.08, 1.0), min(color[2] * 1.08, 1.0), 1.0)
        links.new(texcoord.outputs["Generated"], colour_noise.inputs["Vector"])
        links.new(colour_noise.outputs["Fac"], colour_ramp.inputs["Fac"])
        links.new(colour_ramp.outputs["Color"], bsdf.inputs["Base Color"])
        pore_noise = nodes.new("ShaderNodeTexNoise")
        pore_noise.inputs["Scale"].default_value = 125.0
        pore_noise.inputs["Detail"].default_value = 3.0
        pore_noise.inputs["Roughness"].default_value = .72
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = .14
        bump.inputs["Distance"].default_value = .008
        links.new(texcoord.outputs["Generated"], pore_noise.inputs["Vector"])
        links.new(pore_noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
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


def _chest_hair_material(name, skin_colour):
    """Procedural strand mask with a soft anatomical chest-region falloff."""
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = skin_colour
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = .76

    geometry = nodes.new("ShaderNodeNewGeometry")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geometry.outputs["Position"], separate.inputs["Vector"])

    def map_range(source, from_min, from_max, to_min, to_max):
        node = nodes.new("ShaderNodeMapRange")
        node.clamp = True
        node.inputs["From Min"].default_value = from_min
        node.inputs["From Max"].default_value = from_max
        node.inputs["To Min"].default_value = to_min
        node.inputs["To Max"].default_value = to_max
        links.new(source, node.inputs["Value"])
        return node.outputs["Result"]

    lower_fade = map_range(separate.outputs["Z"], 1.94, 2.14, 0.0, 1.0)
    upper_fade = map_range(separate.outputs["Z"], 2.48, 2.73, 1.0, 0.0)
    absolute_x = nodes.new("ShaderNodeMath")
    absolute_x.operation = "ABSOLUTE"
    links.new(separate.outputs["X"], absolute_x.inputs[0])
    lateral_fade = map_range(absolute_x.outputs["Value"], .62, .86, 1.0, 0.0)
    front_fade = map_range(separate.outputs["Y"], -.64, -.34, 1.0, 0.0)

    def multiply(left, right):
        node = nodes.new("ShaderNodeMath")
        node.operation = "MULTIPLY"
        links.new(left, node.inputs[0])
        links.new(right, node.inputs[1])
        return node.outputs["Value"]

    region_mask = multiply(multiply(lower_fade, upper_fade), multiply(lateral_fade, front_fade))
    texcoord = nodes.new("ShaderNodeTexCoord")
    wave = nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "X"
    wave.inputs["Scale"].default_value = 155.0
    wave.inputs["Distortion"].default_value = 4.0
    wave.inputs["Detail"].default_value = 2.0
    links.new(texcoord.outputs["Generated"], wave.inputs["Vector"])
    strand_ramp = nodes.new("ShaderNodeValToRGB")
    strand_ramp.color_ramp.elements[0].position = .72
    strand_ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    strand_ramp.color_ramp.elements[1].position = .88
    strand_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    links.new(wave.outputs["Color"], strand_ramp.inputs["Fac"])
    hair_mask = multiply(region_mask, strand_ramp.outputs["Color"])

    mix = nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MIX"
    mix.inputs["Color1"].default_value = (*skin_colour[:3], 1.0)
    mix.inputs["Color2"].default_value = (.045, .023, .014, 1.0)
    links.new(hair_mask, mix.inputs["Fac"])
    links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])

    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .13
    bump.inputs["Distance"].default_value = .004
    links.new(hair_mask, bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return mat

def _torso_surface(name, skin):
    """Create a continuous waist-to-clavicle torso with integrated bilateral pec forms."""
    rings = [
        (0.96, .49, .36),
        (1.10, .56, .40),
        (1.28, .46, .33),
        (1.48, .45, .32),
        (1.70, .51, .36),
        (1.92, .61, .41),
        (2.10, .70, .45),
        (2.28, .80, .50),
        (2.46, .78, .47),
        (2.62, .69, .41),
        (2.76, .43, .30),
        (2.86, .26, .22),
    ]
    segments = 96
    vertices = []
    faces = []
    for z, radius_x, radius_y in rings:
        for index in range(segments):
            angle = (2.0 * math.pi * index) / segments
            cosine = math.cos(angle)
            sine = math.sin(angle)
            x = radius_x * cosine
            y = radius_y * sine
            front = max(0.0, -sine) ** 2
            left_pec = math.exp(-(((x + .34) / .36) ** 2) - (((z - 2.29) / .27) ** 2))
            right_pec = math.exp(-(((x - .34) / .36) ** 2) - (((z - 2.29) / .27) ** 2))
            upper_left = math.exp(-(((x + .30) / .37) ** 2) - (((z - 2.49) / .18) ** 2))
            upper_right = math.exp(-(((x - .30) / .37) ** 2) - (((z - 2.49) / .18) ** 2))
            lower_left = math.exp(-(((x + .34) / .38) ** 2) - (((z - 2.11) / .16) ** 2))
            lower_right = math.exp(-(((x - .34) / .38) ** 2) - (((z - 2.11) / .16) ** 2))
            outer = math.exp(-(((abs(x) - .66) / .16) ** 2) - (((z - 2.28) / .31) ** 2))
            sternum = math.exp(-((x / .075) ** 2) - (((z - 2.29) / .31) ** 2))
            bulge = (
                .145 * (left_pec + right_pec)
                + .045 * (upper_left + upper_right)
                + .035 * (lower_left + lower_right)
                + .018 * outer
            ) * front
            groove = .035 * sternum * front
            y -= bulge
            y += groove
            vertices.append((x, y, z))
    for ring_index in range(len(rings) - 1):
        lower = ring_index * segments
        upper = (ring_index + 1) * segments
        for index in range(segments):
            next_index = (index + 1) % segments
            faces.append((lower + index, lower + next_index, upper + next_index, upper + index))
    bottom_center = len(vertices)
    vertices.append((0.0, 0.0, rings[0][0]))
    top_center = len(vertices)
    vertices.append((0.0, 0.0, rings[-1][0]))
    for index in range(segments):
        next_index = (index + 1) % segments
        faces.append((bottom_center, next_index, index))
        top_start = (len(rings) - 1) * segments
        faces.append((top_center, top_start + index, top_start + next_index))
    mesh_data = bpy.data.meshes.new(name + " / torso surface mesh")
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.materials.append(skin)
    mesh_data.update()
    torso = bpy.data.objects.new(name + " / torso and pectoral surface", mesh_data)
    bpy.context.collection.objects.link(torso)
    for polygon in mesh_data.polygons:
        polygon.use_smooth = True
    return torso


def _anatomy_surface(name="GEEHUB / unified humanoid"):
    """Build overlapping anatomical volumes, then fuse them into one skin surface."""
    skin = _mat("GEEHUB / living skin", (.43, .27, .21), .42, .075)
    parts = []

    def ellipsoid_part(part_name, center, scale):
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=40, ring_count=28, location=center
        )
        part = bpy.context.object
        part.name = name + " / " + part_name
        part.scale = scale
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        part.data.materials.append(skin)
        bpy.ops.object.shade_smooth()
        parts.append(part)
        return part

    def limb_part(part_name, start, end, radius_x, radius_y=None):
        a, b = Vector(start), Vector(end)
        direction = b - a
        radius_y = radius_y if radius_y is not None else radius_x
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=40, ring_count=28, location=(a + b) / 2
        )
        part = bpy.context.object
        part.name = name + " / " + part_name
        part.scale = (radius_x, radius_y, direction.length / 2 + radius_x * .42)
        part.rotation_mode = "QUATERNION"
        part.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        part.data.materials.append(skin)
        bpy.ops.object.shade_smooth()
        parts.append(part)
        return part

    # Coordinates are metres, Z-up, subject facing -Y. The torso is a
    # continuous parametric surface; the pectorals are sculpted into its front.
    parts.append(_torso_surface(name, skin))

    # Neck, skull, jaw and ears overlap; nose is a small forward facial volume.
    for side in (-1, 1):
        tag = "L" if side < 0 else "R"
    ellipsoid_part("neck", (0, 0, 2.96), (.23, .22, .37))
    ellipsoid_part("skull", (0, -.015, 3.43), (.32, .29, .42))
    ellipsoid_part("jaw", (0, -.055, 3.23), (.255, .27, .205))
    ellipsoid_part("nose", (0, -.285, 3.40), (.065, .105, .12))
    for side in (-1, 1):
        ellipsoid_part("ear." + ("L" if side < 0 else "R"), (side * .30, -.005, 3.42), (.075, .10, .13))
        ellipsoid_part("deltoid." + ("L" if side < 0 else "R"), (side * .77, -.015, 2.57), (.39, .36, .36))

        limb_part("upper arm." + ("L" if side < 0 else "R"), (side * .78, 0, 2.55), (side * 1.03, -.005, 1.75), .235, .215)
        ellipsoid_part("biceps." + ("L" if side < 0 else "R"), (side * .93, -.105, 2.12), (.235, .19, .34))
        ellipsoid_part("triceps." + ("L" if side < 0 else "R"), (side * .92, .105, 2.12), (.22, .18, .33))
        ellipsoid_part("elbow." + ("L" if side < 0 else "R"), (side * 1.03, -.005, 1.74), (.205, .20, .22))
        limb_part("forearm." + ("L" if side < 0 else "R"), (side * 1.03, -.005, 1.75), (side * 1.13, -.025, 1.16), .18, .16)
        ellipsoid_part("hand." + ("L" if side < 0 else "R"), (side * 1.13, -.055, .99), (.15, .13, .22))

        ellipsoid_part("thigh." + ("L" if side < 0 else "R"), (side * .34, .005, .62), (.33, .35, .64))
        ellipsoid_part("knee." + ("L" if side < 0 else "R"), (side * .36, .005, .08), (.235, .25, .27))
        limb_part("calf." + ("L" if side < 0 else "R"), (side * .36, .01, .08), (side * .38, -.005, -.82), .245, .23)
        ellipsoid_part("ankle." + ("L" if side < 0 else "R"), (side * .38, -.025, -.84), (.16, .17, .22))
        ellipsoid_part("foot." + ("L" if side < 0 else "R"), (side * .38, -.205, -.99), (.18, .33, .14))

    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    mesh = parts[0]
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = name + " / fused skin"

    # Voxel fusion removes the visible seams between the overlapping anatomy
    # volumes and creates one continuous surface for the armature and shape keys.
    mesh.data.remesh_voxel_size = 0.035
    mesh.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()
    mesh = bpy.context.object
    mesh.name = name + " / fused skin"
    mesh.data.materials.clear()
    mesh.data.materials.append(skin)
    chest_hair = _chest_hair_material(name + " / chest hair", (.43, .27, .21, 1.0))
    mesh.data.materials.append(chest_hair)
    for poly in mesh.data.polygons:
        poly.use_smooth = True
        centre = poly.center
        poly.material_index = 1

    smooth = mesh.modifiers.new("Anatomical surface relaxation", "SMOOTH")
    smooth.factor = .72
    smooth.iterations = 4
    sub = mesh.modifiers.new("Production subdivision", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 2
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
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
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


def _add_face_details(rig, name):
    """Add restrained, non-identifying adult facial features to the rigged head."""
    beard_mat = _mat(name + " / short beard", (.055, .027, .019), .82)
    eye_white = _mat(name + " / eye white", (.72, .68, .60), .34)
    eye_dark = _mat(name + " / iris", (.045, .028, .018), .32)

    def detail(label, center, scale, material):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=center)
        obj = bpy.context.object
        obj.name = name + " / face / " + label
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(material)
        for poly in obj.data.polygons:
            poly.use_smooth = True
        obj.parent = rig
        return obj

    detail("full beard", (0, -.12, 3.205), (.25, .19, .18), beard_mat)
    for side, tag in ((-1, "L"), (1, "R")):
        detail("eye white." + tag, (side * .12, -.278, 3.49), (.041, .023, .029), eye_white)
        detail("iris." + tag, (side * .12, -.298, 3.49), (.019, .012, .019), eye_dark)


def build_rigged_character(name="GEEHUB / rigged base", animate=False,
                           start_frame=1, end_frame=120, growth_ceiling=1.22):
    """Create and return (unified_mesh, armature); safe to call in a clean scene.

    Animation is keyed only across the requested growth passage and holds its
    final form afterwards. growth_ceiling is clamped to a restrained 1.0–1.8.
    """
    mesh = _anatomy_surface(name)
    rig = _make_armature(mesh, name)
    _add_face_details(rig, name)
    if animate:
        scene = bpy.context.scene
        start_frame = max(1, int(start_frame))
        end_frame = max(start_frame + 1, int(end_frame))
        ceiling = max(1.0, min(1.8, float(growth_ceiling)))
        scene.frame_start = min(scene.frame_start, start_frame)
        scene.frame_end = max(scene.frame_end, end_frame)
        keyframes = ((start_frame, 1.0),
                     (int(start_frame + (end_frame - start_frame) * .42), 1.0 + (ceiling - 1.0) * .48),
                     (end_frame, ceiling))
        for frame, amount in keyframes:
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
