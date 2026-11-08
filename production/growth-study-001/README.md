# GEEHUB Growth Study 001

The first procedural character-and-environment prototype. This pass is a reusable blockout designed to make four production questions independently testable: body-volume rigging, controlled growth progression, studio lighting, and material response.

## Files
- `geehub_growth_study.py` — procedural Blender scene generator.
- `SCENE_SPEC.json` — scene hierarchy, controls, stages, and production boundaries.

## Build
Run the Python file from Blender's Scripting workspace or with `blender --background --python geehub_growth_study.py`. It creates a Blender project and two preview renders. Target environment is Blender 4.x. The source script has been Python syntax-checked; Blender execution and render output remain unverified in this environment because Blender is not installed here.

## Rig and progression
The adult male study figure is assembled from named, replaceable anatomy volumes. Each volume uses a one-bone vertex group and an armature modifier. A master custom property, `growth`, drives cross-section scaling on the torso, arms, forearms, thighs, and calves. Four timeline keys mark rest, activation, expansion, and the full study stage. This is a blockout approach, not a final deformation rig; joint continuity and corrective shapes are explicit next-pass work.

## Lighting and materials
The scene has separate warm key, cool fill, rear rim, and top-strip lights. A subtle volume object can be disabled for an A/B comparison. Skin and training fabric use distinct procedural material networks with intentionally restrained surface variation. The shader values are placeholders for testing, not recovered settings from Hulum's Cave.

## Research-to-production connection
The architecture is informed by public creator notes in the Hulum's Cave research corpus:
- The creator described experimenting with body movement using "pinning/locking body parts" in the Bedroom Growth technical-study post: https://www.patreon.com/hulumscave/posts/bedroom-growth-84293264. This prototype starts with named deformation sections so future pinning, constraint, or corrective-shape tests can be isolated. It does not claim to reproduce the creator's implementation.
- The creator described atmosphere volume as improving realism while increasing render time: https://www.patreon.com/hulumscave/posts/atmosphere-77922144. The scene therefore makes volume an optional, separately testable layer.
- A production update described moving a devil and throne set into Maya, ready for animation: https://www.patreon.com/hulumscave/posts/next-scene-is-90663150. The scene uses separate environment and character collections so sets and lighting can be reused.
- A separate update described choosing a night-time look for Laboratory Growth: https://www.patreon.com/hulumscave/posts/i-decided-to-go-89020199. The current studio uses controlled warm/cool separation as a starting lighting study, not a recreation of that scene.

## Next pass
1. Run in Blender and inspect the two preview frames.
2. Repair silhouette gaps and joint discontinuities; replace overlapping ellipsoids with connected meshes where necessary.
3. Test key/fill/rim ratios with and without the volume object.
4. Replace placeholder procedural skin texture with a layered material only after light response is established.
5. Add motion, camera continuity, and a frame-by-frame comparison record.
