# GEEHUB local automation

GEEHUB uses GitHub as the canonical source for code and project instructions, Codex as the coding workspace, Resolve Free as the editorial/runtime application, and Dropbox as the asset and output exchange.

## One-time Mac setup

From the repository root:

```bash
chmod +x engine/growth-video-studio/integrations/davinci-resolve-free/install-macos.sh
./engine/growth-video-studio/integrations/davinci-resolve-free/install-macos.sh
```

The installer copies all integration Lua scripts into Resolve's per-user Utility scripts directory. If Dropbox is installed in its standard macOS location, it creates `GEEHUB/Bridge`, `GEEHUB/Assets`, and `GEEHUB/Exports`. For a nonstandard Dropbox location:

```bash
GEEHUB_DROPBOX_ROOT="/path/to/Dropbox" ./engine/growth-video-studio/integrations/davinci-resolve-free/install-macos.sh
```

Open the repository root in Codex. Codex reads `AGENTS.md` and the project-local `.codex/config.toml`; reusable workflows live under `.agents/skills/`.

## What is automated

- Codex project instructions and reusable workflows are versioned with the repository.
- A single installer deploys the Resolve Lua scripts to the local Resolve Utility menu.
- Dropbox exchange folders are created for assets, bridge metadata, and exports.
- GitHub remains the canonical source for code; Dropbox is not used as an unsafe second copy of the Git working tree.

## What still requires a local action

The installer must be run once on the Mac. Resolve must be restarted to refresh its script menu. Dropbox sign-in and folder sync are managed by the Dropbox desktop app. The current Lua scripts configure Resolve's editorial structure; they do not yet perform automatic body segmentation, landmark detection, pixel deformation, or final growth rendering.
