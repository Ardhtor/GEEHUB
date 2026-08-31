# GEEHUB Operating Model

GEEHUB is most useful when it behaves less like a conventional project-management system and more like a small creative machine with a memory.

The machine has several layers. The Atlas tells us what exists. The Narrative Jammer creates collisions between things. The individual projects provide places where those collisions can become artifacts. The documentation explains the reasons behind the machinery. The repository history records what actually changed.

The layers are deliberately different because different kinds of information need different homes.

## The front door

The visible interface should be simple enough that a person can enter without learning the project's internal vocabulary. One obvious action should create movement. Search should reveal things. A project card should lead somewhere useful. A result should be concrete enough to act on.

This is not an argument for making the underlying system simple. It is an argument for hiding complexity until complexity becomes useful.

## The jammer

The jammer is the engine of unpredictability. It takes existing project ingredients and combines them through a relationship or transformation verb. The goal is not randomness for its own sake. The goal is productive dislocation.

A good collision contains enough constraint to make the imagination move:

**two ingredients + a relationship + a medium + a constraint + one first action**

That formula deliberately echoes the strongest interaction ideas inherited from the visual-generation work in `Ardhtor/lp9hppuio88`: expose the state of creation, make variation cheap, preserve useful outputs, and allow the user to intervene.

## Artifact before administration

The user should encounter a premise before encountering forms, settings, taxonomies, or repository mechanics. When a premise becomes interesting, `MAKE IT` should turn it into a tiny artifact brief. The point is to cross the boundary from narrative into action while the idea is still warm.

A tiny artifact can be a storyboard, Blender blockout, web toy, character study, research sketch, game mechanic, diagram, or sound loop. The exact medium is less important than the fact that the output is tangible.

## Practice as feedback

The recursive practice described in `ModernTexts` gives GEEHUB a useful model: do the thing, examine how the thing was done, then change the practice based on what was learned.

This means a failed interaction is not merely a defect ticket. It is also evidence about the shape of the system. A successful interaction is not merely a feature. It is evidence of a workflow that might deserve preservation.

The project should therefore record meaningful failures and corrections, especially when they reveal a durable design principle.

## State and recoverability

Creative work should not vanish at the end of an interaction. Generated jams should be saveable. Inputs should remain visible. Provenance should stay attached to outputs. A user should be able to make another variation without rebuilding the previous setup from memory.

This is the most direct lesson inherited from the Stable Diffusion UI repository available on the same profile. Its feature set repeatedly exposes generation parameters, supports variations, maintains history, and makes prior work recoverable. GEEHUB applies the same principle to ideas rather than images alone.

## Deep systems, clean documentation

The Blender repository reinforces a different but complementary rule: the root documentation can stay concise while deeper material lives in the appropriate documentation layer.

GEEHUB therefore separates concerns. The README states the architecture. The build narrative preserves the story of important decisions. Focused documents preserve subsystem reasoning. Code comments explain non-obvious implementation choices. The Atlas preserves cross-project identity.

No single file should have to contain the whole project.

## Public boundaries

Repository history also teaches a boundary lesson. `ModernTexts` contains explicit history showing an experimental scenario being added and then a private scenario being removed from the public repository. That is a concrete reminder that experimentation and publication are different stages.

GEEHUB should preserve useful reasoning without exposing private or sensitive material merely because it once existed in an accessible workspace. The public hub should favor metadata, permitted assets, links, and architectural summaries when the underlying material should not be redistributed.

## What to optimize for

The immediate test for a new GEEHUB capability is not whether it adds another screen. Ask whether it produces one of four useful effects:

1. It makes something easier to discover.
2. It makes something easier to create.
3. It makes an existing idea more connected or understandable.
4. It makes future work less dependent on the original conversation.

A feature that does none of these should probably not be added yet.

## The deeper loop

The project's development rhythm can now be understood as two loops operating together.

The engineering loop is:

**discover → synthesize → build → test → expand → connect → split**

The creative loop is:

**constellation → collision → premise → artifact → evaluation → promotion**

The first keeps the software healthy. The second keeps the software interesting.

GEEHUB is successful when the two loops reinforce each other: a creative collision produces an artifact; the artifact reveals a useful workflow; the workflow becomes a tool; the tool becomes another node in the constellation; the larger constellation produces a new collision.
