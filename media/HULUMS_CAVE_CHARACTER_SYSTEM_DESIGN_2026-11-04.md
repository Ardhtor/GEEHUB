# Hulum's Cave — Character System Design Pass
Date: 2026-11-04
Status: design specification; implementation not yet validated

## Purpose

Translate the first visual readings and the supplied rig/deformation reference into a practical GEEHUB character system. The target is a reusable, identity-stable adult CG performer whose pose, proportions, growth, expression, camera, lighting and wardrobe can be authored independently. This is a creator-facing reconstruction, not a claim to reproduce Hulum's private Maya project or toolchain.

## Source register and confidence

Dropbox remains the source of truth. The following canonical source records were located:

| Dropbox source | File size | Last modified |
|---|---:|---|
| `/SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4` | 1,685,453 bytes | 2026-10-31 |
| `/WhatsApp Video 2026-10-31 at 02.10.14.mp4` | 1,045,260 bytes | 2026-10-31 |

Dropbox also contains same-sized copies with ` (1)` suffixes, modified 2026-11-02. Equal file sizes do not prove byte identity; compare content hashes or decoded media metadata before deduplicating. Preserve all four records until that comparison is available. The two chat-uploaded clips previously inspected are six seconds, 24 fps, 448 × 672; do not assume without media comparison that they are byte-identical to either Dropbox original.

Direct visual observations remain limited to the supplied clips and sampled frames: frontal full-body presentation, repeated flex/arms-open pose changes, a late oblique turn in one clip, cool blue-green skin against warm amber industrial light, dark shorts, and a low frontal camera. The footage does not establish continuous growth or reveal the original rig. Pipeline-era claims and Maya node architecture remain reported or inferred, not verified.

## Audit of the current GEEHUB rig foundation

The current `engine/video/rigged_character.py` is a useful first unified-surface experiment: fused metaball anatomy, a deform skeleton, and normalized distance-based weights blended across the three nearest bone segments.

It is not yet a production character rig. The current code has no animator-facing FK/IK controls, no pole-vector or foot controls, no explicit twist helpers, no pose-corrective shape library, and no independent regional growth controls. Its growth pass keys scale on the torso chain and limb bones; this can change joint spacing and volume in ways that are not equivalent to controlled muscle growth. Distance-only weighting also needs deformation tests around shoulder caps, armpits, elbows, hips, knees and the groin before it is trusted. The current fused surface is a neutral anatomical blockout, not a finished likeness or final sculpt.

The renderer's `character_model: "rigged"` option is correctly isolated behind a manifest switch. Keep it opt-in until the tests below pass.

## Character data model

Use one persistent character record with these independent channels:

- **Identity:** stable mesh/surface, head proportions, face details, skin material, persistent asset ID and revision history.
- **Proportions:** normalized anatomical measurements, stored separately from pose and growth.
- **Pose:** named skeletal state and animation curves; pose edits never write to growth values.
- **Growth:** a scalar master driver plus regional values and sculpted corrective targets; growth never changes identity or camera.
- **Expression:** face controls and gaze, independently keyable.
- **Wardrobe:** garment meshes, fit parameters, cloth simulation settings and collision proxies.
- **Shot:** camera, focal length, framing, lens height, camera path and lighting.
- **Provenance:** Dropbox source path/ID, original filename, media metadata, analysis version, selected ranges, derived asset IDs and output lineage.

Each channel should have its own manifest section and revision hash. A render report must state which channels changed between versions.

## Proportion landmark model

Measure in a neutral A-pose or relaxed T-pose with the camera orthographic or calibrated. Store ratios relative to total standing height (H), not raw pixels:

- shoulder breadth / H
- chest breadth and depth / H
- waist breadth / H
- pelvis breadth / H
- upper-arm and forearm length / H
- arm span / H
- thigh and lower-leg length / H
- thigh, calf and upper-arm circumference / H
- head height / H

Record left and right values separately where asymmetry is visible. Use at least front, side and three-quarter views. For source comparison, normalize scale and align pelvis, sternum and head landmarks before measuring silhouette differences. A single frontal frame cannot establish depth or circumference.

## Deformation architecture

### Stage A — structural rig
Build a clean hierarchy with root, pelvis, multi-joint spine, chest, neck, head, clavicles, upper arms, forearms, hands, thighs, shins and feet. Add non-deforming animator controls for root, torso, head, hands and feet. Keep deform bones separate from control objects. Add IK/FK switching for arms and legs, pole-vector controls, foot roll and wrist/ankle twist distribution.

### Stage B — skinning
Use normalized heat/distance weights only as an initial seed. Add explicit influence regions and weight-paint validation. Use dual-quaternion or preserve-volume deformation where appropriate, but do not rely on it as a substitute for corrective shapes. Shoulder, hip and elbow transitions require dedicated inspection poses.

### Stage C — corrective library
Create pose-space correctives for raised arms, double-biceps, arms-open, hands-at-waist, elbow flexion, shoulder protraction, hip flexion, knee bend and three-quarter torso twist. Correctives must be driven by pose state, not growth. Maintain a neutral rest shape and a small number of readable, versioned sculpt targets before adding complexity.

