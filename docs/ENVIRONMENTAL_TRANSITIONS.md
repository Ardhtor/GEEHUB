# Environmental Transitions — GEEHUB

A line break is an environmental event, not a typographic instruction. When a passage needs to move into a new paragraph, scene, speaker, or focus, the world carries the transition: light shifts, the camera moves, architecture opens or contracts, sound changes, distance changes, a doorway appears, a shadow crosses the room, or the environment responds to the event.

The environment is the punctuation. No arbitrary blank-space transition where a physical or atmospheric change can carry the reader forward.

## Basal world principle

The console is the in-world experience, not a menu outside it. The story unfolds through continuous prose and multi-decision exploration. A decision changes the next passage; the passage changes the world; the resulting world-state becomes history and opens the next decision. History must derive from text and choices that actually occurred, never from an invented retrospective summary.

Every world change must echo from the hub as a small, distinctive noise as well as a visible environmental response. The sound is a quiet acknowledgement that the world registered the event, not a notification competing with it. Respect user-gesture audio restrictions and reduced-motion/accessibility settings; the story remains legible when sound is unavailable or muted. Record each transition with its stage, narrative line, and timestamp so the hub can reconstruct the path taken.

This rule applies across narration, chapters, character descriptions, encounter copy, maps, artifacts, and interface text. A transition should preserve continuity with the preceding state while changing the viewer's relationship to it.

The browser layer is implemented in `engine/environmental-transitions.js` and styled by `engine/environmental-transitions.css`. It provides a persistent environmental field, responds to sensation and morph events, emits a restrained low tonal echo for each transition when browser audio is available, and stores a bounded chronological transition history in local storage. Each transition dispatches `geehub:environmental-transition` and `geehub:world-history` events for connected story and archive systems. Narrative branching and durable repository-backed history remain integration responsibilities; the local trace is the basal record, not a claim of cloud persistence.

The complete HYPER experience is recorded in [../experiences/HYPER_COMPLETE_EXPERIENCE.md](../experiences/HYPER_COMPLETE_EXPERIENCE.md). The growth experience rules live in [../experiences/MUSCLE_GROWTH_FETISH.md](../experiences/MUSCLE_GROWTH_FETISH.md).

## Editorial test

Does the next passage enter because the world has changed? If not, change the world first.
