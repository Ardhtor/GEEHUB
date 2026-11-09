# GEEHUB Growth Study 001 — Modular Appendage System

Status: V2.2 geometry pass authored. The script now creates twenty separate tapered digit meshes and weights each to its two-segment chain. Blender execution, mesh appearance, joint motion, and contact behavior remain unvalidated.

## Reference direction

Use the Library image set as proportion and surface references, not as literal mesh blueprints:

- `Massive Baseline: Gym Giant Portrait.png` — full-body silhouette, broad shoulder-to-hip relationship, hand scale, long readable limbs, and large feet in a neutral standing pose.
- `Giant Bodybuilder in Industrial Gym.png` — low-angle mass distribution, shoulder/arm/forearm continuity, thigh-to-calf volume, and ground contact.
- `Blue Giant in the Cool-Toned Gym.png` — Joey's blue-green skin response, broad chest and shoulder mass, relaxed hands, and the way the forearm transitions into the palm.
- `Dark Blue Joey in the Industrial Gym.png` — deeper blue lighting and the large-scale torso/arm relationship.
- `Blue Giant in the Industrial Gym.png` — teal surface response, beard/head continuity, and a second low-angle proportion check.

The photographs establish silhouette, proportion, pose, material response, and visual identity. They do not provide hidden anatomy, exact measurements, or a rig. Preserve identity and pose continuity; do not use camera perspective as a substitute for actual geometry scale.

## Construction principle

Keep two representations available. The visible character uses a continuous skin surface where adjacent anatomical regions need to read as one body. The hidden source kit preserves named replaceable components so an arm, forearm, hand, thigh, calf, palm, finger, foot, or toe can be rebuilt without losing the entire figure. The V2.2 script now preserves the pre-fusion source volumes in `SOURCE_ANATOMY_MODULES — replaceable kit`; this is a geometry source archive, not yet a finished modular export system.

Appendages are not generic tapered tubes. Each limb is a connected sequence of volumes with distinct silhouette responsibilities, joint landmarks, and local controls. Keep the shoulder/deltoid transition, upper arm, elbow, forearm, wrist, palm, and digits readable. Likewise preserve hip/thigh, knee, calf, ankle, foot arch, heel, ball, and toes. The largest muscle masses should remain legible without turning the joints into swollen uninterrupted cylinders.

## Hand modules

Create each hand as a palm module plus five independently replaceable digit chains. The palm must carry the broad metacarpal mass and a clear wrist transition. Fingers should have a proximal and distal segment at minimum, with the thumb on an opposing plane and a different sweep from the four fingers. The index, middle, ring, and little fingers should have individual lengths and natural spacing; avoid identical parallel capsules. The current rig has two-segment deform controls named `thumb_01/02`, `index_01/02`, `middle_01/02`, `ring_01/02`, and `pinky_01/02` for each side. The script now creates separate tapered finger meshes weighted across the proximal and distal controls. Inspect the pivots and the palm seam in Blender before accepting the result.

## Foot modules

Build the foot as heel, arch, midfoot, ball, and toe modules with a continuous skin bridge in the final render. The big toe must have its own direction and broader base; the remaining toes step down in length and volume. Preserve the heel-to-ankle transition and the forefoot spread. The script now creates separate tapered toe meshes, each weighted across its two-segment chain. They remain provisional until the toe spread, sole seam, and ground-contact poses are checked.

## Rigging and growth

Keep the existing master `growth` property and staged progression. Growth should affect the limb's cross-section and muscle volumes without arbitrarily lengthening every segment or changing the camera. Shoulder, upper arm, forearm, thigh, and calf growth remain separately tunable. Hand and foot scale should follow the wrist/ankle and palm/sole proportions, while finger and toe proportions remain character-specific. Do not scale every digit uniformly: retain the thumb's opposition, finger taper, toe hierarchy, and joint spacing.

Use the existing three-nearest-bone blend only as an initial weighting heuristic. For the appendage pass, paint or calculate weights with explicit joint regions and influence falloff. Add corrective shapes for shoulder abduction, elbow flexion, wrist bend, hip flexion, knee flexion, ankle flexion, thumb opposition, and finger curl. Test the neutral pose and at least one bent pose at every growth stage. Preserve volume at elbows, wrists, knees, and ankles; inspect for pinching, collapsing, detached seams, and self-intersection.

## Validation gates

1. Open the V2.2 project in Blender 4.x and verify the hidden source collection can be unhidden, selected, duplicated, and replaced without altering the visible fused body.
2. Inspect the generated hand and foot digit meshes at the reference silhouette scale; check front, side, three-quarter, and low-angle views.
3. Check the existing digit weights and bone pivots; correct the joint blend where curling or spreading causes pinching.
4. Validate wrist, elbow, ankle, knee, thumb, finger, and toe deformation in rest, activation, expansion, and full-study frames.
5. Compare the Library references under a fixed camera and lighting rig. Keep the camera fixed when judging physical growth.
6. Read saved scene and render outputs back for integrity. Record Blender execution and render validation separately from Python syntax checks.

## Current boundary

The repository has not yet run this V2.2 scene in Blender. Python syntax can be checked independently, but voxel fusion, hidden collection behavior, digit geometry, deformation quality, material response, and renders remain pending visual validation. Do not describe the appendage system as production-ready until those checks pass.


## V2.2 additions

The procedural builder now creates twenty individually named tapered digit meshes: thumb, index, middle, ring, and pinky on each hand; big toe and four lesser toes on each foot. Each mesh has a proximal and distal vertex group, with weights blending through the joint band. The corresponding two-bone chains are deforming bones. The palm and the foot body remain part of the fused body surface, so digit geometry is modular without leaving a detached wrist or ankle assembly.

The hand layout gives the thumb an opposing sweep and varies each finger's reach and taper. The toe layout gives the big toe a distinct medial position and length hierarchy across the remaining toes. These are authored proportion guides based on the named Library photographs, not measured anatomy from those images. The first Blender inspection must check that the digits emerge cleanly from the palm/forefoot, do not intersect one another, and retain natural spacing at all four growth stages.

Validation must include individual finger curl, finger spread, thumb opposition, toe flexion, flat-foot contact, and a relaxed hand pose. The connected torso/limb skin weights remain a separate heuristic and should not be considered solved by adding digit geometry.
