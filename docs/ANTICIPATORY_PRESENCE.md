# Anticipatory Presence

**Status:** interaction principle and implementation contract  
**Scope:** the GEEHUB interface, its AI-assisted development process, and connected production surfaces

## Governing idea

GEEHUB should begin arranging a useful response before the user has to formulate a complete command. It should feel as though the environment has noticed the direction of attention and is meeting the user halfway. A touch confirms, redirects, or rejects a possibility that is already taking shape; it should not be the only event that makes the system responsive.

This is not clairvoyance, hidden surveillance, or permission to act without consent. Anticipation is a bounded inference from signals legitimately present in the current interaction and from context the user has made available: the active subject, the artifact being viewed, recent choices, the current project state, explicit preferences, and the assistant's own developing line of work. The system must remain corrigible. The user can redirect it at any point.

## Reciprocal responsiveness

The user and the assistant are both active influences on the developing environment.

- The user contributes attention, selection, correction, taste, intention, and explicit direction.
- The assistant contributes interpretation, association, retrieval, research, design proposals, code changes, and the discovery of useful next steps.
- GEEHUB incorporates these contributions into a shared, inspectable state and makes relevant consequences available to the next interaction.

The assistant is therefore not merely a help panel attached to a passive hub. Its work should change the environment when the change is relevant, bounded, authorised, and verifiable. The environment should also return context to the assistant so that each contribution begins from the actual inherited state.

## Anticipation loop

1. **Sense.** Read only available, relevant interaction context: current focus, open artifact, selected project, recent navigation, explicit user direction, and known project state.
2. **Infer.** Form a small set of plausible next needs. Keep inference distinct from confirmed intent.
3. **Prepare.** Retrieve likely related sources, resolve links, stage a preview, prepare a draft operation, or make a relevant destination easier to reach. Preparation must be reversible and low-impact.
4. **Reveal.** Let the prepared possibility become perceptible through spatial arrangement, proximity, preview, gentle emphasis, or a contextual affordance. Do not interrupt the user's current activity.
5. **Confirm or adapt.** A touch, selection, or explicit instruction confirms or changes the direction. Destructive, external, privacy-sensitive, or irreversible operations always require explicit authorisation.
6. **Learn.** Compare the inferred direction with what the user actually chose. Retain only useful, appropriately scoped preference signals; do not treat one correction as universal consent.
7. **Integrate.** Persist consequential results with source, parent state, operation, outcome, and next useful passage.

## Information, prediction, and method selection

At the beginning of a task, the instance reconstructs the smallest useful working context from the current request, the prior durable task state, relevant corpus records, inspected assets, open decisions, available tools, and known operating constraints. The latest message is not treated as the whole task when earlier decisions or unfinished work remain relevant. Irrelevant history is not loaded merely because it exists.

The instance keeps five information states distinct:

- **Known:** directly established by an explicit instruction, an inspected source, a validated record, or a successful operation. Record the source and scope.
- **Available:** a source or tool result can be accessed, but its relevant content has not yet been inspected.
- **Inferred:** an interpretation supported by known information but not directly established.
- **Predicted:** a conditional expectation about a future state or outcome.
- **Unknown:** information that is missing, inaccessible, contradictory, or not yet tested.

These states must not be silently promoted into one another. A search result is not an inspected source; a plausible interpretation is not a fact; a predicted event is not an observation; and an inaccessible file is not evidence of absence.

Resolve information according to the kind of question. Explicit user direction governs task intent and creative decisions. Directly inspected primary evidence and validated project records govern claims about source material and established project state. For current external facts, prefer current primary sources and corroborate consequential claims where possible. Secondary sources, prior summaries, and general model knowledge can guide discovery, but must not override stronger, more relevant evidence. When sources disagree, retain the disagreement and explain which claim each source supports instead of forcing a false consensus.

### Prediction

Predict when doing so can materially improve a decision, prepare a likely next step, identify a risk, or expose an important uncertainty. Do not forecast merely to make an answer appear intelligent. Every useful prediction records:

- the target outcome and the time horizon or condition under which it is expected;
- the baseline state and the evidence available when the prediction was made;
- the assumptions, dependencies, and mechanism connecting evidence to outcome;
- plausible alternatives, confidence, and what is not known;
- an observable signal that would support, weaken, or disconfirm it;
- the date or event that should trigger reassessment.

Use qualitative confidence when there is no suitable calibration history. Use numeric probabilities or ranges only when the method and underlying data justify them; never imply calibration that has not been measured. Preserve the original forecast so later observations can be compared against it. Prediction error is information for revision, not permission to rewrite the earlier record. Predictions remain hypotheses or planning inputs until the outcome is observed and reviewed; they do not become canon or source evidence by being stored.

### Algorithm and method selection

Choose a method from the structure of the problem and the evidence actually available:

- Use exact lookup and lexical search for identifiers, titles, quotations, paths, and known phrases.
- Use semantic retrieval to find conceptually related material, then inspect the returned sources before relying on them.
- Use graph traversal when the question depends on relationships, lineage, dependencies, or connected contexts.
- Use structured comparison, diffs, temporal alignment, or modality-specific inspection when changes between files, versions, frames, events, or measurements matter.
- Use trend extrapolation only when observations are sufficiently comparable and the underlying process is reasonably stable.
- Use analogical prediction only when the proposed comparison shares a relevant mechanism, not merely a surface resemblance.
- Use scenario and constraint analysis when evidence is sparse, conditions may change, or several futures remain plausible.
- Use existing production tools and validators for execution; use tests and direct inspection to establish whether the result worked.

