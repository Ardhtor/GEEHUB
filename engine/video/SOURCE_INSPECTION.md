# GEEHUB source inspection

This is the first executable gate in the Luke reproduction pipeline. It records
technical source properties and extracts evenly spaced reference frames without
modifying the original footage.

## Requirements

- Python 3.9+
- FFmpeg (both `ffmpeg` and `ffprobe` on PATH)

## Run

```bash
python3 engine/video/source_inspector.py "/path/to/SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4" --out "/path/to/GEEHUB_SOURCE_INSPECTION" --frames 16
```

Outputs:

- `source_report.json`: codec, dimensions, frame rate, duration, audio streams,
  frame timestamps and extracted-file paths.
- `reference_frames/`: evenly spaced JPEGs for actual visual review.

## Production rule

The report deliberately leaves visual analysis and identity/pose measurements
pending. A frame-extraction script cannot establish face identity, body
proportions, pose, or the timing of the transformation. Those must be measured
from the extracted frames and source playback before the 3D rig is authored.
