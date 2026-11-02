"""GEEHUB Blender humanoid rig scaffold. Run: blender --background --python luke_rig_scaffold.py"""
import bpy, math
from mathutils import Vector
from pathlib import Path
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT"; scene.render.resolution_x=1280; scene.render.resolution_y=720
scene.render.fps=30; scene.frame_start=1; scene.frame_end=180
scene.render.image_settings.file_format="FFMPEG"; scene.render.ffmpeg.format="MPEG4"; scene.render.ffmpeg.codec="H264"
parts=[]
def uv(name,loc,scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); parts.append(o)
def limb(name,a,b,r1,r2):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2)
    o=bpy.context.object; o.name=name; o.rotation_mode="QUATERNION"; o.rotation_quaternion=d.to_track_quat("Z","Y"); parts.append(o)
uv("Pelvis",(0,0,1.02),(.31,.20,.24)); uv("Abdomen",(0,0,1.37),(.32,.20,.42))
uv("Thorax",(0,0,1.83),(.49,.25,.43)); uv("Chest",(0,-.015,1.94),(.55,.265,.28))
uv("Neck",(0,0,2.28),(.12,.13,.19)); uv("Head",(0,-.005,2.55),(.19,.19,.27))
for s,side in [(-1,"L"),(1,"R")]:
    uv("Deltoid."+side,(s*.51,0,2.13),(.22,.23,.22))
    limb("UpperArm."+side,(s*.57,0,2.10),(s*.83,0,1.68),.145,.12)
    uv("Elbow."+side,(s*.83,0,1.68),(.12,.12,.12))
    limb("Forearm."+side,(s*.83,0,1.68),(s*.91,-.015,1.18),.115,.075)
    uv("Hand."+side,(s*.92,-.025,1.08),(.09,.07,.15)); uv("Glute."+side,(s*.17,.02,1),(.19,.20,.22))
    limb("Thigh."+side,(s*.17,0,1.02),(s*.19,0,.48),.19,.135); uv("Knee."+side,(s*.19,0,.48),(.14,.14,.14))
    limb("Shin."+side,(s*.19,0,.48),(s*.20,0,.09),.12,.085); uv("Foot."+side,(s*.20,-.09,.075),(.13,.25,.075))
bpy.ops.object.select_all(action="DESELECT")
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join()
body=bpy.context.object; body.name="Luke_Body_Surface"
# Joining primitives keeps the active pelvis object origin by default. Apply its
# transform so mesh coordinates, shape-key envelopes, and armature coordinates
# all use the same world-origin basis.
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
rm=body.modifiers.new("Anatomy_Voxel_Fusion","REMESH"); rm.mode="VOXEL"; rm.voxel_size=.035; bpy.ops.object.modifier_apply(modifier=rm.name)
sm=body.modifiers.new("Surface_Smoothing","SMOOTH"); sm.factor=.65; sm.iterations=4; bpy.ops.object.modifier_apply(modifier=sm.name)
for p in body.data.polygons:p.use_smooth=True
ad=bpy.data.armatures.new("Luke_Rig_Data"); rig=bpy.data.objects.new("Luke_Rig",ad); scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode="EDIT")
bones={}
def addbone(n,h,t,parent=None,connected=False):
    b=ad.edit_bones.new(n); b.head=h; b.tail=t
    if parent:b.parent=ad.edit_bones[parent]; b.use_connect=connected
    bones[n]=(Vector(h),Vector(t))
