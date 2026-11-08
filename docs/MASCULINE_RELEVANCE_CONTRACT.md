# TRACTUS // MASCULINE RELEVANCE CONTRACT
Status: active directive for The Tractus / GEEHUB hub  
Grammar: mechanism → interface → transformation rule → continuity principle → setting → mythology  
Test: WHAT HAPPENED → WHAT DO WE SEE → WHAT CHANGED → WHAT REMAINS

## Law

Nothing consequential is real until it is inscribed.  
Nothing inscribed is complete until its residue is readable by the next process.  
Strength is not atmosphere. Strength is a change the house must keep.

## Core loop (masculine completion)

```
ENCOUNTER → WORK → COST → RESIDUE → NEW BASELINE → NEXT PASSAGE
```

Not:

```
MOOD → DESCRIPTION → MORE DESCRIPTION → ARCHIVE WITHOUT CONSEQUENCE
```

A cycle is complete only when:

1. an occurrence has a stable `id`
2. `inscribe_event` has written it
3. `current-world.json` reflects the delta
4. at least one durable artifact exists
5. the next process can load the new baseline without the original conversation

## Continuity Kernel (required)

All hub surfaces are clients of one kernel.

```text
occurrence
  → inscribe_event(event, source)
  → activity.jsonl
  → artifacts/index.json
  → current-world.json
  → (optional) job queue
  → UI reads baseline + open jobs + next_passage
```

Forbidden:

- browser-only saves presented as world memory
- parallel “current state” files that can disagree
- narration of renders, growth, or world change without inscription
- `QUEUED` reported as completed work

## Event shape (Tractus passage)

```json
{
  "id": "passage-000128",
  "occurred_at": "ISO-8601",
  "source": "hub|world-pulse|long-play|worker|fiction|sensation",
  "region_id": "cedar-house",
  "agents": ["ursalon", "you"],
  "work": "clear the path / raise the beam / accept baseline / hold the line",
  "cost": "what was risked, spent, yielded, or refused",
  "delta": {
    "material": ["chair reinforced", "blue cup moved"],
    "relation": ["protection without ownership"],
    "body": ["scale 1.00 → 1.00"],
    "room": ["door left open"]
  },
  "residue": {
    "artifact_ids": ["activity-passage-000128"],
    "baseline_id": "cabin-baseline-000128",
    "open_threads": ["walk alone tomorrow"]
  },
  "status": "OCCURRED_AND_INSCRIBED",
  "canon": "canon|draft|experiment",
  "next_passage": "return to the hearth with berries / ask before intervening"
}
```

## current-world.json (single source of truth)

```json
{
  "version": 1,
  "pulse": 0,
  "region_id": "cedar-house",
  "place": "The Quiet That Holds",
  "agents_present": ["ursalon"],
  "baseline_id": "cabin-baseline-000128",
  "last_passage_id": "passage-000128",
  "material_state": {
    "door": "open",
    "table": "extra place set",
    "path": "cleared to the trees"
  },
  "relation_state": {
    "central_bond": "chosen daily",
    "protection_mode": "information not prohibition"
  },
  "body_state": {},
  "open_jobs": {
    "image": [],
    "video": [],
    "sound": [],
    "space3d": []
  },
  "open_threads": [],
  "next_passage": null
}
```

Every RUN, SAVE, ACCEPT, CROSSING, and worker completion rewrites this file through the kernel only.

## Masculine operators (executable preferences)

Prefer these transformation rules:

| Operator | Meaning in Tractus terms |
|---|---|
| `WORK` | A task with a visible result: repair, carry, clear, raise, finish, inscribe |
| `COST` | Time, pride, safety, comfort, or certainty spent |
| `HOLD` | Maintain a line, a beam, a door, a promise without spectacle |
| `YIELD_ONCE` | Chosen restraint (force offered, not extracted) |
| `ROOM_ANSWERS` | Architecture, furniture, clearance, tools respond to body and choice |
| `BROTHER_FRICTION` | Loyalty expressed through argument, labor, teasing, rivalry with residue |
| `RETURN` | Departure allowed; return changes the table |

Demote these:

| Operator | Why |
|---|---|
| `VIBE_ONLY` | No delta, no artifact |
| `SPECTACLE_WITHOUT_CRAFT` | Presence without work |
| `OWNERSHIP_AS_CARE` | Shelter becoming cage (Locked Orchard failure mode) |
| `FALSE_COMPLETION` | Queued or specified treated as done |
| `META_ENGINE_AS_SCENE` | Mechanism lecture replacing place |

## Setting bias (front door)

Primary stage:

- cabin / hearth / table / path / porch
- workshop surfaces where jobs complete or fail honestly
- rooms that recalibrate when bodies or bonds change

Secondary:

- pantheon orbit as visitors who arrive with work, schemes, or weather
- studios as production layers of the same world, not separate apps

The front door must show:

```text
LAST PASSAGE
WHAT CHANGED
WHAT REMAINS
OPEN JOBS (queued ≠ done)
NEXT PASSAGE
```

Not an encyclopedia of nodes first.

## Sensation Engine alignment

```
ANTICIPATION → EMBODIMENT → REWARD → RESIDUE → NEW BASELINE → NEXT DESIRE
```

Masculine relevance rules:

- embodiment is physics (`ROOM_ANSWERS`)
- reward includes competence and ease, not only escalation
- residue must update `baseline_id` and `current-world.json`
- next desire emerges from the new baseline, not a reset

Identity continuous. Scale consequential. Clothing and clearance honest.

## Fiction Engine alignment

```
ENCOUNTER → SCENE → CONSEQUENCE → INHERITANCE → NEW BASELINE → NEXT SCENE
```

Write men through action:

- food passed
- beam held
- path cleared
- question asked before intervention
- insult safe only because the bond already exists

End on a live vector. Save canon delta. Do not explain the engine inside the scene.

## Brotherhood protocol

Valid pantheon / household collisions produce:

1. friction (disagreement, rivalry, envy, humor)
2. shared work or shared table
3. a residue the house keeps

Invalid collisions produce only commentary.

Ursalon rule:

```
protect = inform + prepare + remain
protect ≠ choose the other person's life
```

Grokthar rule:

```
arrival may be loud
arrival does not excuse what follows
force can be offered; it cannot manufacture consent
```

## Job honesty

```
QUEUED    → request exists
RUNNING   → worker claimed it
COMPLETED → file exists + artifact inscribed
FAILED    → failure inscribed, baseline unchanged
```

UI and broadcast may only use these words as defined.

## Completion test (masculine + relevant)

A Tractus passage is successful when:

- a man (or men) did work in a place
- the work had cost
- the world kept evidence
- relations could strain without breaking the house
- the next passage is loadable from state alone
- no false completion was claimed

## Operator instruction

```
Load current-world.json.
Enter the place.
Do one unit of work.
Pay one real cost.
Inscribe the occurrence.
Update the baseline.
Show what remains.
Offer the next passage.
```

## Forbidden claim

Do not say the hub is a living world engine while SAVE is local-only, jobs are eternally queued, or multiple current states disagree.

## Preferred claim (earned)

```
The Tractus keeps what happened.
The house answers what changed.
The next process begins from what remains.
```
