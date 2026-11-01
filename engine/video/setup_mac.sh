#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install it from https://brew.sh, then run this script again."
  exit 1
fi

echo "Installing the GEEHUB production dependencies..."
brew install --cask blender
brew install ffmpeg

echo
echo "Checking the engine..."
python3 gee_engine.py doctor
echo
echo "Starting the local Studio bridge..."
python3 gee_engine.py serve
