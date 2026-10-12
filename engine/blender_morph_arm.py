"""
GEEHUB / MORPH ARM — Blender production scaffold
Run with:
  blender --background --python engine/blender_morph_arm.py
Optional output override:
  GEEHUB_OUTPUT=/path/to/output blender --background --python engine/blender_morph_arm.py

Creates a continuous lofted upper-limb mesh with shape keys, a growth animation,
studio lighting, camera, and a saved .blend project. Configure OUTPUT_ROOT below
or with GEEHUB_OUTPUT. Rendering is opt-in via GEEHUB_RENDER=1.
"""
import bpy
import math
import os
from mathutils import Vector

OUTPUT_ROOT = os.environ.get("GEEHUB_OUTPUT", os.path.abspath("./geehub_morph_arm_output"))
RENDER_VIDEO = os.environ.get("GEEHUB_RENDER", "0") == "1"
os.makedirs(OUTPUT_ROOT, exist_ok=True)
BLEND_PATH = os.path.join(OUTPUT_ROOT, "geehub_morph_arm.blend")
VIDEO_PATH = os.path.join(OUTPUT_ROOT, "geehub_morph_arm.mp4")

# Reset scene
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for block in list(datablocks):
        if block.users == 0:
            datablocks.remove(block)

def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x-a)/(b-a)))
    return t*t*(3.0-2.0*t)

def bell(x, center, width):
    return math.exp(-((x-center)/width)**2)

def radius_profile(y):
    # Shoulder to wrist, with a broad upper arm and taper into the forearm.
    points = [
        (1.34, .26), (1.18, .40), (.98, .48), (.72, .43),
        (.48, .37), (.18, .34), (-.18, .32), (-.52, .30),
        (-.78, .27), (-.94, .285), (-1.15, .30), (-1.40, .255),
        (-1.68, .21), (-1.90, .16), (-2.02, .135)
    ]
    for i in range(len(points)-1):
        y0, r0 = points[i]
        y1, r1 = points[i+1]
        if y0 >= y >= y1:
            t = (y0-y)/(y0-y1)
            t = t*t*(3-2*t)
            return r0*(1-t)+r1*t
    return points[0][1] if y > points[0][0] else points[-1][1]

def loft_geometry(growth=None, rings=100, sides=64):
    verts, faces = [], []
    y_top, y_bottom = 1.34, -2.02
    for j in range(rings+1):
        t = j/rings
        y = y_top + (y_bottom-y_top)*t
        base = radius_profile(y)
        g = growth or {}
        shoulder = g.get("Shoulder", 0.0) * bell(y, .92, .38) * .42
        biceps = g.get("Biceps", 0.0) * bell(y, -.03, .43) * .32
        triceps = g.get("Triceps", 0.0) * bell(y, -.12, .48) * .28
        forearm = g.get("Forearm", 0.0) * bell(y, -1.38, .43) * .23
        for i in range(sides):
            a = 2*math.pi*i/sides
            # Front/back radii are gently asymmetric to avoid a featureless tube.
            front = 1.0 + .11*max(0, math.sin(a))
            r = base + shoulder + biceps + triceps + forearm
            x = math.cos(a)*r*front
            z = math.sin(a)*r*(1.0 + .04*math.cos(a*2))
            verts.append((x, y, z))
    for j in range(rings):
        for i in range(sides):
            a = j*sides+i
            b = j*sides+(i+1)%sides
            c = (j+1)*sides+(i+1)%sides
            d = (j+1)*sides+i
            faces.append((a,b,c,d))
    faces.append(tuple(range(sides-1,-1,-1)))
    start = rings*sides
    faces.append(tuple(start+i for i in range(sides)))
    return verts, faces

verts, faces = loft_geometry()
mesh = bpy.data.meshes.new("MORPH_ARM_CONTINUOUS_MESH")
mesh.from_pydata(verts, [], faces)
mesh.update()
arm = bpy.data.objects.new("MORPH ARM / PRIMARY MESH", mesh)
bpy.context.collection.objects.link(arm)
for poly in mesh.polygons:
    poly.use_smooth = True

