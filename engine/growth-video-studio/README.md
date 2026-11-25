# GEEHUB Growth Video Studio

A first-party product for continuous, identity-preserving physical transformation in source footage.

## Product promise

A source person remains recognizably the same person while their body changes over time. The system treats growth as a sequence of measured, versioned body states—not as a one-off prompt or a uniform image scale.

## Product layers

1. **Source** — video, frame timing, camera metadata, and source lineage.
2. **Identity lock** — face and identity landmarks that must remain stable across every generated state.
3. **Body model** — connected regional measurements for stature, torso, shoulder span, chest depth, arm length, arm mass, thigh length, and thigh mass.
4. **Growth solver** — monotonic, eased interpolation between approved states, with anatomical dependency rules.
5. **Scene response** — clothing tension, ground contact, occlusion, camera clearance, and object interaction.
6. **Temporal compositor** — stable tracking and frame-to-frame continuity.
7. **Validation** — identity drift, landmark jitter, proportion discontinuity, clipping, and scene-contact checks.
8. **Archive** — immutable source, state snapshots, render settings, outputs, and lineage.

## Implemented geometry slice

The new core/growth-mesh.js module turns a tracked source frame plus baseline and target body states into explicit target landmarks. It extends the ankle-to-knee segment from the stature channel, the knee-to-hip segment from thigh length, the hip-center-to-neck/shoulder segment from torso length, the shoulder span horizontally, and each arm segment from its parent joint. The ankles remain fixed. The face-center anchor follows the neck without changing its offset and is excluded from the body-mesh anchor list.

The mapper reports the requested stature ratio, the projected stature measured from the mapped landmarks, and any anchors that leave the normalized frame so a director can request a camera reframe instead of silently clipping the subject. renderGrowthMesh passes mapped body anchors to the existing piecewise-affine Canvas warp when a caller supplies a valid body-only triangle mesh.

Chest depth and regional mass channels are deliberately deferred. They require segmentation-derived silhouette geometry, depth, or a 3D body representation; this module does not fake them with centerline landmarks. Face pixels are protected only when the caller's triangle mesh excludes the face region. The original renderGrowthMesh helper still accepts caller-supplied anchor triangles; the new mesh-deformation module connects the separate mask-mesh grid to the articulated anchors and refuses to render across the supplied protected-face mask.

Focused tests live in core/growth-mesh.test.js and cover baseline stability, articulated segment scaling, shoulder width, face offset, ground contact, reframe detection, invalid growth, and the supplied-triangle render call.

## Versioned media bridge

core/bridge-manifest.js defines the first versioned exchange record between the AI director, frame workers, local storage, and Resolve. A manifest carries an immutable source reference, typed frame-set references, render-job records, output artifacts, and an append-only event history. Each mutation returns a new revision linked to its previous revision.

The bridge accepts the existing geehub.growth-render-job payload only when its source metadata matches the manifest source and it contains growth states and landmark evidence. Job and output URIs are reserved separately; an output cannot reuse the source URI or another exchange path. Jobs move through queued, running, completed, or failed states. Completion requires an artifact at the reserved output URI with a caller-supplied SHA-256 digest. The manifest checks the digest's format but does not read or hash the output bytes. A failed job records its error without inventing an artifact.

The Resolve Free Lua inspector reads a version-one manifest and its referenced job JSON from the local Dropbox mirror. It checks the exchange contract and writes a read-only audit. It does not import clips, change timelines, or render.

### Local exchange staging

core/bridge-exchange.js is the first filesystem-backed courier. It maps dropbox://GEEHUB/... references beneath a configured local Dropbox root, rejects traversal and symlinked exchange directories, hashes the actual source bytes, and verifies a declared source checksum when one exists. It writes the portable job JSON first and the manifest last, using exclusive file creation so existing files are never replaced. A successful call returns a receipt with source, job, and manifest SHA-256 digests and the reserved output path. It never creates the output file or modifies the source.

With Node 22, stage a manifest and its portable job JSON using:

~~~bash
GEEHUB_DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox" \
  npm run stage:bridge -- ./manifest.json ./render-job.json render-job-id
~~~

If the manifest has exactly one queued job, the final id argument can be omitted. The default manifest destination is dropbox://GEEHUB/Bridge/incoming/manifest.json; set GEEHUB_BRIDGE_MANIFEST_URI to choose another path. Existing manifest/job/output files are intentionally refused. Archive the previous incoming manifest and job JSON before staging a new exchange. The command prints a machine-readable receipt; it does not render frames.

The module records references and lineage; it does not copy video bytes, write frame sequences, invoke Resolve, or render pixels. Tests are in core/bridge-manifest.test.js and core/bridge-exchange.test.js.

## Frame-sequence intake and local verification