addbone("root",(0,0,.05),(0,0,.45)); addbone("pelvis",(0,0,.85),(0,0,1.12),"root")
addbone("spine",(0,0,1.12),(0,0,1.55),"pelvis",True); addbone("chest",(0,0,1.55),(0,0,2.02),"spine",True)
addbone("neck",(0,0,2.02),(0,0,2.34),"chest",True); addbone("head",(0,0,2.34),(0,0,2.78),"neck",True)
for s,side in [(-1,"L"),(1,"R")]:
    addbone("clavicle."+side,(0,0,1.98),(s*.50,0,2.12),"chest")
    addbone("upper_arm."+side,(s*.50,0,2.12),(s*.83,0,1.68),"clavicle."+side)
    addbone("forearm."+side,(s*.83,0,1.68),(s*.91,0,1.18),"upper_arm."+side,True)
    addbone("hand."+side,(s*.91,0,1.18),(s*.93,0,.98),"forearm."+side,True)
    addbone("thigh."+side,(s*.17,0,1.02),(s*.19,0,.48),"pelvis")
    addbone("shin."+side,(s*.19,0,.48),(s*.20,0,.09),"thigh."+side,True)
    addbone("foot."+side,(s*.20,0,.09),(s*.20,-.28,.07),"shin."+side,True)
bpy.ops.object.mode_set(mode="OBJECT")
def segdist(p,a,b):
    ab=b-a; t=max(0,min(1,(p-a).dot(ab)/(ab.dot(ab)+1e-9))); return (p-(a+t*ab)).length
deform=[n for n in bones if n!="root"]; groups={n:body.vertex_groups.new(name=n) for n in deform}
for v in body.data.vertices:
    p=body.matrix_world@v.co; near=sorted((segdist(p,*bones[n]),n) for n in deform)[:4]
    weights=[math.exp(-d*11) for d,n in near]; total=sum(weights) or 1
    for (d,n),w in zip(near,weights):
        if w/total>.025:groups[n].add([v.index],w/total,"REPLACE")
mod=body.modifiers.new("Armature_Deformation","ARMATURE"); mod.object=rig
body.parent=rig; body.matrix_parent_inverse=rig.matrix_world.inverted()
bpy.context.view_layer.objects.active=rig; bpy.ops.object.mode_set(mode="POSE")
# Animator-facing blend controls: 0 = FK, 1 = IK.
rig["arm_ik_blend"]=1.0
rig["leg_ik_blend"]=1.0
rig.id_properties_ui("arm_ik_blend").update(min=0.0,max=1.0,default=1.0,
    description="Arm FK/IK blend: 0 is FK, 1 is IK")
rig.id_properties_ui("leg_ik_blend").update(min=0.0,max=1.0,default=1.0,
    description="Leg FK/IK blend: 0 is FK, 1 is IK")
for side,s in [("L",-1),("R",1)]:
    for chain,loc,poleloc in [("forearm."+side,(s*.91,-.02,1.18),(s*1.35,-.1,1.7)),("shin."+side,(s*.20,-.05,.09),(s*.55,-.15,.5))]:
        target=bpy.data.objects.new("CTRL_"+chain+"_IK",None); scene.collection.objects.link(target); target.empty_display_type="SPHERE"; target.empty_display_size=.07; target.location=loc
        pole=bpy.data.objects.new("CTRL_"+chain+"_POLE",None); scene.collection.objects.link(pole); pole.empty_display_type="CIRCLE"; pole.empty_display_size=.09; pole.location=poleloc
        c=rig.pose.bones[chain].constraints.new("IK"); c.name="IK_FK_BLEND"
        c.target=target; c.pole_target=pole; c.chain_count=2
        prop="arm_ik_blend" if chain.startswith("forearm") else "leg_ik_blend"
        fc=c.driver_add("influence")
        drv=fc.driver; drv.type="SCRIPTED"
        var=drv.variables.new(); var.name="blend"; var.type="SINGLE_PROP"
        var.targets[0].id=rig; var.targets[0].data_path='["'+prop+'"]'
        drv.expression="max(0.0, min(1.0, blend))"
for n in ["chest","upper_arm.L","upper_arm.R"]:
    pb=rig.pose.bones[n]; pb.rotation_mode="XYZ"; pb.keyframe_insert(data_path="rotation_euler",frame=1,group="Rig_Sanity")
    pb.rotation_euler[1]=math.radians(4 if n=="chest" else (-7 if n.endswith(".L") else 7)); pb.keyframe_insert(data_path="rotation_euler",frame=90,group="Rig_Sanity")
    pb.rotation_euler=(0,0,0); pb.keyframe_insert(data_path="rotation_euler",frame=180,group="Rig_Sanity")
