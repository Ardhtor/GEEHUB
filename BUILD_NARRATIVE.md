# GEEHUB Build Narrative

This file is intentional. It preserves the reasoning behind the project as well as the artifacts produced from that reasoning.

## Why the project exists

GEEHUB began as a practical response to a recurring problem: ideas were being generated faster than they could be given a durable home. Conversations contained useful design decisions, aesthetic observations, names, systems, experiments, references, and unfinished possibilities, but a chat transcript is not a good project archive. The repository therefore became an attempt to turn conversation into persistent infrastructure.

The central rule is that a useful conversation should leave behind something that can continue without the conversation. Sometimes that thing is code. Sometimes it is a data model, a research trail, a visual experiment, a game mechanic, a fictional canon, a tool specification, or a repository boundary. GEEHUB exists to keep those things connected.

## The working voice

The project should retain a particular voice: curious but not breathless, playful without becoming vague, technically grounded, and willing to follow an idea far enough that it becomes strange or unexpectedly useful. The writing around a change matters because it records why the change was made and what kind of future it is meant to enable.

That means important implementation decisions should not be represented only by a terse commit title such as `add feature`. A future reader should be able to understand the pressure that produced the feature, the alternatives that were considered, the reason the chosen path fits the larger system, and what remains unresolved.

## The build loop

The recurring process is:

**discover → synthesize → build → test → expand → connect → split**

Discovery gathers references, observations, source material, visual language, technical constraints, and fragments from earlier work. Synthesis turns those fragments into a coherent concept rather than merely copying them. Building produces an artifact that can be touched or run. Testing checks whether the artifact actually works. Expansion adds the next useful capability instead of filling space. Connection links the new capability back into the larger constellation. Splitting happens when a concept has enough identity and substance to deserve its own repository.

The loop is deliberately open-ended. A project does not have to reach a final form before it becomes valuable. Prototypes, dormant ideas, research trails, and partial systems are first-class citizens as long as their state is recorded honestly.

## Why the Project Atlas exists

The Atlas is the map above the individual projects. It prevents the repository from becoming a pile of unrelated folders and allows a new idea to be recognized as part of an existing lineage. BodyLounger belongs to archival research. Beefythiq is a generative transformation grammar. The Complex is a persistent world. Growth Canvas is a visual experimental system. Liminal Gains and BIG BRUTEFORCE are games. The Facility and Muscle Myth belong to the fictional/mythic layer. Growth Tools and Discovery Engine belong to tooling. Retro Lab records an aesthetic lineage. Religion as Dialogue is a research workspace. The Gods provides a place for pantheon-level concepts. Blender Stand is the 3D production arm.

These categories are descriptive rather than restrictive. A project may change groups as it matures. The purpose of the Atlas is to show relationships, not enforce taxonomy.

## Why narrative is kept alongside code

The project is being built through dialogue, so its most important implementation details are sometimes conceptual rather than syntactic. For example, a seemingly simple request for a more usable interface can imply a whole design principle: the system should be understandable without first learning its machinery. Likewise, a request to preserve all of the reasoning behind a build implies that the repository itself should function as a memory device.

For that reason, substantial changes should carry durable narrative in at least one of these places:

- README material that explains the current architecture and intent.
- A design/specification document for a significant subsystem.
- Code comments where a non-obvious choice would otherwise be lost.
- A changelog, decision record, or build narrative when the change represents a meaningful turn in the project.

The goal is not to archive every sentence. The goal is to preserve the ideas that would otherwise disappear when the chat window closes.

## Usability principle

GEEHUB should remain easy enough that someone can enter without understanding Git, schemas, package managers, or the internal project model. The visible experience should lead with choices rather than terminology: open something interesting, search, add a thing, follow a relationship, or jump into a working project.

The underlying system can be sophisticated. The surface should not require sophistication from the person using it.

## Visual and creative principle

The project often grows from visual culture, archives, fictional systems, and 3D experimentation. Those sources should be treated as inputs to synthesis rather than as excuses to reproduce material indiscriminately. When an archive contains age-restricted or otherwise sensitive media, GEEHUB should prefer public metadata, provenance, links, and permitted assets over redistributing restricted material.

The same principle applies to visual production: the Blender workspace is a place for making models, scenes, studies, and experiments that belong to the project, while GEEHUB provides the connective tissue that explains why those artifacts exist.

## Repository strategy

GEEHUB is the umbrella. Small ideas can live in its Atlas until they prove they need a dedicated repository. Mature projects may then split into their own repositories while remaining registered in the Atlas. A dedicated repository is justified when a project has a recognizable identity, a coherent body of artifacts, an independent workflow, or a strong enough internal grammar that separating it makes future work easier.

The split should not erase continuity. The Atlas entry should retain the project's identity and relationship to the other projects.

## What counts as a successful change

A successful change is not merely code that runs. It should make the system more useful, more legible, more connected, or more capable of producing the next artifact. Ideally, a person opening the repository after a long absence can understand what changed and why without reconstructing the entire original conversation.

That is the standard this file exists to enforce.