# Jock Hypnosis — Tractus Continuity Bridge

Status: connected design contract. Registry links and this cross-system contract are committed; executable event propagation is a subsequent implementation task.

## Placement in GEEHUB

This is not a standalone gym application. It is a recurring experience layer inside the Institute of Becoming and the wider Tractus. The original gymnasium at the Institute is its first home, with routes into the residential quarters, locker rooms, dining hall, lecture rooms, workshops, gardens, and other campuses. The gym is a social and architectural centre, not a sealed level.

The experience inherits the existing GEEHUB continuity model. It uses the Growth Study rig and video references for embodied movement; the Growth Canvas, Beefythiq and Mass1v1ng grammars for cumulative physical change; character records and the voice engine for individual identity and speech; Arboreal Audio's procedural-audio lineage for environmental sound; Media Tools and GEEHUB Studio for source inspection and audiovisual production; and the Sensation Engine / Tractus for persistent world memory, passages, artifacts, and discovery.

## Shared identities

Use stable IDs already established by GEEHUB wherever possible. Do not create duplicate versions of a character, place, or artifact simply because it appears in a gym scene.

- institute-of-becoming — institution and campus.
- the-coach — founding coach, with the existing character record and voice continuity.
- growth-study-001 — Blender anatomy, rigging, growth and motion production study.
- sensation-engine — shared world and memory interface.
- tractus-continuity — passage, canon, provenance and propagation rules.
- character-records / developing-voices / voice-engine-runtime — identity, speech and social behaviour.
- media-tools / geehub-studio — source video, shot, camera, sound and rendered artifact lineage.
- arboreal-audio — procedural sound system lineage; gym sounds should be a new environment profile, not a replacement for forest ambience.
- male-stud, sacred-corridor, the-complex, beefythiq, mass1v1ng, muscle-myth — connected social, spatial, transformation and mythic contexts.

## One shared passage, many consequences

A training occurrence should be recorded once and then referenced by its consequences. Do not write a separate disconnected story event, growth event, video event and dorm event when they are all consequences of the same session.

The proposed event envelope is:

    {
      "event_id": "stable-unique-id",
      "event_type": "training.session.completed",
      "subject_id": "character-id",
      "place_id": "institute-gymnasium",
      "occurred_at": "world-time-or-sequence",
      "source_refs": ["video-or-rig-reference"],
      "prior_state_ref": "character-state-before",
      "changes": {
        "body_state_ref": "growth-state-after",
        "movement_state_ref": "pose-or-action-id",
        "social_state_refs": [],
        "place_state_refs": []
      },
      "passage_refs": [],
      "artifact_refs": [],
      "canon_status": "draft",
      "unresolved": []
    }

This is a proposed shared contract, not a claim that the runtime already accepts this schema. The event is inscribed once, receives a stable identity, and is then consumed by the relevant systems.

## Propagation rules

**Body → clothing and equipment.** A committed body-state change updates fit, clearances, grip assumptions, seating, and other practical interactions. Do not scale every object indiscriminately; use explicit fit and clearance rules.

**Body → movement.** A new baseline changes the rig's physical proportions and may require retargeting, joint correction, or a revised motion study. Keep source movement, retargeted action, and final character performance separately identifiable.

**Training → residence.** A completed session can affect the next dormitory or residential scene: fatigue, appetite, shower and laundry routines, shared recovery, a conversation, a new training appointment, or a character's changed confidence. These are authored character consequences, not automatic generic rewards.

**Training → dining hall.** Meal scenes may reflect the actual time of day, training schedule, appetite, friendships and cooking culture. The dining hall remains a social place with its own ongoing life.

**Training → relationships.** A spot, rivalry, invitation, compliment, refusal, disagreement, or shared routine can change a relationship record. No character is required to admire or validate another.

**Training → campus.** Repeated use may change the gym's equipment layout, storage, changing rooms, door clearances, routes, timetables, and the Institute's building plans. Architecture remembers accumulated use.

**Training → media.** A pose or movement can become a source-grounded action in the motion library, a shot in GEEHUB Studio, or a new rigging task. Every derived artifact keeps its source reference and transformation history.

**Training → myth and dream.** A repeated gesture, reflection, phrase, or unusual spatial event may enter the dream/experiment layer. It does not alter canon until explicitly accepted. Mythic interpretations can develop from accumulated events without overwriting their practical causes.

## The connected daily rhythm

The default session is a lived sequence rather than a six-step minigame. A man wakes in residence, moves through the campus, meets another inhabitant, trains, changes, eats, returns to his room or workshop, and encounters the consequences of the session later. Other men continue their own schedules. The gym remains available while the rest of the Institute proceeds.

The hypnotic quality comes from recurrence across locations: the same man adjusts his sleeve in the dorm mirror, repeats the gesture before a set, sees its altered reflection in the gym, and later notices the changed fit at the dining table. The gesture is a motif that gathers meaning through use. Camera, sound and prose should reinforce this continuity without forcing a fixed sequence or preventing the user from going elsewhere.

## Canon, experiment and rollback

- Canonical body, relationship, voice and place states are never silently overwritten by a visual experiment.
- A temporary growth pass, alternate pose, reflection anomaly or sound treatment is marked experimental.
- A user-approved passage can promote an experiment to canon, with a trace to the previous state.
- Every consequential write should be read back and checked against its event ID and source references.
- If one downstream system cannot update, preserve the event and create a visible pending handoff; do not claim propagation succeeded.

## Implementation sequence

1. Add this node to both project registries and connect it to the Institute, Growth Study, Sensation Engine, Tractus, character/voice, audio and media systems.
2. Inspect the existing event-inscription, world-state, artifact-ledger and campus-state formats before writing adapters. Reuse their real schemas rather than inventing parallel stores.
3. Implement a training-session event writer that inscribes one event and records references to body, movement, social, place and artifact consequences.
4. Add readers for the Institute gym, residence and dining-hall scenes so they consume the same event and current character state.
5. Connect Growth Study outputs as versioned motion/body artifacts; keep Blender validation status explicit.
6. Add audio and camera profiles as reusable scene components.
7. Test repeated sessions, interrupted writes, conflicting updates, state rollback, read-back integrity and continuity across locations.
8. Only then mark runtime propagation active.

## Validation boundary

This bridge currently establishes design relationships and registry discoverability. It does not yet implement the shared event writer, cross-location readers, or live propagation. Those require inspection and modification of the existing Tractus runtime and campus-state formats. The next implementation should begin there, not by creating a second isolated state system.
