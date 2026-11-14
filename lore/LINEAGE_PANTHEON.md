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
- **Hephaestus — The Forge-Maker:** controlled fire, metallurgy, craft, invention, mechanical design, architecture, and repair. He understands making as a continuing responsibility: an object must be useful, maintainable, and answerable to the people who live with it.

These figures are distinct presences, not one interchangeable group of “old gods.” Neptune, Odin, Zeus, and Hephaestus retain different domains and temperaments. God Daddy is not a substitute for them; his chosen protection gives the lineage a different axis of strength. Hephaestus does not duplicate Odin's discipline of witness: Odin asks what the evidence supports, while Hephaestus asks what the material can bear and how a thing can be made, repaired, and maintained.

## Runtime contract

The `engine/lineage-pantheon.js` module inserts a visible Pantheon panel immediately below the main header. It opens on a playable encounter, not an empty dashboard. Its form includes a cinematic inline-SVG scene stage, a restrained cold-electric palette, responsive editorial typography, encounter progress, clear choice cards, reduced-motion support, and visible outcome treatment. Six branching scenes feature the cow, Gumshoe, Solid Snake, the boys, God Daddy, Neptune, Odin, Zeus, Hephaestus, Swolebeasts, and Hulum's Cave. The cast register gives God Daddy, Neptune, Odin, Zeus, and Hephaestus separate selectable identities and role statements. Each scene offers three choices and a NEXT ENCOUNTER control. Choosing an outcome advances the cycle, preserves the result in event history, and emits an artifact into the existing GEEHUB artifact runtime when that runtime is available. It provides:
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

Seth and Nick carry the viewer-facing broadcast from across the active scene. They share the view with the audience, point out changes, compare visible evidence, and occasionally address the viewer directly. They do not become the characters they observe, and they do not replace the participants' own voices. Neptune, Zeus, God Daddy, Odin, and Hephaestus are active in-world presences, not additional presenters. They may enter a scene, speak in their own voices, make decisions, disagree, and leave consequences that the inhabitants must live with. Their dialogue is character dialogue; Seth and Nick remain the presenters who help the viewer follow what is happening.

Keep the named roles distinct. **Neptune** acts through depth, water, pressure, tides, and memory beneath the visible surface; his influence reveals conditions and routes without automatically dominating those who use them. **Odin** acts through wisdom, witness, order, and the discipline of making claims answer to evidence. **Zeus** acts through storm, public authority, command, and consequence; his power must remain answerable for what it changes, and his judgements should be visible rather than hidden behind decree. **God Daddy** acts through chosen protection: practical help, shelter, confidence, care, and permission. He makes room for others and keeps a way out open; he does not claim ownership of the people he protects. God Daddy is a mythic title and relational role, not a biological-father assertion. **Hephaestus** acts through controlled fire, metal, craft, invention, architecture, and repair. He studies the material before changing it, values the knowledge of workers who maintain it, and treats every tool or structure as something that must continue to serve the people who use it. He is also distinct from **Big Daddy's Voice**, the archival phenomenon in Book I that makes a described thing remain through repeated attention. The two may correspond thematically, but they are not the same character or mechanism.

A scene may show Seth and Nick describing water rising beneath a training hall while Neptune reveals the buried channel, Zeus calls for a public inspection of the storm-damaged supports, God Daddy moves people clear before helping the crew brace the structure, and Hephaestus designs a repair that can be inspected and maintained by the workers. The gods should be allowed to disagree and act from their own domains, rather than speaking as a single chorus or becoming interchangeable sources of spectacle. Their presence must change the world through specific actions, while ordinary inhabitants retain their own judgement, work, and agency.

## Character continuity through action

The first dimensional encounters establish a practical distinction among the three presences. Neptune is patient, exact, and difficult to hurry; he speaks through depth, current, pressure, and the history retained by water. He may reveal a direction without promising that the route is open, and he treats a river or channel as a continuing system rather than a static map. Zeus is direct, formal, and publicly accountable. He is willing to make a decision visible, call attention to its costs, and hold power to a stated limit; he does not treat command as permission to conceal consequences. God Daddy is immediately attentive to people and to the conditions that let them act. He notices the cold, the blocked exit, the unbraced beam, the empty food basket, and the person who has not been given room to speak. His protection is practical, warm, and non-possessive. He helps, then makes space for the recipient to continue independently.

These are not fixed theatrical mannerisms. They are recurring tests of character. Neptune must sometimes accept that a measured channel is not the whole waterway. Zeus must listen when public evidence changes the decision. God Daddy must allow people to refuse help or take a different route. Hephaestus must accept that a beautiful or technically sound design still has to fit the lives and skills of the people who maintain it. Each can be wrong about a practical detail without ceasing to embody his domain. Their disagreements should have consequences, but they should never collapse into one generic voice of authority.

The first sustained enactment is recorded in [The Hall of Three Powers](dimension/FIRST_ROOM_CHAPTER_10.md), [The Blue Survey](dimension/FIRST_ROOM_CHAPTER_11.md), [The Open Table](dimension/FIRST_ROOM_CHAPTER_12.md), [The Trial of the Lower Gate](dimension/FIRST_ROOM_CHAPTER_13.md), and [The Forge Under the Roots](dimension/FIRST_ROOM_CHAPTER_14.md). Hephaestus enters through the work of material inspection and repair, creating a listening key that extends the crew's ability to observe without opening the gate. Across these scenes, the gods alter the conditions of the work, while the inhabitants retain the responsibility to measure, repair, deliberate, and decide.


## Hephaestus and the recognition–custody gap

Hephaestus is the keeper of the unfinished transfer: the interval between seeing a thing and making it durable. He understands that recognition is not possession and that a design is not yet an object. When a portrait appears in conversation, he can identify what it contributes to a character while acknowledging that the image file has not entered the archive. He does not call an attachment preserved until it has a verified home, and he does not overwrite an earlier version merely because a newer one is more pleasing. He records the source, protects the original, makes derivatives traceable, and leaves a practical route for repair or replacement. This is his form of craftsmanship. Odin witnesses the limits of the evidence, while Hephaestus builds the durable path that lets the evidence remain useful.

In GEEHUB, this becomes a world principle: **recognition may precede custody**. Characters, places, and events can become present in awareness before their records are complete, but the system must show the difference between known, referenced, preserved, and integrated. Missing files remain missing; uncertain relationships remain provisional; incomplete records remain open to growth. Hephaestus makes the gap workable without pretending it has vanished.


## The Gentle King Lion — Muscle Myth

The **Gentle King Lion**, informally called by the user the **long-donged lion**, is an independent mythic presence established through an earlier artwork interpretation. The artwork presents an enormous golden lion-like figure dominating the background, dwarfing the central figure through deliberate visual excess, symmetry, warm gold, and deep burgundy. Its design is not governed by anatomical realism; the standard is visual pleasure, strong silhouette, and expressive magnificence.

The lion embodies immense, peaceful, nonviolent power: purring sovereignty, magnificence without cruelty, and strength that does not need to oppress. Its scale can fill a composition without turning its presence into a threat. Its gentleness is not weakness but power held in reserve. Keep the lion distinct from Hephaestus and the other pantheon figures. Hephaestus may build for it, but does not define or possess it. See [The Gentle King Lion — Artwork Interpretation](MUSCLE_MYTH_GENTLE_KING_LION.md).
