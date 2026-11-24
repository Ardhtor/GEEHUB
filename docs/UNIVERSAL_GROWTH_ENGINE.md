# GEEHUB — Universal Growth Engine

**Status:** governing architecture  
**Scope:** the complete GEEHUB / Tractus corpus, interfaces, research, worlds, characters, media, tools, and production workflows  
**Principle:** development is cumulative: each new state inherits the relevant prior state and adds a bounded, inspectable change.

## Purpose

GEEHUB is one connected growth system. Its research, archive, creative work, software, inhabitants, environments, and production processes are not separate destinations. They are different kinds of material moving through a shared cycle of observation, investigation, interpretation, experimentation, development, and reuse.

The engine should make the whole repository more capable over time. It should not turn every activity into a generic growth metaphor, force unrelated material into one category, or replace working systems with a parallel framework. Existing systems retain their responsibilities and connect through stable records, explicit handoffs, and discoverable artifacts.

Growth is usually incremental. A visual subject may become gradually hairier through successive passes; a character may acquire a habit through repeated encounters; a research question may become more precise as evidence accumulates; a room may gain detail as it is used; a tool may gain a tested capability. Each example has its own measures and pace, but the continuity rule is shared.

## The common cycle

`ENCOUNTER → INTAKE → OBSERVATION → RESEARCH → INTERPRETATION → EXPERIMENT → GROWTH PASS → REVIEW → INTEGRATION → NEXT PASS`

This is a reusable operating cycle, not a mandatory sequence for every task. A simple asset edit may need only intake, a growth pass, and review. A complex research-led production may use every stage and repeat them many times.

1. **Encounter and intake.** Register a source, idea, event, request, artifact, or external discovery. Preserve its original identity and provenance.
2. **Observation.** Record what is directly present, with precise locators where applicable. State what was actually inspected and what remains inaccessible.
3. **Research.** Retrieve relevant prior records and investigate additional sources, methods, context, and competing explanations. Research produces questions as well as findings.
4. **Interpretation.** Form hypotheses and comparisons while keeping them separate from direct evidence. Record uncertainty and what could disconfirm a hypothesis.
5. **Experiment.** Define a bounded change or test. Preserve the baseline and make the proposed difference explicit.
6. **Growth pass.** Apply an incremental addition or transformation to the inherited state. Avoid unrelated redesign and destructive replacement.
7. **Review.** Compare the result with its parent state, source constraints, quality requirements, and intended outcome.
8. **Integration.** Persist the result, its lineage, status, relationships, and next useful action. Propagate consequential changes to affected systems.
9. **Next pass.** Make the new state available for later research, production, and further development.

## The growth record

Every durable growth pass should be representable as a record with these fields. Existing ledgers and schemas should be reused where they already express the same information; this is a shared data contract, not a demand to duplicate every record in a new database.

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

A pass must not claim a result that was not produced or inspected. Queued generation is not a render; a hypothesis is not a finding; an experiment is not canon; an untested implementation is not an operational capability.

## Cumulative development and continuity

The default operation is additive and reversible. Preserve the source and the previous state. Create a new state for each meaningful pass, linked to its parent. Keep small changes small and allow their effects to accumulate.

For visual development, preserve identity, pose and camera context, proportions, material characteristics, and relevant source details. A gradual hair-development sequence, for example, changes coverage, length, density, distribution, and texture in measured increments while retaining the same underlying subject and comparable viewing conditions. Do not substitute an unrelated design for the next stage.

For characters and relationships, accumulate supported traits, choices, routines, and consequences without flattening individual agency. For environments, add detail and function in response to use and history. For research, refine questions and conclusions as evidence changes. For software, add capabilities through bounded implementation and tests. Each domain defines its own dimensions; the common engine supplies inheritance, traceability, review, and continuation.

Branch when alternatives need to be explored. A branch inherits a known baseline and records its divergence. Merge only compatible, reviewed changes, with conflicts made explicit. Never erase the history of a branch merely because another result is selected.

## Research is a permanent engine function

Research is not a preliminary phase that ends when production begins. It runs before, during, and after production. New outputs become material for further inspection; new findings can revise a design, open a question, or identify a better method.

The research function should:

- Discover relevant records across the repository and connected sources.
- Inspect source material at an appropriate level of coverage.
- Compare related sources and successive states.
- Track citations, provenance, dates, methods, and uncertainty.
- Maintain open questions, negative findings, and competing hypotheses.
- Identify reusable techniques, assets, and production constraints.
- Turn validated findings into actionable experiments and production decisions.
- Revisit earlier conclusions when new evidence or prediction errors appear.

Use the [File Analysis Standard](FILE_ANALYSIS_STANDARD.md) for source-grounded inspection. It defines provenance, direct observation, interpretation, generative application, coverage levels, and modality-specific methods. Where human bodies or gestures are relevant, its embodiment / psychosomatic layer is a possible interpretive lens, not a compulsory explanation; never infer a real person's private desires, consent, relationships, diagnosis, or inner state from an image or recording.

Research outputs should be discoverable records, not isolated notes. Link each finding to the evidence that supports it, the question it addresses, its limitations, and any resulting experiment or artifact.

## Evidence, canon, experiments, and production

Keep four statuses distinct:

- **Evidence:** what a source directly supports, with provenance and locators.
- **Interpretation:** a hypothesis or explanation linked to evidence, with uncertainty.
- **Canon:** an explicitly established fact within a fictional or project-specific continuity.
- **Experiment:** a provisional test, alternative, or generated branch that has not been promoted.

A production artifact may draw from all four, but it must record which parts it preserves and which it invents. Persistence alone does not make material canon. Promotion requires an explicit review and must preserve the previous baseline.

## How the architecture connects to the existing repository

The Universal Growth Engine is a coordinating model over existing GEEHUB systems, not a replacement runtime.

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

## Operating loop and review gates

A growth pass is complete only when its result is durable and its status is honest. Before accepting a pass, check:

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

## Interface direction

The interface should make development visible. A user should be able to enter a subject, see its source and current state, inspect earlier passes, compare changes, review research and uncertainty, branch an experiment, and continue production. The primary interaction is to continue a living subject, not to fill out a report about it.

Show the artifact and its evolving states first; keep provenance, research notes, controls, and technical diagnostics available beside or behind the working view. A visible history should make gradual change legible without turning the workspace into a text-heavy dashboard.

## Governing rule

**Everything can contribute to growth; not everything grows in the same way.** Preserve each subject's identity, evidence, pace, and local rules while allowing its discoveries and outputs to become useful elsewhere.

GEEHUB is a research environment that develops what it discovers, a production environment that develops what it creates, and a living archive that carries every accepted state into the next opportunity for growth.