The frame-sequence intake contract is `core/frame-sequence.js`, schema
`geehub.frame-sequence` version 1. It accepts per-frame evidence from an
external segmentation/tracking producer and validates contiguous frame numbers,
fixed-FPS timestamps, source lineage, frame dimensions, identity and articulated
landmarks, confidence, and temporal continuity. Segmentation records name
separate body and face PNG masks. The body-mask descriptor declares
`excludesFace: true`; the face-mask descriptor declares
`protectsIdentity: true`.

`core/mask-pixels.js` and `core/frame-sequence-worker.js` now inspect actual
mask pixels. The accepted mask format is deliberately explicit: non-interlaced,
8-bit grayscale PNG, with samples exactly 0 (background) or 255 (foreground).
The decoder verifies PNG chunk CRCs, decompresses image data, and reconstructs
all five standard PNG row filters. It rejects palette/RGB/alpha encodings,
soft probability values, empty masks, corrupt chunks, and unsafe dimensions
rather than guessing how to interpret them.

For each frame, the worker checks the body and face masks are both non-empty
and have zero overlapping foreground pixels. It records foreground counts,
bounding boxes, and overlap counts. A successful audit reports
`pixelDataVerified: true` and `faceExclusionVerified: true`; it still reports
`pixelSemanticsVerified: false`. Disjoint masks prove that the supplied body
and face regions do not overlap. They do not independently prove that the
upstream model found the correct anatomy or that every face pixel was labeled
correctly. No source image pixels are altered.

Run the audit with Node 22:

~~~bash
GEEHUB_DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox" \
  npm run inspect:frames -- ./frame-sequence.json
~~~

A successful audit reports `ready-for-geometry` only after sequence structure,
actual mask bytes, binary pixel values, non-empty foreground, and body/face
disjointness all pass. The audit's pixel summary is copied into the registered
segmentation sidecar. The bridge adapter refuses a fabricated or incomplete
pixel audit. During render-job preparation, the worker re-decodes the local
mask files and compares the result with the registered summary; a changed mask
or stale pixel audit blocks the job. The resulting render job carries the
fresh pixel audit as evidence while retaining
`pixelSemanticsVerified: false`.

`core/frame-sequence-bridge.js` converts a successful audit into two typed,
checksummed bridge frame sets: `segmentation` and `landmarks`.
`core/frame-sequence-registration.js` persists those documents safely,
verifies their actual checksums, and publishes the manifest revision last.

The decoder is not a segmentation model and does not detect a face. It verifies
the format and internal relationship of masks supplied by an upstream producer.
A future model or independent detector must establish anatomical correctness
before the system can claim semantic face protection.

## Fixed-topology mask-derived mesh

`core/mask-mesh.js` builds a first 2D correspondence mesh from at least two decoded body/face mask frames. It lays a bounded regular grid over each frame's body-mask bounds and assigns stable row/column vertex IDs. Candidate triangles are retained only when every covered pixel centre is body foreground and protected-face background in every supplied frame. Row-prefix sums make the exhaustive scanline coverage check independent of triangle area.

The output contains one shared triangle index list and topology digest, plus per-frame source-pixel coordinates for the same vertex IDs. This is deliberately conservative: a moving or changing silhouette may remove triangles from the common topology. The result reports candidate/stable counts, coverage ratio, edge-connected component count, and rejection reasons. A mesh is ready only when the retained triangles form one edge-connected component and meet the configured minimum count; fragmented grids return `disconnected`, while sparse connected grids return `insufficient-coverage`.

After a successful mask-file audit, `frame-sequence-worker.js` now builds this mesh and returns it as `maskMesh`, with a separate `meshReady` flag. `readyForGeometry` still means that the sequence and its mask pixels passed intake; it does not imply that enough stable triangles were found. The mesh proves only that its retained triangles lie inside the supplied body masks and outside the supplied face masks. It does not prove anatomical segmentation correctness, so `pixelSemanticsVerified` remains false.

The mesh is not yet registered as a typed bridge frame set, mapped through the articulated growth landmarks, or passed into `renderGrowthMesh`. It is a measured source-space surface, not a deformation or render. Tests in `core/mask-mesh.test.js` cover moving-frame correspondence, exhaustive mask coverage, face exclusion, invalid masks, ordering, and insufficient configured coverage.

## Articulated mask-mesh deformation

`core/mesh-deformation.js` transfers the articulated growth mapper from its sparse landmark anchors onto the stable vertices produced by `core/mask-mesh.js`. It fits a distance-weighted local affine field in source-pixel coordinates, so the same vertex IDs and triangle indices can be evaluated against each frame's own tracked landmarks and source-space mesh coordinates. `buildGrowthDeformationSequence` requires one landmark frame, one approved body target, and one decoded protected-face mask tagged with the same frame number for every mesh frame; growth channels may hold or increase, but cannot regress.

