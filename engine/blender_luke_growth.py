"""GEEHUB / LUKE GROWTH MORPH
Run: blender --background --python engine/blender_luke_growth.py
Render MP4 + generated sound: GEEHUB_RENDER=1 blender --background --python engine/blender_luke_growth.py
Output folder: GEEHUB_OUTPUT=/path/to/folder
This is a procedural full-body stand-in. Swap in the approved Luke mesh when available.
"""
import bpy, math, os, wave, struct, json
from mathutils import Vector

OUT=os.environ.get("GEEHUB_OUTPUT",os.path.abspath("./geehub_luke_growth_output"))
DO_RENDER=os.environ.get("GEEHUB_RENDER","0")=="1"
STATE_PATH=os.environ.get("GEEHUB_MORPH_STATE","")
MORPHS={}
if STATE_PATH and os.path.isfile(STATE_PATH):
    with open(STATE_PATH,"r",encoding="utf-8") as sf:
        MORPHS=json.load(sf).get("morphs",{})
    print("Imported Geehub morph state:",STATE_PATH,MORPHS)
os.makedirs(OUT,exist_ok=True)
BLEND=os.path.join(OUT,"luke_growth_morph.blend")
VIDEO=os.path.join(OUT,"luke_growth_morph.mp4")
AUDIO=os.path.join(OUT,"growth_atmosphere.wav")
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.cameras,bpy.data.lights):
    for d in list(datablocks):
        if d.users==0: datablocks.remove(d)

