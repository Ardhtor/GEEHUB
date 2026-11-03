# Hulum's Cave — First Video Readings
Date: 2026-11-03
Status: First-pass visual observations from two supplied source clips; not a claim about the creator's private rig or node graph.

## Sources inspected

| Source | Duration | Frame rate | Frame size | Sampling |
|---|---:|---:|---:|---|
| `22.mp4` | 6.04 s | 24 fps | 448 × 672 | 8 evenly spaced frames |
| `3333.mp4` | 6.04 s | 24 fps | 448 × 672 | 8 evenly spaced frames |

Both are short vertical-format CG character clips. The visual samples show the same broad character design and warm industrial-gym setting. They appear related, but should remain separate source records until a full-frame comparison establishes whether they are alternate edits, related generations, or different takes.

## Reading 01 — Shared character construction

The subject is an adult, bald, bearded male character with a broad jaw, compact head relative to body mass, very large deltoids and upper arms, a deep and segmented torso, broad pectorals, thick quadriceps, and heavy calves. The body is stylized and deliberately pushed beyond ordinary bodybuilding proportions. Skin is rendered in a cool blue-green range; shorts are dark grey and remain the main clothing anchor.

The silhouette reads immediately from a low camera position: shoulder width and chest mass dominate the upper outline; the waist narrows sharply; the thighs carry substantial volume. The legs are not an afterthought. Their size and definition are essential to the full-body scale impression.

The surface combines smooth, rounded muscle volumes with sharply separated anatomical planes. Highlights describe the large forms; fine surface detail is secondary. The warm amber backlight and darker industrial-gym background separate the cool body from the room.

## Reading 02 — Clip 22

The clip opens on a full-body, front-facing stance with arms lowered. The character then raises and spreads the arms, moves into a double-biceps presentation, changes expression, and cycles through further flexing poses. The camera remains predominantly low and frontal; the full-body silhouette is the main event.

The pose sequence is readable because the major body masses remain stable while the arms and shoulders change configuration. The clip behaves more like a compact pose showcase than a growth passage. Across the sampled frames, there is no reliable evidence of progressive volumetric expansion, clothing stress, tearing, or environmental response. Do not label this clip as a growth animation without a closer frame-by-frame measurement.

Production lesson: build a dependable neutral full-body pose first, then make flexing a distinct animation layer. Shoulder rotation, elbow bend, wrist placement, chest presentation, and head expression should be independently controllable without changing the character's underlying proportions.

## Reading 03 — Clip 3333

The opening is closely related to clip 22: frontal full-body stance, arms lowered, then a gradual move into a broad flexing display. The middle emphasizes raised arms and upper-body mass. Near the end, the character shifts into a more oblique / side-oriented pose, giving the viewer a different read of chest depth, arm thickness, waist-to-hip transition, and glute / thigh volume.

This ending is the most useful difference from clip 22. It demonstrates that a single character design can be re-read through a change of orientation rather than a redesign. Preserve the same head, shoulder span, torso depth, waist, shorts, and leg proportions through the turn.

As with clip 22, the sampled sequence is primarily posing. No verified continuous growth curve is visible in these samples.

## Reading 04 — Shared staging and image language

- Camera: low, frontal, full-body emphasis; framing tightens or crops during raised-arm poses.
- Environment: industrial gym interior, dark structure, warm amber practical lights and backlight.
- Contrast: cool blue-green character against warm background.
- Clothing: plain dark-grey shorts; no observed fabric simulation or damage in these clips.
- Motion: deliberate pose transitions and held displays; the body is presented for inspection.
- Composition: the figure occupies most of the vertical frame; the room provides scale and atmosphere without competing with the subject.

## GEEHUB implementation translation

Separate the production problem into three layers:

`character = identity + proportion + surface`
`performance = pose + expression + timing`
`shot = camera + light + environment`

1. Lock a reusable character identity and proportion sheet before animation.
2. Store neutral, front-flex, double-biceps, and oblique-turn pose states as reusable controls.
3. Keep pose controls separate from growth controls. A flex must not accidentally inflate the body; a growth pass must not change the face or costume.
4. Build regional growth as a continuous parameter with intermediate shapes, not a jump between unrelated body models.
5. Validate the silhouette from frontal and oblique views. The side / three-quarter view is needed to check depth, not just width.
6. Keep the amber gym lighting and cool body treatment as a reproducible look preset, while allowing other GEEHUB environments to inherit the character asset.
7. Record clothing behavior only when it is actually visible. These two clips do not establish a cloth-stress or tear system.

## Confidence and limits

High confidence: visible character design, pose order at sampled points, frame dimensions, frame rate, duration, broad camera and lighting language.

Medium confidence: relationship between the two clips and the exact continuity of the underlying character asset; only sampled frames have been compared here.

Not established: Maya use, skeleton hierarchy, blendShape layout, skinning method, simulation stack, AI model, LoRA, or creator workflow. Those remain hypotheses until supported by source material or direct creator documentation.

## Next reading

Inspect all frames of both clips, compare silhouette landmarks over time, and classify each interval as pose change, camera / crop change, or genuine shape change. Then compare against the Dropbox source library and add each original file's Dropbox path / ID before treating the local copies as canonical production sources.


## Second pass — denser temporal read

A second contact-sheet pass sampled 24 evenly spaced frames per clip (approximately every 0.26 seconds). This refines the initial eight-frame reading:

### Clip 22 — timing notes
- 0.00–0.80 s: frontal stance; arms travel outward from the lowered position.
- 1.04–2.61 s: arms rise into a wide / double-biceps presentation, with small changes in head angle and expression.
- 2.87–3.65 s: arms lower and hands move toward the waist; the pose becomes a compact hands-at-hips display.
- 3.91–4.43 s: arms reopen and rise again.
- 4.70–6.04 s: returns to the double-biceps presentation and holds it through the end.
- The repeated return to the same flex is a deliberate pose loop / reprise. No stable monotonic increase in body dimensions is apparent.

### Clip 3333 — timing notes
- 0.00–1.30 s: frontal stance with a gradual arm and torso presentation change.
- 1.57–2.35 s: arms spread, then rise toward the flex.
- 2.61–4.43 s: sustained double-biceps display; framing is tighter and the upper body dominates.
- 4.70–4.96 s: arms open / lower as the character resets.
- 5.22–6.04 s: turns into an oblique and then near-side profile, exposing torso depth and the relationship between chest, arm, waist, hip and thigh.
- The final turn is a view-change, not a demonstrated growth event.

### Temporal continuity observations
The clips preserve a recognizable overall character design, clothing, color treatment and gym environment. At the same time, sampled frames show small variations in face, expression, hand / forearm placement, muscle contour and framing. Treat these as image-sequence continuity tolerances to study, not proof of a shared deform rig. The character's apparent size and mass can change with arm position, camera crop and orientation; future measurements must normalize for those factors before classifying growth.

### Updated practical rule
For GEEHUB reference analysis, tag every interval with one or more explicit labels:
`POSE`, `CAMERA_CROP`, `ORIENTATION`, `EXPRESSION`, `TRUE_SHAPE_CHANGE`, `UNCERTAIN`.
Only use `TRUE_SHAPE_CHANGE` when comparable landmarks and silhouette regions change after accounting for pose, perspective and framing.