A frame plan is renderable only when its triangles remain non-degenerate and keep their orientation, no used vertex leaves the image, and neither the source nor destination triangles overlap the supplied face mask. A frame that needs camera clearance reports `requires-reframe`; foldovers and face collisions are blocked instead of being drawn. `renderGrowthDeformationFrame` passes only a ready plan to the existing piecewise-affine Canvas warp. The face pixels themselves are not moved by this first slice; the guard prevents the body warp from painting across the protected face region.

The focused tests cover baseline identity, articulated surface movement, fixed topology under source motion, cumulative-growth regression, renderer handoff, frame/mask evidence mismatch, gradual temporal progression, velocity and acceleration blocking, irregular timestamps, and invalid temporal configuration. The fake-canvas test verifies per-triangle draw calls, not browser pixel output. The local-affine field is a first deformation model: it does not yet model muscle volume, clothing, depth, or occlusion, and the mask mesh is not yet registered as a typed bridge frame set. `buildGrowthDeformationSequence()` now measures each used vertex's change in deformation offset against the source body height and actual adjacent timestamps. Configurable velocity and acceleration limits block the entire sequence, and every frame plan, when a threshold is exceeded. These guards measure geometric continuity; they do not prove perceptual smoothness or correct tracking.

## RGBA body-layer rasterizer

`core/pixel-frame-renderer.js` now rasterizes one already-validated
`geehub.growth-deformation-frame` into a transparent RGBA body layer. It
requires the exact source frame number, its decoded binary body mask, and its
decoded protected-face mask. Every source triangle must remain inside body
foreground; body and face masks must be disjoint; source and destination
triangles must preserve orientation and avoid protected-face pixels.

The rasterizer walks destination pixel centres, evaluates barycentric
coordinates in each destination triangle, and samples the corresponding
source position with bilinear interpolation in premultiplied-alpha space.
Shared triangle edges are written once and must agree on their source
correspondence. The source RGBA buffer is read-only. Pixels outside the
deformed mesh are transparent in the returned layer, and the coverage mask
records exactly which output pixels were produced. The current safety ceiling
is 12 million pixels per frame.

This is the first CPU pixel-buffer implementation, not yet a complete frame
worker or compositor. The new `core/rgba-png.js` module provides
`decodeRgbaPng()` and `encodeRgbaPng()` for bounded, lossless PNG buffers.
The decoder accepts non-interlaced 8-bit RGB/RGBA source images, expands RGB
to opaque RGBA, verifies chunk CRCs and ordering, and reconstructs all five
standard PNG row filters. The encoder writes non-interlaced 8-bit RGBA PNGs
with fresh CRCs and lossless compression. Both directions default to a
12-million-pixel and 128 MiB ceiling. Palette, grayscale, 16-bit, interlaced,
and tRNS inputs are refused. Ancillary color-profile/gamma metadata is not
interpreted or preserved, so channel samples are lossless but color-management
metadata is not. Seven focused tests cover the codec's supported formats,
round-trip behavior, row filters, corruption handling, and size limits.
### File-backed single-frame body-layer worker

The codec returns bytes. The new `core/frame-file-renderer.js` connects
that boundary to the CPU rasterizer for one frame. It reads a source RGB/RGBA
PNG, the exact frame's binary grayscale body and protected-face masks, and a
serialized ready `geehub.growth-deformation-frame` plan. The plan must carry
the stable vertex and triangle identities and a topology digest. The worker
checks input file types and byte ceilings, rejects symlinked inputs and files
that change during reading, verifies all image dimensions, reruns the pixel
renderer, and encodes the transparent body layer as a new lossless RGBA PNG.

The output PNG and adjacent `.receipt.json` are created exclusively; neither
may already exist. The receipt records SHA-256 digests for the source frame,
both masks, deformation plan, and output, together with frame/time, topology,
vertex/triangle counts, and raster coverage. These digests describe the bytes
actually consumed; this first worker does not yet compare the source-frame or
mask digests with registered bridge frame-set descriptors. That lineage check
belongs to the queued-job batch adapter. If receipt creation fails, the worker
removes only the output file it created, identified by its device and inode.
It never writes to the source, mask, or plan paths. The output directory must
already exist.

Run one prepared frame with Node 22:

~~~bash
npm run render:frame -- ./source.png ./body-mask.png ./face-mask.png ./frame-001.plan.json ./renders/frame-001-body.png
~~~

This command consumes a plan already produced by the validated sequence
deformation pass; it does not derive plans from a queued bridge job or process
a whole sequence. The result remains a transparent body layer, not a complete
frame. Background reconstruction, protected-face compositing, batch scheduling,
and Resolve export remain open, and `pixelSemanticsVerified` remains false.
Five focused tests cover the lossless file round-trip and receipt digests,
source preservation, existing-output refusal, receipt-failure rollback,
symlink/path-collision refusal, and invalid dimensions/plans.

