# GEEHUB construction state

Updated: 2026-10-31

## Growth geometry increment added
- engine/growth-video-studio/core/growth-mesh.js maps validated tracked landmarks from baseline to target body states. Stature extends the ankle-to-knee segment; thigh length extends knee-to-hip; torso length extends the hip-center-to-neck/shoulder offsets; shoulder span widens the shoulder pair; arm length extends both arm segments.
- Both ankles remain fixed. The face-center anchor follows the neck without changing its offset and is excluded from the body-mesh anchor list.
- renderGrowthMesh forwards the mapped body anchors to the existing piecewise-affine Canvas warp when the caller supplies a valid body-only triangle mesh. It does not create masks or triangles.
- The mapper reports projected stature and out-of-frame anchors, allowing the next stage to request a camera reframe rather than silently clipping the subject.
- Chest depth and arm/thigh/calf mass remain deferred until segmentation-derived silhouette geometry, depth, or 3D geometry is available.
- Four focused Node tests pass in a local harness against the current growth-state, landmark-track, and mesh-warp module interfaces. Resolve and full video runtime behavior remain unverified.

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
1. Define a versioned bridge manifest for source media, generated frames, render jobs, and output status.
2. Add a Resolve-side watcher/import script that consumes manifests safely, without overwriting source media.
3. Connect segmentation/tracking output to face-excluding mesh generation and the new landmark mapper.
4. Run a short per-frame deformation pass with temporal validation and camera-reframe feedback.
5. Validate an end-to-end clip before expanding the pipeline.

Each item changes status only when evidence exists.
