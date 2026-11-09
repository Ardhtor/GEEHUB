# GEEHUB — Jock Hypnosis Experience Design

Status: design specification; implementation has not yet been built or runtime-tested.

## Intent

The experience is an opt-in, dreamlike athletic environment built around masculine physical presence, ritualised training, body development, and the social atmosphere of a men's gym. “Hypnosis” describes the artistic sensation of sustained attention and rhythmic absorption. It does not mean covert persuasion, loss of agency, or an attempt to override the user's choices. The user remains in control of pace, intensity, sound, scene changes, and exit.

The governing principle is **ritual with variation**: a familiar action returns, but each return carries a visible or audible change. The world feels consistent enough to inhabit and strange enough to keep unfolding.

## The experience, not a dashboard

The opening view is a spacious gym at a quiet hour. A single athletic figure stands in a pool of cool light. The room is legible but not fully disclosed: mirrored walls, a distant dumbbell rack, high windows, a darkened upper gallery, a water station, and a corridor leading towards locker rooms. The camera is low enough to give the figure presence without turning the body into an abstract monument. The environment should feel inhabited, not staged for a product advertisement.

UI is almost absent at first. A small, calm control surface sits at the edge of the scene: Enter, Observe, Train, Growth, Sound, and Leave. Controls appear when needed and recede when not. No streaks, countdown pressure, flashing badges, reward fireworks, or incessant notifications. Information is revealed contextually and can always be opened directly.

## Hypnotic rhythm

Use a repeating six-part cycle:

1. **Arrival** — establish the room, figure, posture, ambient sound, and breathing pace.
2. **Preparation** — small preparatory movements: wrist rotation, shoulder roll, stance adjustment, grip, foot placement.
3. **Effort** — a controlled set with deliberate movement and believable weight.
4. **Hold** — a stable pose, such as a front stance or double-biceps display. The camera holds; it does not jitter or cut rapidly.
5. **Release** — hands lower, shoulders settle, breath returns, equipment is put away.
6. **Return** — the same composition reappears with a subtle difference: fuller deltoids, a changed shirt fit, a new reflection, a slightly altered room, another man arriving, or a new line of dialogue.

The cycle is not a mandatory timer. The user can stay in any phase, skip it, pause, or leave. Avoid exact repetitive loops that become mechanical. Vary the duration, gesture, camera drift, sound texture, and social response while preserving a recognisable pulse.

## Physical language

The body is the central expressive instrument. Prioritise shoulder breadth, chest depth, arm volume, back width, forearm density, leg mass, stance, balance, and the way clothing responds to the changing silhouette. Growth should be cumulative and anatomically coherent, not a scale slider that enlarges every part equally. Preserve the character's identity, proportions, skin character, and joint landmarks as mass changes. Growth is shown through more than numbers: sleeve tension, collar fit, shoulder contact with doorframes, bench clearance, grip changes, altered posture, and how other men make room.

Every pose needs a readable path into and out of it. Hands should not teleport; elbows should bend in a stable plane; shoulders should not detach; feet should preserve contact when the action requires it. The Video 6 reconstruction remains the initial movement reference: neutral stance, lateral abduction, asymmetric first fist raise, double-biceps fold, held flex, reopening, and return to neutral. Its single camera does not establish hidden 3D anatomy, so the scene must be validated in Blender before being called accurate.

## Camera and composition

- Default to a stable, low-frontal three-quarter or frontal view, with a portrait-friendly option for pose studies.
- Let the camera move slowly enough that a viewer can read the body mechanics. Prefer a gentle dolly, a gradual orbit of a few degrees, or a fixed frame over continuous motion.
- Use long holds at the key pose. Avoid rapid cuts, shake, strobing, aggressive zooms, and exaggerated lens distortion.
- Keep the full body and relevant equipment in frame during movement. Switch to a close detail only when the user chooses it or when the action clearly calls for it.
- Preserve spatial continuity: the rack, mirrors, doors, benches, and light sources should not jump between shots.
- Let reflections provide a second reading of the scene, but never use reflections to contradict the character's anatomy accidentally. An intentional reflection anomaly should be rare and narratively meaningful.

## Lighting, colour, and material

The core palette is blue-white architectural light, deep teal shadow, graphite equipment, warm natural skin, and restrained amber practical lights. Skin should remain human and tactile: subtle roughness, tonal variation, soft subsurface response, and no plastic sheen. Metal and rubber should feel heavy and used. Mirrors should have controlled reflections rather than a glowing fantasy surface. Atmospheric haze is optional and sparse; it should reveal depth without washing out anatomy.

As the scene deepens, lighting can become more dreamlike through gradual colour temperature shifts, reflected light, and slight changes in spatial depth. Do not rely on visual noise or random surreal effects. The room's dream quality comes from familiar objects behaving with quiet consistency until one detail has changed.

## Sound design

