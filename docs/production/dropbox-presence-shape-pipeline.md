# Dropbox-to-GEEHUB Presence-Shape Pipeline

**Status:** Target workflow / supervised specification  
**Principle:** Presence shape — the presence and pride of the particular man standing in front of you.  
**Primary source of direction:** The user's existing Library and Dropbox visual corpus, not generic stock or bodybuilding-editorial imagery.

## Purpose

A user-selected Dropbox photograph or video should enter GEEHUB as a source asset, be read against the relevant character and visual continuity, and become the basis for controlled image or video transformations with linked AI-written story additions. GEEHUB should not stop at describing a picture. It should be able to develop the pictured presence into a sequence of visual and narrative artefacts while preserving the originating source and the identity of the character.

The governing concept is **presence shape**. It includes physical scale and anatomy, but also bearing, face, expression, movement, small mannerisms, self-possession, clothing, spatial occupation and pride. Observable traits serve the recognition of a particular presence; they do not replace the man with an inventory of measurements.

## Reference priority and existing corpus

Use the user's existing files before generic web or stock imagery. The active visual and production sources include:

- Dropbox photographic and video collections in `/grouba` and `/grouba (1)`.
- Dropbox root-level photographs and transformation videos, including selected references used in previous GEEHUB sessions.
- `/GEEHUB/production/projects/teal-titan-golds-on-5th/`, with its established `01_SOURCE`, `02_FRAMES`, `03_GROWTH_PASSES`, `04_COMPOSITES`, `05_EXPORTS`, `06_AUDIO` and `07_MANIFESTS` structure.
- Dropbox Paper: `GEEHUB — Visual Taste & Comic Production System`, `Dima Romanov — Physique Study`, and `GEEHUB AI — Build 0.1`.
- Library production records including `GEEHUB_Joey_Growth_Engine_v0_1.py`, `GEEHUB_Joey_Continuous_Growth_Driver_v0_2.py` and `geehub_phase4_growth_simulation.csv`.

The current sequential-comic anchor is *Growing Hunger*: use its transformation unfolding across panels, recognisable characters, expressions and reactions as storytelling evidence. Page 26 remains an uninspected archive lead; do not infer its contents from Page 25. Hulum's Cave is a historical production corpus spanning early comics, Maya-era CG, later animation and generative-video experiments. Extract production knowledge such as staging, pacing, camera, continuity, reactions and environmental storytelling; do not imitate its creator or copy distinctive compositions.

Keep character-specific physique studies separate. For example, Dima Romanov's study describes a concentrated shoulder/chest/arm structure and its front-versus-side depth; it is not a template to transfer to unrelated characters.

## Pipeline

### 1. INTAKE / LOOK

Read a user-selected Dropbox file or approved folder without altering the original. Record Dropbox file ID and path, filename, media type, dimensions or duration where available, modification time, content hash, provenance and access notes. Deduplicate by content hash. Do not perform a broad unattended scan of the entire account by default.

### 2. OBSERVE

For photographs, inspect composition, framing, pose, face and expression, mannerisms, silhouette, clothing, environment, lighting, surface and body-to-space relationships. For videos, inspect the progression over time: shot boundaries, camera movement, pose transitions, physical changes, clothing continuity, facial reactions, environment, pacing and sound cues. Produce a timestamped shot log and selected frame sequence rather than relying on a single still.

Separate directly observed evidence from interpretation and invention. Do not infer biography, personality, identity or real-world facts that the source does not support.

### 3. CLASSIFY / BIND

Assign one or more roles to each source:

- identity anchor
- physique or morphology reference
- pose and gesture reference
- face, expression or mannerism reference
- clothing and material reference
- environment and spatial-scale reference
- sequential storytelling reference
- transformation and motion reference
- sound or timing reference

Bind a source to a character or project only when the relation is grounded in existing records or explicitly directed by the user. Keep the real-person source record separate from the fictional character record.

### 4. RETRIEVE CONTINUITY

Retrieve the character's approved identity sheet, face anchor, prior transformation stages, body proportions, wardrobe cues, mannerisms, voice, relationships, locations and open story threads. Explicit user corrections outrank inferred taste. If the source conflicts with established continuity, surface the conflict and create a reversible branch.

### 5. MORPH / GROW