## Registered-evidence render-job preparation

`core/bridge-render-job.js` reads the exact segmentation and landmark sidecar
text associated with one registered sequence. It checks each sidecar's
SHA-256 against the manifest, verifies source/sequence/frame-range agreement,
requires separate body and face mask references, and confirms that the
landmark observations cover the same ordered timestamps. It then combines
those observations with at least two approved cumulative growth states,
preserving the identity, source-motion, ground-contact, connected-mesh, and
temporal constraints. The queued job records the exact segmentation and
landmark frame-set IDs, checksums, sequence, and format. The source frame rate
is preserved, including fractional rates such as 23.976 FPS. Pixel semantics
remain explicitly unverified.

With Node 22, prepare a local bundle after registration:

~~~bash
GEEHUB_DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox" \
  npm run prepare:render -- ./registered-manifest.json ./growth-states.json render-phase-01 ./BridgeJobs/render-phase-01
~~~

The growth-state JSON may be an array or an object with a `states` array.
If the manifest contains multiple registered sequences, append the desired
sequence id. The command reads the registered sidecars from the local Dropbox
mirror, reconstructs the frame sequence, and rechecks every referenced body
and face PNG checksum and dimension before writing a new job JSON and queued
manifest into the bundle directory using exclusive creation. It prints the subsequent `stage:bridge` command.
New queue operations require the exact frame-evidence reference; older
version-one payloads without that additive field remain stageable. Staging
rechecks the actual sidecar files before the Resolve inspector can audit the
job. The Resolve integration remains a read-only handoff inspector;
no local render is claimed by job preparation.

## Source-timestamped deformation plan bundle

The `prepare:render` command now completes the geometry-planning stage before it
publishes a queued bundle. After reconstructing the registered mask mesh and
rechecking the actual body/face PNG digests, it decodes the protected-face masks
again and samples the approved cumulative growth states at each frame's
source-clip timestamp over the immutable source duration. The resulting
`geehub.render-plan-bundle` is written as
`<job-id>.deformation-plans.json` beside the portable job and queued manifest.
It carries the exact three frame-set IDs/checksums, topology digest, growth-state
IDs, temporal audit, and one fixed-topology deformation plan per registered
frame. A geometric, face, camera-boundary, or temporal failure prevents bundle
publication; the job and plan files are removed if the final manifest cannot
be written. The bundle is a plan artifact, not rendered imagery. `render:frame`
consumes one extracted source PNG and one frame plan; `render:batch` now
consumes the bundle and a checksummed source-frame index to write the complete
transparent body-layer sequence with a sequence receipt. Background reconstruction, protected-face and clothing compositing, and video export remain open. The FFmpeg-backed source-frame extraction/index worker is implemented and exercised in CI against a synthetic two-frame MP4; local user footage, Dropbox, and Resolve runtime remain unverified.

## Source-video frame extraction

`core/source-frame-extractor.js` and `tools/extract-source-frames.js` add
`npm run extract:frames`. The command accepts a local bridge manifest, a
registered segmentation frame-set id, and a new output directory. It resolves
the immutable source video and checksummed segmentation sidecar beneath the
configured Dropbox root, hashes the source bytes, and asks `ffprobe` for the
selected video stream's frame timestamps and dimensions. Every registered
frame number and timestamp must agree with the probed source within a quarter
frame before extraction begins.

The worker invokes `ffmpeg` without a shell, selects exactly the registered
frame range, and writes PNGs into a newly created directory. Each PNG is
decoded again through the Studio's bounded RGBA PNG codec and checked against
the registered dimensions before its SHA-256 is entered into
`source-frame-index.json`. The index preserves both the registered
`timeSeconds` and the probed source PTS, and includes the source checksum,
stream identity, tool versions, timestamp origin, and extraction count. The
source is hashed again after extraction; a changed source or incomplete frame
range rolls back only outputs created by that attempt.

Run with Node 22, FFmpeg and FFprobe installed:

~~~bash
GEEHUB_DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox" \
  npm run extract:frames -- ./job.manifest.json segmentation-frame-set-id ./source-frames
~~~

