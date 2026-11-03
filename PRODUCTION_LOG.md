# GEEHUB Production Log

This is the durable resume point for repository work. Update it after meaningful production sessions. Keep concise operational state here; detailed canon belongs in each project's continuity file.

## 2026-11-03 — Mexiancas world initialized

- Repository inspected: `Ardhtor/GEEHUB`, default branch `main`.
- Existing conventions reviewed: root `README.md`, `projects.json`, `hub/projects.json`, and `docs/INFORMATION_PORTABILITY.md`.
- Confirmed connected GitHub account has admin/push permissions for this repository.
- Added the Mexiancas world as an active Atlas node in both registries.
- Added `lore/mexiancas/CHRONICLE_I.md` — Volume I, *The First Account*, ten chapters.
- Added `lore/mexiancas/CONTINUITY.md` — current canon, sequence, writing rules, and exact handoff.
- Current story position: first traveller has returned from HULUM'A carrying a dark disc. The Assembly's open question is “Who else is making a world?”
- Next: write Volume II from the disc examination; then build a browsable entry point and connect artifacts to shared state.
- Dropbox checked: `/GEEHUB` exists; `worlds/` and `chapters/` are currently empty; `production/` and `state/` also exist. Search for “Mexiancas” returned no existing files. No Dropbox mutations were made; GitHub commits do not imply Dropbox synchronization.

## 2026-11-03 — Mexiancas Volume II continued

- Read the existing Mexiancas continuity record and production log before continuing.
- Created `lore/mexiancas/CHRONICLE_II.md` — Volume II, *The Disc and the Other Shore*, eight chapters.
- New events: the disc produces an inconsistent first voice; Izel maps a proposed corridor; a seam reveals a room beyond the western wall; an unnamed speaker asks whether the Hall still keeps accounts and requests a place in the archive; the disc gains a second mark; a second, warm chair appears.
- Canon remains deliberately unresolved: the speaker's identity, the disc's function, and the meaning of the second mark are not settled.
- Updated the Mexiancas continuity record with the new stopping point and next operation.
- Next: continue Volume II with a deliberate response to the unnamed speaker, preserving the other world's agency and its right to author its own account.
- Dropbox: no changes. GitHub remains the verified text location; no Dropbox synchronization is claimed.


## 2026-11-03 — Mexiancas novel, first homeland encounter

- Added Volume II, Chapter IX, “The Man Who Came Through the Western Door.”
- Introduced Mateo as the first named visitor from the Mexiancas' country; his own account establishes a homeland with its own settlements, roads, social customs, and histories.
- Spanish appears as natural dialogue between Mateo and Izel.
- Mateo leaves a map showing a second doorway and mentions a brother who may visit. These become the next narrative threads.
- Volume II is now at Chapter IX. Dropbox remains unchanged; this production is verified in GitHub only.


## 2026-11-03 — Hulum's Cave first video readings

- Inspected both supplied clips, `22.mp4` and `3333.mp4`, at sampled intervals. Each is 6.04 seconds, 24 fps, 448 × 672.
- Added `media/HULUMS_CAVE_FIRST_READINGS_2026-11-03.md` as the first visual-reading record.
- Main observation: both clips primarily present an already extreme adult male CG character through deliberate flexing and pose changes; sampled frames do not establish progressive volumetric growth.
- Clip 22 emphasizes a frontal full-body stance and repeated flexing. Clip 3333 shares the opening language and adds a more oblique / side-oriented ending that reveals body depth.
- Recorded character silhouette, cool blue-green body / warm amber gym contrast, low frontal camera, shorts continuity, pose sequence, confidence limits, and direct GEEHUB implementation lessons.
- Production distinction established: identity / proportions, performance / pose, and shot / lighting must be separate controllable layers. Pose changes must not be mistaken for growth.
- No claims made about Hulum's private Maya rig, node graph, AI model, LoRA, or simulation stack.
- Next: inspect every frame, quantify silhouette landmarks, classify pose vs camera vs true shape change, then reconcile local source copies against Dropbox originals and record Dropbox provenance.
- Dropbox was not modified in this pass.


### Hulum's Cave readings — denser temporal pass

- Re-sampled both six-second clips at 24 evenly spaced points (about 0.26-second spacing) and expanded the first-reading document.
- Clip 22 has a clear pose rhythm: lowered stance → arms spread / double-biceps → hands-at-waist reset → repeat flex hold.
- Clip 3333 has a related opening and sustained flex, then opens the arms and turns to an oblique / near-side view in its final second.
- Added explicit interval tags for future analysis: `POSE`, `CAMERA_CROP`, `ORIENTATION`, `EXPRESSION`, `TRUE_SHAPE_CHANGE`, `UNCERTAIN`.
- Refined rule: apparent size changes caused by pose, perspective, crop or orientation are not growth. Only label true shape change after comparable landmarks and silhouette regions have been normalized.


### Hulum's Cave — mechanical rig / deformation reference

- Added `media/HULUMS_CAVE_RIG_DEFORMATION_SPEC.md`, translating the supplied creator shorthand into a structured GEEHUB technical reference.
- Separated reported pipeline-era claims and inferred Maya mechanics from facts directly visible in the two supplied clips.
- Captured the proposed biped foundation, sculpted growth targets, regional controls, corrective deformation, optional cloth / secondary systems, animation grammar, and provisional title-era classification.
- Added implementation rules: identity, pose, growth, expression, camera and cloth remain separate channels; verify true shape change against normalized multi-view silhouettes.
- No claim that Hulum's private rig, Maya node graph, or generative model has been recovered. The supplied clips remain pose references, not verified growth demonstrations.
- Next: build proportion landmarks and reusable pose states, then prototype and validate the unified GEEHUB character deformation path.


## 2026-11-04 — Hulum's Cave character system design

- Re-read the video-engine README, unified rig foundation, Blender scene integration, source analyzer and Hulum's Cave build log.
- Audited the current rig: it has a fused metaball-derived mesh and distance-based three-bone weighting, but no animator-facing FK/IK controls, twist distribution, pose-space correctives or independent regional growth profiles. Its present growth pass scales torso and limb bones; this remains a blockout experiment, not a validated muscle-growth system.
- Rechecked Dropbox source records. Located the two canonical filenames and their same-sized ` (1)` copies. Original and duplicate sizes match pairwise, but equal sizes do not prove byte identity; content-hash/media comparison remains open. The chat-uploaded clips must not be assumed identical to Dropbox originals without comparison.
- Added `media/HULUMS_CAVE_CHARACTER_SYSTEM_DESIGN_2026-11-04.md`: character data model, proportion landmarks, structural rig, skinning/corrective stages, independent regional growth driver, pose grammar, reference-analysis upgrade, manifest proposal and ten acceptance tests.
- Design decision: validate fixed-size deformation first; implement growth only after pose, joint spacing and silhouette remain stable. Identity, proportions, pose, growth, expression, wardrobe and shot remain independent channels.
- Verification boundary: design document committed; no Blender execution, deformation render, Dropbox hash comparison or direct Dropbox-to-engine ingestion has been completed in this pass.
- Next: compare Dropbox source pairs by content hash and media probe; add a source/annotation manifest; then run the rig acceptance poses in Blender before changing the growth implementation.
