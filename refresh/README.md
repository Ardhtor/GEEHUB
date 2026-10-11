# GEEHUB Refresh — The Living Atlas

A clean, standalone entry point for the next GEEHUB iteration. This is an additive build; it does not replace the existing hub.

## Open
- GitHub Pages path: `/refresh/` (after the repository's Pages deployment updates)
- Source: `refresh/index.html`

## Core behavior
- A persistent illustrated terrain map with a pin that follows the current story location.
- RUN advances the world and records an event.
- Four in-world choices alter the route, story, and accumulated noise.
- The session ledger records world events in browser local storage.
- Reset returns the story to arrival without deleting the ledger.
- Responsive layout, no external libraries, and no network calls.

## Continuity grammar
`ACCUMULATE → CHARACTERIZE → CONTACT → ACT → ALTER → RECORD → ACCUMULATE`

The map is always present. The story moves across it. Each encounter changes the current state and can be kept as a memory artifact.

## Next integration pass
Connect the event ledger to GEEHUB's canonical corpus/state schema and Dropbox production tree; add real map/assets and media-native chapter artifacts while retaining provenance for source, derived, generated, and canon material.
