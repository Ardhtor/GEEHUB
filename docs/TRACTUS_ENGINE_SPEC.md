# Tractus Engine Specification — Adopted Revision

Status: adopted, additive revision  
Scope: versioned canon, retrieval-first writing, Innervation action cues, fail-fast validation  
Compatibility: historical activity records remain valid without v2 fields.

## Memory and canon

`engine/activity.jsonl` remains the chronological append-only event stream. Existing records are not rewritten or migrated. New `canon_update` events are validated before inscription. They require a prior version, an expected prediction, an observed result, an explicit prediction error, a new version ID, a statement of what changed and what remains, and provenance. An invalid canon update is downgraded to an `observation`; the missing fields are never fabricated.

The durable records now have separate jobs:

- `engine/canon_versions.jsonl` — version identity, entity, parent version, source event, claim, remainder, and canon/experiment/superseded status.
- `engine/revision_history.jsonl` — file-level revision lineage, retrieval ID, before/after SHA-256, prediction, observation, error, and reason.
- `engine/activity.jsonl` — append-only occurrence and observation history.

A version can only extend an existing version whose status is `canon`. The version ledger is append-only: each new version points to its prior version, and promotion creates a new canon version rather than rewriting the experiment record. An experiment is not promoted by persistence alone. No historical versions are fabricated during migration.

The current version ledger begins empty because the repository did not contain evidence-backed v2 version records. On the first enabled writer run, existing approved destinations are captured as `experiment` baselines with matching observation events; no narrative file is changed by this capture. The autonomous writer records an observation and holds a proposed canon change while the destination's latest version remains experimental. An operator must review the source and explicitly promote the baseline with `python scripts/promote_canon_version.py VERSION_ID --reviewer REVIEWER --reason REASON --evidence-event-id EVENT_ID`. The evidence IDs must already exist in `engine/activity.jsonl`, must be canon/narrative events, and must identify the same destination path; the baseline-capture observation cannot count as its own evidence. Only then can that destination accept another autonomous canon revision.

## Spaced retrieval

The six-hour workflow trigger is not permission to write. The writer first recalls from the prior retrieval snapshot, without opening canon. It then checks the recall against the source corpus. The first bootstrap pass only creates a retrieval snapshot and cannot write narrative.

The interval ladder is `1 → 3 → 7 → 21 days`. One oldest-due open thread is selected per cycle; ties prefer the thread with fewer successful recalls. A recall score of at least 0.5 advances one interval. A score below 0.5 holds the current interval. Two consecutive failures reset the interval to one day and set `needs_repair`. A score below 0.5 cannot produce a canon addition. A successful recall without prediction error may update retrieval state but does not change canon.

## Innervation cues

The legacy `engine/schemas/innervation-cue.schema.json` remains available for existing cue producers. New tempo-tagged action cues use `engine/schemas/innervation-cue-v2.schema.json` and append to `engine/innervation_cues.jsonl`.

Each v2 cue declares BPM, phase, duration, target response, spatial change, action, sonic residue, and a before/after state. BPM must be 30–300. Target responses are `pause`, `step`, `turn`, `breath`, `reach`, and `stillness`. At least one of tempo, routes, presence, or scale must change. A break must include a tempo change or at least two beats of silence. A cue that only names a mood is rejected.

These are interface and narrative control parameters. They do not establish that software changes a user's physiology.

## Validation and commands

`engine/tractus_science.py` contains dependency-free validators. `engine/inscription.py` exposes `validate_event` and `inscribe`; invalid canon updates are safely downgraded. `engine/check_performance.py` adds the `tractus-science` mode:

```bash
python engine/check_performance.py tractus-science
python engine/check_performance.py all
python -B -m unittest discover -s scripts -p 'test_*.py'
python -B -m unittest discover -s engine -p 'test_*.py'
```

The Tractus workflow runs the new unit tests and science checks before asking the model to write. Existing world and Long Play checks remain separate and continue to distinguish queued media jobs from completed renders.

## Guardrails

- Memory is reconstructive; versioning preserves the history of revisions rather than promising perfect recall.
- A retrieval is not a canon update.
- A queued image, video, or sound job is not a completed render.
- Sound cues change declared tempo, attention, action availability, or fictional/interface state; no physiological effect is claimed.
- Environmental detail supports a scene but does not replace character intention or empathy.
- A local or cloud production capability is not claimed until its actual health checks pass.
