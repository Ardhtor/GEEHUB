# GEEHUB construction state

Updated: 2026-11-02

## Resolve Free bridge consumer added — 2026-11-02
- `engine/growth-video-studio/integrations/davinci-resolve-free/GEEHUB_Bridge.lua` is a read-only consumer for `geehub.media-bridge` schema version 1. It reads the incoming manifest and referenced portable render-job JSON from the local Dropbox mirror, validates source identity, frame-set references, job state, required face/source-motion/ground-contact/connected-mesh/temporal constraints, and output-path availability.
- `dropbox://GEEHUB/...` references map beneath the configured Dropbox root. Unsupported URI schemes and path traversal are rejected. A queued job is marked ready only when its job JSON agrees with the immutable source, preserves the required identity constraints, and its reserved output file does not already exist.
- The consumer writes `Bridge/outgoing/resolve-bridge-audit.json` or a Desktop fallback. It does not import clips, create timelines, start rendering, or modify source media. `ready-for-local-renderer` is a validated handoff status, not proof that a renderer exists or ran.
- Seven Lua tests cover manifest validation, URI collision detection, Dropbox URI mapping/path traversal, successful job inspection, existing-output refusal, source mismatch, and required identity constraints. The package workflow now installs Lua 5.4, checks syntax with `luac5.4 -p`, and runs the Lua tests before packaging. These checks are configured but have not yet been observed on a completed GitHub Actions run.
- The installer creates `Bridge/incoming` and `Bridge/outgoing` for the consumer. Resolve runtime behavior, Dropbox sync, and actual frame rendering remain unverified. The user must sync/install the repository, restart Resolve, and run Workspace > Scripts > Utility > GEEHUB_Bridge with a version-1 manifest and job JSON present.


## Versioned media bridge manifest added — 2026-11-01
- `engine/growth-video-studio/core/bridge-manifest.js` defines `geehub.media-bridge` schema version 1. It records the immutable source, typed frame-set references, portable render-job exchange paths, output artifacts, and append-only revision events.
- Frame sets preserve source lineage, frame ranges, dimensions, FPS, and optional SHA-256 checksums. The manifest rejects duplicate IDs, path collisions, broken frame-set references, invalid state transitions, and inconsistent artifact lineage.
- Render jobs are queued only when an existing `geehub.growth-render-job` payload contains growth states and landmark evidence and its source name, duration, and dimensions match the immutable source record. Job JSON and output paths are separate; the output path cannot collide with source or other exchange assets.
- Jobs can be marked running, failed, or completed. A completed job must provide an artifact at its reserved output URI with a caller-supplied SHA-256 digest. The manifest validates digest format only; a worker must calculate the checksum from the actual file. Failed jobs remain explicit and create no artifact.
- Eight focused tests are in `core/bridge-manifest.test.js`. A temporary Node 22.16.0 harness using branch copies of the bridge module and its required core dependencies ran all eight tests: 8 passed, 0 failed. `node --check` passed for the bridge module and test file. The full studio `npm test` suite was not run. The package workflow now installs Node 22 and runs `npm test` before building the mirror, but the GitHub status endpoint returned no checks for the latest branch commit, so CI execution remains unverified.
- This is a portable manifest contract only. No Dropbox bytes were exchanged, no Resolve Lua consumer was run, and no video was rendered. Local Mac/Resolve/Dropbox behavior remains unverified.

## Growth geometry increment added
- engine/growth-video-studio/core/growth-mesh.js maps validated tracked landmarks from baseline to target body states. Stature extends the ankle-to-knee segment; thigh length extends knee-to-hip; torso length extends the hip-center-to-neck/shoulder offsets; shoulder span widens the shoulder pair; arm length extends both arm segments.
- Both ankles remain fixed. The face-center anchor follows the neck without changing its offset and is excluded from the body-mesh anchor list.
- renderGrowthMesh forwards the mapped body anchors to the existing piecewise-affine Canvas warp when the caller supplies a valid body-only triangle mesh. It does not create masks or triangles.
- The mapper reports projected stature and out-of-frame anchors, allowing the next stage to request a camera reframe rather than silently clipping the subject.
- Chest depth and arm/thigh/calf mass remain deferred until segmentation-derived silhouette geometry, depth, or 3D geometry is available.
- Four focused geometry tests pass, and a temporary local core harness ran 15 of 15 current core test cases. The first full run exposed a growth-curve diagnostic-order issue; the validator now reports a decreasing channel as a cumulative-growth regression before applying the minimum-scale check. GitHub reports no status checks for the geometry commit. Resolve and full video runtime behavior remain unverified.

## Resolve operator added
- GEEHUB_Operator.lua performs a one-run project audit, inventories media and timelines, probes available Resolve API capabilities, ensures a review bin structure, and adds missing editorial tracks/stage markers without deleting source media or existing timeline clips.
- The operator writes a JSON audit to Dropbox GEEHUB/Bridge/outgoing/resolve-audit.json, falling back to the Mac Desktop. Runtime execution has not yet been confirmed.

## New mirror layer committed
- scripts/sync-macos.sh performs a guarded fast-forward update, installs all Resolve Lua scripts, and refreshes Dropbox exchange folders when available.
- SYNC.md documents the one-sweep local mirror workflow and its safety boundaries.
- .github/workflows/package-geehub.yml packages a portable snapshot on branch pushes and manual workflow dispatch.
- The mirror is pull-based: the user must run the local sync command. GitHub cannot directly write to the Mac without a local agent and explicit machine access.

## Confirmed working
- GitHub repository and the growth-video-studio-foundation branch are available for development.
- Resolve Free Lua Console is active on the user's Mac.
- Media Pool folders were successfully created with MediaPool:AddSubFolder(parent, name).
- The user confirmed the source clip plays on GEEHUB_GROWTH_SEQUENCE.
- Codex project instructions, local config, two reusable skills, and a macOS Resolve/Dropbox installer have been committed.

## Present but not yet runtime-verified
- GEEHUB_GrowthStructure.lua adds named video lanes and six stage markers. It has not yet been confirmed running in the user's Resolve session.
- The macOS installer has not been run.
- Dropbox folder creation and exchange have not been verified.
- Codex has not yet been confirmed opening this repository with the new project instructions.
- The new geometry module has unit evidence only; it has not been connected to a real segmentation model, source clip, or Resolve session.

## Not implemented yet
- Automatic person/body segmentation and face-excluding mask generation.
- Automatic body landmark detection and confidence tracking.
- Segmentation-derived mesh triangulation and temporally stable mesh tracking across frames.
- A frame worker that samples growth states, maps landmarks, renders every source frame, and validates temporal continuity.
- Garment and environment response driven by measured contact and depth.
- Automated frame import from a render worker into Resolve.
- Final growth-video rendering and export.
- Live two-way synchronization between Codex, GitHub, Resolve, and Dropbox.

## Next construction targets
1. Add a local exchange writer/reader that stages the manifest and portable job JSON, calculates real file checksums, and refuses source/output collisions.
2. Connect segmentation/tracking output to face-excluding mesh generation and the landmark mapper.
3. Run a short per-frame deformation pass with temporal validation and camera-reframe feedback.
4. Return rendered frames and verified artifacts to Resolve without replacing source footage.
5. Validate an end-to-end clip before expanding the pipeline.

Each item changes status only when evidence exists.
