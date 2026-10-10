# Screen Puncture — GEEHUB Interface Direction

The active story window is not a floating card. It is a breach in the display plane: the scene drives forward through a jagged opening toward the viewer, with enough perspective, shadow, and spatial recoil to make the computer feel as though it has reached across the screen.

## The impact

On first arrival, RUN, story-location change, or a meaningful interaction, the story window is placed immediately below the page header and lunges toward the viewer. The panel overshoots, recoils, then settles slightly forward from its original plane. A jagged aperture opens over the story surface; fractured lines race outward across the display; a cold edge-light catches the torn rim. A single expanding wave crosses the viewport, and the surrounding interface gives a small visual recoil. The experience should feel like the scene has punched through glass and entered the viewer's space—not like a card sliding in.

The hole must read as depth, not a black sticker. The screen surface darkens around an irregular transparent aperture so the underlying world view remains visible through the center; lit broken edges, uneven fracture lines, perspective distortion, and a strong cast shadow define the torn rim. The tear should mark the moment the world crosses the interface boundary.

## Relationship to the world

The full textured map remains present inside the window as passive geography. The current story pin marks where the event is taking place. The scene projects from that location; the pin and narrative state remain synchronized. The window itself is the focal object, while the rest of the interface recedes.

Environmental detail, character presence, and motion should carry the scene through the breach. Avoid poster art, infographic layouts, giant explanatory overlays, constant idle motion, or a generic glowing card. Let the place feel inhabited beyond the immediate plot.

## Interaction and accessibility

- The story window moves into the first-screen position and triggers a first-arrival impact without requiring scrolling or a click. RUN, story-location changes, and meaningful window interactions can trigger it again, with a brief lunge, fracture flare, and viewport shockwave.
- After the hit, the window remains slightly raised and the fractured rim stays visible as a trace of the encounter.
- Debounce rapid repeated triggers so the effect feels consequential rather than noisy.
- No sound is required. Do not force navigation or block controls.
- Respect reduced-motion preferences: retain the raised frame and visible tear, but omit the camera recoil, lunge, and expanding wave.
- Keep the title/status bar legible and maintain usable navigation around the active view.

## Acceptance test

A viewer should notice the scene immediately, perceive the display surface splitting open, feel the scene advance toward them, and understand that the map and story are one place. The effect must be implemented in the interface, not merely described in a planning document.
