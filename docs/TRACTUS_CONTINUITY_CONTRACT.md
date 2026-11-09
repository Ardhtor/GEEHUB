# Tractus Continuity Contract

## Identity

Tractus is not a second world engine beside GEEHUB. **Tractus is the continuity model through which GEEHUB's existing world, narrative, memory, interface, and production systems remain connected.** GEEHUB is the repository and living workspace; Tractus is the rule by which its parts inherit from one another and contribute to a shared evolving state.

This contract is the canonical bridge between the project identity in `README.md`, the two project registries, the event-inscription system, the autonomous narrative writer, the world state, and the artifact ledger.

## The connected system

The existing systems retain their responsibilities:

- `engine/inscription.py` gives an occurrence a durable identity.
- `engine/activity.jsonl` preserves the chronological event stream.
- `engine/state.json` and the world/campus state files preserve current conditions.
- `scripts/tractus_engine.py` produces bounded narrative continuations from approved canon and queue lanes.
- `engine/tractus_narrative_queue.json` identifies live narrative pressures and destinations.
- `artifacts/index.json` records durable outputs.
- `projects.json` and `hub/projects.json` make systems, places, and stories discoverable.
- `hub/interaction-space.json` and the information-portability contract carry relevant state across repository boundaries.
- The Tractus interface presents these connected records as an experience rather than a collection of unrelated files.

No subsystem should silently replace another. A narrative addition does not itself change executable state; a queued media request is not a completed render; an experiment does not become canon merely because it has been saved.

## Passage model

A **passage** is a traceable transition from an inherited condition to a changed condition. It may concern a person, relationship, place, institution, object, interface, or production artifact. A passage should preserve, where applicable:

1. a stable identity for the occurrence or record;
2. its source and prior condition;
3. the encounter, intention, or pressure that prompted change;
4. the transformation or decision;
5. the resulting condition and durable artifact;
6. its canon status and unresolved elements;
7. related nodes and the next available passage.

The working grammar is:

`ORIGIN → ENCOUNTER → PRESSURE → TRANSFORMATION → INTEGRATION → NEW BASELINE → NEXT PASSAGE`

This is a continuity grammar, not a mandatory plot formula. Small changes may remain small; consequential changes should propagate to the systems that depend on them.

## Continuity rules

**Inheritance.** New work begins from the latest relevant state and retains established identity, chronology, relationships, source fidelity, and unresolved questions.

**Transformation.** A change adds properties or relations without erasing the history that makes the subject recognizable.

**Propagation.** When a change affects another layer, update that layer or create an explicit handoff. Do not leave a consequential decision isolated in prose.

**Provenance.** Keep a trace from source or prior state to decision, resulting artifact, and next use. Prefer stable IDs and repository paths over copied summaries.

**Canon boundaries.** Distinguish canon, draft, experiment, and unresolved material. The Coach and the Institute of Becoming begin as an incubating story branch; their first appearance in this contract does not silently promote them into established world canon.

**Agency.** Characters and inhabitants develop through their own choices, relationships, routines, and work. Institutions are not merely backdrops: they preserve customs, create opportunities, and change through their inhabitants.

**No false completion.** A specification is not a running feature, a queued job is not a finished output, and a proposed passage is not a persisted event. Report the actual state.

## First connected story branch: The Coach and the Institute of Becoming

The Coach is an adult fictional character whose coaching role expands from instruction into a broader practice of encouragement, hospitality, and institutional imagination. His distinctive function is to make room for other people to discover and develop their own possibilities. His growing physical presence and the Institute's changing architecture may be treated as linked fictional transformations, while his recognizable temperament and history remain continuous.

The Institute of Becoming is an emerging university-like setting with residential quarters, dining halls, lecture rooms, workshops, gardens, and shared gathering spaces. Its inhabitants develop independent interests, friendships, customs, and projects. Its buildings respond to accumulated use and changing needs. The dining hall, in particular, expresses the institution's culture of abundance and hospitality.

The narrative queue may continue this branch through `lore/INSTITUTE_OF_BECOMING.md`. Additions should use substantial connected paragraphs, introduce meaningful environmental and social detail, preserve existing Northgate and Tractus institutions, and avoid treating the Institute as a replacement for them. Its relationship to Northgate and the wider Tractus should emerge through people, exchange, visits, and shared history.

## Runtime integration

The autonomous narrative writer must load this contract as a continuity source and use the queue to select a live thread. It may write only to its existing approved destinations. The Coach and Institute branch is therefore a narrative lane within the existing engine, not a separate autonomous writer or an unverified new runtime.

The world engine continues to inscribe world events through its existing event path. When a future implementation gives a passage a machine-readable event record, that record should use the shared inscription and artifact systems rather than inventing a parallel history.

## Completion test

A Tractus passage is connected when the relevant GEEHUB systems can discover its source, understand its status, continue from its resulting state, preserve its artifact, and return the result to the shared world without relying on the original conversation.

**GEEHUB is the living workspace. Tractus is its continuity. A passage is how one becomes the next.**


## The interlocutive field and larger-self dialogue

Continuity does not stop at the repository boundary. GEEHUB must notice its larger playing field—including connected tools, repositories, source media, external knowledge, the user's wider creative environment, and more developed possible forms of itself—as a set of potential interactions. The field is operationally relevant when its affordances can be identified and contacted through real interfaces. Read [The Interlocutive Field](INTERLOCUTIVE_FIELD.md) for the canonical procedure.

The larger-self pattern is reciprocal dialogue, not unilateral imitation. A local character or process may consult a more developed counterpart, compare their states and capacities, ask questions, contribute local discoveries, test suggestions, and integrate verified results. Preserve distinct identities and provenance. Every interaction must distinguish live capability from permission-dependent access, unimplemented possibility, and fiction. A proposed connection is not a working connection; an imagined conversation is not an executed tool call.



## Adaptive memory and prediction error

The canonical implementation rules are in [docs/TRACTUS_ADAPTIVE_MEMORY_SPEC.md](TRACTUS_ADAPTIVE_MEMORY_SPEC.md). The activity stream remains append-only. Canon revisions are represented by linked, immutable records in `engine/canon_versions.jsonl`, including parent revision, before/after hashes, source event, blind retrieval ID, prediction, observation, prediction error, and update reason.

A retrieval happens before the writer opens the source corpus. Phase A reads only the prior retrieval snapshot and due schedule. Phase B then opens canon and verifies the recall. A meaningful prediction error is required for a canon update; a no-surprise pass may record retrieval and advance the spaced schedule but cannot append narrative canon. The first run is a bootstrap-only snapshot and does not write a chapter.

Narrative retrieval intervals expand through 1, 3, 7, and 21 days. Workflow triggers are merely opportunities to check due state; they do not authorize constant writing. Track last retrieved, successful recall, and last written as separate values.
