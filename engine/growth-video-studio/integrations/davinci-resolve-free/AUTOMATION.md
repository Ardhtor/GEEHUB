# GEEHUB local automation

GEEHUB uses GitHub as the canonical source for code and project instructions, Codex as the coding workspace, Resolve Free as the editorial/runtime application, and Dropbox as the asset and output exchange.

## One-time Mac setup

From the repository root:

```bash
chmod +x engine/growth-video-studio/integrations/davinci-resolve-free/install-macos.sh
./engine/growth-video-studio/integrations/davinci-resolve-free/install-macos.sh
```

The installer copies all integration Lua scripts into Resolve's per-user Utility scripts directory. If Dropbox is installed in its standard macOS location, it creates `GEEHUB/Bridge/incoming`, `GEEHUB/Bridge/outgoing`, `GEEHUB/Assets`, and `GEEHUB/Exports`. For a nonstandard Dropbox location:

```bash
GEEHUB_DROPBOX_ROOT="/path/to/Dropbox" ./engine/growth-video-studio/integrations/davinci-resolve-free/install-macos.sh
```

Open the repository root in Codex. Codex reads `AGENTS.md` and the project-local `.codex/config.toml`; reusable workflows live under `.agents/skills/`.

## What is automated

- Codex project instructions and reusable workflows are versioned with the repository.
- A single installer deploys the Resolve Lua scripts to the local Resolve Utility menu.
- Dropbox exchange folders are created for assets, bridge metadata, and exports.
- GitHub remains the canonical source for code; Dropbox is not used as an unsafe second copy of the Git working tree.

## Inspect a versioned bridge manifest in Resolve

Place the version-1 manifest at `GEEHUB/Bridge/incoming/manifest.json` and each queued job JSON at the `jobUri` recorded in that manifest. The URI form `dropbox://GEEHUB/...` maps to the corresponding path under the local Dropbox root. The Resolve Utility script `GEEHUB_Bridge` validates manifest lineage, job/source agreement, identity-preserving render constraints, and whether the reserved output path is still unused. It writes `GEEHUB/Bridge/outgoing/resolve-bridge-audit.json` or a Desktop fallback.

Run it from **Workspace > Scripts > Utility > GEEHUB_Bridge** inside Resolve. The default manifest path can be overridden with `GEEHUB_BRIDGE_MANIFEST`; the Dropbox root can be overridden with `GEEHUB_DROPBOX_ROOT`. This is read-only inspection: it does not import clips, start rendering, or modify timelines. A job marked `ready-for-local-renderer` is only a validated handoff, not evidence that a renderer has run.

## What still requires a local action

The installer must be run once on the Mac. Resolve must be restarted to refresh its script menu. Dropbox sign-in and folder sync are managed by the Dropbox desktop app. The current Lua scripts configure Resolve's editorial structure and inspect bridge jobs; they do not yet perform automatic body segmentation, landmark detection, pixel deformation, or final growth rendering.
