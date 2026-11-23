# Laboratory Serum — 60s Continuous

**Status: preproduction prototype; not yet an accepted production delivery.** The repository contains an executable Blender scene builder, timeline-driven deformation, image-library reference manifests, and local source-intake tooling. It does not yet contain provider-generated video shots or an approved master export.

The production is 60 seconds at 24 fps (1,440 frames), with seven contiguous semantic stages. The regional shape-key controller expands the pectorals symmetrically, deltoids, traps, arms, lats, back, torso, quadriceps, calves, and overall body envelope. The camera widens gradually in response to the maximum active regional growth value, preserving the same lens and continuous spatial relationship. Stage boundaries do not create cuts or reset the deformation.

## Run it locally

Requirements: Blender 5.3+ and Python 3.10+. From the GEEHUB repository root:

```bash
python3 engine/video/render_project.py
```

This first renders the complete 60-second transformation at low resolution, so the entire growth passage can be judged rather than only its opening. It also saves the full-length editable scene to 04_COMPOSITES/Laboratory-Serum-60s.blend. Inspect the preview before committing to the full-resolution render.

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
- A fitted torso shell, training shorts and paired shoulder straps with matching timeline-driven deformation keys.
- A continuous camera orbit/push/pull that widens with the evolving silhouette while retaining its focal length.
- A face-preserving whole-body influence mask.
- An automatically generated `07_MANIFESTS/growth_measurements.json` report with evaluated mesh bounds at six checkpoints.
- A reusable Blender project and an H.264 MP4 render.

## Current limitations

This is an executable procedural prototype, not a finished Hulum's Cave-quality asset. The base is a neutral generated humanoid, not a source-fitted likeness. The deformation is spatially weighted shape-key expansion, not a full muscle simulation or corrective sculpt system. Physical cloth simulation/tearing, detailed face rigging, secondary soft-tissue dynamics, environmental breakage, and designed sound cues are not yet implemented in the Blender scene. The fitted wardrobe is a shape-key-driven prototype, not a cloth solver. The current local renderer supplies a simple low-frequency audio bed only through the separate GEEHUB engine route; this direct project renderer produces the Blender picture pass.

The project remains explicitly adult and fictional. Intimate anatomy is not modeled or rendered. Source media and identity-lock frames remain absent until a verified source is supplied and inspected.

The full-duration low-resolution preview is one acceptance gate, not the final production gate. The canonical image references are indexed in `production/IMAGE_LIBRARY_INDEX.json`; this project's selected subset is `07_MANIFESTS/reference_library.json`. The five pectoral controls are stored in `07_MANIFESTS/growth_profile.json` and validated against those reference IDs. The car-sequence variants have been visually compared, but their order is not approved as a measured growth progression. The local engine cannot query ChatGPT Library or Dropbox directly; export a selected image to the Dropbox-synced folder and stage it with `engine/video/stage_reference_image.py`.

The requested video provider is Grok Imagine Video, but no Grok/Weave generation connection is available in the current workspace. No paid model run has been launched; the Dropbox production specification requires explicit cost approval before generation. The project still needs at least two independent provider-generated shot files, a verified OTIO assembly and master export, and a Dropbox folder that can be reopened and checksum-verified. The intended Dropbox destination is `/GEEHUB/production/projects/hulums-lab-serum-60s`; it has not yet been provisioned. No rendered video or Dropbox delivery is claimed.
