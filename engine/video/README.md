# GEEHUB Video Engine

A local macOS production runner for GEEHUB. The browser Studio prepares a production manifest; this engine executes it through Blender (3D scene construction and animation) and FFmpeg (encoding, soundtrack muxing, final MP4 delivery).

## Requirements

- macOS on Apple Silicon or Intel
- Python 3.10+
- Blender 4.x
- FFmpeg

On macOS, double-click `Start-GEEHUB-Engine.command`. It runs the setup script, installs Blender and FFmpeg through Homebrew, checks both, and starts the local Studio bridge. Leave its Terminal window open while using GEEHUB. If macOS blocks the downloaded launcher, open Terminal in this folder and run `bash setup_mac.sh`. Or install manually with `brew install --cask blender` and `brew install ffmpeg`, then start the bridge with `python3 gee_engine.py serve`.

If Blender is installed as an application but is not on PATH, the runner also checks `/Applications/Blender.app/Contents/MacOS/Blender`.

## Start the local engine

From this directory:

```bash
python3 gee_engine.py doctor
python3 gee_engine.py serve
```

Keep that Terminal window open. Then open GEEHUB Studio, go to PREP, build the production package, and choose **RUN LOCAL PRODUCTION ENGINE**. The Studio connects only to `127.0.0.1:8765`.

## What the first engine pass executes

- Builds a complete procedural 3D stage and adult humanoid character in Blender.
- Animates a continuous proportional growth passage, ending at the configured phase-four ceiling.
- Directs a five-part scene arc through camera, lighting, timing and held reveal.
- Renders a 24 fps MP4 through Blender.
- Uses FFmpeg to encode the delivery file and mix an optional supplied soundtrack with a quiet generated low-frequency bed.
- Returns a downloadable MP4 and a production report.

This is a real local 3D render pipeline, not a photorealistic text-to-video model. The character is a procedural 3D base that can be replaced by imported, rigged character assets as the next layer is added.

## Output

Renders are saved under `~/Movies/GEEHUB/`. The local API exposes `/health`, `/render`, `/status?id=...` and `/download?id=...`.

## Optional soundtrack

Copy the audio file into `engine/video/assets/` in the repository checkout. In the Studio PREP panel, enter its filename (for example `quthbert.mp3`). The assets folder is git-ignored so private recordings are not committed. The engine copies that asset into the render folder and mixes it with the generated low-frequency bed. The local API never reads arbitrary filesystem paths supplied by a browser.
