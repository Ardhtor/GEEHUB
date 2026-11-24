# Universal Growth Engine

*A shared way of working across research, making, and everyday development.*

**Use:** a shared working approach  
**Across:** the repository's research, archives, creative work, tools, media, and projects  
**Principle:** development is cumulative: each new state inherits the relevant prior state and adds a bounded, inspectable change.

## What this is

The Universal Growth Engine governs the repository as one cumulative system: research, archives, creative work, software, characters, environments, media, tools, interfaces, and production. Each area can inform the others without losing its own identity, evidence, methods, or canon. Encounters become inputs; observation and research make them legible; assimilation identifies what can be carried forward; bounded transformations produce new states; differentiation preserves useful branches; continuity makes the result available to later work. Growth is the overarching mechanism, not a theme imposed on every subject.

The aim is to let useful work carry forward and make later work easier. It should not turn every activity into a generic growth metaphor, force unrelated material into one category, or replace working systems with a parallel framework. Existing systems retain their responsibilities and connect through stable records, explicit handoffs, and discoverable artifacts.

Growth is usually incremental. A visual subject may become gradually hairier through successive passes; a character may acquire a habit through repeated encounters; a research question may become more precise as evidence accumulates; a room may gain detail as it is used; a tool may gain a tested capability. Each example has its own measures and pace, but the continuity rule is shared.

## Context carries meaning

Do not solve missing context by adding more explanation. Broaden the field around the work. Every artifact belongs to a larger situation: its sources, place, time, relationships, prior states, surrounding materials, consequences, and possible next uses. Make those connections available through the work itself—its arrangement, links, visual environment, inherited state, and behavior.

A character should be encountered through the people, places, routines, history, and choices that shape the character. An image should retain its source, sequence, visual neighbors, and transformations. A tool should sit beside the material it acts on and the results it produces. A story should inhabit its geography and carry the consequences of earlier chapters. A research finding should remain connected to the evidence, disagreements, and questions that give it meaning.

Context is not a caption attached after the fact. It is part of the object. Build the surrounding relationships before adding explanatory copy. Prefer a meaningful connection, visible consequence, or usable artifact over a paragraph telling someone what to think about it. Keep precise language where it protects provenance, safety, operation, or interpretation; remove language that merely announces, decorates, repeats, or translates what the surrounding work already makes clear.

Broaden without flattening. Preserve distinct projects, people, sources, voices, and interpretations. Connections should reveal their differences as well as their affinities. Do not manufacture a relationship simply to make the whole appear unified.

## Taste emerges through broadening

The purpose of broadening context is to discover a particular taste. Expand the field around an idea until meaningful relationships become perceptible: source material, history, neighboring disciplines, places, people, images, bodies, materials, sounds, techniques, local customs, contradictions, and unfamiliar possibilities. Do not stop at the nearest category or the first obvious precedent. Do not accumulate context merely to make the corpus larger.

The process is:

`BROADEN → ENCOUNTER → COMPARE → DISCERN → MAKE → REVIEW → BROADEN AGAIN`

Broaden beyond the expected reference set. Bring material into a form that can be experienced: a scene, place, image, sound, object, interaction, passage, or working prototype. Compare alternatives long enough for their differences to register. Discern what feels unusually right, what is promising but unresolved, what is merely familiar, and what should be left out. Make something that expresses the emerging preference. Review the result against the actual response and the evidence. The next expansion should follow what the work revealed, not a predetermined expansion schedule.

**Taste is a developing ability to select.** It is more particular than a category, mood board, aesthetic label, or list of preferences. It appears in choices of proportion, pace, voice, material, atmosphere, humour, scale, social texture, narrative attention, and omission. It can be recognized in a family of works without requiring them to repeat the same surface. A distinct taste allows surprise while making the result feel as though it belongs.

The user's judgment remains the decisive signal for work made to the user's direction. Repeated corrections and selections can become durable working preferences, but a single response should not be inflated into a universal rule. The system may offer a hypothesis about an emerging taste; it must not claim to have discovered the user's inner identity or treat a statistical pattern as consent. Keep observed choices, interpretations, and confirmed preferences distinct.

Broadening should change what can be made, not bury the work under references. Preserve provenance and disagreement; do not blend unlike sources into a false lineage. Let context appear through the experience itself—in the names people use, the places they revisit, the materials they choose, the scenes they inhabit, the contrasts they notice, and the things they decline to include. Explanation is available when useful, but it should not replace the encounter.

The endpoint is not endless expansion. It is a distinctive sensibility capable of producing work that could not have emerged from the initial narrow prompt alone. Once a choice has a clear reason and the result has a recognizable character, make it. Return to broadening when the work becomes generic, stalled, or unable to surprise itself.


## A useful rhythm

