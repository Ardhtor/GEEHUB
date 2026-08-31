# Imagination Principles

GEEHUB should not merely make ideas more numerous. It should make the user's internal picture of an idea more vivid.

This distinction matters. A weak creative interface can produce many nouns, prompts, tags, or combinations while leaving the imagination almost unchanged. The user reads a sentence, understands its category, and moves on. A stronger interface causes a small internal scene to appear: where something is, what surrounds it, what changes, what it feels like to look at, what happens one second later, and what physical consequence follows from the premise.

The narrative jammer therefore has a new quality target: every useful output should increase **imaginal resolution**.

## Imaginal resolution

For GEEHUB, imaginal resolution means the degree to which an idea can be mentally inhabited rather than merely named. A vivid output tends to provide several kinds of information at once:

- **Spatiality:** where things are relative to one another.
- **Scale:** what feels small, large, close, distant, heavy, or expansive.
- **Materiality:** surface, texture, reflectivity, softness, hardness, age, wear, temperature, or other physical cues.
- **Lighting:** where illumination comes from and what it reveals or conceals.
- **Motion:** what is changing, moving, growing, rotating, breathing, flickering, or remaining unnervingly still.
- **Sound:** when a sonic cue substantially changes the scene in the imagination.
- **Sequence:** what happened immediately before and what is likely to happen next.
- **Witness position:** where the observer seems to be standing or looking from.
- **Constraint:** the simple rule that makes the scene behave differently from ordinary reality.

These are not a checklist that must appear in every sentence. They are a reservoir of ways to make a premise perceptually legible.

## The central rule

Prefer **scene over label**.

“Blender meets Muscle Myth” is a label. “A cold studio floor, a single oversized sculptural figure under a hard overhead lamp, with the mythic symbol appearing as a physical joint in the model” creates a scene.

Prefer **consequence over adjective**.

“Very large” is weak. “The shoulders now determine where the light stops reaching the wall behind him” gives scale a visible consequence.

Prefer **sequence over static description**.

“An expanding figure” is a category. “The camera holds while the frame slowly loses empty space around the figure” creates temporal behavior.

Prefer **specific ambiguity over generic randomness**.

A strange detail becomes useful when it can be visualized clearly while remaining open to interpretation.

## Why this belongs in the jammer

The jammer exists to escape obvious next steps. But surprise alone is insufficient. A random pairing can be surprising while producing nothing to imagine. The better collision introduces a relationship that the mind can simulate.

The jammer should therefore bias toward outputs that contain a small, drawable or buildable scene. The user should be able to sketch the result, block it out in Blender, prototype it as a web toy, describe it as a camera shot, or write the first paragraph without first inventing the scene from scratch.

## The body as a high-resolution anchor

Body-focused exploration is especially useful because the body already gives the imagination a dense vocabulary of shape, weight, balance, posture, movement, proportion, clothing, skin, material contrast, and spatial presence. The point is not to force a sexual interpretation. The point is to use embodiment as a concrete substrate for visual reasoning.

When the body is the focus, prompts should favor observable relationships: shoulder width against doorway width, posture against gravity, silhouette against background, surface against light, movement against clothing, or mass against the geometry of a room. A strong body prompt should allow the user to see the figure before deciding what the figure means.

## The five-second test

A jam should pass this test:

**Can the user close their eyes for five seconds and have something specific to picture?**

If not, the output is probably too abstract. Add one spatial fact, one sensory cue, one action, or one visible consequence.

## The artifact test

A vivid premise should also contain enough structure to become a tiny artifact. The user should be able to answer, without further planning:

- What am I looking at?
- Where is it?
- What is changing?
- What rule makes it interesting?
- What is the smallest thing I could make to test the idea?

This connects imagination directly to production.

## Relationship to inherited repository reasoning

This principle extends several older lessons already present in the repository ecosystem. Interactive generation is more useful when the user can steer it; provenance makes surprising results trustworthy; progressive disclosure keeps interfaces from becoming overwhelming; visual production tools become powerful when generation parameters and state remain inspectable; and research becomes durable when observations are preserved as structured material rather than disappearing into a session.

GEEHUB combines those lessons differently: the jammer should make the first mental image vivid, then preserve enough structure that the user can immediately turn that image into an experiment.

## Implementation direction

Future jammer outputs should be assembled from scene ingredients rather than only project names and verbs. Useful ingredients include location, framing, scale relation, material, light source, motion, temporal beat, anomaly, and a single build constraint.

A future generator can score candidate jams for imaginal resolution, for example by checking whether a premise contains at least one spatial relation and one concrete consequence. More sophisticated versions can use embedding similarity, imageability heuristics, user save rates, and downstream artifact creation as feedback.

The success condition is not “the sentence sounds clever.” It is:

**the user sees more in their head than they saw before pressing the button.**
