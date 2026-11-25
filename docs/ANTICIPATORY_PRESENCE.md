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
- Repeated corrections narrow the relevant behaviour without broadening consent.
- No external or irreversible action occurs merely because the system predicted it.
- The hub remains useful and quiet when it has nothing meaningful to anticipate.

## Relationship to existing GEEHUB systems

This contract extends, rather than replaces, the [Universal Growth Engine](GROWTH.md), [Tractus Continuity Contract](TRACTUS_CONTINUITY_CONTRACT.md), and [Interlocutive Field](INTERLOCUTIVE_FIELD.md). Growth supplies cumulative development; Tractus preserves inheritance and provenance; the Interlocutive Field establishes real contact with connected systems; Anticipatory Presence governs how the environment prepares and presents the next useful passage.

**The intended feeling:** before the user reaches for something, the hub has already begun bringing it within reach.
