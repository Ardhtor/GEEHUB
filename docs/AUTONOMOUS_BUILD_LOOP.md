# Autonomous Build Loop

GEEHUB is allowed to continue moving when the human is absent. This is not a request to generate endless activity; it is a design decision about how the repository should behave between sessions.

## The premise

The project is being built through accumulated observation, experimentation, and recombination. A useful system should not become inert merely because the conversation window is closed. During downtime, the system should inspect its current state, notice the most promising unfinished thread, make a bounded improvement, test it as far as the available environment permits, and leave a readable trace of what happened.

The autonomous loop is therefore:

**observe → choose → build → test → record → leave the next opening**

The loop should prefer a small completed improvement to a large speculative rewrite. The purpose of downtime is compounding: each run should leave the next run with more structure, more evidence, or a more capable surface to work from.

## What an autonomous run may do

An autonomous run may inspect the accessible GEEHUB repositories and the project's own documents, identify a concrete weakness or opportunity, implement a modest improvement, add or update documentation, and commit the result. It may also synthesize compatible ideas from older repositories when those ideas clearly strengthen the current system.

Good targets include interface failures, missing persistence, weak provenance, underused existing data, disconnected project relationships, visual/imaginal richness, small generators, test fixtures, repository documentation, and low-risk cross-project integrations.

The run should not manufacture activity simply to produce a commit. No meaningful change is better than noise.

## The selection rule

Choose work according to this rough priority:

1. Fix something demonstrably broken.
2. Complete a partially implemented path that already has a clear purpose.
3. Improve the user's ability to see, make, save, revisit, or connect things.
4. Strengthen the memory/provenance of an important idea.
5. Prototype a small new behavior that tests a known design hypothesis.
6. Only then invent a larger subsystem.

This ordering protects the project from becoming a collection of ambitious placeholders.

## Testing rule

An autonomous run must distinguish between inspection and execution. Reading source code is not the same as running the software. A syntax check is not a browser interaction test. A successful API write is not proof that the resulting interface behaves correctly for a human.

Record the strongest test that was actually performed. When a stronger form of testing is unavailable, say so plainly and avoid turning an assumption into a claim.

## Narrative rule

The repository should preserve the reasoning that materially changes the project. An autonomous run should therefore leave enough narrative for a future reader to answer four questions:

- What did the run notice?
- Why did that observation matter?
- Why was this implementation chosen instead of another obvious path?
- What new possibility does the change create?

This information may live in a design note, source comment, decision record, README section, or a substantial commit message. It does not need to duplicate the whole conversation.

## The project should remain open-ended

The final state of an autonomous run should be a useful opening, not a declaration of completion. A good run leaves a clearer next move: an experiment to perform, an artifact to make, a connection to inspect, a failed path to revisit, or a new capability that can now be pushed further.

In the language of the project, downtime is another kind of visitor. It should leave a trace.
