# GEEHUB Growth Study 001 — V2.4 IK Rig, Video6 Pose Match, and Locomotion

V2.3 builds on the first prototype's continuous anatomy and adds articulated appendages plus a separate run-away action: the body was made from separate ellipsoids. This pass fuses overlapping body volumes into one connected skin blockout, then assigns each remeshed vertex blended weights from its three nearest armature bone segments.

## Files
- `geehub_growth_study_v2.py` — V2 procedural Blender scene generator.
- `geehub_growth_study.py` — V1 modular-volume fallback.
- `SCENE_SPEC_V2.json` — V2 scene and validation state.
- `README_V2.md` — production notes.

## What V2 changes
The torso, pelvis, neck, head, pectoral masses, deltoids, biceps, triceps, forearms, hands, abdominal landmarks, obliques, thighs, quadriceps, calves, and feet are assembled from intersecting source volumes. Blender's voxel remesh converts them into one continuous surface. A light Smooth modifier relaxes the voxel surface. Vertex weights are then calculated from distance to armature bone segments, with each vertex blended across its three nearest deform bones. Hair, eyes, ears, and clothing remain separate replaceable objects. V2.2 preserves the named pre-fusion anatomy volumes in the hidden `SOURCE_ANATOMY_MODULES — replaceable kit` collection, so the connected render surface does not destroy the modular source assembly.

The four growth stages and lighting/material setup remain. The optional atmosphere volume is independently switchable. V1 is retained as a fallback and comparison baseline.

## Run
Target: Blender 4.x. In Blender, open the Scripting workspace, load `geehub_growth_study_v2.py`, and run it. Alternatively:
```bash
blender --background --python geehub_growth_study_v2.py
```
The script writes a `.blend` project and two PNG preview renders. When run as a standalone script, output is placed beside the script. When run from an already-saved Blender project, output is placed beside that project.

Select `GROWTH_RIG — master control` and adjust its `growth` custom property between 0 and 1, or use the four timeline stages at frames 1, 36, 72, and 108.

## Locomotion — RUN_AWAY
The rig carries two independent NLA tracks: 01_GROWTH — independent stage control and 02_LOCOMOTION — run away. The run action turns the figure 180 degrees, drives four 24-frame gait cycles, counter-swings the arms, flexes the knees and ankles, articulates the digits, and moves the rig 9 scene units along world +Y away from the fixed camera. The original orthographic studio camera remains unchanged. A separate fixed perspective camera takes over at frame 108 for the retreat, so the character visibly recedes while the original growth-study framing is preserved. Mute the locomotion NLA track to disable the retreat; the growth track remains separate.

The run takes place after the four growth stages, from frame 108 through frame 208. The final preview render is run_away_retreat_endpoint.png.

## IK / FK rig controls
The V2.4 rig has separate clavicle, upper-arm, forearm, and hand joints. Each arm receives a four-bone IK chain with a hand target and elbow pole; each leg receives a three-bone IK chain with a foot target and knee pole. `arm_ik` and `leg_ik` are independent 0–1 influence switches; set either to 0 to use direct FK rotations. The hand and elbow targets are driven by the single `CTRL_VIDEO6_DRIVER` property object. Foot targets remain planted during the Video6 pose sequence. Heel and toe pivot references are present for the next foot-roll pass.

## Video 6 pose match
The Library clip `generated_video6(1).mp4` is 6.0417 seconds, 24 fps, 448×672. The new `VIDEO6_POSE` action reproduces its visible sequence: neutral front stance, arms rise to a broad spread, double-biceps flex, held pose, then arms open and settle. It uses fixed feet, moving hand IK targets, elbow poles, and finger curl. This is a single-view pose reconstruction: depth and hidden joint motion are inferred, not recovered from multi-camera motion capture. The clip's generated imagery has small frame-to-frame shape changes, so the rig preserves one stable character silhouette rather than copying those image artifacts.

The pose action begins at frame 216 and ends at frame 360. A dedicated low frontal camera switches in at frame 216. Preview frames are rendered at the neutral pose, wide-arm pose, double-biceps peak, hold, and release.

## Validation
The updated source will be checked by the repository's static-validation workflow. Blender execution, IK bend direction, skinning, foot contact, and the preview renders remain pending. Voxel-remesh output, weight quality, render appearance, and animation behavior remain pending Blender validation.

This is a procedural blockout, not a finished anatomical character. Fusion removes gaps between anatomy volumes but does not provide muscle sliding, corrective shapes, detailed hands, facial performance, or production-quality topology. The nearest-bone weighting is a starting heuristic and must be inspected at shoulders, elbows, hips, and knees.

## Research connection
- [Bedroom Growth Technical Study](https://www.patreon.com/hulumscave/posts/bedroom-growth-84293264): the creator described body movement experiments using pinning/locking body parts. V2 keeps anatomical regions and bone controls explicit for later constraint and corrective-shape tests.
- [Atmosphere volume](https://www.patreon.com/hulumscave/posts/atmosphere-77922144): the creator described the realism benefit and render-time cost of atmosphere volume. This scene keeps atmosphere optional.
- [Next Scene is built!](https://www.patreon.com/hulumscave/posts/next-scene-is-90663150): the creator described moving a devil and throne set into Maya ready for animation. The GEEHUB scene separates character, clothing, environment, and lighting for reuse.

## Next pass
1. Execute in Blender and inspect the generated body surface.
2. Correct the shoulders, elbows, wrists, hips, knees, and ankles.
3. Inspect blended weights in rest and all growth stages.
4. Add corrective shapes and joint-volume preservation.
5. Calibrate layered skin and cloth materials under the existing lights.
6. Validate the IK/FK switches and both hand/foot pole directions in Blender.
7. Scrub Video 6 frames 216–360 and compare pose beats against the Library source.
8. Inspect shoulder, elbow, wrist, knee, ankle, finger, and toe deformation at each peak pose.
9. Add corrective shapes and heel/toe roll behavior after the control rig passes.

See `APPENDAGE_SYSTEM_SPEC.md` for the modular appendage construction plan, Library photo direction, and joint validation gates.
