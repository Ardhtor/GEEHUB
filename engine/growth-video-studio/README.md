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

## First implementation boundary

This branch establishes the product contract and deterministic growth-state core. It does **not** claim to solve photorealistic video deformation yet. The renderer is an adapter boundary: it can later connect to a native 3D character pipeline, a generative video model, or a hybrid tracked-compositing system without changing the growth-state model.

## First acceptance test

Use a short portrait source clip. Establish a baseline state, create at least three increasing states, and verify:
- identity landmarks remain locked;
- stature and limb length increase with regional mass;
- no state regresses below an earlier approved state;
- interpolation is smooth at arbitrary timestamps;
- every render records its source and state lineage.

## Runtime

The core is dependency-free JavaScript (ES modules). It can run in a browser or Node. Renderer adapters must implement the contract described in `core/renderer-contract.md`.

## Development sequence

- **Slice 001:** project model, state interpolation, continuity validation.
- **Slice 002:** source-video ingest and frame/landmark tracking.
- **Slice 003:** identity-locked body segmentation and 2D/3D correspondence.
- **Slice 004:** body deformation solver and garment response.
- **Slice 005:** temporal render, validation, and export.