### Stage D — growth system
Use a normalized master driver `G` and region weights, not uniform bone scaling. Initial regions: deltoids, pectorals, upper back, arms, forearms, abdomen, gluteal mass, thighs and calves. Each regional value is bounded and interpolates between authored sculpt targets. Growth changes cross-sectional volume and selected silhouette dimensions while preserving joint centers, limb lengths and foot contact unless a separately authored stature change is requested.

Growth interpolation should use a monotonic curve with a restrained ease-in / ease-out. A hold is a hold: once a stage is reached, the character remains at that exact state until a new event explicitly changes it. Do not let a pose transition silently advance the growth driver.

### Stage E — surface and secondary motion
Only after the base mesh deforms correctly, add muscle-group definition, subtle skin response, garment fit, cloth tension and secondary motion. Cloth should be a separate simulation layer with body collision proxies. Do not add tearing, fluid or exaggerated soft-body behaviour unless the shot specifically calls for it and the simulation is stable.

## Pose grammar from the current references

Create reusable pose states for: relaxed frontal stance; arms-open transition; double-biceps flex; hands-at-waist reset; sustained flex hold; three-quarter turn. These are animation presets, not claims that the subject's exact joint angles have been recovered. Record pose timing separately from camera movement and growth.

For six-second vertical studies, preserve the source's compact rhythm: establish the frontal silhouette, make one clear pose transition, hold long enough to read the anatomy, then optionally reveal depth with a controlled three-quarter turn. Keep the camera low and stable before introducing any movement. Avoid adding a growth event unless the source or brief actually calls for one.

## Reference-analysis upgrade

The current `analyze_source.py` measures frame-change energy and coarse image-space motion; it does not track anatomy or estimate camera motion. Extend it in layers:

1. **Media facts:** probe exact duration, frame rate, dimensions, codec and rotation metadata; record a SHA-256 for each staged source.
2. **Shot segmentation:** detect cuts and fades, but retain confidence and allow manual correction.
3. **Pose landmarks:** run a person/pose landmark model on sampled frames; store confidence per joint and never infer hidden joints as observed.
4. **Camera normalization:** estimate framing and scale changes; flag clips where camera movement makes silhouette comparison unreliable.
5. **Silhouette measurements:** compare aligned masks and normalized landmarks across comparable poses.
6. **Human review:** annotate each interval as `POSE`, `CAMERA_CROP`, `ORIENTATION`, `EXPRESSION`, `TRUE_SHAPE_CHANGE` or `UNCERTAIN`; preserve reviewer notes and evidence frames.

Automated classification must remain advisory. Only call a change `TRUE_SHAPE_CHANGE` when pose, camera, crop and orientation differences have been accounted for.

## Manifest direction

The next manifest revision should support a stable `character_id`, `character_revision`, `pose_sequence`, `growth_profile`, `proportion_profile`, `wardrobe_profile`, and `source_reference`. Keep the existing `character_model: "rigged"` opt-in. A render should fail early when a requested pose or growth profile is missing, rather than silently substituting an unrelated default.

Illustrative structure (schema proposal, not yet implemented):

```json
{
  "character_model": "rigged",
  "character": {
    "id": "subject-hc-01",
    "revision": "base-a",
    "pose_sequence": "front-flex-turn-v1",
    "growth_profile": "phase-04-hold",
    "proportion_profile": "source-measured-v1",
    "wardrobe_profile": "graphite-shorts-v1"
  },
  "source_reference": {
    "dropbox_path": "/SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4",
    "selected_range": [0.0, 6.0]
  }
}
```

## Acceptance tests before production use

1. Neutral front/side/back turntable: no mesh holes, spikes, pinching or unexpected asymmetry.
2. Arms raised, double-biceps and arms-open: shoulder and armpit volume remains continuous.
3. Elbow and knee flexion: no collapsing or candy-wrapper twisting.
4. Hip flexion and three-quarter turn: pelvis, gluteal and thigh transitions remain coherent.
5. Growth at fixed pose: only intended regional dimensions change; joint centers, limb lengths, camera and floor contact remain stable.
6. Pose change at fixed growth: silhouette volume remains constant apart from articulation.
7. Growth hold: final values remain unchanged for the remainder of the shot.
8. Wardrobe test: shorts remain fitted and do not intersect the body in the flex and turn poses.
9. Render review: front, side and three-quarter frames at the start, midpoint and hold are compared side by side.
10. Provenance test: every output links back to the exact Dropbox source record and staged-file hash.

## Next build order

First compare the Dropbox originals and suffixed copies by content hash and media probe. Then add a source manifest and a structured annotation format. Next, repair and validate the rig at fixed size and fixed pose before implementing regional growth. Only then add pose correctives, wardrobe behaviour and the Hulum-style six-second shot preset. Keep every stage opt-in until its acceptance tests pass.

## Explicit non-claims

This design does not recover Hulum's private Maya rig, proprietary settings, generative model, LoRA, or exact production pipeline. The supplied clips do not prove continuous growth, cloth tearing, or a specific simulation method. The architecture above is GEEHUB's proposed implementation, informed by visible results and the user's supplied technical hypotheses.
