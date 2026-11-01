# Source footage analysis

```bash
python3 analyze_source.py /path/to/source.mp4 --fps 2 --width 320 --output analysis.json
```

This is the first measurable stage of the GEEHUB reference-to-production loop. It probes source metadata, samples frames through FFmpeg, measures frame-to-frame luminance change, estimates the center of changed pixels, detects likely cuts, and groups the timeline into held / slow / active / cut intervals.

The JSON output is designed to become input to shot planning. It preserves timestamps and sample records rather than collapsing the source into a prose summary. Use higher sample rates for fast choreography and lower rates for long atmospheric passages.

Requirements: FFmpeg and FFprobe on PATH; Python standard library only.

Interpretation boundary: the motion centroid is a coarse image-space cue. It is not optical flow, skeletal tracking, camera calibration, or a claim about the identity of a person in the footage. Thresholds are tunable and should be checked against the source.

Next integration: let the Studio import this JSON as a reference track, expose shot intervals on the timeline, and map selected intervals to Blender camera / light / character animation curves. Preserve original timestamps so each generated sequence can be compared against its source passage.