def mat(name,color,rough=.43,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF"); bs.inputs["Base Color"].default_value=(*color,1); bs.inputs["Roughness"].default_value=rough; bs.inputs["Metallic"].default_value=metal
    return m
skin=mat("Luke / warm skin",(.36,.19,.13),.38); lit=mat("Muscle planes",(.49,.27,.19),.4); shade=mat("Muscle shadow",(.22,.095,.065),.48); shorts=mat("Graphite posing trunks",(.035,.055,.065),.65,.08)
def sphere(name,loc,scale,material,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=28,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    if parent:o.parent=parent
    o["region"]=name
    return o
def rod(name,a,b,r1,r2,material):
    va,vb=Vector(a),Vector(b); delta=vb-va
    bpy.ops.mesh.primitive_cone_add(vertices=40,radius1=r1,radius2=r2,depth=delta.length,location=(va+vb)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=delta.to_track_quat("Z","Y").to_euler();o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o
root=bpy.data.objects.new("LUKE / GROWTH MORPH ROOT",None); bpy.context.collection.objects.link(root)
# The head and its identity landmarks are deliberately outside all growth controls.
head=sphere("Luke / identity anchor / head",(0,2.06,0),(.29,.39,.27),skin,root)
sphere("Hair silhouette",(0,2.31,-.015),(.30,.19,.28),shade,root)
sphere("Jaw",(0,1.88,.045),(.235,.18,.235),lit,root)
for s in (-1,1):
    sphere("Ear "+str(s),(s*.29,2.06,0),(.055,.085,.045),skin,root)
    sphere("Eye "+str(s),(s*.105,2.11,.245),(.034,.02,.012),shade,root)
neck=rod("Neck",(0,1.43,0),(0,1.77,0),.17,.19,skin);neck.parent=root
torso=sphere("Torso / base",(0,.57,0),(.56,.91,.31),skin,root)
chest=sphere("Chest / growth",(0,.96,.035),(.64,.43,.36),lit,root)
traps=sphere("Traps / growth",(0,1.35,-.015),(.38,.28,.26),skin,root)
abs1=sphere("Abdominal plane",(0,.12,.07),(.39,.48,.25),skin,root)
pelvis=sphere("Pelvis",(0,-.42,0),(.43,.39,.28),shorts,root)
parts={"shoulders":[],"biceps":[],"triceps":[],"forearms":[],"thighs":[],"calves":[]}
for s in (-1,1):
    sh=sphere("Deltoid "+str(s),(s*.64,.98,0),(.29,.32,.28),lit,root);parts["shoulders"].append(sh)
    upper=rod("Upper arm "+str(s),(s*.70,.83,0),(s*.79,.04,0),.205,.16,skin);upper.parent=root
    bi=sphere("Biceps "+str(s),(s*.75,.39,.16),(.19,.39,.16),lit,root);parts["biceps"].append(bi)
    tri=sphere("Triceps "+str(s),(s*.79,.38,-.14),(.17,.4,.14),shade,root);parts["triceps"].append(tri)
    elbow=sphere("Elbow "+str(s),(s*.79,-.05,0),(.15,.15,.15),skin,root)
    fore=rod("Forearm "+str(s),(s*.80,-.11,0),(s*.91,-.81,.025),.15,.095,skin);fore.parent=root;parts["forearms"].append(fore)
    sphere("Hand "+str(s),(s*.92,-.95,.025),(.12,.16,.085),skin,root)
    for j in range(4):rod("Finger "+str(s)+" "+str(j),(s*(.87+j*.035),-1.02,.05),(s*(.87+j*.035),-1.16,.05),.027,.022,skin).parent=root
    thigh=rod("Thigh "+str(s),(s*.25,-.60,0),(s*.29,-1.45,.015),.25,.18,skin);thigh.parent=root;parts["thighs"].append(thigh)
    quad=sphere("Quadriceps "+str(s),(s*.27,-1.05,.13),(.22,.43,.18),lit,root);parts["thighs"].append(quad)
    ham=sphere("Hamstring "+str(s),(s*.29,-1.08,-.12),(.18,.38,.13),shade,root)
    sphere("Knee "+str(s),(s*.29,-1.49,.015),(.16,.16,.16),skin,root)
    calf=rod("Calf "+str(s),(s*.29,-1.57,0),(s*.30,-2.23,-.035),.16,.09,skin);calf.parent=root;parts["calves"].append(calf)
    gast=sphere("Calf muscle "+str(s),(s*.30,-1.91,-.025),(.15,.30,.13),lit,root);parts["calves"].append(gast)
    sphere("Foot "+str(s),(s*.30,-2.34,.12),(.14,.10,.25),skin,root)
# Animate regional scale without altering the head. Sliders remain editable as object transforms in Blender.
def animate_scale(obj,factor,axis='xyz'):
    base=obj.scale.copy()
    for frame,mul in ((1,1.0),(25,1.04),(75,factor),(121,factor)):
        obj.scale=base
        if 'x' in axis:obj.scale.x*=mul
        if 'y' in axis:obj.scale.y*=mul
        if 'z' in axis:obj.scale.z*=mul
        obj.keyframe_insert(data_path="scale",frame=frame)
animate_scale(chest,float(MORPHS.get('chest',1.42)),'xz');animate_scale(traps,float(MORPHS.get('traps',1.55)),'xyz')
for o in parts['shoulders']:animate_scale(o,float(MORPHS.get('shoulders',1.62)),'xz')
for o in parts['biceps']:animate_scale(o,float(MORPHS.get('biceps',2.0)),'xyz')
for o in parts['triceps']:animate_scale(o,float(MORPHS.get('triceps',1.82)),'xyz')
for o in parts['forearms']:animate_scale(o,float(MORPHS.get('forearms',1.48)),'xz')
for o in parts['thighs']:animate_scale(o,float(MORPHS.get('thighs',1.62)),'xz')
for o in parts['calves']:animate_scale(o,float(MORPHS.get('calves',1.38)),'xz')
# Scene set
floor_mat=mat("Studio / graphite",(.018,.027,.035),.72,.12)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,-2.52,0));floor=bpy.context.object;floor.name="Studio floor";floor.data.materials.append(floor_mat)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.025,.04,.055,1);world.node_tree.nodes["Background"].inputs["Strength"].default_value=.45
def area(name,loc,power,color,size):
    d=bpy.data.lights.new(name,"AREA");d.energy=power;d.color=color;d.shape="DISK";d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat("-Z","Y").to_euler()
