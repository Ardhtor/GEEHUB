# Decision Records

GEEHUB is being built through accumulation rather than a single specification. That makes certain decisions unusually important: choosing a static architecture, deciding that the Atlas is the umbrella, treating the jammer as a production mechanism rather than a prompt generator, or deciding that a concept deserves its own repository.

A decision record exists when reversing a choice later would be expensive or confusing. The purpose is not bureaucracy. It is to keep the repository intelligible to its future self.

## Record format

Each record should answer five questions in ordinary language:

### Context
What was happening that made this decision necessary? Include the relevant pressure, failure, opportunity, or observation.

### Decision
What are we actually going to do?

### Reasoning
Why this choice instead of the obvious alternatives? This is the important part. A future reader should understand the tradeoff, not merely the outcome.

### Consequences
What becomes easier? What becomes harder? What new possibilities does the decision open, and what does it intentionally leave unresolved?

### Lineage
Which existing project, experiment, conversation, or repository supplied the idea? Link to the source when possible.

## Initial records

### DR-001 — GEEHUB is the umbrella

**Context:** The work already spans research, archives, games, fiction, myth, visual experiments, tooling, and 3D work. Keeping all of those ideas in one undifferentiated project would make the repository easier to start but harder to understand.

**Decision:** GEEHUB remains the umbrella map. Small ideas stay inside it until they acquire enough identity and substance to justify a dedicated repository. When a project splits, the Atlas keeps the relationship visible.

**Reasoning:** Repository boundaries should follow usefulness, not naming enthusiasm. The map provides continuity while allowing mature systems to develop their own internal grammar.

**Consequences:** The hub stays coherent, while substantial projects can become deeper without making the umbrella unreadable.

**Lineage:** Project Atlas and the existing constellation work.

### DR-002 — The jammer must produce an artifact brief

**Context:** A random idea is easy to generate and easy to forget. The useful unit is the transition from surprising combination to something concrete enough to make.

**Decision:** `MAKE IT` turns a collision into a tiny artifact brief with an intended medium and a limiting constraint. The brief can be saved locally and copied.

**Reasoning:** This preserves the playful speed of the jammer while connecting it to actual production. The smaller the first artifact, the lower the cost of testing the idea.

**Consequences:** The jammer becomes a bridge between imagination and production. It still does not generate the final artifact itself; that is the next integration boundary.

**Lineage:** Narrative Jammer specification and the project's build loop.

### DR-003 — Provenance is part of creative state

**Context:** Beefythiq's semantic model explicitly treats lineage, relations, potential, timestamps, provenance, and confidence as meaningful node data. Archive work likewise depends on knowing where a record came from.

**Decision:** GEEHUB should preserve source project IDs and later artifact lineage wherever practical.

**Reasoning:** Without lineage, recombination becomes noise. With lineage, a strange result can be traced, compared, promoted, or deliberately mutated.

**Consequences:** Data structures become slightly more verbose, but the repository gains a memory of how ideas move.

**Lineage:** Beefythiq research and BodyLounger archive design.

### DR-004 — Simplicity at the surface, complexity underneath

**Context:** Earlier versions became fragile when the front page depended on more runtime pieces than a curious user needed to understand.

**Decision:** Keep the first interaction self-contained and simple. Put sophisticated machinery behind the doorway rather than in front of it.

**Reasoning:** The user's first task is not to learn the architecture. It is to discover something interesting and act on it.

**Consequences:** Some duplication in the front-end data is acceptable. The tradeoff buys resilience and immediate usability.

**Lineage:** GEEHUB debugging history and the progressive-disclosure principle documented in the Beefythiq research.

## When to create another record

Create a new record when a choice changes the shape of the system, establishes a reusable convention, or would otherwise be hard for a future session to reconstruct. Tiny implementation details belong in code comments or ordinary commits. Major changes belong here.
