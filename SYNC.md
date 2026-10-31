# GEEHUB mirror and one-sweep update

## Architecture

GitHub is the canonical development source. Your Mac holds a working checkout opened by Codex. Resolve Lua scripts are installed from that checkout into Resolve's user Scripts folder. Dropbox is the synchronized exchange location for assets, bridge messages, and exports.

The mirror is deliberately pull-based: GitHub cannot directly write to a Mac that is offline or has not granted a running local agent permission. The local sync command performs the update when you run it. This avoids exposing your machine to an inbound remote-control service.

## One-time setup

Clone the project and open it in Codex:

```bash
git clone --branch growth-video-studio-foundation https://github.com/Ardhtor/GEEHUB.git
cd GEEHUB
chmod +x scripts/sync-macos.sh
./scripts/sync-macos.sh
```

The sync script fast-forwards the branch, installs every Resolve Lua integration script, and refreshes the Dropbox GEEHUB exchange folders if Dropbox is installed at its standard macOS location. For a custom Dropbox root:

```bash
GEEHUB_DROPBOX_ROOT="/path/to/Dropbox" ./scripts/sync-macos.sh
```

It refuses to run if the checkout has local changes, is on the wrong branch, or contains untracked files. Commit or stash local work before syncing.

## Ongoing use

Run this single command from the repository root whenever you want the latest committed work:

```bash
./scripts/sync-macos.sh
```

GitHub Actions also packages a portable snapshot on each branch push. The artifact is available from the repository's Actions run for 30 days. The Git checkout remains the recommended mirror because it can receive future fast-forward updates.

## Current boundary

This mirrors repository code and installs Resolve scripts. It does not yet synchronize a running Resolve timeline or automatically transfer rendered video frames. Dropbox is currently provisioned as an exchange folder; a manifest-driven two-way media bridge is the next implementation stage. The user must run the local command; no remote process has been installed or granted machine access.
