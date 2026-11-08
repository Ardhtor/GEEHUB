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

## current-world.json (authoritative runtime projection)

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

`engine/activity.jsonl` remains the canonical historical event stream. `current-world.json` is the authoritative, rebuildable projection of accepted events and current runtime conditions; it is not a second historical ledger. Existing files such as `engine/state.json` and world/campus state must be reconciled through explicit adapters or migration before this projection is declared operational. No subsystem may silently become a competing authority. Every RUN, SAVE, ACCEPT, CROSSING, and worker completion updates the projection through the shared kernel only.

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


## Global male-only fictional scope

The fictional world-building emphasis of this contract is male-only spaces across the full GEEHUB geography. This is a setting and membership rule for fictional places, not a claim about real-world populations or a restriction on real-world access.

The scope includes, where appropriate, households, universities, residential halls, fraternities, gyms, workshops, studios, clubs, pantheons, territories, institutions, settlements, and purpose-built communal spaces. Each space should have a legible identity, an understood membership boundary, and a reason for existing beyond its label. Populate these settings with men whose relationships, routines, work, customs, ambitions, and histories give the place its character. Do not default to a mixed social environment when developing a space explicitly established as male-only.

Male-only does not mean culturally uniform. The global geography should contain distinct societies and institutions shaped by their own histories, climates, materials, customs, architecture, economies, and forms of fellowship. A gym in one region should not feel like a renamed gym elsewhere; a residential institution should carry the habits and history of its inhabitants. Differences should be specific and internally coherent rather than decorative stereotypes.

## Global geography and inter-place continuity

No place exists in isolation. Every place belongs to a larger geography; every man belongs to a history; every encounter has the possibility of changing both.

Give each region a stable identity and relationships to neighboring regions, routes, institutions, and shared resources. Places may exchange visitors, inhabitants, goods, techniques, stories, challenges, and traditions. They may compete, collaborate, host one another, or disagree. These crossings must leave traceable consequences in both the local record and the wider world when the consequences affect both.

Global continuity must not flatten local identity. Preserve each place's vocabulary, customs, visual language, social arrangements, and historical memory while allowing contact to change them. Record the source of an imported custom or relationship; distinguish inheritance from imitation and exchange from takeover.

## Inhabitant development

Recurring male characters have lives that continue beyond the scene in which they appear. Preserve stable identity while allowing development in physical condition, competence, skills, friendships, rivalries, habits, possessions, responsibilities, ambitions, and personal history. Development should arise through choices, practice, relationships, environment, and time—not arbitrary resets or unexplained escalation.

A character's development may change the places he inhabits: equipment is adjusted, rooms are reorganized, routines become customary, responsibilities are reassigned, new facilities are built, and relationships alter how shared spaces are used. Conversely, places and institutions should shape their inhabitants through opportunity, constraint, teaching, tradition, and shared work.

Keep distinct records for established canon, proposed development, and experimental alternatives. A character sheet is not a substitute for lived passages; a passage should contribute relevant changes back to the character and world records.

## State authority and recovery

The historical event stream and the current-world projection have different jobs. The event stream answers what happened and in what order. The current-world projection answers what the world is like now. The projection must be reproducible from the event stream plus explicitly versioned initial conditions, accepted state inputs, and documented migration rules.

Before runtime integration is considered complete, identify every existing state file and define whether it is canonical input, a regional projection, a cache, a compatibility view, or deprecated data. Reconcile existing world and campus state rather than silently replacing it. Recovery must be tested by rebuilding the current projection from persisted records without relying on the original conversation or an in-memory session.

## Expanded completion test

A globally connected passage is complete when its local consequences are inscribed, affected characters and places inherit the relevant changes, any cross-region consequences are propagated, canon status is explicit, and the next process can recover the resulting state from persisted records. A passage need not affect the whole world; its scope should match its actual consequences.
