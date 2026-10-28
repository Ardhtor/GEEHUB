# The Lineage Pantheon — GEEHUB canon and runtime contract

Status: active prototype; runtime state is functional in the browser. Mythic descriptions are canon, not claims about completed 3D rendering.

## Foundational orientation

This module is the first visible implementation of the [GEEHUB Prime Meridian](./PRIME_MERIDIAN.md): the shared origin for form, function, world-state, and continuity.

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

The `engine/lineage-pantheon.js` module inserts a visible Pantheon panel immediately below the main header. It opens on a playable encounter, not an empty dashboard. Its form includes a cinematic inline-SVG scene stage, a restrained cold-electric palette, responsive editorial typography, encounter progress, clear choice cards, reduced-motion support, and visible outcome treatment. Five branching scenes feature the cow, Gumshoe, Solid Snake, the boys, Daddy, the old gods, Swolebeasts, and Hulum's Cave. Each scene offers three choices and a NEXT ENCOUNTER control. Choosing an outcome advances the cycle, preserves the result in event history, and emits an artifact into the existing GEEHUB artifact runtime when that runtime is available. It provides:
- **PLAYABLE ENCOUNTERS:** choose among three outcomes, receive an authored scene consequence, and leave a trace in the existing artifact system.
- **GROW BASELINE:** advances the scale variable while retaining Luke as the identity-preserving growth anchor.
- **SHARED INERTIA:** adds a temporal trace without replacing earlier events.
- **RESET EXPERIMENT:** resets local simulation state only, not this canon document.
- **EXPORT STATE JSON:** downloads the current state and event history.

State is stored in browser localStorage under `geehub.lineage-pantheon.v1`. It is local to that browser/profile and is not yet synchronized across devices or repositories. The current scale multiplier is a simulation parameter, not a measured 3D body scale. This module does not yet render video or directly reconstruct Hulum's Cave source clips; scene choices are narrative/interaction outputs that can feed the existing artifact pipeline.

## Transformation loop

`encounter → inherited state → growth / inertia → visible consequence → saved event → next run`

The durable rule: **the new state inherits the old state; it does not erase the lineage.**