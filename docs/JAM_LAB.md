# GEEHUB Jam Lab

The Jam Lab is the memory surface for the narrative jammer. The jammer is useful only when its collisions accumulate into artifacts, experiments, observations, or new project structure. A generated premise that disappears after one click is entertainment; a premise that can be revisited, compared, and promoted becomes creative infrastructure.

## The operating idea

GEEHUB has two related loops. The engineering loop is **discover → synthesize → build → test → expand → connect → split**. The creative loop is **constellation → collision → premise → artifact → evaluation → promotion**. The Jam Lab sits between them. It records enough information about a collision that a later session can understand where it came from and what happened after it was generated.

This is intentionally lightweight. The first useful state is simply a saved jam. More structure should appear only when it proves useful.

## What a saved jam contains

A jam should retain its title, premise, source project IDs, creation time, medium or intended form, and the constraint that shaped the proposed artifact. Later versions can add a short observation, outcome, rating, links to produced files, or a promotion target.

The source IDs matter. Provenance turns a funny collision into a traceable relationship in the larger constellation.

## What evaluation means here

Evaluation does not mean grading creative work as though it were an exam. It means asking whether the collision changed anything. Did it produce a useful image? Did it reveal a new relationship? Did the constraint make the prototype easier to start? Did the combination suggest a dedicated project? Did it fail in an interesting way?

A failed jam is still useful when the failure is recorded. This follows the broader repository practice of keeping experimentation visible rather than pretending every branch was successful.

## Promotion

A jam becomes eligible for promotion when it produces durable material: a prototype, scene, research question, visual series, mechanic, canon entry, or repeatable technique. Promotion should eventually create a short project brief containing the jam, its lineage, the proposed artifact, and the next concrete action.

The repository boundary can then follow the work. Do not split a project simply because a clever name appeared. Split when the idea has acquired enough identity and substance that its own workspace will reduce friction.

## Design principles inherited from the constellation

The system should remain easy at the surface and explicit underneath. The older work on semantic exploration suggests that concepts become more useful when their lineage, relations, provenance, and potential are visible. The visual-tool lineage suggests that useful interfaces expose immediate manipulation while keeping advanced controls available when needed. The research lineage suggests that practice should be observed as well as performed: doing the thing and studying how the thing is done are part of the same recursive process.

This is why the Jam Lab exists. It is not a diary of prompts. It is a compact experiment ledger for the system's attempts to make connections.

## Near-term implementation

1. Save jams locally with stable source IDs.
2. Show the most recent saved jam without requiring navigation.
3. Let a saved jam be copied into a project brief.
4. Add a tiny outcome field: `made`, `interesting`, `dead`, or `needs another pass`.
5. Add links to resulting artifacts when they exist.
6. Promote unusually productive jams into the Atlas as candidate projects.

The guiding rule is simple: **make the next click produce something that can survive the current session.**