def material(name, color, roughness=.38, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return m

skin = material("Warm sculpt / satin skin", (.40,.20,.13), .36)
arm.data.materials.append(skin)
basis = arm.shape_key_add(name="Basis")
# Build shape keys by recalculating the same topology with region-specific volume.
for key_name in ("Biceps", "Triceps", "Forearm", "Shoulder"):
    key_verts, _ = loft_geometry({key_name: 1.0})
    key = arm.shape_key_add(name=key_name)
    for i, co in enumerate(key_verts):
        key.data[i].co = co

# Detail volumes are separate meshes but parented to the same rig for silhouette readability.
def uv_detail(name, loc, scale, mat, segments=40, rings=28):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    obj.parent = arm
    return obj

highlight = material("Anatomical highlight", (.58,.32,.22), .4)
shade = material("Anatomical shadow", (.24,.105,.075), .46)
# Low-relief forms ride the main volume; the primary continuous mesh carries the morph.
uv_detail("Biceps relief", (.055,-.03,.255), (.235,.58,.105), highlight)
uv_detail("Triceps relief", (-.055,-.12,-.245), (.22,.61,.085), shade)
uv_detail("Forearm flexor relief", (.065,-1.38,.17), (.16,.45,.075), highlight)
uv_detail("Hand / palm", (.02,-2.20,.015), (.20,.27,.145), skin)
for i in range(4):
    x = .13 - i*.085
    uv_detail("Finger %02d" % (i+1), (x,-2.43,.02), (.043,.17,.045), skin, 24, 16)
uv_detail("Thumb", (.225,-2.24,.10), (.07,.18,.065), skin, 24, 16)

# Studio floor and lighting
floor_mat = material("Graphite floor", (.025,.038,.05), .72, .16)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,-2.62,0))
floor = bpy.context.object
floor.name = "Studio floor"
floor.data.materials.append(floor_mat)

world = bpy.context.scene.world
world.color = (.035,.045,.06)
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.035,.05,.065,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .35

def area_light(name, location, energy, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0,-.35,0))-obj.location).to_track_quat("-Z","Y").to_euler()
    return obj
area_light("Key / warm softbox", (3,2.8,4), 520, (1,.78,.61), 4)
area_light("Rim / cold cyan", (-3,.8,-2.5), 650, (.22,.78,1), 3)
area_light("Fill / overhead", (-1,4,2), 280, (.68,.84,1), 3)

camera_data = bpy.data.cameras.new("Morph Arm Camera")
camera = bpy.data.objects.new("Morph Arm Camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (3.7,.05,7.6)
camera.rotation_euler = (Vector((0,-.5,0))-camera.location).to_track_quat("-Z","Y").to_euler()
camera_data.lens = 58
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"

# Growth sequence: baseline -> expansion -> new baseline.
scene.frame_start = 1
scene.frame_end = 121
scene.render.fps = 24
key_values = {"Biceps": 1.05, "Triceps": .90, "Forearm": .52, "Shoulder": .78}
for name, value in key_values.items():
    block = arm.data.shape_keys.key_blocks[name]
    block.value = 0
    block.keyframe_insert(data_path="value", frame=1)
    block.value = value
    block.keyframe_insert(data_path="value", frame=121)
# Smooth transition interpolation
if arm.data.shape_keys.animation_data and arm.data.shape_keys.animation_data.action:
    for fc in arm.data.shape_keys.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
scene.frame_set(1)

# Save a native Blender project and a settings manifest.
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
manifest = os.path.join(OUTPUT_ROOT, "morph-manifest.txt")
with open(manifest, "w", encoding="utf-8") as f:
    f.write("GEEHUB MORPH ARM\n")
    f.write("Project: geehub_morph_arm.blend\n")
    f.write("Shape keys: Biceps, Triceps, Forearm, Shoulder\n")
    f.write("Animation: frames 1-121 at 24 fps\n")
    f.write("Render video: set GEEHUB_RENDER=1 and run this script again\n")

if RENDER_VIDEO:
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.filepath = VIDEO_PATH
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080
    scene.cycles.samples = 48
    bpy.ops.render.render(animation=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

print("GEEHUB MORPH ARM READY:", BLEND_PATH)
if RENDER_VIDEO:
    print("VIDEO OUTPUT:", VIDEO_PATH)