area("Key / warm", (3,4,4),850,(1,.75,.58),4);area("Rim / cyan",(-3,2,-3),1100,(.18,.72,1),3);area("Fill",(-2,4,2),500,(.68,.83,1),4)
cd=bpy.data.cameras.new("Luke portrait camera");cam=bpy.data.objects.new("Luke portrait camera",cd);bpy.context.collection.objects.link(cam);cam.location=(3.5,.05,9.5);cam.rotation_euler=(Vector((0,-.05,0))-cam.location).to_track_quat("-Z","Y").to_euler();cd.lens=58
sc=bpy.context.scene;sc.camera=cam;sc.render.engine="CYCLES";sc.cycles.samples=24;sc.render.resolution_x=720;sc.render.resolution_y=900;sc.render.resolution_percentage=100;sc.render.fps=24;sc.frame_start=1;sc.frame_end=121;sc.render.image_settings.file_format="PNG";sc.view_settings.view_transform="AgX"
# Smooth morph curves.
for ob in bpy.data.objects:
    if ob.animation_data and ob.animation_data.action:
        for fc in ob.animation_data.action.fcurves:
            for kp in fc.keyframe_points:kp.interpolation="BEZIER"
# Generate a quiet five-second synthetic sound bed (low drone + restrained pulse).
sr=22050;duration=121/24
with wave.open(AUDIO,"wb") as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr)
    frames=[]
    for i in range(int(sr*duration)):
        t=i/sr;fade=min(1,t/.35,(duration-t)/.5);pulse=(.5+.5*math.sin(2*math.pi*1.1*t))**3
        sample=fade*(.12*math.sin(2*math.pi*55*t)+.045*math.sin(2*math.pi*82.4*t)+.025*pulse*math.sin(2*math.pi*110*t))
        frames.append(struct.pack("<h",int(max(-1,min(1,sample))*32767)))
    wav.writeframes(b"".join(frames))
# Sound is mixed by Blender's sequencer into the MP4 on render.
sc.sequence_editor_create()
try:
    sc.sequence_editor.strips.new_sound("Growth / low atmospheric pulse",AUDIO,channel=1,frame_start=1)
except Exception:
    try: sc.sequence_editor_create().sequences.new_sound("Growth / low atmospheric pulse",AUDIO,channel=1,frame_start=1)
    except Exception as exc: print("Sound strip setup warning:",exc)
sc.render.image_settings.color_mode="RGBA"
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
with open(os.path.join(OUT,"luke-growth-manifest.txt"),"w",encoding="utf-8") as f:
    f.write("GEEHUB / LUKE GROWTH MORPH\n")
    f.write("Project: luke_growth_morph.blend\nAudio: growth_atmosphere.wav\nVideo: luke_growth_morph.mp4 (when rendered)\n")
    f.write("Head identity anchor is not animated. Regional body volumes animate from baseline to expanded state.\nBrowser state import: set GEEHUB_MORPH_STATE to luke-growth-morph-state.json.\nImported morph values control chest, traps, shoulders, biceps, triceps, forearms, thighs, and calves.\n")
if DO_RENDER:
    sc.render.image_settings.file_format="FFMPEG";sc.render.ffmpeg.format="MPEG4";sc.render.ffmpeg.codec="H264";sc.render.ffmpeg.audio_codec="AAC";sc.render.ffmpeg.audio_channels="MONO";sc.render.filepath=VIDEO;sc.cycles.samples=32
    bpy.ops.render.render(animation=True);bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print("LUKE MORPH PROJECT:",BLEND);print("SOUND BED:",AUDIO)
if DO_RENDER:print("GROWTH VIDEO:",VIDEO)
