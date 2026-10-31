# GEEHUB agent instructions

GEEHUB is a video-generation system focused on temporally coherent, identity-preserving physique transformation.

## Working rules
- Treat this repository as the canonical source for code, configuration, tests, and production instructions.
- Prefer implementing and validating a working increment over writing plans.
- Never claim that a feature renders, tracks, segments, deforms, or exports video unless its implementation and tests prove it.
- Preserve source identity, face, pose, camera, lighting, environment, and audio unless a task explicitly changes them.
- Growth must remain temporally coherent and anatomically plausible: track height and limb length alongside muscular volume; preserve joints, silhouette continuity, skin texture, and clothing interaction.
- Treat HULUM'A / Hulum's Cave as a broad aesthetic reference, not a request to copy a specific video frame-for-frame.
- Use modular assets and reusable stages. Keep canon, experiments, and production outputs distinguishable.
- Resolve Free integration must use in-app Lua scripts. Do not assume Studio-only remote scripting.
- Verify Resolve API methods against the documented API or a known working in-app test before relying on them. The MediaPool folder method verified in this project is AddSubFolder(parent, name), not CreateFolder.
- Scripts must be safe to rerun: detect existing bins, tracks, markers, and outputs before creating duplicates.
- Never overwrite source footage. Keep generated frames, composites, and exports in separate bins.
- Keep user-facing instructions short and executable.

## Project layers
- `engine/growth-video-studio/`: core growth-video engine.
- `engine/growth-video-studio/integrations/davinci-resolve-free/`: Resolve Free Lua bridge.
- `.agents/skills/`: reusable Codex workflows.
- `.codex/`: project-local Codex configuration.
- `bridge/` and Dropbox output: generated manifests, logs, and exchange artifacts only; source code remains in Git.

## Validation
- Run the narrowest relevant tests after changes.
- For Lua, run syntax validation when a Lua interpreter is available and state clearly when Resolve runtime validation remains outstanding.
- Keep a clear distinction between metadata scaffolding and actual pixel-level video transformation.
