# Renderer Adapter Contract

The growth-state core is renderer-independent. A renderer consumes:
- the immutable source video reference and timing metadata;
- tracked identity landmarks and body-region correspondences;
- a sampled growth state for each output timestamp;
- scene constraints (ground plane, camera, clothing, props);
- validation settings.

A renderer adapter must expose:

```ts
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
```

## Required invariants

- Facial identity landmarks are protected from body-scale transforms.
- Body regions deform as a connected articulated system.
- Feet/ground contact and joint placement remain coherent.
- Garments follow the deformed body with material-specific tension and folds.
- Temporal tracking prevents flicker, landmark jumps, and texture swimming.
- Source frames remain available for comparison and rollback.

## Render status

The adapter must return explicit states: `queued`, `processing`, `validated`, `failed`. An output is never marked complete until an actual artifact exists and validation has run.
