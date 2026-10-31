# GEEHUB construction state

Updated: 2026-10-31

## New mirror layer committed
- `scripts/sync-macos.sh` performs a guarded fast-forward update, installs all Resolve Lua scripts, and refreshes Dropbox exchange folders when available.
- `SYNC.md` documents the one-sweep local mirror workflow and its safety boundaries.
- `.github/workflows/package-geehub.yml` packages a portable snapshot on branch pushes and manual workflow dispatch.
- The mirror is pull-based: the user must run the local sync command. GitHub cannot directly write to the Mac without a local agent and explicit machine access.

## Confirmed working
- GitHub repository and the `growth-video-studio-foundation` branch are available for development.
- Resolve Free Lua Console is active on the user's Mac.
- Media Pool folders were successfully created with `MediaPool:AddSubFolder(parent, name)`.
- The user confirmed the source clip plays on `GEEHUB_GROWTH_SEQUENCE`.
- Codex project instructions, local config, two reusable skills, and a macOS Resolve/Dropbox installer have been committed.

## Present but not yet runtime-verified
- `GEEHUB_GrowthStructure.lua` adds named video lanes and six stage markers. It has not yet been confirmed running in the user's Resolve session.
- The macOS installer has not been run.
- Dropbox folder creation and exchange have not been verified.
- Codex has not yet been confirmed opening this repository with the new project instructions.

## Not implemented yet
- Automatic person/body segmentation.
- Automatic body landmark detection and confidence tracking.
- Temporally coherent body mesh generation and pixel deformation.
- Automated frame import from a render worker into Resolve.
- Final growth-video rendering and export.
- Live two-way synchronization between Codex, GitHub, Resolve, and Dropbox.

## Next construction targets
1. Make the local installer robust and verify its path assumptions.
2. Define a versioned bridge manifest for source media, generated frames, render jobs, and output status.
3. Add a Resolve-side watcher/import script that consumes manifests safely, without overwriting source media.
4. Implement measurable body landmarks and segmentation as actual image-processing stages.
5. Connect deformation and temporal stabilization to the frame renderer.
6. Validate a short end-to-end clip before expanding the pipeline.

Each item changes status only when evidence exists.
