# The Lineage Pantheon — GEEHUB canon and runtime contract

Status: active prototype; runtime state is functional in the browser. Mythic descriptions are canon, not claims about completed 3D rendering.

## The two source lineages

**Swolebeasts** govern physical presence: mass, height, limb length, broad rounded shoulders, deep chest, posture, and the sense that a body has become a durable environment. Ordinary activity remains the scale reference. Growth must preserve the subject's recognizable identity and proportional continuity.

**Hulum's Cave** governs shared inertia: motion, timing, camera, lighting, geometry, sound, temporal deformation, and the residue one state leaves in the next. The cold electric/cyan interpretation is a visual signal, not a substitute for source fidelity. Reconstruct source clips from observed motion and timing; do not claim a source-faithful render until it has been rendered and compared.

## Pantheon roles

- **Gee — Continuity:** the one who stays; encounters and return paths remain available.
- **Luke — Living Baseline:** identity persists across increasingly extreme body states.
- **Swolebeasts — Weight of Becoming:** physical scale, mass, and bodily presence.
- **Hulum's Cave — Shared Inertia:** temporal continuity, synchronized movement, and accumulated motion traces.
- **Daddy — Chosen, protective presence:** confidence and care; explicitly not a biological-father relationship.
- **Neptune, Odin, Zeus — Depth, Order, Power:** inherited mythic figures that comment on the new lineage without superseding it.

## Runtime contract

The `engine/lineage-pantheon.js` module inserts a visible Pantheon panel into the main world. It provides:
- **RUN LINEAGE:** advances a persistent cycle and selects the next lineage member.
- **GROW BASELINE:** advances the scale variable while retaining Luke as the identity-preserving growth anchor.
- **SHARED INERTIA:** adds a temporal trace without replacing earlier events.
- **RESET EXPERIMENT:** resets local simulation state only, not this canon document.
- **EXPORT STATE JSON:** downloads the current state and event history.

State is stored in browser localStorage under `geehub.lineage-pantheon.v1`. It is local to that browser/profile and is not yet synchronized across devices or repositories. The current scale multiplier is a simulation parameter, not a measured 3D body scale. This module does not claim to render video or connect to the Hulum's Cave source corpus.

## Transformation loop

`encounter → inherited state → growth / inertia → visible consequence → saved event → next run`

The durable rule: **the new state inherits the old state; it does not erase the lineage.**