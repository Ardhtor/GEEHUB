# Renderer Adapter Contract

The growth-state core is renderer-independent. A renderer consumes:
- the immutable source video reference and timing metadata;
- tracked identity landmarks and body-region correspondences;
- a sampled growth state for each output timestamp;
- scene constraints (ground plane, camera, clothing, props);
- validation settings.

A renderer adapter must expose:

    interface GrowthRenderer {
      inspectSource(source): Promise<SourceAnalysis>;
      prepareIdentityLock(source, analysis): Promise<IdentityTrack>;
      renderFrame(input: {
        sourceFrame: VideoFrame;
        identity: IdentityTrack;
        growth: SampledGrowthState;
        scene: SceneConstraints;
      }): Promise<VideoFrame>;
      validateFrame(frame, reference, growth): Promise<FrameValidation>;
      export(frames, audio, settings): Promise<RenderArtifact>;
    }

## Required invariants

- Facial identity landmarks are protected from body-scale transforms.
- Body regions deform as a connected articulated system.
- Feet/ground contact and joint placement remain coherent.
- Garments follow the deformed body with material-specific tension and folds.
- Temporal tracking prevents flicker, landmark jumps, and texture swimming.
- Source frames remain available for comparison and rollback.

## Current 2D geometry primitive

core/growth-mesh.js maps one validated landmark frame between two absolute body states. Stature scales the ankle-to-knee segment; thigh length scales knee-to-hip; torso length scales the hip-center-to-neck/shoulder vertical offsets; shoulder span widens the shoulder pair; arm length scales shoulder-to-elbow and elbow-to-wrist. The ankles remain fixed. The face-center point follows the neck while preserving its offset, but it is excluded from the body-mesh anchor list.

renderGrowthMesh forwards those mapped anchors to the existing piecewise-affine Canvas warp. Its triangle indices address GROWTH_MESH_ANCHORS, not the full tracking list. A caller must supply a valid body-only triangle mesh that excludes the face region. This module does not generate a segmentation mask or infer the triangles. Chest depth and regional mass channels remain deferred until silhouette/depth or 3D geometry is available.

The mapper also returns projectedStatureRatio, outOfFrame, and requiresReframe. A renderer should use these values to adjust framing or reject a pass; it must not silently clamp landmarks back into the frame.

## Render status

The adapter must return explicit states: queued, processing, validated, failed. An output is never marked complete until an actual artifact exists and validation has run.
