# GEEHUB Build Narrative

## Why this file exists

GEEHUB is being built as an evolving project environment rather than as a pile of disconnected code samples. The surrounding conversation is part of the design process: we repeatedly discover a useful idea, test whether it wants to become a tool or a world, build a concrete artifact, notice what is missing, and then let the next discovery reshape the architecture.

That process should survive the conversation. This document therefore records the durable reasoning behind the build. It is not intended to reproduce every message. It is intended to preserve enough narrative that a future contributor can understand why the repository is shaped this way, what a feature is trying to accomplish, and what trade-offs were deliberately made.

## The working voice

The project should sound direct, curious, concrete, and slightly strange without becoming decorative for its own sake. The voice should make technical and creative decisions feel connected. A short statement such as "add a Blender node" is not enough to explain the change. The useful version is that the Blender workspace is becoming a production arm for the wider constellation, allowing visual experiments, models, scenes, and reusable assets to move between the visual systems, the transformation grammar, the fiction, and the archive.

The repository should therefore prefer meaningful prose over unexplained labels. Code comments should explain intent where intent is not obvious from implementation. README sections should explain why a system exists, what problem it is solving, and how it relates to neighboring systems. Commit messages may stay concise for Git hygiene, but important architectural decisions belong in README files or dedicated narrative documents such as this one.

## The core loop

The recurring process is:

1. Discover something that appears to matter.
2. Synthesize it with what already exists.
3. Build the smallest concrete artifact that gives the idea a body.
4. Test it in use rather than only describing it.
5. Notice what is missing or unexpectedly useful.
6. Expand the architecture in response.
7. Connect the result back to the larger constellation.
8. Split a mature subsystem into its own repository when that improves clarity or independence.

This loop matters because the project is not supposed to become a static encyclopedia of ideas. A project entry is useful when it points toward something one can actually open, run, inspect, modify, or extend.

## Why GEEHUB is an umbrella

The repository began as a home for an archive browser, then became more useful as a map above multiple kinds of work. The atlas exists to keep continuity while allowing different ideas to acquire different technical shapes.

A research archive should not have to pretend it is a game. A worldbuilding system should not have to pretend it is a web application. A Blender workflow should not have to be flattened into prose. GEEHUB therefore acts as the connective tissue. Mature concepts can become dedicated repositories while their existence, status, relationships, and rationale remain visible from the hub.

The important distinction is between centralization of knowledge and centralization of implementation. GEEHUB centralizes the map. It does not need to centralize every implementation.

## Project constellation

The current atlas includes the BodyLounger Research Archive, BEEFYTHIQ, The Complex, Growth Canvas, Liminal Gains, BIG BRUTEFORCE, The Facility, Muscle Myth, Growth Tools, Discovery Engine, Retro Lab, Religion as Dialogue, The Gods, and the Blender Stand / 3D Workspace.

These entries are deliberately heterogeneous. Some are archives. Some are games. Some are worldbuilding environments. Some are conceptual grammars. Some are research projects. The heterogeneity is not a flaw; it is one of the reasons the atlas exists.

## The Blender / 3D role

The Blender workspace belongs in the constellation because visual production is one of the places where several ideas become concrete at once. A model can embody a character concept. A scene can test a fictional environment. A proportion study can become a visual experiment. A procedural setup can implement part of a transformation grammar. A render can become a reference for a later archive entry.

For that reason, the Blender node should eventually be treated as a working production environment rather than simply a link to an external application. When the connector or repository becomes accessible, the atlas should point directly to it and record what kind of bridge it provides.

Until then, the atlas should not fabricate a repository URL. A placeholder is preferable to false connectivity.

## Archive philosophy

The BodyLounger work established a useful rule: preserve trails and provenance instead of pretending the archive is simply a folder full of files. Sources, mirrors, dates, labels, confidence, and relationships are meaningful data. The same idea should extend to the rest of GEEHUB.

A project should expose where an idea came from, what changed it, what it is connected to, and what remains uncertain. This makes the system more resilient to broken links, changing tools, unfinished experiments, and the normal messiness of creative work.

## What counts as durable context

Not every conversational detail belongs in the repository. Durable context includes decisions that affect future implementation, recurring conceptual vocabulary, reasons for choosing one architecture over another, known limitations, naming conventions, and descriptions of the intended experience.

Temporary chatter, redundant back-and-forth, and details that have no consequence for the project should not be copied merely for completeness. The objective is not a transcript. The objective is continuity.

## Human simplicity, machine depth

The visible interface should remain much simpler than the underlying architecture. The guiding test is that someone unfamiliar with Git, schemas, or project management should be able to open the hub, understand what the large project cards mean, click into something interesting, and start using it.

The technical layer can remain sophisticated underneath. Data registries, provenance records, relationships, local storage, import pipelines, and external integrations are allowed to be complex. Complexity should be absorbed by the system rather than demanded from the person using it.

## Safety and access boundaries

Where a project touches adult or access-controlled material, GEEHUB should preserve metadata, provenance, and public references without attempting to defeat access controls or redistribute restricted material. This is both a practical boundary and a useful archival principle: the repository records the trail without claiming ownership of everything on the trail.

The same principle applies to external credentials and connectors. Never invent access. Record a placeholder and explain the missing capability until the real connector or repository becomes available.

## How future changes should be justified

A change is stronger when its purpose can be stated in ordinary language before its implementation is discussed. Before adding a subsystem, answer what new capability it gives the user or the project. Before splitting a repository, explain why separation improves clarity, tooling, ownership, or iteration. Before changing the interface, explain what confusion or friction the change removes.

The justification should be long enough to preserve the reasoning, but not so long that the explanation becomes another system nobody reads. A few substantial paragraphs are usually more valuable than a collection of isolated one-line comments.

When a change materially alters the architecture, update this narrative or a more specific document near the affected subsystem. Future code should not force someone to reverse-engineer the history from commit hashes alone.

## Current direction

The immediate direction is to turn GEEHUB from a project catalog into an actual operational front door: something that makes it easy to discover work, open the right workspace, understand the current state, and move ideas between related systems without losing their provenance.

The next stage should favor concrete working surfaces over additional labels. A project that has earned its own repository should get one. A project that is still speculative should remain lightweight. A project that has useful assets or experiments should expose them directly. The atlas should become more executable as the constellation grows.

## Closing principle

The repository should remember not only what was built, but why it was worth building. The best future version of GEEHUB should let a person encounter a strange idea, understand where it came from, see what it became, and immediately have somewhere useful to go next.
