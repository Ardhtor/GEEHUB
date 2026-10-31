#!/bin/bash
set -euo pipefail

# One-sweep local mirror update: fast-forward the GEEHUB checkout, install
# Resolve Lua scripts, and refresh the Dropbox exchange directories.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${GEEHUB_BRANCH:-growth-video-studio-foundation}"
REMOTE="${GEEHUB_REMOTE:-origin}"

if ! command -v git >/dev/null 2>&1; then
  echo "Git is required." >&2; exit 1
fi
if [[ ! -d "$ROOT/.git" ]]; then
  echo "This script must run inside a GEEHUB git checkout." >&2; exit 1
fi

cd "$ROOT"
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "Current branch is '$CURRENT_BRANCH'; expected '$BRANCH'."
  echo "Switch to the intended branch and rerun. No files were changed."
  exit 2
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Local tracked changes detected. Commit or stash them before syncing."
  exit 3
fi
if [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  echo "Untracked files detected. Move or commit them before syncing."
  exit 3
fi

git fetch "$REMOTE" "$BRANCH"
git merge --ff-only "$REMOTE/$BRANCH"

INTEGRATION="$ROOT/engine/growth-video-studio/integrations/davinci-resolve-free"
RESOLVE_SCRIPTS="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"
mkdir -p "$RESOLVE_SCRIPTS"
lua_count=0
for script in "$INTEGRATION"/*.lua; do
  [[ -f "$script" ]] || continue
  install -m 0644 "$script" "$RESOLVE_SCRIPTS/"
  lua_count=$((lua_count + 1))
done

DROPBOX_ROOT="${GEEHUB_DROPBOX_ROOT:-$HOME/Library/CloudStorage/Dropbox}"
if [[ -d "$DROPBOX_ROOT" ]]; then
  mkdir -p "$DROPBOX_ROOT/GEEHUB/Bridge/incoming" \
           "$DROPBOX_ROOT/GEEHUB/Bridge/outgoing" \
           "$DROPBOX_ROOT/GEEHUB/Assets" \
           "$DROPBOX_ROOT/GEEHUB/Exports"
  cp "$ROOT/engine/growth-video-studio/integrations/davinci-resolve-free/AUTOMATION.md" \
     "$DROPBOX_ROOT/GEEHUB/Bridge/AUTOMATION.md"
  echo "Dropbox mirror refreshed: $DROPBOX_ROOT/GEEHUB"
else
  echo "Dropbox folder not found at $DROPBOX_ROOT; skipped Dropbox refresh."
fi

echo
echo "GEEHUB mirror updated to $(git rev-parse --short HEAD)"
echo "Installed $lua_count Resolve Lua scripts."
echo "Restart Resolve to refresh its script menu."
echo "Codex should use this same repository folder as its project workspace."
