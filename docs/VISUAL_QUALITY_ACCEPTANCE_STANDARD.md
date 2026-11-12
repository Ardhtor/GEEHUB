# GEEHUB Visual Quality Acceptance Standard

Status: active production standard
Authority: user-supplied attached visual reference; source-led visual review
Purpose: ensure that GEEHUB's finished visual output reaches the fidelity, finish, and continuity expected by the supplied reference. The reference is an acceptance benchmark, not merely an aesthetic suggestion.

## Governing rule

A visual asset is not production-ready because it is technically valid, described in detail, or recognizably related to a prompt. It must hold up beside the supplied reference. The source image or clip governs identity, silhouette, pose, movement, camera, lighting, materials, and the degree of finish wherever those properties are visible.

Do not substitute a generic muscular character, a rough anatomical blockout, a poster-like approximation, or a text-heavy interface for the requested visual result. A strong concept is not a finished visual.

## Reference handling

The attached Video 6 reference is treated as a short portrait performance benchmark. Its recorded working metadata is 6.04 seconds, 24 fps, portrait framing. Preserve the original attachment and its source identity. Do not assume that it is byte-identical to Dropbox sources or to the Hulum's Cave clips 22.mp4 and 3333.mp4; compare hashes and decoded media metadata before merging source records.

For each review, record:
- exact source filename or Library file ID;
- source frame or timecode;
- the visible subject, pose, camera and lighting state;
- what must remain continuous;
- what the new output changes;
- any uncertainty that prevents a fair comparison.

The benchmark clip's pose sequence is a performance reference, not automatic permission to invent growth. Pose change, camera change, orientation change, and genuine shape change must remain separately labelled.

## Visual acceptance gates

Every important character render, animation pass, environment image, and final shot is reviewed against the applicable gates below. Mark each gate PASS, REVISE, or NOT APPLICABLE, with a frame or image reference supporting the decision.

### 1. Identity and continuity

- The same recognizable character persists across views, poses, frames, and revisions.
- Face shape, head-to-body relationship, hair or facial hair, skin tone, and other established identity features do not drift without an explicit design change.
- Character identity is not inferred from a filename alone.
- Separate characters and source sequences are not merged merely because they share a style or body type.

### 2. Anatomy and silhouette

- The full-body silhouette reads cleanly at the reference camera distance.
- Shoulder span, chest depth, waist, pelvis, arms, forearms, thighs, calves, head scale, and limb lengths preserve their established relationships.
- Muscle volumes connect plausibly through shoulders, armpits, elbows, hips, knees, and other deformation zones.
- A low camera's perspective exaggeration is not mistaken for a change in anatomy.
- Front, side, and three-quarter checks are used where depth or circumference matters.

### 3. Pose and performance

- Pose transitions reproduce the reference's readable order, timing, and holds where the brief calls for a match.
- Feet, balance, hands, wrists, elbows, shoulders, and torso orientation remain coherent through motion.
- A flex does not silently alter the growth state; growth does not silently alter the pose.
- Motion has deliberate starts, transitions, holds, and resets rather than arbitrary interpolation.
- The final sequence is reviewed as motion, not only as a collection of attractive stills.

### 4. Surface and material finish

- Skin has coherent shading, texture, specular response, and anatomical definition at the intended output resolution.
- Muscle forms are sculpted and integrated, not assembled from visibly disconnected primitives.
- Clothing has believable fit, folds, tension, and contact with the body.
- No obvious mesh intersections, broken joints, melted contours, texture seams, or procedural artifacts remain in the final view.
- Fine detail supports the large forms; it does not conceal weak anatomy.

### 5. Camera, lighting, and composition

- Camera height, lens perspective, subject scale, framing, and orientation are intentionally matched or deliberately varied.
- The subject remains the visual focus; the environment supports scale and presence without competing unnecessarily.
- Light direction, contrast, color separation, shadow quality, and reflections are controlled rather than accidental.
- The cool body / warm industrial-light relationship from the Hulum's Cave readings is used only where that reference family is relevant, not imposed on every GEEHUB world.

### 6. Environment and integration

- The character belongs in the room: contact shadows, floor contact, scale cues, lighting response, and spatial perspective agree.
- Architecture and props have coherent geometry, materials, and scale.
- The environment is not a flat backdrop behind an otherwise finished character.
- Visual detail is allocated to the actual scene requirements, not replaced by decorative noise or excessive interface overlays.

### 7. Temporal and technical finish

- No identity, proportion, clothing, lighting, or geometry flicker appears between frames unless deliberately authored.
- The output preserves the requested frame rate, aspect ratio, duration, and resolution.
- Motion blur, antialiasing, sampling, compression, and color management do not materially degrade the result.
- A final review includes the opening, key transitions, holds, and ending; a single attractive frame cannot certify a sequence.

## Review procedure

1. Select the exact source and approved reference frames.
2. Build a neutral baseline and record identity and proportion landmarks before adding motion or growth.
3. Produce a matched camera comparison wherever possible.
4. Review the same key poses and corresponding time ranges side by side.
5. Mark each acceptance gate and attach evidence frames.
6. Correct the largest visible discrepancy first: identity, silhouette, deformation, pose, camera, materials, then secondary detail.
7. Repeat until all applicable gates pass. If a gate cannot be assessed from the available source, mark it NOT APPLICABLE or UNCERTAIN; do not invent certainty.
8. Promote the output to accepted status only after human review.

## Status vocabulary

- BLOCKOUT: structure or rig test; not a finished visual.
- LOOKDEV: materials, lighting, and camera exploration; not final.
- REVIEW: a complete candidate awaiting comparison.
- REVISE: one or more applicable gates failed.
- ACCEPTED: all applicable gates passed and a human review is recorded.
- ARCHIVED: preserved output with its source, revision, and review history.

Never describe a blockout, prompt, contact sheet, queued job, or unreviewed render as an accepted final asset.

## Minimum review record

Each review should record:
- asset ID and revision;
- source ID(s) and exact frame/timecode references;
- output path and render settings;
- character identity and proportion revision;
- pose/performance revision;
- camera and lighting revision;
- gate results and evidence frames;
- reviewer and review date;
- accepted discrepancies or unresolved limitations.

## Relationship to the Library and evidence system

The Library Image Atlas discovers and describes source material. The Visual Evidence Ledger records what has actually been observed and how observations change over time. This standard decides whether a derived visual is good enough to enter production as an accepted result.

These are separate functions:
- Atlas: what source material exists and why it matters.
- Evidence ledger: what the source visibly establishes.
- Quality standard: whether the new output meets the visual target.

The source remains primary. New work may extend it, but must not quietly replace its identity, proportions, motion, or visual character.

## Production principle

GEEHUB must be judged by the image and the moving image it actually produces. Documentation supports the work; it does not substitute for it. The target is a coherent, identity-stable, materially finished visual result that can withstand direct comparison with the supplied reference.