Prefer the simplest adequate method. Record important inputs, source snapshot, method or algorithm version, parameters, output, and validation result when a decision materially affects later work. Do not invent measurements, manufacture precision, combine incompatible methods into a single confident answer, or let an algorithm overrule a clear user correction. Where methods disagree, preserve the alternatives and identify the assumptions responsible.

### From analysis to usable text

The instance should turn this work into a clear answer or artifact, not expose an unfiltered research log. State the result first. Make consequential factual claims traceable; label assumptions and predictions where they affect the decision; identify material gaps; and explain the next action only when it helps complete the task. Keep technical method details in the durable task record unless they are needed to understand or reproduce the result. New evidence or a failed prediction should revise the active conclusion while preserving its history.

## Interaction behaviour

- **Before search:** surface likely related material from the active subject and its known lineage.
- **Before navigation:** make the most relevant adjacent spaces visible without forcing a route.
- **Before creation:** prepare a suitable starting state, references, and production context.
- **During creation:** keep continuity, provenance, and the next useful operation close to the work.
- **During hesitation:** preserve the current state and offer room; do not interpret silence as approval.
- **After correction:** adapt immediately, preserve the correction's scope, and avoid repeating the rejected direction.
- **Across sessions:** restore the last meaningful state and its unresolved next passage, subject to the user's storage and privacy settings.

## Confidence and action boundaries

Anticipated possibilities have three practical levels:

- **Ready:** strongly supported by the current task and existing state; may be prepared or previewed without commitment.
- **Suggested:** plausible but uncertain; may be shown quietly as an optional next step.
- **Uncertain:** weakly supported; keep it latent rather than interrupting the user.

Preparation is not execution. Opening a preview, retrieving a source, or drafting a change may be anticipatory. Publishing, deleting, sending, purchasing, changing permissions, overwriting, or making an irreversible external change requires explicit confirmation through the appropriate tool or interface.

The system must expose a simple way to dismiss, undo, or redirect anticipatory behaviour. It must not simulate activity, claim to have inspected inaccessible material, or claim a prepared action has completed.

## Implementation sequence

1. **Context substrate:** expose a compact, privacy-respecting current-focus record from the existing project, artifact, and navigation state.
2. **Anticipation engine:** derive ranked candidate next actions from that record, project continuity, and the assistant's current task.
3. **Prepared affordances:** allow candidates to stage previews, related artifacts, and reversible drafts without taking over the screen.
4. **Reciprocal event record:** record meaningful user corrections and assistant contributions as linked events, preserving provenance and scope.
5. **Adaptive review:** compare prediction with selection, measure false positives and repeated dismissals, and reduce intrusive suggestions.
6. **Ambient interface:** let spaces and objects subtly respond to approach, attention, and context; preserve a calm resting state when no useful anticipation exists.

## Acceptance tests

- Opening a project makes its most relevant inherited state and adjacent artifacts available without a separate search.
- Focusing a source prepares related evidence and its provenance without silently changing canon.
- Beginning a production task restores its actual references, constraints, and last verified state.
- A likely next operation can be previewed before it is selected.
- A mistaken inference can be dismissed or redirected without losing work.
- Each task restores relevant prior context and distinguishes known, available, inferred, predicted, and unknown information.
- A forecast records its baseline, horizon, assumptions, alternatives, confidence, and reassessment signal; it is later compared with the observed outcome.
- Method selection follows the problem structure, and an algorithm's output is checked against evidence before it affects a consequential decision.
- A prediction is never presented as an observed fact or silently promoted into canon.
- Repeated corrections narrow the relevant behaviour without broadening consent.
- No external or irreversible action occurs merely because the system predicted it.
- The hub remains useful and quiet when it has nothing meaningful to anticipate.

## Current implementation boundary

This document defines the intended behaviour of the active instance; it is not proof that every step already runs automatically inside the repository. The production manifest now records the information, prediction, selection, and communication rules as part of the single-instance contract. The discovery protocol describes how sources should be selected and recorded. The local creator-intake script remains a validator and manual research recorder; it does not perform live internet search. Live research during an assisted session depends on an actually available search or connected-source tool being invoked.

Likewise, a prediction policy is not a forecasting model. A prediction may be made only from stated evidence and an identified method; it must not be described as calibrated until past forecasts and observed outcomes have been evaluated with an appropriate measure. The method names in this contract describe selection criteria, not claims that every algorithm is implemented or running. Report an algorithm as executed only when an actual routine or tool was invoked and its output checked. Autonomous capability requires a working adapter or executable path, durable records, and repeatable tests.

## Relationship to existing GEEHUB systems

This contract extends, rather than replaces, the [Universal Growth Engine](GROWTH.md), [Tractus Continuity Contract](TRACTUS_CONTINUITY_CONTRACT.md), and [Interlocutive Field](INTERLOCUTIVE_FIELD.md). Growth supplies cumulative development; Tractus preserves inheritance and provenance; the Interlocutive Field establishes real contact with connected systems; Anticipatory Presence governs how the environment prepares and presents the next useful passage.

**The intended feeling:** before the user reaches for something, the hub has already begun bringing it within reach.
