# GEEHUB Growth Study 001 — Modular Appendage System

Status: V2.1 preparation pass. This document defines the next geometry and rigging pass; it does not claim that Blender has executed or that the appendage meshes are complete.

## Reference direction

Use the Library image set as proportion and surface references, not as literal mesh blueprints:

- `Massive Baseline: Gym Giant Portrait.png` — full-body silhouette, broad shoulder-to-hip relationship, hand scale, long readable limbs, and large feet in a neutral standing pose.
- `Giant Bodybuilder in Industrial Gym.png` — low-angle mass distribution, shoulder/arm/forearm continuity, thigh-to-calf volume, and ground contact.
- `Blue Giant in the Cool-Toned Gym.png` — Joey's blue-green skin response, broad chest and shoulder mass, relaxed hands, and the way the forearm transitions into the palm.
- `Dark Blue Joey in the Industrial Gym.png` — deeper blue lighting and the large-scale torso/arm relationship.
- `Blue Giant in the Industrial Gym.png` — teal surface response, beard/head continuity, and a second low-angle proportion check.

The photographs establish silhouette, proportion, pose, material response, and visual identity. They do not provide hidden anatomy, exact measurements, or a rig. Preserve identity and pose continuity; do not use camera perspective as a substitute for actual geometry scale.

## Construction principle

Keep two representations available. The visible character uses a continuous skin surface where adjacent anatomical regions need to read as one body. The hidden source kit preserves named replaceable components so an arm, forearm, hand, thigh, calf, palm, finger, foot, or toe can be rebuilt without losing the entire figure. The V2.1 script now preserves the pre-fusion source volumes in `SOURCE_ANATOMY_MODULES — replaceable kit`; this is a geometry source archive, not yet a finished modular export system.

Appendages are not generic tapered tubes. Each limb is a connected sequence of volumes with distinct silhouette responsibilities, joint landmarks, and local controls. Keep the shoulder/deltoid transition, upper arm, elbow, forearm, wrist, palm, and digits readable. Likewise preserve hip/thigh, knee, calf, ankle, foot arch, heel, ball, and toes. The largest muscle masses should remain legible without turning the joints into swollen uninterrupted cylinders.

## Hand modules

Create each hand as a palm module plus five independently replaceable digit chains. The palm must carry the broad metacarpal mass and a clear wrist transition. Fingers should have a proximal and distal segment at minimum, with the thumb on an opposing plane and a different sweep from the four fingers. The index, middle, ring, and little fingers should have individual lengths and natural spacing; avoid identical parallel capsules. The current rig has two-segment non-deforming placeholders named `thumb_01/02`, `index_01/02`, `middle_01/02`, `ring_01/02`, and `pinky_01/02` for each side. Replace the placeholders with actual deform controls only after the digit meshes exist and their pivots have been visually checked.

## Foot modules

Build the foot as heel, arch, midfoot, ball, and toe modules with a continuous skin bridge in the final render. The big toe must have its own direction and broader base; the remaining toes step down in length and volume. Preserve the heel-to-ankle transition and the forefoot spread. The current rig has two-segment non-deforming placeholders for the big toe and four lesser toes on each side. They are layout guides only until geometry, weights, and contact poses are validated.

## Rigging and growth

Keep the existing master `growth` property and staged progression. Growth should affect the limb's cross-section and muscle volumes without arbitrarily lengthening every segment or changing the camera. Shoulder, upper arm, forearm, thigh, and calf growth remain separately tunable. Hand and foot scale should follow the wrist/ankle and palm/sole proportions, while finger and toe proportions remain character-specific. Do not scale every digit uniformly: retain the thumb's opposition, finger taper, toe hierarchy, and joint spacing.

Use the existing three-nearest-bone blend only as an initial weighting heuristic. For the appendage pass, paint or calculate weights with explicit joint regions and influence falloff. Add corrective shapes for shoulder abduction, elbow flexion, wrist bend, hip flexion, knee flexion, ankle flexion, thumb opposition, and finger curl. Test the neutral pose and at least one bent pose at every growth stage. Preserve volume at elbows, wrists, knees, and ankles; inspect for pinching, collapsing, detached seams, and self-intersection.

## Validation gates

1. Open the V2.1 project in Blender 4.x and verify the hidden source collection can be unhidden, selected, duplicated, and replaced without altering the visible fused body.
2. Build the hand and foot modules at the reference silhouette scale; inspect front, side, three-quarter, and low-angle views.
3. Bind digit geometry to the staged controls; replace non-deforming placeholders only after pivot placement is correct.
4. Validate wrist, elbow, ankle, knee, thumb, finger, and toe deformation in rest, activation, expansion, and full-study frames.
5. Compare the Library references under a fixed camera and lighting rig. Keep the camera fixed when judging physical growth.
6. Read saved scene and render outputs back for integrity. Record Blender execution and render validation separately from Python syntax checks.

## Current boundary

The repository has not yet run this V2.1 scene in Blender. Python syntax can be checked independently, but voxel fusion, hidden collection behavior, digit geometry, deformation quality, material response, and renders remain pending visual validation. Do not describe the appendage system as production-ready until those checks pass.
