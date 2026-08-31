# GEEHUB

GEEHUB is the umbrella workspace for a growing constellation of archives, tools, games, fictional worlds, visual systems, research projects, and future repositories.

The important idea is that the project is not supposed to become a pile of disconnected files. The interface, README, source comments, registry, and repository history should preserve enough context that a future session can understand **why something exists, what it grew out of, and where it is meant to go next**.

## The build philosophy

The working loop is:

**discover → synthesize → build → test → expand → connect → split when mature**

A small idea can live in the hub. A useful prototype gets an executable or browsable surface. A mature system can become its own repository. A research trail gets provenance. A world gets canon. A visual tool gets assets and workflows. A god, subsystem, or other major concept can eventually receive a dedicated repository of its own.

The hub is therefore both an index and a memory layer.

## Why the commentary matters

The conversations that produce these projects contain design decisions that are easy to lose: why a feature was added, what aesthetic was being chased, what failed before, what the next experiment was supposed to test, and which concepts are related.

That context should not exist only in chat history. Important intent should be reflected in one or more of these places:

- README documentation for durable project-level decisions.
- Code comments where behavior would otherwise look arbitrary.
- Data fields such as provenance, status, lineage, and relationships.
- The Project Atlas registry for cross-project connections.
- Git commit messages that state the actual change and its purpose.
- Dedicated design/spec notes when a concept becomes large enough to deserve them.

Do not copy every conversational sentence into source code. Preserve the **reasoning that changes how the project should be built or understood**.

## Project constellation

The Atlas currently tracks projects and systems including:

- BodyLounger Research Archive — historical web research and provenance.
- BEEFYTHIQ — a generative grammar of accumulation, stress, mutation, and new baselines.
- The Complex — a persistent creative/worldbuilding environment.
- Growth Canvas — a visual transformation workspace.
- Liminal Gains — a cooperative growth-game prototype.
- BIG BRUTEFORCE — a compact mutation-engine experiment.
- The Facility — a fictional research environment and setting.
- Muscle Myth — pantheon, mythology, symbols, artifacts, and canon.
- Growth Tools — image/video and visual experimentation tooling.
- Discovery Engine — discovery and recommendation experiments.
- Retro Lab — older-web, Y2K, and Heisei-era aesthetic experiments.
- Religion as Dialogue — academic/research work.
- The Gods — a repository-ready layer for individual deities and related canon.
- Blender Stand / 3D Workspace — the 3D production arm for modeling, scenes, studies, and visual output.

Not every node needs to be a separate Git repository immediately. The Atlas records the idea first; repository boundaries follow usefulness and maturity.

## The Blender connection

The Blender workspace is intended to connect the abstract systems to actual 3D production. It can hold models, scene files, procedural experiments, proportion studies, render setups, reusable assets, and visual experiments derived from the wider constellation.

When a connected Blender workflow becomes available, it should be linked from the Atlas rather than treated as an isolated application silo.

## BodyLounger Research Archive

The archive is the first substantial working application in the repository. It is a local-first, metadata-first browser for tracing the historical web ecosystem around BodyLounger, Sarge's Locker, Hulum's Cave, muscle-growth animation, related creators, labels, and archival sources.

The browser treats the archive as a graph of references rather than a folder of media. Each record can keep its source URL, archive URL, date context, creator/subject, labels, provenance, status, and adult-content metadata visible. Search spans the record and facets provide navigation by label, creator, source type, status, and era.

The repository stores references and metadata rather than copying or redistributing age-restricted media. External links may have their own access controls; the project does not attempt to bypass them.

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

A plain static server is enough. No package installation or build pipeline is required for the current site.

## GitHub Pages

The repository is intentionally static, so it can be served from GitHub Pages from the `main` branch root.

## Data and local research

The canonical built-in BodyLounger index is `records.json`, with its structure documented in `schema.json`.

The browser supports local additions through the UI. Those records live in browser storage and can be exported for later review or merge work.

The GEEHUB Project Atlas lives under `hub/` and is backed by `hub/projects.json`.

## Repository conventions

Prefer explicit names and small readable files over clever abstractions. Keep metadata close to the thing it describes. Treat provenance as first-class data. Make unfinished work visible instead of disguising placeholders as completed systems.

When a project is moved into its own repository, leave a durable link and a concise description in the Atlas so the constellation does not fragment.

## Roadmap

- Bookmark import and URL canonicalization.
- Duplicate detection by canonical URL and title similarity.
- Chronology/timeline view.
- Provenance graph showing source, mirror, and archive relationships.
- Optional thumbnails only when the user supplies or has permission to store them.
- Observation timestamps and content hashes for metadata snapshots.
- Import/merge workflow for exported local records.
- Stronger Atlas links into dedicated repositories and connected production tools.
- Dedicated repositories for projects that become substantial enough to warrant independent code, assets, or canon.

## Reading the repository as a record of the build

The source tree is intentionally more than implementation. The README records durable intent. The Atlas records the constellation. The data files record provenance and state. Source comments should explain non-obvious design choices. Commit messages should explain meaningful steps in the evolution of the system.

That way the project remains legible even when the original conversation is no longer in front of the reader.