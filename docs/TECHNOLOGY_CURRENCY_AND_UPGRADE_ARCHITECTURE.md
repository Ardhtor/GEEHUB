# GEEHUB Technology Currency and Upgrade Architecture

**Baseline date:** 2026-11-23  
**Purpose:** keep GEEHUB technologically current without making the continuity corpus dependent on any single vendor, model, application, or API.

## Operating principle

GEEHUB should have a stable continuity core and replaceable execution engines. The core owns project identity, source provenance, permissions, versioned state, relationships, and the distinction between observation, interpretation, canon, and experiment. Engines perform specialist work and may be replaced as better tools become available.

The system should not chase every release. A technology enters the active stack only after a small representative test demonstrates a real improvement in quality, control, reliability, cost, speed, portability, or accessibility. Keep a dated technology watchlist for promising tools that are not yet accepted.

## Stable core

- **Canonical records:** human-readable Markdown and structured JSON, versioned in Git.
- **Media provenance:** preserve original files and stable source identifiers; derived images, clips, meshes, audio, and renders receive separate records.
- **Continuity manifests:** explicit character identity, proportions, stage/baseline, camera, wardrobe, environment, and transformation constraints.
- **Interchange:** prefer open or widely supported formats where practical, including PNG, JPEG, WAV, MP4, glTF/GLB, USD where supported, JSON, and OpenTimelineIO.
- **Execution adapters:** isolate vendor APIs and application-specific automation behind small adapters. Never let an API response become canon without review.
- **Permission model:** distinguish private personal assistant context from shared project material; collaboration must be scoped, attributable, and revocable.
- **Portable operation:** every important project should retain a useful local path and documented export, rather than depending exclusively on one cloud provider.

## Replaceable engine families

1. **Research and language:** web retrieval, source comparison, long-context synthesis, coding assistants, and task agents.
2. **Image:** reference-aware generation and editing, segmentation, restoration, upscaling, and batch consistency.
3. **Video:** shot and frame inspection, reference-driven generation, editing, interpolation, compositing, and timeline exchange.
4. **3D and motion:** modeling, sculpting, rigging, deformation, simulation, motion capture, Gaussian splats, and procedural environments.
5. **Audio:** speech cleanup, voice workflows, sound design, procedural ambience, and music tools.
6. **Workspace and automation:** browser interfaces, local scripts, desktop automation, storage connectors, Git workflows, and render orchestration.

Each family should expose a consistent job contract: inputs, source references, requested operation, settings, outputs, logs, cost/time if available, model/application version, and human review status.

## Current verified technology note: Blender

As of 2026-11-23, Blender's official release information lists Blender 5.3.0 as released on November 10, 2026, and Blender 5.2.4 LTS as the current long-term-support maintenance build. Blender 5.3 adds native 3D Gaussian Splat import for PLY and SPZ, Geometry Nodes foundations for custom fluid simulations, EEVEE material lighting nodes, Cycles dispersion and anisotropic roughness, improvements to the Video Sequencer, and initial OpenTimelineIO support. Blender 5.2 LTS is supported until July 2028 and is the conservative production choice where stability matters more than the newest features.

Sources:
- https://www.blender.org/releases/5-3/
- https://www.blender.org/releases/5-2/
- https://www.blender.org/press/blender-5-3-release/

**GEEHUB implication:** evaluate Blender 5.3 for Gaussian-splat environment capture, procedural set construction, and timeline interoperability. Keep the production baseline on a tested stable/LTS build until the relevant GEEHUB scripts, add-ons, and assets pass a compatibility test. Do not silently upgrade production files.

## Technology intake and validation

For each candidate, record: vendor/project, exact product and version, official release date, source URL, access method, license/usage constraints, hardware requirements, API or application availability, data retention/privacy implications, export formats, pricing if relevant, and last verified date.

Run a bounded acceptance test using a known GEEHUB sample. Compare against the current baseline for:
- identity and visual continuity;
- controllability and repeatability;
- source fidelity and provenance;
- export quality and editability;
- runtime, cost, and hardware demand;
- failure recovery and portability.

Record one of four states: **watching**, **testing**, **accepted**, or **retired**. Include a reason and date for every state change.

## Freshness limits

This document is a dated snapshot, not a claim of continuous monitoring. Check official vendor release notes and API documentation at the time a technology is selected or upgraded. Third-party model trackers can help discover candidates but must not be treated as definitive product documentation. Recheck pricing, availability, model IDs, terms, and capabilities before implementation.

## Immediate engineering direction

Build a technology registry and adapter contract before adding more integrations. Then validate one complete vertical workflow end-to-end: source media → provenance record → frame/reference inspection → continuity-aware transformation → editable 3D or video output → review → Git/Dropbox archive. This is more valuable than collecting disconnected tool integrations. Keep the workflow modular so the image, video, 3D, and language engines can change independently.