The output directory must not already exist. Set `FFMPEG_PATH` or
`FFPROBE_PATH` when the executables are not on `PATH`. The command writes a
source-frame index ready for `render:batch`; its receipt records the source,
timestamp, and extraction checks. Before batch rendering, the batch worker
rehashes the immutable source video, reruns FFprobe against the selected stream,
and asks FFmpeg to decode the exact registered frame range again into a
temporary directory. It compares the decoded RGBA pixels of every indexed PNG
with that fresh source decode, not merely the PNG's declared checksum. The
sequence receipt sets `sourceFrameDerivationVerified` and
`sourceFramePixelsRevalidated` only after the source hash, PTS inventory, and
all frame pixels agree. FFmpeg/FFprobe must therefore be available during
`render:batch` as well as extraction; set `FFMPEG_PATH` and `FFPROBE_PATH`
when their executables are not on `PATH`. The CLI forwards those overrides to
the independent verifier. This independently verifies source
derivation; it does not establish that the upstream body/face masks are
anatomically correct, so `pixelSemanticsVerified` remains false. The package
workflow exercises the adapter checks and a real synthetic-video path.
Background reconstruction, protected-face/clothing compositing, and finished
video export remain open.

## AI creative-workstation framework

The studio now has a first executable layer for AI-directed construction:
- core/creative-project.js provides a versioned graph for source media, shots, subjects, masks, geometry, materials, assets, effects, camera, lighting, audio, transitions, composites and renders. Source nodes are immutable; changes append operation records and project versions.
- core/capability-registry.js provides adapter registration and runtime capability discovery. A capability is available only when a real adapter registers it; unavailable tools are surfaced as blockers.
- core/director-planner.js converts natural-language directions into semantic operations and capability requirements. Its current interpreter is a deterministic starter parser, not a connected LLM.
- The Studio UI now includes an AI Director command surface. It records a draft creative-operation graph and reports which tools would be needed. The manifest export includes the graph and plan.
- Focused tests were added for graph lineage, immutable sources, direction decomposition, and honest capability blocking.

This creates the shared project language and orchestration boundary for editing, constructing assets, effects, and scene changes. It does not yet execute generative video, segmentation, garment simulation, environment reaction, or final rendering. No provider is registered by default, so the UI correctly reports those operations as waiting for connected tools.

## First implementation boundary

This branch establishes the product contract and deterministic growth-state core. It does not claim to solve photorealistic video deformation yet. The renderer is an adapter boundary: it can later connect to a native 3D character pipeline, a generative video model, or a hybrid tracked-compositing system without changing the growth-state model.

## First acceptance test

Use a short portrait source clip. Establish a baseline state, create at least three increasing states, and verify:
- identity landmarks remain locked;
- stature and limb length increase with regional mass;
- no state regresses below an earlier approved state;
- interpolation is smooth at arbitrary timestamps;
- every render records its source and state lineage.

## Runtime

The core is dependency-free JavaScript (ES modules). It can run in a browser or Node. Renderer adapters must implement the contract described in core/renderer-contract.md.

## Development sequence

- Slice 001: project model, state interpolation, continuity validation.
- Slice 002: source-video ingest and frame/landmark tracking.
- Slice 003: identity-locked body segmentation and 2D/3D correspondence.
- Slice 004: articulated growth-landmark mapping, caller-supplied triangle warp, fixed-index mask-derived grid, checksummed topology registration, CPU pixel rasterization, file-backed single-frame output, manifest-bound batch body-layer output, and FFmpeg-backed source-frame extraction; background reconstruction, protected-face/clothing compositing, and export remain open.
- Slice 005: complete compositing, temporal validation, Resolve assembly, and export.


## Registered mask-mesh evidence

A successful frame-sequence inspection produces three immutable bridge frame sets: segmentation, landmarks, and deformation. The deformation set is a geehub.mask-mesh-evidence sidecar containing the fixed grid dimensions, topology digest, stable vertex and triangle identities, triangle indices, and per-frame source-pixel coordinates. Its coordinates remain in source space; registration does not apply growth or move pixels.

`npm run register:frames` writes all three sidecars to revisioned Dropbox paths, reads each one back to verify its SHA-256 checksum, and publishes the manifest last. The optional `GEEHUB_FRAME_DEFORMATION_URI` environment variable overrides the default mesh-sidecar destination. The manifest revision advances by three for the three frame-set events; all three sidecars are stored under the resulting revision directory.

New `npm run prepare:render` jobs require exactly one registered segmentation, landmark, and deformation frame set from the same sequence. The command reads all three sidecars, rechecks the actual body/face PNG bytes, decodes their pixels, and rebuilds the stable mask mesh from those pixels. It then constructs the canonical deformation-evidence document and compares the complete registered sidecar—including topology, vertex/triangle identities, and every per-frame coordinate—with the fresh reconstruction. Re-hashing a changed sidecar and updating its manifest checksum does not bypass this comparison.

The queued job binds `deformationFrameSetId`, `deformationChecksum`, `topologyId`, `vertexCount`, and `triangleCount` into its additive `frameEvidence` record and lists the exact three frame-set IDs as inputs. The manifest queue validator, local staging courier, and Resolve Free inspector compare those references against the manifest. Staging also hashes the actual three sidecar files before publishing the exchange. Older v1 jobs without the additive deformation fields remain readable; every new preparation requires the exact mesh.

