# Tractus Adaptive Memory and Perception-Action Specification

**Status:** implementation contract, version 1  
**Scope:** narrative memory, retrieval cadence, sensory interaction, Innervation  
**Principle:** memory is a versioned update process, not a mutable inscription.

## 1. Memory: append-only evidence, versioned canon

The chronological event history remains `engine/activity.jsonl`, append-only. Canonical prose files remain readable narrative surfaces, but every accepted canon addition must also create an immutable revision record in `engine/canon_versions.jsonl`. A revision points to its parent revision, target path, prior and resulting content hashes, source event, prediction error, and reason for change. Never silently rewrite or erase a prior revision. Corrections append a new version and explicitly identify what was corrected.

A retrieval is not itself a canon update. Store retrieval attempts as activity events. If no meaningful mismatch is found, the cycle may record a successful recall and update its spaced-retrieval schedule, but it must not alter canon.

### Revision record

Required fields:

- `revision_id`: stable unique identifier.
- `parent_revision_id`: preceding revision for the same canon path, or null for first version.
- `canon_path`: approved narrative target.
- `prior_sha256` and `result_sha256`: content hashes before and after the append.
- `retrieval_id`: ID of the blind-recall pass that preceded inspection.
- `prediction`: what the writer expected before reading canon.
- `observation`: what the canon and evidence actually showed.
- `prediction_error`: specific mismatch, contradiction, or unexpected consequence.
- `update_reason`: why this mismatch warrants a new canon passage.
- `source_event_id`: matching event in the append-only activity stream.
- `created_at`: UTC timestamp.
- `status`: `CANON_REVISION`, `DRAFT`, or `RETRIEVAL_ONLY`.

A revision requires non-empty `prediction`, `observation`, `prediction_error`, and `update_reason`. The error must be a concrete difference, not a generic statement that the scene was surprising. No prediction error means no canon update.

## 2. Retrieval before inspection

The narrative writer runs in two distinct model calls.

**Phase A — blind retrieval.** Read only `engine/retrieval_state.json` and `engine/retrieval_schedule.json`. Do not load the manuscript, canon, queue descriptions, or source corpus. Recall the due thread's three open threads, character locations/states, unresolved facts, and expected next consequence. Store this as a retrieval attempt.

**Phase B — verification and update.** Only after Phase A has returned, load the continuity contract, narrative queue, canon, manuscript, and activity excerpts. Compare recall with the source. Identify what was accurate, what was missing, and what contradicted expectation. Produce a `surprise` object. If the mismatch is absent or trivial, return `skip=true`; do not append a chapter.

The first deployment is a bootstrap cycle: read canon once to seed a compact retrieval snapshot, but do not write a chapter. The next cycle must perform blind retrieval against that snapshot before reading canon.

Retrieval snapshot is a cache, not canon. It must cite the source revision or event from which each recalled fact came. Update it only after the verification phase.

## 3. Spaced retrieval

The narrative workflow may still be triggered every six hours, but a trigger is not permission to write. A thread is eligible only when its `next_due_at` is reached. The expanding interval is:

`1 day → 3 days → 7 days → 14 days → 30 days`

After a successful recall (score ≥ 0.5), advance to the next interval. After a failed recall (score < 0.5), keep the current interval; after two consecutive failures, reset to 1 day and flag the thread `needs_repair`. Never mark an unverified recall as successful. Store `last_retrieved_at`, `next_due_at`, `interval_days`, `successful_recalls`, `retrieval_attempts`, `retrieval_failures`, `needs_repair`, `last_recall_score`, and `last_revision_id` per thread. Prioritize threads that are due and have consequential open material. Track last retrieved and successfully recalled separately from last written.

## 4. Perception-action coupling

Every interactive experience must close a short loop:

`PERCEIVE → CHOOSE → ACT → STATE CHANGE → NEW PERCEPTION`

A choice must alter the next visible or available state within one or two turns. The changed state must propagate to all dependent views: selected region, map pin, route graph, broadcast, scene description, and available actions. A displayed affordance is not functional until using it changes state.

In the Hewn Threshold, each affordance must declare its action, preconditions, state mutation, newly available route, route or option it closes, and resulting perception. If no state changes, the affordance is decorative and must be labelled as such or removed.

The system changes interface state, timing, and available actions. Descriptions of sensation are metaphorical or fictional; do not claim that software literally changes a user's body.

## 5. Innervation: tempo and phase

A cue is a timed control signal, not a mood label. Every actionable cue records:

- `cue_id`, `source_id`, `bpm` (30–300 when periodic; null for non-periodic sound);
- `phase` in beats or seconds, `duration_ms`, `meter` or pulse interval;
- `target_response`: `step`, `breath`, `turn`, `pause`, `reach`, `hold`, or a declared action;
- `synchrony_mode`: `entrain`, `offset`, `break`, or `free`;
- `trigger`, `action`, `state_before`, `state_after`;
- `next_cue_allowed`, and concrete `sonic_residue`.

Use steady isochronous pulses when the scene requires stable synchronization. Use phase shifts, missing beats, or silence when a threshold should interrupt expectation. A cue is rejected if it has no observable action or state consequence. BPM is a design parameter, not a claim that a specific neural response has been measured.

## 6. Narrative image and empathy

Environmental details are selected, not mechanically inserted at every paragraph break. Use one or two concrete details that matter to the character's immediate goal, attention, fear, or desire. Pair environmental perception with a legible character intention. A scene should leave a reader able to recall at least three concrete images and one character intention without rereading. This is an editorial check, not a validated psychometric measure.

## 7. Acceptance gates

A narrative canon update is accepted only when:

1. blind retrieval is recorded before canon inspection;
2. recall is checked against current canon and provenance;
3. a specific prediction error is recorded;
4. the update is consequential and does not contradict unresolved canon;
5. the chapter passes existing destination, length, and content validation;
6. the prior and resulting file hashes are recorded;
7. the revision and its source event are appended without deleting prior history;
8. the retrieval snapshot and schedule are updated;
9. all generated files parse and tests pass.

A no-surprise cycle records retrieval only and exits without changing canon. A dry run writes nothing. A queued or proposed sensory cue is not reported as played or rendered.

## 8. Scope and scientific caution

Reconsolidation, retrieval practice, spacing, embodied cognition, perception-action coupling, and rhythmic entrainment motivate these design choices. The implementation is an engineering analogy and editorial method, not a biological model of human memory or a clinical intervention. The cited rhythm range is a broad practical design envelope; individual entrainment varies. Narrative transportation is used as a craft lens, not a guarantee of reader response.
