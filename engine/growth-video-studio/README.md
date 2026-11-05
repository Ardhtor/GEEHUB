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

Chest depth and regional mass channels are deliberately deferred. They require segmentation-derived silhouette geometry, depth, or a 3D body representation; this module does not fake them with centerline landmarks. Face pixels are protected only when the caller's triangle mesh excludes the face region. Automatic segmentation, landmark detection, and mesh generation are not implemented here.

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
landmarks, confidence, and temporal continuity. Segmentation records must name
separate body and face PNG masks. The body-mask descriptor must declare
`excludesFace: true`; the face-mask descriptor must declare
`protectsIdentity: true`.

`core/frame-sequence-worker.js` verifies the referenced mask files beneath the
configured Dropbox root. It refuses symlinked paths, checks each actual
SHA-256 digest, and reads the PNG signature and IHDR dimensions. Run the audit
with Node 22:

~~~bash
GEEHUB_DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox" \
  npm run inspect:frames -- ./frame-sequence.json
~~~

A successful audit reports `ready-for-geometry`. This means the sequence,
mask files, checksums, and declared dimensions agree. It does **not** mean a
segmentation model ran or that mask pixels were semantically inspected:
face-exclusion and identity-protection remain producer declarations, and the
worker neither decodes nor changes image pixels. No frame deformation or video
render is performed by this intake step.

`core/frame-sequence-bridge.js` converts a successful local audit into two
typed, checksummed bridge frame sets: `segmentation` and `landmarks`. It
returns the exact JSON sidecar contents and their SHA-256 digests, together
with a new manifest revision. The caller must persist those sidecars at the
returned Dropbox URIs before staging. Render jobs now require exactly one
segmentation and one landmark frame set from the same sequence, with matching
frame range, dimensions, FPS, and checksums. `stageBridgeExchange` verifies
the actual sidecar files and hashes before it writes the job and manifest.
This closes the metadata handoff, but the sidecar writer/CLI and semantic mask
inspection remain open. The frame-sequence suite now includes the bridge
conversion and incomplete-audit refusal cases; the complete package workflow
passed 54 Node tests and 10 Resolve Lua tests on 2026-11-05.

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
- Slice 004: articulated growth-landmark mapping and caller-supplied triangle warp; automatic masks and temporal mesh tracking remain open.
- Slice 005: temporal render, validation, and export.
