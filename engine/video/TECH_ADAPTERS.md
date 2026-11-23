# GEEHUB current production adapters

This is the executable integration surface for current production tools. The adapter layer is deliberately separate from project canon and render logic.

## Blender 5.3+ and OpenTimelineIO

Blender 5.3 includes OpenTimelineIO as a built-in Python module. GEEHUB exports its semantic timeline to an OTIO file while preserving the one-shot design: each semantic stage becomes a time-ranged marker over one continuous picture track, not a sequence of cuts.

Export a timeline without attaching media:

    python3 engine/video/gee_engine.py export-otio \
      --timeline production/projects/teal-titan-golds-on-5th/07_MANIFESTS/timeline.json \
      --output production/projects/teal-titan-golds-on-5th/04_COMPOSITES/teal-titan.otio

Attach a source video as the continuous picture clip:

    python3 engine/video/gee_engine.py export-otio \
      --timeline production/projects/teal-titan-golds-on-5th/07_MANIFESTS/timeline.json \
      --media /path/to/verified-source.mp4 \
      --output production/projects/teal-titan-golds-on-5th/04_COMPOSITES/teal-titan.otio

The adapter does not decode, copy, or alter the source video. It writes an external media reference and carries GEEHUB stage notes, camera direction, growth instructions, and sound cues as marker metadata.

## Native Gaussian Splat PLY import

Blender 5.3 can detect and import Gaussian Splat PLY files as native point clouds. GEEHUB wraps the importer with a verification step: the imported point cloud must contain the Gaussian Splat attributes `scale`, `rotation`, and `radiance:base`. A normal PLY mesh is not silently accepted as a Gaussian Splat capture.

Run:

    python3 engine/video/gee_engine.py import-splat \
      --source /path/to/capture.ply \
      --output production/assets/captures/capture.blend

The source PLY remains untouched. GEEHUB writes a separate .blend file and a .source.json sidecar with the source SHA-256, byte size, Blender version, imported point count, and verified attribute names. The importer refuses unsupported Blender versions and unverified PLY data.

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


## Bilateral pectoral growth geometry

The continuous growth renderer now decomposes the pectoral channel into three local shape-key layers: forward projection (front-to-back chest depth), upper fullness (clavicular region), and outer sweep (lateral contour). All three are driven by the existing authored `pectorals` curve, so existing project timelines and growth profiles remain compatible. The geometry fields are mirrored, Gaussian-weighted, and confined to the chest; they do not scale the head or abdomen.

The standalone deformation field lives in `growth_geometry.py` and is covered by Python unit tests without requiring Blender. In Blender, `timeline_growth.py` turns those fields into editable shape keys on the unified character mesh and fitted wardrobe shell. This is a controllable geometric prototype, not a claim of anatomically simulated muscle tissue. Inspect a rendered front, three-quarter, and side preview before approving a production character.