The sidecar preserves `faceExclusionVerified=true` as a mask-relative coverage claim and `pixelSemanticsVerified=false` as an explicit limitation. Rebuilding the mesh proves that the registered geometry matches the supplied mask pixels; it does not prove that an upstream model correctly recognized anatomy. No local Dropbox or Resolve runtime has been exercised, and the frame worker has not yet written transformed source frames. The next construction is the lossless per-frame worker that consumes this exact mesh revision and the validated growth-deformation plans.


## Manifest-bound batch body-layer rendering

core/frame-batch-renderer.js consumes the queued bridge manifest, portable
render job, source-timestamped deformation-plan bundle, and an external
geehub.source-frame-index version 1. The index file lives beside the extracted
PNG frames and records sourceAssetId, sourceChecksum, sequenceId, firstFrame,
lastFrame, format (width, height, fps, frameCount), and one
{ frame, timeSeconds, file, sha256 } entry per image. Each file must be a
unique PNG basename in that same directory. The registered source must have
a SHA-256 checksum, and the index must repeat it exactly.

Before writing, the worker validates the queued job and plan bundle against
the manifest, reads and hashes all three registered segmentation, landmark,
and deformation sidecars from the configured Dropbox root, and checks the
sidecar source/sequence/range. It recomputes the registered mesh topology
digest, checks stable vertex/triangle inventories, matches every plan's
source points and topology to its registered mesh frame, and verifies each
extracted PNG and both mask files against their indexed/registered digests.
The existing frame-file-renderer.js then performs the actual PNG decode,
binary-mask checks, CPU triangle rasterization, RGBA encode, and per-frame
receipt creation.

Run after frame extraction and prepare:render:

~~~bash
GEEHUB_DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox" \
  npm run render:batch -- \
  ./render-phase-01/render-phase-01.manifest.json \
  ./render-phase-01/render-phase-01.render-job.json \
  ./render-phase-01/render-phase-01.deformation-plans.json \
  ./extracted/source-frame-index.json \
  ./renders/render-phase-01
~~~

The output directory must not already exist and must not be inside the extracted
source-frame directory. The worker writes one transparent body-layer PNG and
one adjacent digest receipt per frame, then publishes sequence.receipt.json
last. If a later frame fails, it removes only outputs whose bytes still match
this batch's receipts and leaves the source frames and registered evidence
untouched. A successful receipt records the manifest/job, plan bundle, source
index, all three registered sidecars, every source/mask/plan digest, every
output digest, and the exact frame count.

This is a body-layer batch, not a finished sequence of composited frames. The
source-frame index is supplied by an external extraction process; the worker
verifies the index and frame bytes but does not independently prove that the
PNG files were extracted from the registered video, so
sourceFrameDerivationVerified remains false. Upstream mask semantics also
remain unverified. Background reconstruction, protected-face and clothing
compositing, automatic source-video extraction, and Resolve export remain open.
The ten focused batch tests use the real PNG codec, mask decoder, and CPU
pixel rasterizer with synthetic frames. GitHub Actions package run 44390673983
passed all 140 Node tests and all 14 Resolve Lua tests, passed Lua 5.4 syntax
validation, and built/uploaded the portable package. The separate Validate
GEEHUB data run 44390674032 failed only at browser repository-link validation
for the four stale project tuples already recorded in STATE.md. These checks
do not establish a local Mac/Dropbox/Resolve run or a render of user footage.


## Conservative temporal scene-plate prototype

`core/temporal-scene-plate.js` adds
`buildTemporalScenePlate(frames, cameraRegistration, options)`, an
in-memory background-repair primitive. It considers only pixels covered by
the union of the registered body masks. For each such pixel it searches other
frames for opaque samples that are outside both the body and protected-face
masks. At least two donors are required by default, and their per-channel
spread must remain within the configured threshold (12 levels by default).

The plate copies one actual donor pixel: it chooses the candidate nearest the
donor colour mean, with a temporal-midpoint tie-break. It does not average,
synthesize, or inpaint colour. The result includes a transparent RGBA plate,
coverage and unresolved masks, the selected donor frame number for every
filled pixel, donor counts, and per-pixel colour-spread measurements. A pixel
with too few donors or unstable colour remains transparent and is marked
unresolved. Protected-face pixels are never donors.

Version 1 deliberately accepts only an externally supplied
`geehub.camera-registration-evidence` v1 record marked verified, with
identity transforms for every frame. The module validates that record's
shape, frame/timestamp alignment, dimensions, and checksum field; it does not
estimate camera motion or independently prove the external fixed-camera
assertion. The registration record is an external assertion until a
camera-registration producer is implemented.

