# GEEHUB Execution Paths — From World to Working System

Status: active implementation map. This document distinguishes existing repository capabilities, new code committed with this plan, and external dependencies that remain unconfigured. A specification, registry entry, queued job, or narrative scene is not evidence that a runtime feature has completed.

## Operating rule

Develop the Tractus as one continuity system with many interfaces. Each occurrence receives one stable event identity through `engine/inscription.py`; the append-only activity stream is canonical, while character histories, campus views, body state, artifacts, maps, narrative and media requests are projections. Do not create a parallel Institute database or a second event log. A feature is complete only when its implementation, consumer, tests, registry entry and read-back verification agree.

## What already exists and can be reused

| Capability | Existing implementation | Immediate use |
|---|---|---|
| Canonical event inscription | `engine/inscription.py`, `engine/activity.jsonl` | Give each occurrence one ID, lock writes, reject conflicting duplicate IDs, write artifact and outbox projections |
| Durable artifact index | `artifacts/index.json`, `artifacts/activity-events/` | Make chapters, events, media and research outputs discoverable |
| World and campus state | `engine/state.json`, `engine/campus-life.json` | Supply current conditions and established campus events |
| Live local service | `server/geehub-server.mjs` | Serve GEEHUB, accept dialogue and event inscription, expose recent activity |
| Character voice continuity | `engine/voices/voice-engine.mjs` | Apply each utterance to next-turn context synchronously |
| Narrative memory | `scripts/tractus_engine.py`, `scripts/tractus_memory.py` | Continue approved threads and preserve spaced retrieval |
| Experience and production surfaces | `hub/gee-studio.html`, `engine/video/imagine-studio.html` | Stage interactive and audiovisual outputs |
| Performance checks | `engine/check_performance.py` | Fail-fast integrity checks for existing world and Long Play paths |

## First executable extension: Institute events

`engine/institute_events.py` is a typed adapter over the canonical writer. It validates stable IDs, ISO timestamps, event kinds, known Institute/partner places, participant IDs and payload shape, then delegates persistence to `inscription.inscribe_event`. It does not create a second store. The accompanying `engine/test_institute_events.py` covers shared-stream projection, artifact/outbox creation, retry idempotency, unknown places, duplicate participants and invalid timestamps.

Run from the repository root:

```sh
python -m unittest engine.test_institute_events engine.test_inscription
```

This command is the first local acceptance gate. The GitHub validation workflow now runs the Institute adapter regression suite as well as the canonical inscription suite on relevant pushes; a code commit alone is not evidence that the tests passed.

## The next implementation layers

### 1. Shared event propagation

Extend the Institute adapter with an event projector that consumes new canonical events and updates derived views by event ID. Initial projections: Institute calendar, place activity, character timeline, training-session history, equipment/maintenance queue and residential daybook. Every projection stores its last processed event ID and can be rebuilt from the canonical stream. Replaying the same event must not duplicate a meal, session, friendship change or maintenance request.

Needed: Python standard library first; existing activity log and artifact ledger; unit tests with temporary directories. No account or download required. Add a small CLI for replay, inspect, verify and rebuild. Keep projection writes atomic and use the existing lock discipline.

### 2. Body and growth continuity

Use existing character IDs and the Growth Study 001/Jock Hypnosis specifications. Represent physical development as versioned observations and deliberate fictional state changes: baseline, measurement provenance, movement evidence, recovery, stage, visible consequences and unresolved estimates. Do not derive permanent body changes from a single camera frame. The body state should connect to clothing fit, equipment reach, posture, training history, dormitory life and social responses through the same event ID.

Needed now: Python/JSON schemas and fixtures, existing character records, existing Jock Hypnosis spec, existing voice runtime. Needed for visual validation later: Blender and the repository's Growth Study assets. Blender automation and visual fidelity must be separately tested; a written rig spec is not a rendered or validated rig.

### 3. Dormitory and campus life

Treat residences as a full social system, not a sleeping-room backdrop. Add room occupancy, shared kitchens, laundry, common rooms, quiet hours, repair requests, personal projects, visits, meals and friendships as events. Each man retains private choices and a first-person account. A change in the gym may affect recovery and clothing; it does not automatically dictate a man's mood, relationships or plans.

Needed: event projections, character/place registries, the existing campus-life data, and browser UI. The first version can run locally without a cloud service.