`ENCOUNTER → INTAKE → OBSERVATION → RESEARCH → INTERPRETATION → EXPERIMENT → GROWTH PASS → REVIEW → INTEGRATION → NEXT PASS`

This is a flexible rhythm, not a required sequence. A small edit may need only a change and a quick review; a research-led project may return to several stages many times. A simple asset edit may need only intake, a growth pass, and review. A complex research-led production may use every stage and repeat them many times.

1. **Encounter and intake.** Register a source, idea, event, request, artifact, or external discovery. Preserve its original identity and provenance.
2. **Observation.** Record what is directly present, with precise locators where applicable. State what was actually inspected and what remains inaccessible.
3. **Research.** Retrieve relevant prior records and investigate additional sources, methods, context, and competing explanations. Research produces questions as well as findings.
4. **Interpretation.** Form hypotheses and comparisons while keeping them separate from direct evidence. Record uncertainty and what could disconfirm a hypothesis.
5. **Experiment.** Define a bounded change or test. Preserve the baseline and make the proposed difference explicit.
6. **Growth pass.** Apply an incremental addition or transformation to the inherited state. Avoid unrelated redesign and destructive replacement.
7. **Review.** Compare the result with its parent state, source constraints, quality requirements, and intended outcome.
8. **Integration.** Persist the result, its lineage, status, relationships, and next useful action. Propagate consequential changes to affected systems.
9. **Next pass.** Make the new state available for later research, production, and further development.

## Keeping track of changes

For work that needs a lasting history, a change can be recorded with fields like these. Existing ledgers and schemas should be reused where they already express the same information; this is a shared data contract, not a demand to duplicate every record in a new database.

- `id`: stable identifier for the pass.
- `subject_id`: stable identity of the subject being developed.
- `parent_state_id`: exact state inherited by this pass.
- `source_ids`: original sources and evidence records that informed it.
- `observations`: linked direct observations and their locators.
- `research_refs`: prior research and external references consulted.
- `hypotheses`: interpretations, confidence, alternatives, and disconfirming tests.
- `change`: the bounded addition, adjustment, or experiment.
- `dimensions`: the aspects being developed, with units or qualitative scales where appropriate.
- `result_state_id`: the resulting state or artifact.
- `review`: comparison, acceptance decision, limitations, and reviewer.
- `status`: proposed, in-progress, reviewed, accepted, superseded, or rejected.
- `next_action`: the next useful research or production step.

The [growth-pass schema](../engine/schemas/growth-pass.schema.json) describes one possible record for tracking a change and its sources. It records work; it does not run it.

A pass must not claim a result that was not produced or inspected. Queued generation is not a render; a hypothesis is not a finding; an experiment is not canon; an untested implementation is not an operational capability.

## Letting changes accumulate

Where possible, make changes gradually and keep earlier versions available. Preserve the source and the previous state. Create a new state for each meaningful pass, linked to its parent. Keep small changes small and allow their effects to accumulate.

For visual development, preserve identity, pose and camera context, proportions, material characteristics, and relevant source details. A gradual hair-development sequence, for example, changes coverage, length, density, distribution, and texture in measured increments while retaining the same underlying subject and comparable viewing conditions. Do not substitute an unrelated design for the next stage.

For characters and relationships, accumulate supported traits, choices, routines, and consequences without flattening individual agency. For environments, add detail and function in response to use and history. For research, refine questions and conclusions as evidence changes. For software, add capabilities through bounded implementation and tests. Each domain defines its own dimensions; the common engine supplies inheritance, traceability, review, and continuation.

Branch when alternatives need to be explored. A branch inherits a known baseline and records its divergence. Merge only compatible, reviewed changes, with conflicts made explicit. Never erase the history of a branch merely because another result is selected.

## Research stays alongside the work

Research can happen before, during, and after making something. New work can raise questions; new findings can change the next version. New outputs become material for further inspection; new findings can revise a design, open a question, or identify a better method.

Research can:

- Discover relevant records across the repository and connected sources.
- Inspect source material at an appropriate level of coverage.
- Compare related sources and successive states.
- Track citations, provenance, dates, methods, and uncertainty.
- Maintain open questions, negative findings, and competing hypotheses.
- Identify reusable techniques, assets, and production constraints.
- Turn validated findings into actionable experiments and production decisions.
- Revisit earlier conclusions when new evidence or prediction errors appear.

Use the [File Analysis Standard](FILE_ANALYSIS_STANDARD.md) for source-grounded inspection. It defines provenance, direct observation, interpretation, generative application, coverage levels, and modality-specific methods. Embodiment and psychosomatic interpretation are a standing analytical layer wherever bodies, gestures, poses, physical changes, captions, recurring motifs, or character histories are relevant. Consider identification, expectation, somatic memory, anticipation, strain, comfort, self-presentation, and transformation while keeping direct observations separate from hypotheses and generative applications. This layer does not dictate a single explanation. Never infer a real person's private desires, consent, relationships, diagnosis, or inner state from an image or recording.

