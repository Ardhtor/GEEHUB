# Hulum's Cave Engine — GEEHUB Design
**Status:** design contract / next implementation pass  
**Date:** 2026-10-26  
**Purpose:** produce original GEEHUB videos that preserve the felt grammar of Hulum's Cave: quiet exploration, spatial unease, object revelation, shared inertia, and a room that seems to remember what happened.

## Engine identity
This is a video-making instrument, not a prompt form or a gallery of unrelated stills. The operator chooses a seed, a place, a disturbance, and an ending; the engine composes a timed sequence in which camera, light, atmosphere, sound, and any figures belong to one continuous event.

## The five layers
1. **Scry / source intake** — accepts a reference clip, a still, a remembered feeling, or a short text seed. Records what was actually supplied; never claims frame analysis when the source is unavailable.
2. **World forge** — builds reusable modular assets: forest wall, corridor, doorway, wet floor, stone relief, lamp, distant silhouette, fog volume, and light rig. Assets retain lineage and can be reused in later episodes.
3. **Choreography** — converts the seed into a shot sequence: establish, approach, notice, hold, reveal, afterimage. Timing is the primary expressive control; the reveal is earned through movement rather than explanatory text.
4. **Shared-inertia field** — a single master phase drives camera creep, figure movement, light pulse, environmental drift, and sound envelope. Motion may lag by a few frames, but must feel causally connected. The room keeps a trace after movement stops.
5. **Cut / archive** — previews the sequence, renders WebM with procedural audio where supported, and saves the scene manifest, source lineage, settings, and output record together.

## Signature visual language
Cold electric cyan and steel-blue against graphite, black-green redwood, amber mist used sparingly, damp reflective surfaces, monumental architecture, tactile CGI, slow camera movement, and small impossible events. Avoid poster layouts, UI embedded in the world, explanatory captions, jump-scare editing, random camera shake, and Japanese styling. The environment should feel pre-existing; the camera discovers it.

## Episode grammar
- **Arrival (0–20%)** — establish a place with a stable frame and an audible room tone.
- **Approach (20–45%)** — one slow camera move or a deliberate change of depth; sound begins to respond.
- **Anomaly (45–65%)** — a light, object, opening, reflection, or spatial relationship changes subtly.
- **Held discovery (65–82%)** — let the viewer register the change. Do not immediately explain it.
- **After-event (82–100%)** — movement stops, but a light trace, sound tail, reflection, or architectural change persists. End on a door left open, a path continuing, or an unresolved spatial fact.

Durations are adjustable; the proportions and emotional order matter more than a fixed runtime. Each episode must vary its place, object, movement, and final transformation while retaining the shared temporal signature.

## Minimal scene manifest
```json
{
  "engine": "hulums-cave",
  "scene_id": "shared-inertia-001",
  "seed": "the room remembers a passing presence",
  "world": "redwood-night / buried-architecture",
  "palette": "cold-electric",
  "shots": [
    {"beat":"arrival","duration":4.0,"camera":"locked","event":"fog crosses the threshold"},
    {"beat":"approach","duration":5.0,"camera":"slow-creep","event":"blue light appears beneath a door"},
    {"beat":"anomaly","duration":3.0,"camera":"micro-dolly","event":"reflection moves before its source"},
    {"beat":"hold","duration":3.0,"camera":"hold","event":"light arrives a fraction late"},
    {"beat":"after-event","duration":4.0,"camera":"settle","event":"the corridor retains a dim trace"}
  ],
  "inertia": {"phase_source":"master-clock","camera_lag_frames":2,"light_lag_frames":3,"sound_tail_seconds":1.8},
  "audio": {"room_tone":true,"procedural_pulse":true,"avoid_music_by_default":true},
  "outputs": ["preview", "webm", "scene-manifest", "asset-lineage"]
}
```

## Runtime modules
- `hulums-cave-engine.js` — scene state, seed parsing, shot timing, master phase, event scheduling.
- `hulums-cave-engine.css` — cold-electric console and cinematic preview frame.
- Existing `video-generation-engine.js` — reuse for preview/export rather than forking the renderer.
- Existing asset queue / manifests — reuse for source lineage and modular asset bookkeeping.
- `HULUMS_CAVE_BUILD_LOG.md` — append every material change, test, render, failure, and limitation.

## Console behavior
The preview is the dominant surface. Keep controls compact and secondary: **Seed**, **Place**, **Disturbance**, **Intensity**, **Duration**, **RUN**, **Hold**, **Export**. A small timeline may show shot beats, but the user should experience the place, not manage a spreadsheet. RUN creates a new variation without overwriting the previous scene. Export must not be shown as complete until a real file is produced.

## First build slice
1. Add the scene manifest and state model.
2. Connect the existing Shared Inertia scene to the master phase rather than independent animation loops.
3. Add three controllable anomaly families: reflection mismatch, light arriving late, and geometry revealing a deeper space.
4. Add a variation seed so successive runs retain the engine's identity while changing the event.
5. Verify preview and WebM/audio export in a live browser; record actual results in the build log.

## Acceptance criteria
- A scene can be generated from one short seed without a long configuration workflow.
- All motion channels share one temporal source.
- A reveal is followed by a meaningful hold and a residual after-event.
- New runs vary the world and event without losing the cold-electric signature.
- Asset lineage and render status are explicit.
- No render, source analysis, or upload is claimed unless it actually succeeded.

## Production boundary
The available repository notes describe the desired grammar, but the original Hulum's Cave source clips were not present in the inspected material. This design therefore encodes the existing GEEHUB interpretation and should be calibrated against supplied source clips when available; it does not claim exact frame-by-frame replication yet.


## Juh-Bungus — living growth subject
The engine's first character-led scene is **Juh-Bungus**: an adult male bodybuilding figure whose growth is the event, not a decorative effect layered over a static portrait. The source reference establishes the baseline: recognizable face and hair, huge chest and deltoids, thick arms, dense legs, white athletic shorts, socks and trainers, against dark vertical gym panels.

### Growth rule
- Preserve identity, face, hair, expression, clothing, and camera axis across phases.
- Grow as a connected body: chest expansion carries shoulder-girdle width; shoulder growth carries upper-arm volume; torso scale carries pelvis, thighs, calves, and total height with it.
- Extend limb length as the body grows. Avoid the compressed, self-imploded look: keep neck, waist, elbows, knees, and ankles legible between enlarged masses.
- Keep the feet planted and let stance, fabric tension, and the framing respond to increasing scale. The camera may subtly retreat to preserve the full-body read, then settle.
- Animate the transformation continuously with eased interpolation and a held final pose. No random pulsing, floating muscles, isolated swelling, or sparkle/fog effects as substitutes for anatomy.

### First sequence
1. **Baseline** — hold the full-body reference composition long enough to register identity.
2. **Load** — chest and deltoids broaden first; upper back, arms, and traps follow with slight temporal lag.
3. **Carry-through** — torso length, arm reach, thigh mass, calves, and height catch up in one coherent wave; shorts and stance respond naturally.
4. **Settle** — the body stops changing; residual breath, weight shift, fabric tension, and camera settle communicate the new scale.
5. **Afterimage** — hold the larger silhouette without cutting away. The viewer should feel the same person occupying more of the world.

### Hub integration
Juh-Bungus belongs as a playable scene/character state inside GEEHUB, not a new dashboard or an effects preset. A growth pass must create a distinct saved phase with its reference, phase parameters, and continuity notes so the next pass grows from the latest state rather than restarting from the baseline. The current cave prototype does not yet implement this character animation; this section defines the next build target, not a claim that the growth renderer already exists.
