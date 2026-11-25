# Luke Growth Morph — browser to Blender

1. Open [Luke Growth](./luke-growth-morph.html).
2. Adjust shoulders, traps, chest, arms, thighs, calves, and definition. Use **EXPORT STATE** to save `luke-growth-morph-state.json`.
3. Put that JSON beside the Blender script or use its full path in `GEEHUB_MORPH_STATE`.
4. Run Blender from the GEEHUB repository root:

```bash
GEEHUB_MORPH_STATE="./luke-growth-morph-state.json" blender --background --python engine/blender_luke_growth.py
```

This writes a native `.blend` scene and `growth_atmosphere.wav` into `geehub_luke_growth_output`.

To render the animated MP4 with the generated atmospheric audio bed:

```bash
GEEHUB_RENDER=1 GEEHUB_MORPH_STATE="./luke-growth-morph-state.json" blender --background --python engine/blender_luke_growth.py
```

Set `GEEHUB_OUTPUT` to change the output folder.

The current model is a procedural blocking character, not Luke's final identity mesh. The browser morph includes an overall stature control that lengthens the body and limbs while counter-scaling the identity landmarks so the head retains its size and recognizable proportions. The browser export controls regional mass targets plus stature. Blender must be installed locally; the repository commit itself does not execute a render.


## Library-grounded Luke source path — 2026-11-25

The Library now contains an explicit Luke before/after composition in **Neon Love Potion Muscle Transformation.png** (Library file ID `file_00000000915081f5b7e06f22fa8a8556`). Its inset establishes the smaller starting state and its main image establishes a much larger result; the composition labels the subject “Same Luke.” This is the first direct source pair to use for an identity-locked transformation test.

Additional Luke checkpoints are indexed in [the Library reference manifest](../library-import/reference-files.json) and visually analyzed in [the muscle-growth transformation analysis](../library-import/muscle-growth-transformation-analysis.md). They include Luke's Stage 3 → 4, Stage 5 → 6 and Stage 6 → 7 references, the massive baseline, and Stage 10's front/rear and detail views. Stage 8 and 9 are not present as inspected Luke source images; any generated intermediate states must be labelled as generated.

## Current implementation status

The browser morph is a Three.js procedural blockout with independent regional sliders, a five-second growth action, timeline interpolation, orbit/zoom, and JSON state export. The Blender script also builds a procedural stand-in from ellipsoids and tapered forms, animates regional scaling, and can render an MP4 when Blender is installed. Neither implementation currently loads the Library before/after images as image-conditioned source and target, nor does either use Luke's approved photographic face/body mesh. The neutral procedural head/body is a blocking model, not the requested finished transformation.

## Next production pass: source-driven transformation

1. **Source lock:** use the smaller Luke inset as the starting reference and the larger same-Luke image as the target. Keep the original images untouched and record their Library IDs in the shot manifest.
2. **Matched framing:** align crop, camera height, body orientation, stance, lighting and background before judging size change. Do not interpret a camera or perspective change as body growth.
3. **Intermediate keyframes:** create several identity-locked states between the two source endpoints. Keep them as generated derivatives, not observed Library evidence. The first test should use a fixed camera and full-body framing.
4. **Regional progression:** distribute growth across delts/traps, chest/ribcage, back/lats, biceps/triceps/forearms, abdomen, glutes, quads/hamstrings and calves. Joint positions, limb lengths, hands, feet, stance and balance must reconcile with each pass.
5. **Material response:** preserve the tank and shorts as garments with independent fit and construction. Update stretch, folds, seams, armholes, neckline, waistband and leg openings with the changing body; do not simply scale the clothing mesh with the body.
6. **Continuity review:** compare every generated keyframe against the starting face and the target face. Reject face drift, changing hair/beard, inconsistent limb proportions, disappearing joints, abrupt texture changes and background/camera jumps.
7. **Motion output:** interpolate the approved keyframes into a continuous take with frame stepping, playback, scrub and export. Do not substitute a crossfade between two static images for a true body transformation.

### Acceptance test

The first production shot is complete only when the viewer can watch Luke change continuously from the smaller Library inset into the larger same-Luke state in one stable full-body shot; his face remains recognizably the same; all major muscle groups grow in a coordinated sequence; joints, stance and clothing respond; and the resulting frames can be reviewed individually and exported. The current procedural blockout remains useful for testing parameter logic, but it does not pass this source-driven acceptance test.

## First Library-grounded animation profile

The first authored Luke profile is `engine/video/profiles/luke-library-transformation-profile.json`, with timeline `engine/video/profiles/luke-library-transformation-timeline.json`. It connects the Library before/after pair to an eight-second, 240-frame, 30 fps regional growth pass. Sixteen regions now have independent curves and Blender deformation fields, including separately controlled biceps, triceps, forearms, abdominals, glutes and hamstrings.

The profile is marked `procedural_first_pass`: its curve values are authoring controls rather than measurements inferred from the images. The new CI workflow checks Python compilation, profile/timeline consistency and curve sampling. Blender execution, fixed-camera render comparison, identity preservation and cloth response remain pending.


## Canonical render path — updated

The canonical eight-second / 240-frame production is **not** the older standalone `engine/blender_luke_growth.py` blockout. Use:

```bash
python3 engine/video/render_project.py --project production/projects/luke-library-transformation
```

This path uses the fused adult humanoid mesh in `engine/video/rigged_character.py`, sixteen regional deformation fields sampled by `engine/video/timeline_growth.py`, and separate fitted tank/shorts geometry generated by `engine/video/blender_scene.py`. The scene now also includes a fixed stylised facial continuity proxy: short light-brown curls, trimmed beard, eyes, brows, ears and nose. Those features are not an image-fitted Luke likeness; the actual identity fit remains a later production requirement.

The older `engine/blender_luke_growth.py` is retained as a lightweight procedural fallback. It now reads the same authored profile and uses the profile's 30 fps / 240-frame timebase, but it is not the canonical fused-mesh renderer.

The validation workflow now compiles the canonical Blender scene and rig source, runs renderer-independent curve/profile tests, and validates the project manifests. A successful manifest check does not constitute a Blender render or visual approval.
