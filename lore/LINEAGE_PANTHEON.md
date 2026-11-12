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
- **God Daddy — The Chosen Protector:** a chosen, protective presence whose strength appears as care, confidence, shelter, and permission. His protection makes room for other people rather than claiming ownership of them. “God Daddy” is a mythic title and relational role, not a biological-father claim.
- **Neptune — The Deep:** sea, depth, pressure, tides, and memory held beneath the visible surface. He can alter the conditions of a place without needing to dominate its inhabitants.
- **Odin — The Keeper of Measure:** wisdom, witness, order, and the discipline of making a claim answer to evidence. He preserves the distinction between authority and proof.
- **Zeus — The Sovereign Storm:** power, public authority, sky, storm, and consequence. His command is real within the pantheon, but it must answer for what it changes.

These figures are distinct presences, not one interchangeable group of “old gods.” Neptune, Odin, and Zeus retain different domains and temperaments. God Daddy is not a substitute for them; his chosen protection gives the lineage a different axis of strength.

## Runtime contract

The `engine/lineage-pantheon.js` module inserts a visible Pantheon panel immediately below the main header. It opens on a playable encounter, not an empty dashboard. Its form includes a cinematic inline-SVG scene stage, a restrained cold-electric palette, responsive editorial typography, encounter progress, clear choice cards, reduced-motion support, and visible outcome treatment. Five branching scenes feature the cow, Gumshoe, Solid Snake, the boys, God Daddy, Neptune, Odin, Zeus, Swolebeasts, and Hulum's Cave. The cast register gives God Daddy, Neptune, Odin, and Zeus separate selectable identities and role statements. Each scene offers three choices and a NEXT ENCOUNTER control. Choosing an outcome advances the cycle, preserves the result in event history, and emits an artifact into the existing GEEHUB artifact runtime when that runtime is available. It provides:
- **PLAYABLE ENCOUNTERS:** choose among three outcomes, receive an authored scene consequence, and leave a trace in the existing artifact system.
- **GROW BASELINE:** advances the scale variable while retaining Luke as the identity-preserving growth anchor.
- **SHARED INERTIA:** adds a temporal trace without replacing earlier events.
- **RESET EXPERIMENT:** resets local simulation state only, not this canon document.
- **EXPORT STATE JSON:** downloads the current state and event history.

State is stored in browser localStorage under `geehub.lineage-pantheon.v1`. It is local to that browser/profile and is not yet synchronized across devices or repositories. The current scale multiplier is a simulation parameter, not a measured 3D body scale. This module does not yet render video or directly reconstruct Hulum's Cave source clips; scene choices are narrative/interaction outputs that can feed the existing artifact pipeline.

## Transformation loop

`encounter → inherited state → growth / inertia → visible consequence → saved event → next run`

The durable rule: **the new state inherits the old state; it does not erase the lineage.**

## Broadcast and mythic presence

Seth and Nick carry the viewer-facing broadcast from across the active scene. They share the view with the audience, point out changes, compare visible evidence, and occasionally address the viewer directly. They do not become the characters they observe, and they do not replace the participants' own voices. Neptune, Zeus, God Daddy, and Odin are active in-world presences, not additional presenters. They may enter a scene, speak in their own voices, make decisions, disagree, and leave consequences that the inhabitants must live with. Their dialogue is character dialogue; Seth and Nick remain the presenters who help the viewer follow what is happening.

Keep the three named roles distinct. **Neptune** acts through depth, water, pressure, tides, and memory beneath the visible surface; his influence reveals conditions and routes without automatically dominating those who use them. **Zeus** acts through storm, public authority, command, and consequence; his power must remain answerable for what it changes, and his judgements should be visible rather than hidden behind decree. **God Daddy** acts through chosen protection: practical help, shelter, confidence, care, and permission. He makes room for others and keeps a way out open; he does not claim ownership of the people he protects. God Daddy is a mythic title and relational role, not a biological-father assertion. He is also distinct from **Big Daddy's Voice**, the archival phenomenon in Book I that makes a described thing remain through repeated attention. The two may correspond thematically, but they are not the same character or mechanism.

A scene may show Seth and Nick describing water rising beneath a training hall while Neptune reveals the buried channel, Zeus calls for a public inspection of the storm-damaged supports, and God Daddy moves people clear before helping the crew brace the structure. The gods should be allowed to disagree and act from their own domains, rather than speaking as a single chorus or becoming interchangeable sources of spectacle. Their presence must change the world through specific actions, while ordinary inhabitants retain their own judgement, work, and agency.
