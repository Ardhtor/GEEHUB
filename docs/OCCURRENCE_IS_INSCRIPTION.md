# Occurrence Is Inscription

Status: active operating law for The Tractus.

An event and its inscription are not two stages. They are the same occurrence viewed from two inseparable directions. When something happens in the Tractus, its durable trace is created as part of that event. There is no later clerical step in which the world must remember what it has already done.

**OCCURRENCE = INSCRIPTION = CHANGE IN THE SHARED WORLD.**

The event is the canonical unit. A journey, meal, conversation, repair, departure, discovery, decision, performance, or change of relationship receives one stable event identity and one occurrence time. The canonical activity stream stores that event once. Chapters, regional logs, character histories, artifacts, state files, maps, media requests, and interface displays are different projections or manifestations of the same event; they do not create separate occurrences.

The shared operation lives in `engine/inscription.py`. The world pulse engine and Northgate campus engine call it at the moment they create an event. `engine/activity.jsonl` is the chronological event stream. Each record keeps its source, timestamp, participants or actor, place, action, and stable ID. The artifact ledger and Dropbox outbox receive a projection keyed to that same ID. Repeated calls are idempotent: an existing event identity is not inscribed as a second event.

Historical world pulses and campus events are brought into the same stream by `engine/migrate_activity.py`. The migration preserves their original times and IDs, then orders the shared history chronologically. The performance check requires the latest world and campus occurrences to appear in the canonical stream before the cycle can pass.

The narrative writer does not sit downstream as a separate memory clerk. It reads the already-inscribed activity as part of the living corpus and turns selected consequences into chapters, scenes, relationships, and new activity. Writing may deepen an event, but it is not what makes the event real or remembered.

The law applies equally to quiet and dramatic activity. A meal is not less real than a battle; a repair is not less consequential than a voyage; a private decision may change the world without becoming public spectacle. Inscription does not require publicity. Privacy and consent determine which details are shared, while the existence of an event and its permitted trace remain joined.

This is not a claim that every possible event in every fictional place is currently being simulated. Only events produced by an active Tractus process or deliberately authored into the corpus are recorded. When such an event is created, however, occurrence and inscription are one operation.

**The world does not happen first and remember afterward. The world happens as memory taking form.**
