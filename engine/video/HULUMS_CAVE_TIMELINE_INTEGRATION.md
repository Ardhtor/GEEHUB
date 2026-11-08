# Hulum's Cave plotline and long-form timeline integration

The Discovery Engine's plotline taxonomy and timeline manifests connect historical analysis to production without confusing narrative stages with editorial cuts.

## Intrinsic plotline taxonomy

The machine-readable definitions live in `research/hulums-cave/INTRINSIC_PLOTLINES.json` and are validated against `engine/video/schemas/plotline.schema.json`:

- **Domestic Intrusion:** private space becomes inadequate.
- **Institutional / Experimental Containment:** a controlled setting attempts to contain or measure a transformation.
- **Triggered Metamorphosis:** a causal event leads from baseline into extended transformation.
- **Remake / Refinement Loop:** a stable premise is revisited and technically refined.
- **Escalation Without Closure:** the process itself remains unresolved at the ending.

A work can carry multiple plotline labels. Classification is an interpretation of its structure; retain the evidence and confidence behind each assignment. A title that resembles a remake is not enough to establish remake genealogy.

## Timeline semantics

A timeline is a continuous timebase with semantic intervals. Each stage has a start and end, but stage boundaries do not imply cuts, mesh swaps, or separate renders. A long-form work may have a baseline, trigger, sustained transformation, environmental registration, escalation, and terminal hold while remaining one continuous event.

Use `engine/video/schemas/timeline.schema.json` for the timeline, `provenance.schema.json` for source and derivative identity, and `asset-register.schema.json` for production inventory. The existing `project-production.schema.json` remains the production safety/pipeline metadata schema; the new schemas extend rather than replace it.

## Project file contract

A Hulum-oriented production project should use:

```text
production/projects/<project-id>/
  01_SOURCE/
  02_FRAMES/
  03_GROWTH_PASSES/
  04_COMPOSITES/
  05_EXPORTS/
  06_AUDIO/
  07_MANIFESTS/
    timeline.json
    provenance.json
    asset_register.json
  production.json
  SHOT_DESIGN.md
  README.md
```

The project-root `production.json` remains the compatibility entry point for Imagine Studio and the existing Blender runner. It points to the extended timeline and provenance manifests. This avoids breaking the current engine while allowing long-form source studies and productions to carry richer time-coded data.

## Teal Titan implementation

The Gold's on 5th production now has a six-second timeline at 24 fps (144 frames), split into six semantic intervals copied from the existing production manifest: The Scoop, Density, The Double Biceps, Proportion Failure, The Roar, and Natural Light Source. The intervals are contiguous and represent one continuous transformation; the pose anchors are choreography references, not edit points.

Its plotline assignment is `triggered-metamorphosis`. It is not currently classified as `escalation-without-closure`, because the existing brief specifies a held new baseline at the end. The timeline links to a provenance manifest that preserves Dropbox candidate file IDs and their metadata-only verification state. No source candidate is silently promoted to inspected media.

## Rig and renderer mapping

The existing Blender module `engine/video/rigged_character.py` builds a fused anatomical mesh, armature, and distance-weighted vertex groups. It exposes a single `growth_ceiling` over a requested frame interval; it does not yet implement the full regional growth curves, corrective shapes, or per-stage control channels described in the research. The timeline therefore records semantic growth regions and rates as production direction, not as already-executable rig controls.

The next rig increment should add a time-sampled growth profile that maps timeline intervals to normalized regional controls (for example chest, deltoids, arms, back, legs, height, and limb proportions), with smooth interpolation across stage boundaries. The renderer should consume the same timeline for camera holds, environmental reactions, and audio cue synchronization. A timeline-aware renderer should reject gaps, overlaps, missing source provenance, and mismatched frame counts before rendering.

## Validation

From the repository root:

```bash
python3 engine/video/validate_timeline.py
```

The validator checks project linkage, frame-count consistency, contiguous stage intervals, and provenance integrity fields. It is a structural check, not a media inspection or a guarantee that the Blender render is visually correct.
