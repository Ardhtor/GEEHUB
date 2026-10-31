#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../../" && pwd)"
INTEGRATION="$ROOT/engine/growth-video-studio/integrations/davinci-resolve-free"
RESOLVE_SCRIPTS="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"
DROPBOX_ROOT="${GEEHUB_DROPBOX_ROOT:-}"

if [[ ! -d "$INTEGRATION" ]]; then
  echo "GEEHUB integration folder not found: $INTEGRATION" >&2
  exit 1
fi

mkdir -p "$RESOLVE_SCRIPTS"
installed=0
for script in "$INTEGRATION"/*.lua; do
  [[ -f "$script" ]] || continue
  cp "$script" "$RESOLVE_SCRIPTS/"
  echo "Installed: $(basename "$script")"
  installed=$((installed + 1))
done

if [[ -n "$DROPBOX_ROOT" ]]; then
  mkdir -p "$DROPBOX_ROOT/GEEHUB/Bridge" "$DROPBOX_ROOT/GEEHUB/Assets" "$DROPBOX_ROOT/GEEHUB/Exports"
  cat > "$DROPBOX_ROOT/GEEHUB/Bridge/README.txt" <<'EOF'
GEEHUB Dropbox bridge
Assets: place source assets and approved reference material here.
Exports: destination for rendered deliverables.
Bridge: exchange manifests, logs, and status files.
GitHub remains the canonical source for code and project configuration.
EOF
  echo "Dropbox folders configured at: $DROPBOX_ROOT/GEEHUB"
else
  CANDIDATE="$HOME/Library/CloudStorage/Dropbox"
  if [[ -d "$CANDIDATE" ]]; then
    mkdir -p "$CANDIDATE/GEEHUB/Bridge" "$CANDIDATE/GEEHUB/Assets" "$CANDIDATE/GEEHUB/Exports"
    echo "Dropbox folders configured at: $CANDIDATE/GEEHUB"
  else
    echo "Dropbox folder not detected. Set GEEHUB_DROPBOX_ROOT and rerun to enable the Dropbox bridge."
  fi
fi

echo
echo "Installed $installed Lua script(s) into Resolve's Utility scripts folder."
echo "Restart DaVinci Resolve, then open Workspace > Scripts > Utility."
echo "Codex project files are in $ROOT. Open this repository folder in Codex."
