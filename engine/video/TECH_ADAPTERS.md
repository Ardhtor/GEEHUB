# GEEHUB current production adapters

This is the executable integration surface for current production tools. The adapter layer is deliberately separate from project canon and render logic.

## Blender 5.3+ and OpenTimelineIO

Blender 5.3 includes OpenTimelineIO as a built-in Python module. GEEHUB exports its semantic timeline to an OTIO file while preserving the one-shot design: each semantic stage becomes a time-ranged marker over one continuous picture track, not a sequence of cuts.

Export a timeline without attaching media:

    python3 engine/video/otio_export.py \
      --timeline production/projects/teal-titan-golds-on-5th/07_MANIFESTS/timeline.json \
      --output production/projects/teal-titan-golds-on-5th/04_COMPOSITES/teal-titan.otio

Attach a source video as the continuous picture clip:

    python3 engine/video/otio_export.py \
      --timeline production/projects/teal-titan-golds-on-5th/07_MANIFESTS/timeline.json \
      --media /path/to/verified-source.mp4 \
      --output production/projects/teal-titan-golds-on-5th/04_COMPOSITES/teal-titan.otio

The adapter does not decode, copy, or alter the source video. It writes an external media reference and carries GEEHUB stage notes, camera direction, growth instructions, and sound cues as marker metadata.

## Capability detection

Run:

    python3 engine/video/gee_engine.py doctor

The doctor reports installed Blender and FFmpeg versions, checks Blender's bundled OpenTimelineIO import, and reports whether the Blender version meets the 5.3 Gaussian Splatting capability baseline. A capability is marked available only when the local executable check succeeds or its version requirement is met. The report is local machine detection, not a remote installation or automatic upgrade.

## Compatibility policy

- Blender 5.3+ is the feature target for native OpenTimelineIO and Gaussian Splat workflows.
- Blender 5.2 LTS is a conservative fallback for existing renders; the OpenTimelineIO adapter can use a separately installed Python package.
- Existing .blend files are never batch-upgraded by this adapter.
- Gaussian Splat import is exposed as a capability flag; source conversion, identity matching, and scene placement remain explicit production steps.
- Keep the original media unchanged. Store derived files and manifests beside the project, and record the source identity separately.