The estimator is bounded to 2 million pixels, 32 frames, and 32 million
frame-pixel samples by default. This is an in-memory repair plate for the
union of body-hidden regions, not a complete background image or file-backed
compositor. It does not fill regions for which no stable donor exists, and it
is not yet connected to `render:batch`. A future camera-registration
producer, file-backed plate writer, provenance receipt, and complete-frame
compositor remain required. Ten focused tests cover donor selection, face
exclusion, unstable lighting, empty repair regions, camera-registration
refusal, mask integrity, timestamp alignment, and work limits. The package
workflow runs these through the existing `npm test` command.

## File-backed temporal scene-plate artifact

`core/scene-plate-artifact.js` exports
`writeTemporalScenePlateArtifact({ plate, cameraRegistration, outputDirectory })`.
It persists an already-built `buildTemporalScenePlate()` result into a new directory:
`scene-plate.png` is the transparent RGBA repair layer,
`coverage-mask.png` and `unresolved-mask.png` are opaque RGBA binary masks
(white means covered/unresolved; black means clear), and
`donor-provenance.bin` stores one seven-byte record per row-major pixel:
little-endian signed 32-bit donor frame (-1 means no donor), unsigned
16-bit donor count, and one-byte maximum channel spread. The final
`scene-plate.receipt.json` records each artifact's SHA-256,
byte length, frame/timestamp range, camera-registration reference, thresholds,
coverage counts, and the provenance layout.

The writer validates that masks, alpha, counts, donor identities, and
provenance agree before creating the destination. Each file is created
exclusively, synced, read back, and compared byte-for-byte before its digest
is accepted. The receipt is published last, and rollback removes only files
whose bytes still match this attempt. A partial plate is still preserved as an artifact,
but `readyForComposite` is false and its unresolved pixels remain
transparent. The scene-plate result now carries `frameTimesSeconds` alongside
frame numbers so the artifact receipt can retain the source timing.

This is a durable writer for an in-memory result, not a file-backed source
reader or complete compositor. It does not re-read source video/PNG/mask
bytes, independently estimate camera motion, prove mask anatomy, composite
the transformed body, or export a finished frame. The receipt therefore keeps
`sourceFrameDerivationVerified`, `cameraRegistrationIndependentlyVerified`, and
`pixelSemanticsVerified` false.


## Single-frame evidence-bound compositor

`core/complete-frame-compositor.js` exports
`composeGrowthFramePixels({ sourceFrame, bodyMask, protectedFaceMask, bodyLayer, scenePlate })`.
It accepts one timestamped source RGBA frame, its binary body and protected-face
masks, the corresponding transparent pixel-renderer body layer, and a version-one
temporal scene plate. The compositor checks frame/time/dimension agreement,
binary-mask integrity, donor provenance, scene-plate counts, body-layer coverage,
and face exclusion before allocating the output. The default working limit is
two million pixels.

The shared scene plate describes the union of body-hidden pixels across the
sequence, but the compositor applies a plate sample only where the current
frame's body mask is foreground. It therefore does not overwrite background
that is already visible in this frame. The transformed body is composited with
straight-alpha source-over. Protected-face pixels are copied directly from the
original source frame and body-layer coverage over those pixels is rejected.

If an original-body pixel has neither a plate sample nor full opaque coverage
from the transformed body, its original source pixel is retained and the output
marks it unresolved. Such a result has status `partial-frame` and is not ready
for assembly. A frame with no unresolved original-body pixels is marked
`complete-frame` and `readyForAssembly=true`; this is a per-frame coverage
claim, not a claim that the mask anatomy or camera registration is correct.
Every result keeps `readyForExport=false`, `sourceFrameDerivationVerified=false`,
`cameraRegistrationIndependentlyVerified=false`, and
`pixelSemanticsVerified=false`. The result is in memory: PNG persistence,
sequence orchestration, clothing/depth response, and Resolve export remain
separate work.

