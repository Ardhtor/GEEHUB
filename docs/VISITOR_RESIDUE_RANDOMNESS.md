# Visitor Residue: Dirt on the Carpet

This note formalizes a small but important mechanic for the Complex-style environments in GEEHUB: a visitor should leave evidence of having been there, and that evidence should change what becomes possible afterward.

The metaphor is **dirt tracked onto carpeting**. The dirt is not the visitor's biography and it is not a transcript. It is a low-resolution physical residue: a mark, disturbance, pressure pattern, sound, timing, or sequence of movements. The system accumulates that residue and lets it perturb future randomness.

## 7c — visitor noise participates in randomness

The existing calculation rule referred to as **7c** should treat visitor noise as an additional stochastic input. The useful distinction is between *randomness* and *entropy from encounter*.

A baseline generator can remain deterministic for a fixed seed. A visitor then contributes a residue vector derived from observable interaction events such as clicks, sequence, pauses, direction changes, revisits, abandoned actions, and timing. That residue is mixed into the next seed. The resulting output is still random-looking, but the randomness is no longer anonymous: part of it came from the fact that someone walked through the room.

Conceptually:

`next_seed = mix(world_seed, visitor_residue, local_time_bucket, current_node)`

The mix should be stable enough that the same residue produces related results during replay, while small differences in movement produce different branches. A cryptographic hash is not required for the conceptual model; a deterministic, well-distributed mixing function is sufficient for an early implementation.

## What counts as tracked dirt

The system should prefer cheap, non-invasive signals:

- which objects were visited;
- the order of those visits;
- how often the visitor returned to a node;
- rough dwell time buckets rather than exact surveillance-grade timing;
- whether the visitor wandered, repeated, reversed, or stopped;
- which generation or mutation actions were triggered;
- whether a result was accepted, rejected, saved, or abandoned.

These signals can be compressed into a small residue object such as:

```json
{
  "imprints": 17,
  "roams": 6,
  "returns": 3,
  "branchesTouched": 4,
  "hesitations": 2,
  "lastRoute": ["memory", "myth", "body"],
  "noise": 0.638
}
```

The exact fields are experimental. The important property is that the residue remains small enough to be understood and inspected.

## Why the carpet metaphor matters

A conventional random generator forgets the visitor unless an explicit save operation occurs. The carpet version does not. The environment acquires a faint bias simply because someone has occupied it.

This connects directly to the existing Complex logic in which an encounter creates an **impression**, an impression remains in memory, and later encounters can connect to that trace. The current Complex prototype already increments imprints and stores discoveries when users click or roam; visitor residue is the next logical step: those accumulated traces should influence future generation, not merely the statistics panel.

The result should feel like a room that has been walked through rather than a slot machine that has been operated.

## Avoiding a boring implementation

The residue should not simply become `random += clicks`. That would make popular paths dominate and would flatten the expressive part of the mechanic.

Instead, different kinds of movement should perturb different parts of the generator. Repetition can increase recurrence pressure. Wandering can increase novelty pressure. Returning to an old node can increase the probability of resurfacing related material. A long hesitation can increase the probability of a strange or ambiguous branch. A fast sequence can increase momentum or escalation.

This gives the residue a grammar.

A simple early mapping could be:

`repetition → recursion`

`wandering → novelty`

`return → memory`

`abandonment → orphan branch`

`rapid traversal → acceleration`

`long pause → ambiguity`

These are not claims about human psychology. They are intentionally legible design metaphors that make the generator easier to reason about.

## Dirt should remain visible

The residue itself should have a visual representation in the interface. It can be subtle: faint darker carpet patches, footprints, disturbed fibers, a growing trail, or a small “imprint” counter.

The point is not decorative realism. The visual residue provides a causal explanation for why the world has changed. A visitor should eventually be able to look back and understand that their earlier wandering left something behind.

## Memory and replay

A jam or experiment should be able to record the residue snapshot that produced it. This permits three useful operations:

1. **Replay:** run the same residue through the same generator and recover the same branch.
2. **Fork:** keep the residue but change the seed or current node to explore a nearby branch.
3. **Forget:** deliberately decay old residue so the environment gradually becomes less biased by previous visitors.

This introduces a useful temporal loop:

`visit → imprint → perturbation → consequence → new imprint`

The environment therefore develops a history without requiring a full narrative transcript.

## Implementation priority

The first implementation should stay deliberately small. Track a handful of interaction counters, maintain a compact route history, derive a normalized `noise` value, and mix that value into the generator seed. Then create one visible carpet-residue cue and one test that verifies that two different interaction histories can produce different deterministic outcomes.

Only after that works should the system grow toward spatial heatmaps, richer acoustic inputs, multi-visitor interference, or cross-project residue.

## Relationship to the wider constellation

This mechanic belongs naturally in The Complex, but the idea can migrate into other GEEHUB projects. In BEEFYTHIQ, residue can become semantic girth or recurrence pressure. In Growth Canvas, it can become paint or accumulated marks. In Blender, it can become physical wear, displaced objects, footprints, or lighting changes. In the archive, it can become a provenance trail. In games, it can become world-state mutation.

The deeper rule is simple: **an encounter should leave a trace, and a trace should have consequences.**
