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

## Analyze reference footage

The source-analysis pass now runs independently of Blender and produces timestamped JSON for shot planning:

```bash
python3 analyze_source.py /path/to/reference.mp4 --fps 2 --width 320 --output analysis.json
```

It uses FFprobe for media metadata and FFmpeg to sample frames. The report records frame-change energy, likely cuts, coarse image-space movement cues, and held / slow / active intervals. See [SOURCE_ANALYSIS.md](SOURCE_ANALYSIS.md) for interpretation limits and the planned Studio integration. The analysis is deliberately separate from rendering: inspect and curate the reference track before using it to direct a new scene.


## Rigged character foundation

The first renderer pass uses separate procedural body parts for fast blocking. A unified, armature-driven alternative now lives in `rigged_character.py`. From Blender's Python console or another scene script:

```python
from rigged_character import build_rigged_character
mesh, rig = build_rigged_character(animate=True)
```

This creates a fused smooth anatomical mesh, a hierarchical deform skeleton, and distance-weighted vertex groups. It is currently a foundation module rather than the default render path. Validate deformation in Blender before switching production scenes to it; in particular inspect shoulder, hip, elbow, and knee transitions.


## Select the unified rigged character

The Blender scene runner now supports an opt-in armature-driven character path. Add these fields to a production manifest:

```json
{
  "character_model": "rigged",
  "format": {
    "rig_growth_ceiling": 1.35
  }
}
```

Omit `character_model` or set it to `blockout` to retain the original fast blocking character. The rigged path places the stage floor beneath the full-height mesh and keys growth only between the existing growth start/end frames, holding the final shape afterwards. The rigged path is experimental until rendered and inspected in Blender; confirm shoulders, hips, elbows, knees, silhouette and floor contact before production use. The rig growth ceiling is clamped to 1.0–1.8 independently of the original blockout ceiling.

## Dropbox video source of truth

Dropbox is the canonical video library for GEEHUB. Reference footage and user-supplied source videos must be located and selected from Dropbox first; do not substitute web examples, generated stills, or locally improvised clips when a Dropbox source exists. Preserve the original Dropbox file and its identity as the source record.

For local production, use a synced or explicitly staged working copy in the project's `01_SOURCE/` area. Treat that folder as a working cache, not a competing source of truth. Keep the original filename and record the Dropbox path or file ID, source duration, frame rate, dimensions, and any selected time ranges in the production manifest/report. Derived frames belong in `02_FRAMES/`; analysis and shot annotations should remain traceable to the same source; transformation passes belong in `03_GROWTH_PASSES/`; composites in `04_COMPOSITES/`; and final renders in `05_EXPORTS/`.

The source-analysis command accepts a local path, so a Dropbox video must be available through the user's synced Dropbox folder or staged into `01_SOURCE/` before analysis. Do not claim direct Dropbox-to-render ingestion until that connector path is implemented and tested.
