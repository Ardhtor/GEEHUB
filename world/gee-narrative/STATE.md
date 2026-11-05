# GEEHUB construction state

Updated: 2026-11-05

## Verified frame-sequence evidence connected to the media bridge — 2026-11-05
- engine/growth-video-studio/core/frame-sequence-bridge.js adds prepareFrameSequenceBridgeInputs(). It accepts only a structurally ready, source-matched frame sequence and a successful local file audit; it rechecks frame range, format, body/face mask count, mask URIs, checksums, and dimensions before preparing two typed sidecar documents.
- The adapter returns a new media-bridge manifest revision with segmentation and landmarks frame sets. Each frame set carries the source asset id, sequence id, frame range, dimensions, FPS, and a SHA-256 digest of the exact JSON sidecar content. The sidecar documents preserve per-frame mask references/checksums and landmark/confidence data. They explicitly retain pixelSemanticsVerified=false.
- queueBridgeRenderJob() and validateBridgeManifest() now require exactly one segmentation and one landmarks input frame set for every render job. The pair must share a sequence id, frame range, dimensions, FPS, and valid SHA-256 digests.
- bridge-exchange.js now verifies the actual input frame-set files beneath the local Dropbox root before staging. It refuses missing/non-regular files, symlinks, missing digests, or bytes whose SHA-256 differs from the manifest. The receipt records the verified frame-set paths and digests.
- The Resolve Lua inspector mirrors the required typed-role, checksum, sequence-id, and matching-format checks. Its fixture now includes the required segmentation and landmark inputs.
- GitHub Actions run 42098046049 completed successfully on commit 71dd954230a4a9787e711907e17d7bc6f4ff987f: 54/54 Node core tests passed, 10/10 Resolve Lua tests passed, Lua 5.4 syntax validation passed, and the portable package was built and uploaded.
- The adapter prepares sidecar content but does not write it to Dropbox. A local writer/CLI must persist the exact returned content at each URI before stage:bridge is run. No local Mac, Dropbox, or Resolve runtime was accessed. Mask pixel semantics and actual face exclusion remain unverified.

## Local media exchange staging added — 2026-11-03
- engine/growth-video-studio/core/bridge-exchange.js adds a Node 22 filesystem adapter for geehub.media-bridge v1. It maps dropbox://GEEHUB/... URIs under a configured local Dropbox root, rejects traversal, encoded path segments, and symlinked exchange paths, and requires a real source file.
- Staging hashes the actual source bytes with SHA-256 and compares them with the immutable source checksum when the manifest declares one. It validates the portable render-job source, output dimensions/FPS, minimum growth/landmark evidence, and face/motion/ground-contact/connected-mesh/temporal constraints.
- The adapter writes the job JSON first and the manifest last with exclusive file creation. It refuses existing manifest, job, or output destinations, and removes the newly written job if manifest creation fails. It never creates the render output or modifies the source.
- tools/stage-bridge-exchange.js exposes the adapter as a command-line operation; npm run stage:bridge prints a JSON receipt containing the observed source, job, and manifest SHA-256 digests and resolved exchange paths.
- Seven focused tests cover URI traversal, successful staging, source checksum mismatch, output collision, existing manifest refusal, symlinked exchange directory refusal, and disabled face protection. GitHub Actions run 41711149701 completed successfully: all 42 Node core tests passed, all nine Resolve Lua tests passed, Lua 5.4 syntax validation passed, and the portable package was built and uploaded.
- This is the first filesystem-backed exchange writer, not a renderer. It has not been run against the user's Dropbox mirror or Mac. It does not yet calculate checksums for completed rendered output, move image sequences, or import media into Resolve.

## Resolve Free bridge consumer added — 2026-11-02
- engine/growth-video-studio/integrations/davinci-resolve-free/GEEHUB_Bridge.lua is a read-only consumer for geehub.media-bridge schema version 1. It reads the incoming manifest and referenced portable render-job JSON from the local Dropbox mirror, validates source identity, frame-set references, job state, required face/source-motion/ground-contact/connected-mesh/temporal constraints, and output-path availability.
- dropbox://GEEHUB/... references map beneath the configured Dropbox root. Unsupported URI schemes and path traversal are rejected. A queued job is marked ready only when its job JSON agrees with the immutable source, preserves the required identity constraints, and its reserved output file does not already exist.
- The consumer writes Bridge/outgoing/resolve-bridge-audit.json or a Desktop fallback. It does not import clips, create timelines, start rendering, or modify source media. ready-for-local-renderer is a validated handoff status, not proof that a renderer exists or ran. Validation now tolerates an absent source by reporting a structured error and recognizes that a completed artifact intentionally reuses its own render job's reserved output URI.
- Nine Lua tests cover manifest validation, URI collision detection, Dropbox URI mapping/path traversal, successful job inspection, existing-output refusal, source mismatch, required identity constraints, safe handling of a missing source, and completed-artifact URI reuse. The package workflow installed Lua 5.4, passed luac5.4 -p, passed all Lua tests, passed the Node core suite, and completed package build/upload on 2026-11-02 (Actions run 41519716150).
- The installer creates Bridge/incoming and Bridge/outgoing for the consumer. Resolve runtime behavior, Dropbox sync, and actual frame rendering remain unverified. The user must sync/install the repository, restart Resolve, and run Workspace > Scripts > Utility > GEEHUB_Bridge with a version-1 manifest and job JSON present.

