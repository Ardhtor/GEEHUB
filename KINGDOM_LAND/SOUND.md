# KINGDOM LAND — Spatial Sound System

Status: design specification / implementation target

## Core principle

Sound is part of the terrain, not a soundtrack layered over it. The world should feel acoustically three-dimensional: sources have position, elevation, distance, directionality, obstruction, reflection, and movement. The mix remains vibrant and detailed without becoming crowded or harsh.

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

1. Add a user-gesture audio bootstrap and master gain control.
2. Create a reusable spatial emitter interface with position, gain, radius, loop/event mode, and environment tags.
3. Add ambient zone blending for plateau, valley, water edge, wetland, and enclosed stone.
4. Attach water and wind emitters to world-space features.
5. Add terrain-aware occlusion and environment-specific reverb as progressive enhancements.
6. Test headphone stereo positioning, source movement, region transitions, mute, and reduced-volume listening.

## Acceptance criteria

- A listener can distinguish left/right, near/far, above/below, and open/enclosed sound relationships.
- Moving through the world changes the mix continuously and meaningfully.
- Water, wind, stone reflections, and living detail remain perceptually separate.
- No audio starts before user interaction; mute and volume controls work.
- The soundscape is immersive and vibrant while remaining gentle, uncluttered, and free of compulsory music or speech.
