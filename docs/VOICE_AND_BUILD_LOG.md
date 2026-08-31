# Voice, Continuity, and Build Log

GEEHUB is built through an unusual medium: conversation. That is useful because conversation produces leaps, associations, corrections, reversals, jokes, constraints, aesthetic judgments, and sudden recognitions that ordinary requirements documents rarely contain. It is also dangerous because those things disappear quickly unless the repository catches them.

This document records a practical rule for the project: when a change is important enough to alter the way GEEHUB behaves, the repository should retain enough narrative for a later reader to understand the pressure behind the change.

## The voice

The project's voice should feel like a capable collaborator exploring something strange with a real engineering discipline underneath it. It can be playful. It can be weird. It can make a strong aesthetic choice. It should not become breathless marketing copy, and it should not flatten every idea into sterile project-management language.

The desired rhythm is discovery followed by interpretation, then action. A useful note does not merely say what was done. It identifies the thing that was noticed, explains why that observation matters, and records what the implementation is trying to make possible.

## The jammer principle

GEEHUB is a narrative jammer as much as it is a project index. The point is not to produce an infinite pile of prompts. The point is to collide existing ideas until one of the collisions becomes useful enough to make.

A good interaction therefore has a small amount of friction and a large amount of possibility. The user should be able to press one obvious action, receive a strange but interpretable premise, and immediately see a path toward an artifact. The system should prefer a concrete creative pressure over a generic suggestion.

The source projects are not just labels. They are ingredients. Their histories, tags, aesthetics, technical affordances, and unresolved problems provide the material for new combinations.

## How changes should be justified

A meaningful change should answer four questions somewhere in the repository:

1. What was noticed or requested?
2. Why did that matter to the larger project?
3. Why was this implementation chosen rather than an obvious alternative?
4. What new behavior or future possibility does the change create?

The answers do not need to be formal essays every time. They do need to be substantive enough that the change remains intelligible outside the original chat.

For a tiny bug fix, a precise commit message may be enough. For a new interaction model, a new project boundary, a new data model, or a major aesthetic decision, use a design note, build narrative, or substantial README section.

## Preserve the turning points

Some of the most important project information arrives in moments that look informal: a correction such as "that's not it," a discovery such as a forgotten archive, a shift from generic browsing to a named project, or the recognition that an interface should be usable before its machinery is understood.

Those turning points should become design principles rather than remain anecdotal. The repository should remember the lesson, not merely the quotation.

## How to keep the code fun

Fun is a functional requirement for this project. That does not mean every screen needs spectacle. It means the user should feel that pressing something can reveal something.

Useful patterns include obvious actions, surprising but traceable combinations, visible lineage, small bits of animation, reversible exploration, and interfaces that reward curiosity before asking for configuration. The underlying implementation can remain simple and static while the experience acquires depth through data and narrative.

## Relationship to technical discipline

Narrative is not a substitute for tests, provenance, or clean code. It is the layer that explains why those technical structures have the shape they do.

The repository should continue to prefer small readable files, explicit data, honest status fields, safe external links, and minimal dependencies where those choices make the system easier to keep alive.

## The living loop

The project should continue through this loop:

**notice → name → connect → build → test → narrate → expose → jam again**

The loop is intentionally recursive. A successful artifact changes the constellation, which changes the next collision. This is why preserving context is not administrative overhead: it becomes part of the material from which later ideas are made.

## A note on scope

The repository does not need to preserve every passing sentence or every discarded joke. It should preserve the design pressure that changes future work. That distinction keeps the codebase alive without turning it into a transcript dump.
