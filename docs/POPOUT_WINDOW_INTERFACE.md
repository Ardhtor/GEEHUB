# Pop-Out Window — GEEHUB Interface Direction

The active story window must feel like it projects toward the viewer, not like a flat card buried in a dashboard. This is a visual and interaction requirement for the GEEHUB interface.

## The feeling

The window is the focal object. It has a strong near edge, visible depth, a small amount of perspective, and a shadow that separates it from the map and archive behind it. Its top edge and title bar catch light; the lower edge casts a deeper shadow. The content inside remains a real scene or world view, not a promotional graphic or text-heavy panel. The rest of the interface recedes quietly.

## Interaction

- On opening or selecting a story, the window advances toward the viewer with a short, smooth ease-out motion, then settles. It should feel like a screen being brought forward, not a notification sliding in.
- Hovering or focusing the window increases its depth slightly and sharpens the edge lighting. Avoid constant bobbing, flashing, or exaggerated motion.
- The map remains visible behind it as a passive illustrated geography. A small pin marks the user's current story location; the window belongs to that place.
- The title bar stays readable and provides a clear grab/drag area. A close or minimize control remains easy to find. The window should never obscure all navigation or trap the user.
- When the user changes story location, the map pin moves and the window content changes in place. Keep continuity between map position, story record, and the visible scene.
- Respect reduced-motion preferences. In reduced-motion mode, use a stable raised window with depth cues and no entrance animation.

## Visual construction

Use layered depth rather than a giant glow: dark outer frame, fine edge highlight, subtly lit title bar, realistic ambient shadow, and a restrained perspective tilt. The scene inside the window should be bright and legible enough to attract the eye immediately. Surrounding panels should be quieter, smaller, and lower contrast. The result should feel like an actual window into the world, not a dashboard tile.

## Acceptance test

At first glance, the user should notice the scene window first, feel that it sits in front of the interface, and understand that it can be opened, moved, and explored. The map and archive should support that experience without competing with it.
