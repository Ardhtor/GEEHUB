# KINGDOM LAND — Spatial Sound System

Status: design specification / implementation target

## Core principle

Sound is part of the terrain, not a soundtrack layered over it. The world should feel acoustically three-dimensional: sources have position, elevation, distance, directionality, obstruction, reflection, and movement. The mix remains vibrant and detailed without becoming crowded or harsh.

## Seven-volume pitch architecture

The primary musical geometry is organized as **7 spatial volumes** rather than 12 independent semitone bands.

`V1 → V2 → V3 → V4 → V5 → V6 → V7`

Each volume is a large three-dimensional acoustic territory. Within every volume, the chromatic 12-semitone cycle is encoded as finer internal spatial structure:

`C C# D D# E F F# G G# A A# B`

The seven volumes are therefore the macro-scale architecture; semitones are the micro-scale resolution inside that architecture.

### Spatial encoding

- **Volume:** large terrain/water region with its own acoustic identity and pitch register.
- **Semitone:** continuous contour/wave/resonance geometry inside the volume.
- **Chromatic movement:** movement through adjacent semitone geometry produces continuous pitch-space traversal.
- **Volume transition:** crossing from one volume to another changes the larger acoustic/pitch field while preserving local continuity.
- **Water:** carries and reflects the semitone geometry, making pitch visibly and spatially legible.
- **Terrain:** plateaus, basins, ridges, and elevation gradients deform the acoustic fields rather than merely sitting beneath them.

The intended result is a readable **7-dimensional-volume / 12-semitone-subdivision** system: seven huge spatial territories containing chromatic detail.

## Synth terrain prototype

The first executable soundscape artifact is:

- `KINGDOM_LAND/three_dimensional_synth_soundscape.mid`
- Format: Standard MIDI File, Type 1
- Role: synth control layer for the spatial terrain
- Layers: sub-terrain, plateau pads, water movement, ridge shimmer, distant events, air, and listener-path motion
- Design: gradual land masses, extensive water presence, low-density events, slow spatial movement, gentle dynamic range

MIDI is the control layer; the final timbre is supplied by the user's synthesizer/DAW. The synth voices should preserve the terrain relationships rather than behave like conventional foreground music.

## Acoustic layers

- **Atmosphere:** a continuous, low-level environmental bed. Open plateau wind is broad and airy; sheltered valleys are quieter and more enclosed. Avoid a single audible loop dominating the scene.
- **Water:** rivers, streams, lakes, wetlands, and falls are independent spatial sources. Their character and level vary with flow, proximity, and terrain. Water below the listener remains perceptibly below.
- **Wind:** moves across the landscape and around the listener. Ridge lines and cliffs alter exposure; passages and ravines create shelter, turbulence, and filtered gusts.
- **Stone:** nearby surfaces produce short, natural reflections. Enclosed passages create stronger, longer reverberation; open terrain remains comparatively dry.
- **Living detail:** sparse birds, insects, foliage movement, and occasional small environmental events provide close-range activity. Their placement should be distinct and not constant everywhere.
- **Distant horizon:** subdued, diffuse ambience establishes scale and distance without masking nearby detail.

## Spatial behavior

1. Use world-space coordinates for sound emitters and the listener.
2. Apply distance attenuation and smooth transitions; no abrupt volume jumps when crossing region boundaries.
3. Use stereo panning at minimum, with Web Audio PannerNode configured for 3D positioning. Prefer HRTF spatialization where supported.
4. Model elevation and occlusion: terrain and structures should filter or attenuate sources when they block the direct path.
5. Use environment-dependent reverb sends, with separate acoustic profiles for open plateau, valley, lakeshore, wetland, cliff base, and enclosed passage.
6. Blend regional ambience by listener location rather than switching abruptly.
7. Keep dynamic range comfortable. Preserve a quiet baseline, prevent clipping, and avoid sudden stingers or forced narration.

## Interaction and controls

- Sound begins only after a user gesture, respecting browser autoplay restrictions.
- Provide master volume and separate ambience, water, wildlife, and effects levels.
- Include a mute control and remember the user's local preference when practical.
- Avoid narration and music by default. The environment itself is the soundscape.

## Initial implementation sequence

1. Encode the seven macro volumes.
2. Encode twelve chromatic semitone subdivisions inside every volume.
3. Make the semitone fields visible as actual spatial audio geometry: contours, wavefronts, resonance paths, and terrain-following bands.
4. Add a user-gesture audio bootstrap and master gain control.
5. Create a reusable spatial emitter interface with position, gain, radius, loop/event mode, and environment tags.
6. Add ambient zone blending for plateau, valley, water edge, wetland, and enclosed stone.
7. Attach water and wind emitters to world-space features.
8. Add terrain-aware occlusion and environment-specific reverb as progressive enhancements.
9. Test headphone stereo positioning, source movement, region transitions, mute, and reduced-volume listening.

## Acceptance criteria

- Seven clearly perceptible macro acoustic/pitch volumes exist in world space.
- Each volume contains twelve continuous chromatic semitone subdivisions.
- A listener can distinguish left/right, near/far, above/below, and open/enclosed sound relationships.
- Moving through the world changes the mix continuously and meaningfully.
- Pitch geometry remains spatially readable without labels or conventional notation.
- Water, wind, stone reflections, and living detail remain perceptually separate.
- No audio starts before user interaction; mute and volume controls work.
- The soundscape is immersive and vibrant while remaining gentle, uncluttered, and free of compulsory music or speech.