Research outputs should be discoverable records, not isolated notes. Link each finding to the evidence that supports it, the question it addresses, its limitations, and any resulting experiment or artifact.

## Keeping different kinds of material clear

Keep four statuses distinct:

- **Evidence:** what a source directly supports, with provenance and locators.
- **Interpretation:** a hypothesis or explanation linked to evidence, with uncertainty.
- **Canon:** an explicitly established fact within a fictional or project-specific continuity.
- **Experiment:** a provisional test, alternative, or generated branch that has not been promoted.

A production artifact may draw from all four, but it must record which parts it preserves and which it invents. Persistence alone does not make material canon. Promotion requires an explicit review and must preserve the previous baseline.

## Where this connects in the repository

This approach sits across existing repository tools; it is not a replacement for them.

| Responsibility | Existing GEEHUB surface |
|---|---|
| Occurrence identity and event history | `engine/inscription.py`, `engine/activity.jsonl` |
| Current world and campus conditions | `engine/state.json` and existing world / campus state files |
| Continuity and inheritance | [Tractus Continuity Contract](TRACTUS_CONTINUITY_CONTRACT.md) |
| Source inspection and evidence | [File Analysis Standard](FILE_ANALYSIS_STANDARD.md), Visual Evidence Ledger |
| Adaptive retrieval and canon revision | [Adaptive Memory Specification](TRACTUS_ADAPTIVE_MEMORY_SPEC.md), `scripts/tractus_memory.py`, `scripts/tractus_engine.py` |
| Durable production outputs | `artifacts/index.json`, existing artifact and production ledgers |
| Project discovery | `projects.json`, `hub/projects.json` |
| Cross-repository exchange | `hub/interaction-space.json`, Information Portability contract |
| User-facing experience | `hub/`, Tractus Studio, Imagine Studio, and existing experiences |

When an implementation gap appears, extend the responsible existing component or create a narrowly scoped module with a documented interface. Do not create a second event log, canon store, artifact ledger, or project registry.

## A quick review before carrying work forward

A change is ready to carry forward when its result is saved and its status is clear. Before accepting a pass, check:

1. **Inheritance:** Is the correct parent state identified and preserved?
2. **Provenance:** Can the source and every consequential observation be traced?
3. **Scope:** Is the change bounded and appropriate to the requested dimension?
4. **Continuity:** Does the result retain the subject's established identity and relevant properties?
5. **Evidence discipline:** Are observation, interpretation, canon, and experiment distinguished?
6. **Quality:** Has the result actually been inspected against its requirements?
7. **Persistence:** Is the artifact or event recorded in the appropriate existing ledger?
8. **Propagation:** Have affected project indexes, interfaces, or dependent records been updated, or has a handoff been recorded?
9. **Next step:** Is there a useful next research or production action?

A failed gate returns the pass for revision or records the limitation. It does not silently promote the result.

## Working view

The workspace should make ongoing work easy to see. A user should be able to enter a subject, see its source and current state, inspect earlier passes, compare changes, review research and uncertainty, branch an experiment, and continue production. The primary interaction is to continue a living subject, not to fill out a report about it.

Show the artifact and its evolving states first; keep provenance, research notes, controls, and technical diagnostics available beside or behind the working view. A visible history should make gradual change legible without turning the workspace into a text-heavy dashboard.

## Operational interface

The Universal Growth Engine is available in the existing hub at [hub/index.html#growth-engine](../hub/index.html#growth-engine). The interface selects a registered subject and records a proposed pass with its parent state, source locator, encounter, direct observation, optional interpretation, bounded change, and next action. It writes a structured record against the [growth-pass schema](../engine/schemas/growth-pass.schema.json), keeps evidence separate from hypotheses, and marks the result as proposed and pending review until an actual output has been produced and inspected.

The interface saves a local browser copy and offers a portable JSON export. When served by the existing GEEHUB runtime, it also submits the proposal through the existing `/api/geehub/inscribe` endpoint using the shared event-inscription path. Successful inscription projects the occurrence into the append-only activity stream, artifact ledger, and Dropbox outbox. A browser-only save is explicitly reported as local and is not represented as repository persistence. The interface does not create a second event log, artifact store, or canon database.

The existing hub's creative-brief inscription now uses the server's accepted event shape (`NOTICE` with `title` and `body`), so the established jam workflow and the new growth-pass workflow share the same durable inscription contract.

## In short

**Different things develop in different ways.** Preserve each subject's identity, evidence, pace, and local rules while allowing its discoveries and outputs to become useful elsewhere.

Research, making, and keeping a useful history can sit alongside one another. What is learned or made today can give tomorrow's work somewhere to begin.
