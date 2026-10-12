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

The current model is a procedural blocking character, not Luke's final identity mesh. The head is kept unscaled while the body expands. The browser export controls the production animation's regional target multipliers. Blender must be installed locally; the repository commit itself does not execute a render.