Ten focused tests cover background replacement only beneath the current body,
visible-background preservation, unresolved pixels, protected-face priority,
alpha compositing, timestamp mismatch, mask overlap, incomplete plate evidence,
and input preservation. The isolated Node 22.16.0 harness passed 10/10 tests
and both syntax checks. The first repository package run executed 180 Node
tests with 179 passing; a fixture-ordering issue was corrected so the
compositor's own mask-overlap guard is reached after a valid plate is built.
The focused rerun passed 10/10 tests. The corrected package workflow
[45479018750](https://github.com/Ardhtor/GEEHUB/actions/runs/45479018750)
completed successfully: all 189 Node tests, all 14 Resolve Free Lua tests,
Lua 5.4 syntax validation, CLI syntax/help checks, package build, and artifact
upload passed. No personal footage or local Dropbox/Resolve session was used.


## File-backed single-frame compositor

`core/complete-frame-file-compositor.js` exports
`composeGrowthFrameFiles({ sourcePath, bodyMaskPath, protectedFaceMaskPath,
bodyLayerPath, batchReceiptPath, sourceFrameIndexPath, scenePlateDirectory,
outputPath })`. The command-line entry is
`npm run compose:frame -- <source.png> <body-mask.png> <protected-face-mask.png>
<body-layer.png> <batch-receipt.json> <source-frame-index.json>
<scene-plate-directory> <new-output.png>`.

The worker binds the selected source PNG to the exact frame and checksum in the
source-frame index, then requires a complete batch receipt that records fresh
FFprobe timeline validation and pixel comparison against a new FFmpeg decode.
That source-derivation claim is inherited from the batch receipt; this compositor
does not rerun FFmpeg. It verifies the selected body-layer receipt, the actual
source/mask/body-layer bytes, and the scene-plate receipt plus all four persisted
artifacts: RGBA plate, coverage mask, unresolved mask, and seven-byte donor
ledger. It reconstructs the in-memory scene-plate evidence and calls the
existing pixel compositor rather than duplicating its pixel rules.

Because the body-layer file receipt records raster coverage but does not persist
a separate coverage-mask PNG, file intake derives visible coverage from
non-zero alpha. Transparent body-layer pixels must be transparent black, and
the visible-alpha count cannot exceed the recorded raster coverage. This is
conservative: transparent samples do not cover original-body pixels, so those
pixels remain unresolved unless the plate repairs them.

The output PNG is created exclusively, read back, and hashed; its adjacent
`.receipt.json` is published last. Existing output or receipt files are refused.
The receipt binds the batch, source index, source frame, body-layer receipt,
masks, scene-plate receipt, donor files, and output digest. Partial frames remain
partial and retain their unresolved count. `readyForExport`,
`cameraRegistrationIndependentlyVerified`, and `pixelSemanticsVerified` remain
false. This produces one PNG candidate, not a video or a Resolve render.


The file-backed compositor's nine integration tests passed in the same
package workflow [45479018750](https://github.com/Ardhtor/GEEHUB/actions/runs/45479018750).
The partial-frame fixture was corrected to use transparent black under zero
alpha; the production guard was retained. The workflow also ran
`node --check tools/compose-growth-frame.js` and
`npm run compose:frame -- --help` successfully.


## File-backed sequence compositing

`core/sequence-file-compositor.js` adds `composeGrowthFrameSequenceFiles()` and the `npm run compose:sequence` command. It consumes the complete body-layer batch receipt, exact source-frame index, registered segmentation sidecar, persisted scene-plate directory, and configured Dropbox root.

The worker binds the segmentation sidecar to the frame-set id and checksum recorded in the batch receipt. It checks contiguous frame numbers and timestamps across the source index, batch, and sidecar; verifies every body/face mask byte digest before creating output; resolves each mask URI beneath the Dropbox root without following symlinks; and delegates each frame to `composeGrowthFrameFiles()` so the single-frame pixel rules remain centralized.

A successful run writes one complete-frame candidate PNG and its per-frame receipt for every indexed frame, then publishes `sequence.receipt.json` last. The receipt distinguishes a fully processed `complete-sequence` from a fully processed but unresolved `partial-sequence`; `allFramesAccountedFor` can be true while `readyForAssembly` is false. `readyForExport` remains false. If any later frame fails, the worker removes only earlier output files whose bytes still match this attempt and removes the new directory only when it remains the same empty directory.

Run it with:

~~~bash
GEEHUB_DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox" \
  npm run compose:sequence -- \
  ./batch/sequence.receipt.json \
  ./source-frames/source-frame-index.json \
  ./registered/segmentation-sidecar.json \
  ./scene-plate \
  ./composited-sequence
~~~

The output parent must already exist and the output directory must be new. The supplied segmentation sidecar must be the exact registered revision named by the batch receipt. Partial frames are preserved as explicit artifacts but prevent sequence assembly. This produces a PNG sequence, not a video or a Resolve timeline. Camera registration remains externally asserted, mask anatomy remains unverified, and no clothing/depth response or export-ready flag is inferred.


The first sequence-compositor package run [45695407336](https://github.com/Ardhtor/GEEHUB/actions/runs/45695407336) passed all 193 Node tests, all 14 Resolve Free Lua tests, Lua 5.4 syntax validation, package construction, and artifact upload. The package workflow now also includes explicit syntax and `--help` checks for `tools/compose-growth-sequence.js` and `npm run compose:sequence`.

The follow-up package run [45695740115](https://github.com/Ardhtor/GEEHUB/actions/runs/45695740115) passed 193/193 Node tests, 14/14 Resolve Free Lua tests, Lua syntax validation, `node --check tools/compose-growth-sequence.js`, `npm run compose:sequence -- --help`, package construction, and artifact upload.