Use an available image or video model to make a bounded transformation from the selected source. Preserve the approved face and head geometry; body growth must not distort the face. Transform the body independently, maintaining coherent anatomy, connected proportions, pose, clothing behaviour and environmental relationships. Keep camera and environment fixed when the goal is to demonstrate actual growth rather than a zoom or crop. Create intermediate stages so the transformation can be compared and revised. Make alternate views as separate outputs when necessary; do not claim one view proves dimensions it cannot show.

### 6. STORY / MAKE

Add AI story material from the specific visual encounter: a man's habitual expression, a characteristic gesture, a glance, a shift of posture, the way clothing sits differently, how he moves through a room, what another character notices, or what changes in a relationship. Outputs may include a character note, scene passage, dialogue, panel beats, caption sequence, shot log or video script. Bind every addition to the source, character, location and transformation event. Fictional invention must remain clearly fictional and must not be presented as fact about a real person.

### 7. RENDER / ASSEMBLE

Produce image variants, alternate angles, contact sheets, sequential panels and video assemblies only when a compatible model and editing tool are actually configured. Use the existing Teal Titan project bins as the output pattern:

```text
01_SOURCE
02_FRAMES
03_GROWTH_PASSES
04_COMPOSITES
05_EXPORTS
06_AUDIO
07_MANIFESTS
```

Keep originals, extracted frames, intermediate morphs, composites and final exports separate. Every derivative remains linked to its source.

### 8. REVIEW / SETTLE

Present the source, proposed transformation and narrative addition as related but distinct artefacts. The user may accept, correct, reject, branch or return to an earlier stage. Rejection never deletes the source. An experiment remains an experiment until an explicit user-directed SETTLE operation promotes it into canon.

## Identity and presence locks

When a user approves a face as the identity anchor, preserve natural facial geometry, expression and recognisability through every body transformation. Do not enlarge, smooth, beautify, stylise or distort the face as a side effect of growth.

Treat body change as a separate, time-indexed state. Record what changes and what remains. The transformation should develop the man's whole silhouette and the way he occupies space, not inflate individual muscles independently. Pride and presence should be expressed through bearing, gesture, manner and interaction as much as through size.

## Tractus and manifest contract

One source-to-story operation should create linked Tractus events:

- INPUT: the exact source asset.
- PROCESS: visual observation and continuity retrieval.
- EXPERIMENT: provisional interpretation or candidate morph.
- OUTPUT: generated image, panel, story text, shot plan or video.
- FEEDBACK: the user's correction, acceptance or rejection.
- RECEIPT: verification that an output was written and can be reopened.

Each manifest should include:

```json
{
  "source_asset_id": "dropbox-file-id",
  "source_path": "/path/to/source",
  "character_id": "geehub-character-id",
  "identity_anchor": "approved-reference-id",
  "presence_shape_notes": [],
  "transformation_stage": "baseline-or-stage-id",
  "protected_features": ["face", "head-geometry", "expression"],
  "changed_features": [],
  "model": null,
  "tool": null,
  "created_at": "ISO-8601",
  "output_paths": [],
  "story_refs": [],
  "user_review": "needs_review",
  "canon_status": "experiment"
}
```

A successful operation must have a verifiable output path and receipt. A prepared brief is not a completed render. Canon, working material, reference and experiment remain distinct.

## Implementation sequence

1. **Supervised intake:** select Dropbox assets, preview or inspect them, index provenance, and bind them to the correct GEEHUB character/project.
2. **Single-image morph:** generate one controlled transformation with a face lock and staged body change; retain the original and all intermediate passes.
3. **Story addition:** produce a linked character note and a scene or panel sequence from the same source and transformation event.
4. **Video route:** add frame extraction, shot logs, temporal identity and morph continuity, audio cues and assembly.
5. **Dropbox write-back:** add explicit, conflict-aware output delivery into the correct project bins, with receipts and reversible versioning.

## Current execution boundary

This is a target workflow, not a claim of a deployed autonomous service. The Dropbox GEEHUB AI build record states that model-provider configuration, runtime hosting and Dropbox write-back remain implementation steps. Until those are verified, use supervised, user-selected assets and report the actual status of each operation. Do not claim that a watcher, batch processor, model provider or background service is running when it is not.
