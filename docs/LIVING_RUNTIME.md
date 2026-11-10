# GEEHUB / The living runtime

GEEHUB should behave as one continuous world with several simultaneous working surfaces. The interface is not the intelligence; it is where the intelligence becomes perceptible. The model is not the world; it is a participant in a world whose state, artifacts, geography, relationships, and production history remain available between turns.

## The live cycle

An encounter enters through the shared interaction bus. The live interlocutor assembles the present scene, recent dialogue, participant identities, voice starting points, current world state, persistent spatial map, active recording, recent exchange ledger, and append-only activity history. The model returns one utterance and a concrete consequence. The utterance enters the bus immediately; the local inscription endpoint then writes the same event to the append-only activity log, artifact ledger, activity-event archive, and Dropbox outbox. The shared room polls the activity endpoint and can receive events created in another session. The next request inherits the changed scene and recent exchange. This is a turn-by-turn continuation, not a batch profile-analysis workflow.

## Four connected ends

**Conversation:** the model produces actual speech in response to the current scene. Characters are not selected from keyword response tables. Their voices are starting hypotheses revised by remembered interaction, not fixed labels.

**World state:** consequences are first-class. A line can change a relationship, introduce an intention, alter a location, leave a disagreement unresolved, or establish a new shared expression. The speaker's generated line becomes that character's recorded response; the consequence chain can direct the next agent. The next turn receives the change.

**Perception:** images, video, sound, and spatial recordings must enter as grounded observations with source references and uncertainty. Text-only context must never masquerade as visual or audio inspection.

**Production:** an inscribed dialogue or world event becomes an unclassified artifact and enters the Dropbox production outbox when the browser production bridge is active. An intention can also become a typed image, video, sound, model, or environment job. Each job needs a status and lineage. A request is not a completed render; a queued job is not a delivered artifact.

## Continuity and authority

Canon, experiments, live session state, and production outputs remain distinguishable. The live model may propose a change; the continuity layer decides where it belongs. Durable memory is written only through an explicit persistence path. The model cannot edit arbitrary code, secrets, workflows, or files through the dialogue endpoint.

## Runtime boundaries

The local server in `server/geehub-server.mjs` supplies the interactive Responses API connection. The browser module in `engine/live-interlocutor.js` supplies the visible conversation surface and synchronous context handoff between turns. It requires a configured API key and model ID on the server. The existing scheduled Tractus writer is not an interactive substitute.

This is a working foundation, not a claim that every modality is already connected. Dialogue inscription and activity polling now use the repository's canonical event writer. Dropbox delivery still requires the user to connect the local GEEHUB folder in a supported desktop browser. Visual/audio perception and the video, sound, and 3D production workers still require their actual providers and independent verification.


## Language self-validation

The local runtime exposes `GET /api/geehub/language`, which runs `engine/tractus_language_audit.py` as a read-only audit. It checks that the executable passage grammar matches the continuity contract, validates exchange-event structure and identity, checks narrative-lane fields and targets, checks world-state passage fields, and validates the append-only activity stream including strict canon-update requirements. The interface reports pass, warning, or fail beside the memory feed. This is structural validation: it can detect malformed records and continuity-contract drift, but it does not certify literary quality, factual truth, consent, or whether a narrative decision deserves canon status. It never repairs or promotes material.
