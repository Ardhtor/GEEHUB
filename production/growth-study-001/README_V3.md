# GEEHUB Growth Study 001 — V3: Growth Club

V3 changes the presentation from a dark technical studio into a small, colorful training club. The connected-body blockout and four growth stages from V2 remain, but the scene now has a more inviting setting and simple play-like controls.

## What's new

- A compact training-club set with midnight-teal flooring, deep-blue wall panels, warm/cyan practical lights, and a neon-style GROWTH CLUB sign.
- A central presentation podium with luminous rings and an animated halo.
- Replaceable set props: a training bench, dumbbell rack, dumbbells, wall bays, stage lamps, and labels.
- Four visual progression markers: REST, WARM, BUILD, MAX.
- A hero camera and a second close-up camera for material and anatomy inspection.
- Two master controls on GROWTH_RIG — master control: growth (0–1) changes the body progression; club_energy (0–2) adjusts the club's lighting intensity through drivers.
- A wider 1600 × 1200 composition and two preview render targets.

## Files

- geehub_growth_study_v3.py — V3 Blender scene generator.
- SCENE_SPEC_V3.json — structured scene and control specification.
- README_V3.md — this document.
- geehub_growth_study_v2.py and geehub_growth_study.py — prior versions kept for comparison and fallback.

## Run

Target: Blender 4.x. Open Blender's Scripting workspace, load geehub_growth_study_v3.py, and run it. Or use:

```bash
blender --background --python geehub_growth_study_v3.py
```

The script is configured to save a .blend project and two PNG previews beside the script (when run standalone) or beside the currently saved Blender project. Preview frames are frame 1 (REST) and frame 108 (MAX).

## Controls

Select GROWTH_RIG — master control and inspect its custom properties:
- growth: 0 = rest; 0.28 = warm-up; 0.62 = build; 1 = max.
- club_energy: 0–2 controls key, fill, rim, top, and practical point-light intensities.

The timeline contains named markers at frames 1, 36, 72, and 108. The halo rotates over the timeline. The secondary camera is CAM_GrowthClub_Closeup; the default camera is CAM_GrowthClub_Hero.

## Validation and limitations

The V3 script passes Python syntax compilation locally. Blender is not installed in the authoring environment, so the Blender scene has not yet been executed, rendered, or visually inspected. Geometry, rig behavior, lighting, drivers, and render output remain pending a Blender run.

The body remains a voxel-fused anatomical blockout with heuristic nearest-bone weights. It is not yet a production-quality anatomical mesh and has no corrective shapes, muscle sliding, detailed hands, facial performance, or cloth simulation. The set props and signs are procedural blockouts, not finished assets. The current interaction model is based on Blender custom properties and timeline controls, not a standalone game interface.

## Next pass

1. Run V3 in Blender and inspect camera framing, signage, props, and render exposure.
2. Validate the club_energy drivers and the halo animation.
3. Repair shoulders, elbows, hips, and knees in the growth sequence.
4. Improve skin, cloth, hair, and footwear materials after the scene is rendering reliably.
5. Add a short camera move and a playful training-club sequence after rig validation.