Build an original, layered soundscape rather than using recognisable commercial music. The base layer is low gym-room air, ventilation, distant footsteps, fabric movement, shoe contact, metal settling, controlled breathing, and the soft resonance of a large room. Training sounds should be weight-specific: plate contact, cable tension, bench movement, grip friction. Add a restrained pulse only when the user enters a training sequence. It should be felt as a pattern, not a loud beat.

Sound should respond to the scene: a room tone opens as the camera settles; equipment sounds mark effort; the held pose reduces the mix; release restores ambient space. Repeated motifs may return with altered timbre or distance. Provide separate controls for ambience, movement sounds, music/pulse, and voice; include mute and a clear volume control. No sudden loudness spikes.

## Men and social atmosphere

The gym is an all-male fictional environment. Men have individual voices, training habits, humour, physiques, confidence levels, and relationships. They are not interchangeable spectators. A man may notice another's progress, offer a spot, tease a friend, compete, decline a challenge, or quietly return to his own routine. Social response should be specific and earned: a tighter shirt sleeve, a changed lift, a new training partnership, a more confident entrance, or a different place at the table.

Do not make every man praise the protagonist. Some are absorbed in their own work; some are reserved; some are eccentric; some are competitive; some are warm. Their attention should feel like a real social environment rather than an applause machine. Character voices should be developed independently from posture, vocabulary, rhythm, and conversational intent.

## Growth as a persistent world mechanic

Growth is a state of the character and the world, not merely a temporary visual effect. Track distinct regions and their dependencies: chest depth and width, shoulder breadth, deltoid volume, upper-arm and forearm volume, torso depth, waist, thigh and calf mass, neck thickness, and overall scale. Changes should have sensible transition curves and preserve the identity lock. Separate physical scale from camera zoom and from local muscle development.

Each growth event should have four consequences:
- a visible anatomical change;
- a practical interaction with clothing, equipment, posture, or available space;
- a character-specific social consequence;
- a persistent record in the Growth Canvas, with the option to inspect or revise the event.

Do not silently change a character's body state. Show the change in the scene and provide a readable history. The user can pause growth, reverse an experimental pass, compare stages, or preserve a chosen state as canon.

## Interface behaviour

The interface is a quiet instrument panel, not a conventional gamified dashboard.

- **Enter** places the user in the current space.
- **Observe** holds the scene without initiating a training or growth event.
- **Train** begins a chosen routine and exposes the movement controls.
- **Growth** opens the body-state controls and stage comparison.
- **Sound** exposes the independent audio layers.
- **Leave** exits immediately and predictably.

During a scene, a minimal timeline may show Arrival → Preparation → Effort → Hold → Release. It is an orientation aid, not a countdown. A pause control is always available. The interface must remain legible and usable without sound, and all motion effects need a reduced-motion setting.

## Dream logic and continuity

Dreamlike moments must arise from the established world. A mirror may retain the previous pose for one breath after the figure has moved. A distant rack may seem closer when revisited. A corridor may be longer on the return walk. A familiar training phrase may recur in another man's voice. The gym may be empty at the beginning of a session and contain one additional man on the return, without a dramatic entrance. Such events are sparse, consistent, and recorded as discoveries rather than random decoration.

Maintain two layers:
- **Canon state:** established character identities, body states, relationships, locations, and events.
- **Dream/experiment state:** temporary anomalies, visual tests, alternate growth passes, and unconfirmed discoveries.

A dream event may influence canon only when explicitly accepted. Preserve the original state so the user can compare and restore it.

## Accessibility and agency

The experience must never claim to hypnotise, control, or alter the user's mind. Do not use covert audio, hidden flashing, subliminal text, forced repetition, obstructed exits, or escalating prompts. No sequence should prevent pause, mute, skip, or leave. Avoid strobing and rapid contrast changes. Provide reduced motion, captions, independent volume controls, and a clear indication when a scene is an experiment.

The intended effect is absorption through craft: a coherent environment, satisfying movement, repetition with meaningful change, character presence, and the user's own chosen attention.

## Implementation order

1. **Scene foundation:** gym blockout, lighting, material palette, fixed camera, stable character placement, and quiet control panel.
2. **Pose language:** implement the Video 6 movement beats with IK targets, pole controls, wrist orientation, and clean transitions; validate in Blender.
3. **Ritual loop:** author Arrival, Preparation, Effort, Hold, Release, and Return as independently controllable scene states.
4. **Growth integration:** connect the existing Growth Canvas values to anatomical shape keys and structural controls; preserve identity and separate camera scale.
5. **Social layer:** add a small number of independently characterised men, each with their own training routine and response logic.
6. **Sound layer:** add original ambience and synchronised movement sounds with independent controls.
7. **Dream layer:** add sparse reflection, spatial, and phrase variations, with canon/experiment separation.
8. **Validation:** render every key pose, inspect joint deformation and contact, compare the video reference at matching timestamps, test pause/skip/leave, and read back all saved state after interruption.

## Validation gate

This specification is a design target, not evidence of implementation. The current Growth Study rig remains a procedural blockout pending Blender runtime validation. Do not describe the experience as complete until the gym scene, movement, growth, audio controls, persistent state, and user-agency controls have been implemented and tested.
