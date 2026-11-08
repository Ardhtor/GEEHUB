# Laboratory Serum — 60s Continuous

This project is now wired to GEEHUB's local Blender scene builder. It is no longer only a shot brief: the timeline can drive a unified rigged humanoid mesh, regional shape-key deformation, a continuous camera arc, a saved Blender scene, and an MP4 render.

The production is 60 seconds at 24 fps (1,440 frames), with seven contiguous semantic stages. The regional shape-key controller expands the pectorals symmetrically, deltoids, traps, arms, lats, back, torso, quadriceps, calves, and overall body envelope. The camera follows the same stage timebase. Stage boundaries do not create cuts or reset the deformation.

## Run it locally

Requirements: Blender 4.x and Python 3.10+. From the GEEHUB repository root:

```bash
python3 engine/video/render_project.py
```

This first renders an eight-second, low-resolution preview and saves the full-length editable scene to 04_COMPOSITES/Laboratory-Serum-60s.blend. Inspect the preview before committing to the full render.

To render the complete 60-second, 1920×1080 master:

```bash
python3 engine/video/render_project.py --preview-seconds 0
```

If Blender is not on PATH, supply its executable:

```bash
python3 engine/video/render_project.py --blender "/Applications/Blender.app/Contents/MacOS/Blender"
```

The MP4 is written to 05_EXPORTS/; the editable Blender scene is written to 04_COMPOSITES/. Both paths can be overridden with --output and --project.

## What is actually generated

- A fused, smooth humanoid base mesh with an armature and weighted deform skeleton.
- Regional shape keys with spatial falloff, so the same surface expands rather than swapping between separate models.
- Keyframed, eased shape-key values derived from the seven timeline intervals.
- Bilateral pectoral deformation from one shared symmetric control.
- A continuous camera orbit/push/pull keyed to the same timeline.
- A reusable Blender project and an H.264 MP4 render.

## Current limitations

This is an executable procedural prototype, not a finished Hulum's Cave-quality asset. The base is a neutral generated humanoid, not a source-fitted likeness. The deformation is spatially weighted shape-key expansion, not a full muscle simulation or corrective sculpt system. Clothing simulation, detailed face rigging, secondary soft-tissue dynamics, environmental breakage, and designed sound cues are not yet implemented in the Blender scene. The current local renderer supplies a simple low-frequency audio bed only through the separate GEEHUB engine route; this direct project renderer produces the Blender picture pass.

The project remains explicitly adult and fictional. Intimate anatomy is not modeled or rendered. Source media and identity-lock frames remain absent until a verified source is supplied and inspected.

The first preview is the acceptance gate: inspect silhouette, body proportions, bilateral balance, camera framing, floor contact, and continuity before running the full master.