### 4. Voice and social continuity

Connect every consequential conversation to the existing voice engine. Record who spoke, who was present, the location, the emotional register, the utterance, the consequence and any acquired expression. Only the next generation step receives the updated context. Expression transfer is a hypothesis until repeated and reviewed; one man's phrase should not overwrite another man's voice.

Needed: existing `engine/voices/voice-engine.mjs`, profile JSON, Node.js 20+ for the server, and tests. Model-generated dialogue additionally requires an enabled model and a server-side API key; manual authored dialogue and local state changes do not.

### 5. Visual and video production

Convert a durable event into a visual brief: subject identity, body state, pose, camera, lens, lighting, environment, temporal beats, source reference, asset dependencies and review status. Keep modular assets reusable: body parts, clothing, props, gym equipment, room pieces, lighting and sound. A video job moves through requested → queued → generated → reviewed → accepted; never label a queued request as a render.

Needed without new signups: repository HTML/JS surfaces, local Blender if installed, local FFmpeg if installed, and existing source assets. The Imagine worker described in the README requires Node, FFmpeg and an xAI API key; it is not available merely because the studio page exists. DaVinci Resolve remains an optional finishing application, not a prerequisite for the first browser experience.

### 6. Sound and sensation

Attach sound state to place and event: room tone, ventilation, footfalls, equipment, voices, music cues, distance and reverb. The first version can use browser audio and original procedural synthesis. Preserve sound as an editable layer rather than baking every cue into a video.

Needed: browser Web Audio API for the no-download prototype; FFmpeg for offline assembly; external sound services only when a specific asset cannot be made locally.

### 7. Cross-world passages

A passage connects places or systems without collapsing their identities. Institute, Northgate, Dad Convent, Veyrthalis, The Complex, Beefythiq, Hulum's Cave, Mass1v1ng and the other Atlas nodes should exchange people, events, artifacts, techniques and references through stable IDs and explicit permissions. A research source does not become canon; a story event does not silently change a production rig; a visual experiment does not overwrite a character record.

Needed: the two Atlas registries, `hub/interaction-space.json`, the continuity contract, event provenance and artifact ledger. Promote only reviewed changes. Keep experimental branches separate until accepted.

## Tool order: least friction first

1. GitHub repository and existing files: no download or new signup; use for code, canon, schemas, tests, registries and review history.
2. Browser-local HTML/CSS/JavaScript: no installation; use for the visible world, panels, maps, timeline, controls and local prototypes.
3. Python standard library: use for event validation, migration, integrity, replay and JSON projections.
4. Node.js already required by the live server: use for the local API and voice/runtime integration.
5. Existing local Blender and FFmpeg installations: use for 3D, compositing, audio/video assembly; detect availability before promising execution.
6. Existing Dropbox connection or token: use for durable media delivery only after access is configured. Repository outbox files are handoff records, not proof of Dropbox upload.
7. Model and media APIs: optional accelerators, not architectural prerequisites. Keep credentials server-side and label external jobs honestly.

## Acceptance gates

- Event identity: one event ID appears once in the activity stream.
- Concurrency: simultaneous writes and repeated autosaves do not corrupt or duplicate records.
- Recovery: interrupted final JSONL append is repaired only at the incomplete tail; complete records remain unchanged.
- Projection integrity: every derived view can be rebuilt from the canonical stream and read back.
- Provenance: source, actor, participants, place, timestamp and parent state remain traceable.
- Canon separation: experiment, draft, review and canon are distinct states.
- Media honesty: requested, queued, rendered, reviewed and accepted are distinct statuses.
- Experience continuity: a session can carry into recovery, meals, residences, clothing, relationships and the next day without inventing unrecorded consequences.
- Interface usefulness: the user can enter a world, see what changed, inspect why, and continue from the artifact rather than reading a dashboard of disconnected summaries.

## Current boundary

The shared Tractus event writer, activity stream, artifact ledger, local server and voice runtime already exist. The Institute-specific typed adapter and tests are the new executable foundation in this commit. Automatic Institute-wide propagation, body-state projections, cross-world subscriptions, Blender automation, verified Dropbox delivery and autonomous media rendering remain subsequent work. They should be implemented in that order, with each acceptance gate run before the next layer is treated as operational.
