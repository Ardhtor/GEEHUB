> ## SERUM MAKES GROWING BIGGER.
> 
> The Serum rule is simple: growth becomes the mechanism for further growth.

# GEEHUB

GEEHUB is the living workspace for archives, tools, games, fictional worlds, visual systems, research, media, and the repositories that grow out of them.

The hub is not a pile of files. It records what happened, what changed, what remains, and what the next process can use. The interface, corpus, artifacts, source history, and repository structure all carry memory.

## The voice

GEEHUB is edited as one continuous announcement.

The default narration is a podcast-style announcement by Seth Feroce and Nick Mercx. Every paragraph break and scene transition should introduce non-plot information about the environment—geography, architecture, light, atmosphere, spatial depth, surfaces, ambient sound, weather, distance, and scale. Line breaks are environmental descriptors, not plot beats. Preserve canon and events; let the changing world carry the reader through them. See [docs/GLOBAL_ENVIRONMENTAL_BROADCAST_REVISION.md](docs/GLOBAL_ENVIRONMENTAL_BROADCAST_REVISION.md).

The editorial source of truth is [docs/EDITORIAL_VOICE.md](docs/EDITORIAL_VOICE.md). Novel-specific rules live in [novel/EDITORIAL_DIRECTIVE.md](novel/EDITORIAL_DIRECTIVE.md) and [novel/GEEHUB_LIVING_REVISION_ENGINE.md](novel/GEEHUB_LIVING_REVISION_ENGINE.md).

The test is:

`WHAT HAPPENED → WHAT DO WE SEE → WHAT CHANGED → WHAT REMAINS`

## The build

The working loop is:

**discover → synthesize → build → test → expand → connect → split when mature**

A small idea can remain in the hub. A useful prototype gets an executable or browsable surface. A mature system can become its own repository. A research trail keeps provenance. A world gets canon. A visual tool gets assets and workflows. A chapter can become an experience, and an experience can become video, audio, interactive media, or another production process.

GEEHUB is both an index and a production scaffold.

## Vision

The project is moving toward vision: many nodes becoming one visible, navigable, living space.

The durable sequence remains:

**mechanism → interface → transformation rule → continuity principle → setting → mythology**

For media work:

**experience → visual state → sound state → temporal behavior → interaction → production output**

These are working grammars, not cages.

## Experience first

Media experience is a first-class chapter layer.

The older hierarchy was:

`novel → chapter → illustrations`

The current one is:

`world/corpus → experience → states → media assets → production`

Text remains canonical where it needs to remain canonical. It is not automatically the final presentation layer.

A chapter can exist as literary source text, visual experience, audio arrangement, timed sequence, interactive browser surface, and production scaffolding. These are manifestations of the same event.

The image can be the spatial specification for the next medium.

## The computer touches back

The sensation engine is built around a simple test: the computer should not only show information. It should leave a trace.

Image, sound, motion, timing, interface response, accumulated memory, and changed context are all ways the system can reach back into the experience.

**We like being touched by computers.**

The question is not only what the computer shows. It is what the person can feel has happened between them and the machine.

## The novel

The developing manuscript is [novel/BOOK_I.md](novel/BOOK_I.md), **GEEHUB — BOOK I: THE HOUSE OF OPEN SCREENS**.

The manuscript remains a canonical literary layer inside the wider experience system. Chapter files can connect to visual states, audio concepts, timing, interaction, and future production scaffolding.

The Serum corpus remains [corpus/SERUM.md](corpus/SERUM.md). It carries transformation grammar, historical material, Voice material, and branching source text.

The current Convergence materials are collected in [novel/VISUAL_EXPERIENCES_THE_CONVERGENCE.md](novel/VISUAL_EXPERIENCES_THE_CONVERGENCE.md).

## Artifact

The artifact is the architectural center: the durable thing left behind when work resolves.

**WORK → RESOLUTION → ARTIFACT → SHARED WORLD → DREAM**

Resolution means something now exists that did not exist before. The artifact may be literary, visual, sonic, technical, spatial, relational, or discovered fact made durable.

Canon and experiments remain distinguishable. Persistence does not make an experiment canon.

The artifact ledger lives at [artifacts/index.json](artifacts/index.json). World pulses become explicit world-event artifacts. The browser provides a staging room and a handoff so the user leaves with something portable.

Dream material is downstream of the ledger. It is residue, not a second idea generator.

## The archive

The BodyLounger Research Archive is the first major working application. It is a local-first, metadata-first browser for tracing the historical web ecosystem around BodyLounger, Sarge's Locker, Hulum's Cave, muscle-growth animation, related creators, labels, and archival sources.

The archive treats references as a graph. Records preserve source URL, archive URL, date context, creator or subject, labels, provenance, status, and age-restriction metadata. The repository stores references and metadata rather than redistributing age-restricted media.

## The constellation

The Atlas tracks the working constellation: BEEFYTHIQ, The Complex, Vision / Living Workspace, Veyrthalis, Growth Canvas, Liminal Gains, BIG BRUTEFORCE, Mass1v1ng Growth Framework, The Facility, Muscle Myth, Growth Tools, Media Tools, Discovery Systems, Retro Lab, Writing & Research, and the projects connected to them.

Not every node needs its own repository. The Atlas records the idea first. Repository boundaries follow usefulness and maturity.

## Accessible repository boundaries

The connected workspace's repository-level view is recorded in [docs/ACCESSIBLE_REPOSITORIES_2026-09.md](docs/ACCESSIBLE_REPOSITORIES_2026-09.md), with the machine-readable counterpart at [hub/repositories.json](hub/repositories.json).

## The Blender connection

The Blender workspace connects abstract systems to actual 3D production: models, scenes, procedural experiments, proportion studies, render setups, reusable assets, and visual experiments derived from the wider constellation.

When a connected Blender workflow is available, the Atlas should point to it rather than isolate it.

## Commentary as memory

The conversations that produce GEEHUB contain decisions that are easy to lose: what was added, what failed, what aesthetic mattered, what the next experiment was for, and which concepts belong together.

Preserve that reasoning where it changes the build: README prose, code comments, provenance fields, Atlas relationships, experience manifests, and meaningful commit messages.

Do not copy the conversation into the repository. Preserve the decisions that change the system.

## Run locally

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

A plain static server is enough for the current site.

## GitHub Pages

The repository can be served from GitHub Pages from the `main` branch root.

## Data

The canonical BodyLounger index is [records.json](records.json), with its structure documented in [schema.json](schema.json).

The browser supports local additions through the UI. Those records live in browser storage and can be exported for later review or merge work.

The Project Atlas lives under [hub/](hub/) and is backed by [hub/projects.json](hub/projects.json). The machine-readable constellation registry is also available as [projects.json](projects.json).

## Repository conventions

Prefer explicit names and small readable files. Keep metadata close to the thing it describes. Treat provenance as first-class data. Make unfinished work visible instead of disguising placeholders as completed systems.

For media work, keep source state separate from rendered output. Preserve links from experience → asset → production step so future work continues instead of reconstructing context from exported files.

When a project moves into its own repository, leave a durable link and concise description in the Atlas.

## Reading the repository

The source tree is an ongoing record of the build.

The README records durable intent. The Atlas records the constellation. Data files record provenance and state. Source comments explain non-obvious decisions. Experience manifests describe how an event is encountered. Commit messages explain meaningful changes.

Read the tree and the sequence becomes visible.

## VISUAL NARRATIVE

Luke / The Mustang — the road extends when someone approaches it.

Tyler / The Second Room — difference can create a third space.

Berit / The Open Door — an unfinished state may remain active.

Joseph / The Signal — significant change can become a signal.