## Versioned media bridge manifest added — 2026-11-01
- engine/growth-video-studio/core/bridge-manifest.js defines geehub.media-bridge schema version 1. It records the immutable source, typed frame-set references, portable render-job exchange paths, output artifacts, and append-only revision events.
- Frame sets preserve source lineage, frame ranges, dimensions, FPS, and optional SHA-256 checksums. The manifest rejects duplicate IDs, path collisions, broken frame-set references, invalid state transitions, and inconsistent artifact lineage.
- Render jobs are queued only when an existing geehub.growth-render-job payload contains growth states and landmark evidence and its source name, duration, and dimensions match the immutable source record. Job JSON and output paths are separate; the output path cannot collide with source or other exchange assets.
- Jobs can be marked running, failed, or completed. A completed job must provide an artifact at its reserved output URI with a caller-supplied SHA-256 digest. The manifest validates digest format only; a worker must calculate the checksum from the actual file. Failed jobs remain explicit and create no artifact.
- Eight focused tests are in core/bridge-manifest.test.js. A temporary Node 22.16.0 harness using branch copies of the bridge module and its required core dependencies ran all eight tests: 8 passed, 0 failed. node --check passed for the bridge module and test file. The full studio npm test suite was not run. The package workflow now installs Node 22 and runs npm test before building the mirror, but the GitHub status endpoint returned no checks for the latest branch commit, so CI execution remains unverified.
- This is a portable manifest contract only. No Dropbox bytes were exchanged, no Resolve Lua consumer was run, and no video was rendered. Local Mac/Resolve/Dropbox behavior remains unverified.

## Growth geometry increment added
- engine/growth-video-studio/core/growth-mesh.js maps validated tracked landmarks from baseline to target body states. Stature extends the ankle-to-knee segment; thigh length extends knee-to-hip; torso length extends the hip-center-to-neck/shoulder segment; shoulder span widens the shoulder pair; arm length extends both arm segments.
- Both ankles remain fixed. The face-center anchor follows the neck without changing its offset and is excluded from the body-mesh anchor list.
- renderGrowthMesh forwards the mapped body anchors to the existing piecewise-affine Canvas warp when the caller supplies a valid body-only triangle mesh. It does not create masks or triangles.
- The mapper reports projected stature and out-of-frame anchors, allowing the next step to request a camera reframe instead of silently clipping the subject.
- Chest depth and arm/thigh/calf mass remain deferred until segmentation-derived silhouette geometry, depth, or 3D geometry is available.
- Four focused geometry tests pass, and a temporary local core harness ran 15 of 15 current core test cases. The first full run exposed a growth-curve diagnostic-order issue; the validator now reports a decreasing channel as a cumulative-growth regression before applying the minimum-scale check. Resolve and full video runtime behavior remain unverified.

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
- A per-frame deformation/render worker that samples growth states, maps landmarks, warps every source frame, and validates the rendered sequence.
- Garment and environment response driven by measured contact and depth.
- Automated frame import from a render worker into Resolve.
- Final growth-video rendering and export.
- Live two-way synchronization between Codex, GitHub, Resolve, and Dropbox.

## Next construction targets
1. Add a safe local writer/CLI that persists the returned segmentation and landmark sidecars, writes a revisioned manifest only after the sidecars are present, and feeds the same evidence into stage:bridge.
2. Connect a real segmentation/tracking producer and verify face-excluding mask semantics rather than relying only on producer declarations.
3. Generate face-excluding mesh triangulation and a temporally stable mesh track.
4. Run a short per-frame deformation pass with temporal validation and camera-reframe feedback.
5. Return rendered frames and verified artifacts to Resolve without replacing source footage.

Each item changes status only when evidence exists.

## Repository validation note — 2026-11-03
- The separate Validate GEEHUB data workflow still fails at Validate browser repository links (Actions run 41711149548). It reports stale embedded project tuples for information-portability, lineage-pantheon, hubby, and media-tools. The Growth Video Studio package workflow passed independently on the same commit; this registry issue is outside the media-bridge change and remains open.


## Frame-sequence intake worker added — 2026-11-04
- engine/growth-video-studio/core/frame-sequence.js defines geehub.frame-sequence schema version 1. It validates fixed-FPS frame numbering and timestamps without sorting away input-order mistakes; source identity and immutability; source/frame dimensions; required identity and articulated landmarks; identity/pose confidence; landmark-track gaps and frame-to-frame discontinuity; and segmentation lineage.
- Each frame can reference separate body and face PNG masks. The body mask must declare face exclusion and the face mask must declare identity protection. Mask URIs must be safe, unique Dropbox GEEHUB references; declared dimensions and SHA-256 formats are checked.
- core/frame-sequence-worker.js verifies the actual referenced files beneath the configured Dropbox root. It refuses symlinked path components, hashes the actual PNG bytes, and checks the PNG signature and IHDR dimensions against the source sequence. It returns a machine-readable audit and performs no writes.
- tools/inspect-frame-sequence.js exposes the worker as npm run inspect:frames. A sequence is marked ready-for-geometry only when frame evidence is structurally complete and every body/face mask file passes checksum and dimension verification.
- Seven focused tests passed under Node 22.16.0 in a temporary harness: ordered/source-matched sequence acceptance; out-of-order, source, and dimension rejection; landmark-only pending state; identity/confidence/temporal failure; actual PNG checksum/dimension verification; checksum mismatch refusal; and symlink refusal. Syntax checks passed for the new core modules and CLI.
- This worker does not run a segmentation model, decode mask pixels, prove that the body mask truly excludes the face, generate a mesh, deform frames, or render a video. The face-exclusion and identity-protection flags remain producer assertions. Local Dropbox/Resolve runtime has not been exercised.