if rig.animation_data and rig.animation_data.action:rig.animation_data.action.name="Luke_Rig_Sanity_Test"
bpy.ops.object.mode_set(mode="OBJECT")
mat=bpy.data.materials.new("Skin_Neutral_Clay"); mat.diffuse_color=(.38,.24,.18,1); body.data.materials.append(mat)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015)); floor=bpy.context.object
fm=bpy.data.materials.new("Stage_Matte"); fm.diffuse_color=(.025,.035,.045,1); floor.data.materials.append(fm)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add(location=(3.6,-7.8,2.3)); cam=bpy.context.object; cam.name="Camera_Diagnostic"; aim(cam,(0,0,1.4)); cam.data.lens=55; scene.camera=cam
for name,loc,power,size in [("Key",(-3,-4,5),900,4),("Fill",(4,-2,3),500,3),("Rim",(0,3,4),1100,3)]:
    bpy.ops.object.light_add(type="AREA",location=loc); lamp=bpy.context.object; lamp.name=name; lamp.data.energy=power; lamp.data.shape="DISK"; lamp.data.size=size; aim(lamp,(0,0,1.4))

# Phase-four growth shape: a single capped, continuous deformation target.
# The timing below is a rig test only; replace it with source-derived timing.
keys=body.shape_key_add(name="Basis")
growth=body.shape_key_add(name="PHASE_04_GROWTH")
growth.slider_min=0.0; growth.slider_max=1.0
for i,v in enumerate(body.data.vertices):
    co=v.co.copy()
    z=co.z
    # Regional envelopes: torso/chest, shoulders/arms, legs. Smooth transitions.
    torso=math.exp(-((z-1.78)/.55)**2)
    chest=math.exp(-((z-1.98)/.27)**2)
    shoulders=math.exp(-((z-2.12)/.32)**2)
    limbs=math.exp(-((z-1.45)/.95)**2)
    radial=1.0 + .13*torso + .09*chest + .07*shoulders + .035*limbs
    # Preserve the centerline; broaden proportionally rather than inflating uniformly.
    growth.data[i].co.x=co.x*radial
    growth.data[i].co.y=co.y*(1.0+.10*torso+.11*chest+.045*limbs)
    growth.data[i].co.z=.06 + (z-.06)*1.045
# Expose phase-four growth as one rig-level control, driven into the shape key.
rig["phase4_growth"]=0.0
rig.id_properties_ui("phase4_growth").update(min=0.0,max=1.0,default=0.0,
    description="Phase-four growth only; 0 = base, 1 = phase-four maximum")
fc=growth.driver_add("value")
drv=fc.driver; drv.type="SCRIPTED"
var=drv.variables.new(); var.name="phase4"; var.type="SINGLE_PROP"
var.targets[0].id=rig; var.targets[0].data_path='["phase4_growth"]'
drv.expression="max(0.0, min(1.0, phase4))"
rig.keyframe_insert(data_path='["phase4_growth"]',frame=1,group="Phase4_Growth")
rig["phase4_growth"]=1.0
rig.keyframe_insert(data_path='["phase4_growth"]',frame=110,group="Phase4_Growth")
rig.keyframe_insert(data_path='["phase4_growth"]',frame=180,group="Phase4_Growth")
# Clamp the UI control to phase four; no phase-five/six shape exists in this rig.
rig["growth_stage_max"]=4
rig["phase4_growth_note"]="Single capped growth shape. Test timing only; retime from source."
scene.timeline_markers.new("GROWTH_BEGIN_TEST",frame=1)
scene.timeline_markers.new("PHASE_04_REACHED_TEST",frame=110)
scene.timeline_markers.new("PHASE_04_HOLD",frame=180)

scene.render.filepath="//luke_rig_diagnostic.mp4"; scene.frame_set(1)
path=Path(bpy.path.abspath("//Luke_Rig_Scaffold.blend")); bpy.ops.wm.save_as_mainfile(filepath=str(path))
print("Saved Blender rig scaffold:",path)
