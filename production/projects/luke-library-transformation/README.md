# Luke — Library Before/After Muscle-Growth Transformation

This is the first renderable GEEHUB production project built directly around Luke's Library before/after reference. It is configured as one fixed-camera, full-body, eight-second take at 30 fps (240 frames).

## Source

The source endpoint pair is contained in the same Library image:

- `Neon Love Potion Muscle Transformation.png`
- Library file ID: `file_00000000915081f5b7e06f22fa8a8556`
- Role: smaller Luke inset → larger same-Luke result
- Supporting multi-angle reference: `Superbodybuilder Gym Transformation Montage.png` (Library file ID `file_00000000f89481f583d665c82eea2080`); use for rear/side pose and surface detail, with identity marked as a visual-continuity candidate rather than confirmed.

The image is a static before/after composition, not motion footage. The timing and intermediate states are authored procedural interpolation, not extracted source motion.

## Render

From the GEEHUB repository root, with Blender 4.x installed:

```bash
python3 engine/video/render_project.py --project production/projects/luke-library-transformation
```

This creates a low-resolution eight-second preview and an editable Blender scene. For the full-resolution master after reviewing the preview:

```bash
python3 engine/video/render_project.py --project production/projects/luke-library-transformation --preview-seconds 0
```

## Animation

The timeline has six continuous semantic intervals: baseline, upper-body onset, arms/back, torso/lower-body catch-up, whole-body integration, and final hold. Sixteen regional curves drive independent shape keys on the unified procedural body and the separate garment meshes.

The camera is fixed and frontal. The wardrobe is a grey fitted tank and dark short shorts. Clothing is currently a geometry/tension proxy, not a cloth simulation.

## Validation

Run renderer-independent curve tests:

```bash
python3 -m unittest discover -s engine/video/tests -p "test_growth_curves.py" -v
```

Run project manifest validation without Blender:

```bash
python3 engine/video/render_project.py --project production/projects/luke-library-transformation --validate-only
```

The GitHub Actions workflow also compiles the renderer modules and checks the profile/timeline contract.

## Current limitations

The rigged character is still a neutral procedural base, not a fitted Luke likeness. The first render can validate that the body geometry changes continuously and that the controls work; it cannot yet pass the identity-lock acceptance test. Source-conditioned facial fitting, anatomical corrective shapes, cloth simulation and actual Blender render inspection remain required. Do not label the blockout render as a finished Luke transformation.
