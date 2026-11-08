# GEEHUB / The living runtime

GEEHUB should behave as one continuous world with several simultaneous working surfaces. The interface is not the intelligence; it is where the intelligence becomes perceptible. The model is not the world; it is a participant in a world whose state, artifacts, geography, relationships, and production history remain available between turns.

## The live cycle

An encounter enters through the shared interaction bus. The live interlocutor assembles the present scene, recent dialogue, participant identities, voice starting points, current world state, and relevant canon. The model returns one utterance and a concrete consequence. The utterance is displayed and inscribed into the local scene immediately. The next request inherits that changed scene and the recent exchange. This is a turn-by-turn continuation, not a batch profile-analysis workflow.

## Four connected ends

**Conversation:** the model produces actual speech in response to the current scene. Characters are not selected from keyword response tables. Their voices are starting hypotheses revised by remembered interaction, not fixed labels.

**World state:** consequences are first-class. A line can change a relationship, introduce an intention, alter a location, leave a disagreement unresolved, or establish a new shared expression. The next turn receives the change.

**Perception:** images, video, sound, and spatial recordings must enter as grounded observations with source references and uncertainty. Text-only context must never masquerade as visual or audio inspection.

**Production:** an intention can become a typed image, video, sound, model, or environment job. The job has a status and lineage. A request is not a completed render; a queued job is not a delivered artifact.

## Continuity and authority

Canon, experiments, live session state, and production outputs remain distinguishable. The live model may propose a change; the continuity layer decides where it belongs. Durable memory is written only through an explicit persistence path. The model cannot edit arbitrary code, secrets, workflows, or files through the dialogue endpoint.

## Runtime boundaries

The local server in `server/geehub-server.mjs` supplies the interactive Responses API connection. The browser module in `engine/live-interlocutor.js` supplies the visible conversation surface and synchronous context handoff between turns. It requires a configured API key and model ID on the server. The existing scheduled Tractus writer is not an interactive substitute.

This is a working foundation, not a claim that every modality is already connected. Visual/audio perception, durable shared persistence, and production workers must each be connected to their actual providers and verified independently.
