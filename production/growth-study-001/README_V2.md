# GEEHUB Growth Study 001 — V2

V2 addresses the first prototype's largest visual limitation: the body was made from separate ellipsoids. This pass fuses overlapping body volumes into one connected skin blockout, then assigns each remeshed vertex blended weights from its three nearest armature bone segments.

## Files
- `geehub_growth_study_v2.py` — V2 procedural Blender scene generator.
- `geehub_growth_study.py` — V1 modular-volume fallback.
- `SCENE_SPEC_V2.json` — V2 scene and validation state.
- `README_V2.md` — production notes.

## What V2 changes
The torso, pelvis, neck, head, pectoral masses, deltoids, biceps, triceps, forearms, hands, abdominal landmarks, obliques, thighs, quadriceps, calves, and feet are assembled from intersecting source volumes. Blender's voxel remesh converts them into one continuous surface. A light Smooth modifier relaxes the voxel surface. Vertex weights are then calculated from distance to armature bone segments, with each vertex blended across its three nearest deform bones. Hair, eyes, ears, and clothing remain separate replaceable objects.

The four growth stages and lighting/material setup remain. The optional atmosphere volume is independently switchable. V1 is retained as a fallback and comparison baseline.

## Run
Target: Blender 4.x. In Blender, open the Scripting workspace, load `geehub_growth_study_v2.py`, and run it. Alternatively:
```bash
blender --background --python geehub_growth_study_v2.py
```
The script writes a `.blend` project and two PNG preview renders. When run as a standalone script, output is placed beside the script. When run from an already-saved Blender project, output is placed beside that project.

Select `GROWTH_RIG — master control` and adjust its `growth` custom property between 0 and 1, or use the four timeline stages at frames 1, 36, 72, and 108.

## Validation
Python syntax compilation passed. Blender execution has not yet been run because Blender is not installed in the authoring environment. Voxel-remesh output, weight quality, render appearance, and animation behavior remain pending Blender validation.

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
6. Add facial expression, finger articulation, camera motion, and a short rendered sequence after deformation is stable.
