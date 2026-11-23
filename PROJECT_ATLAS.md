# GEEHUB Project Atlas

GEEHUB is the umbrella for the projects, worlds, tools, experiments, archives, characters, and conceptual systems developed across the ongoing work. It is an index and connective tissue, not a requirement that everything live in one codebase.

## Operating principle

Discover → preserve → connect → develop when useful.

GEEHUB is a collection before it is a worklist. A note may remain a note; an experiment may remain an experiment; a completed artifact does not need to become a continuing project. Only material with sustained scope and a meaningful next stage needs a project path. Large recurring concepts can earn their own repositories when separation makes them easier to evolve.

## What a registered node can be

The atlas contains several kinds of records, not one hundred-plus simultaneous assignments:

- **Worlds and projects** — substantial creative or technical bodies of work with their own continuity.
- **Artifacts and chapters** — finished or developing works that belong to a larger world or project.
- **Characters and canon** — people, relationships, rules, and established fictional material.
- **Tools and prototypes** — working interfaces, engines, experiments, and technical demonstrations.
- **Research and references** — source collections, observations, and evidence with provenance.
- **Notes and concepts** — early ideas, fragments, possibilities, and unresolved directions that may remain dormant.

A registry status describes the maturity or activity of a record. It does not by itself create a task, promise implementation, or imply that the record belongs on the public front page.

## Major territories

### Beefythiq
A generative transformation grammar rather than a simple "make it bigger" instruction. Core loop: baseline → stress → break → rebuild → new baseline. The later Corruption Engine adds Seed → Desire → Growth → Stress → Mutation → Corruption → New Baseline.

Possible repository: `Beefythiq`.

### The Complex
A persistent world / laboratory / creative environment in which encounters become creations, creations transform, and previous ideas can cross-pollinate. Continuity and mutation are part of the design rather than decoration.

Possible repository: `The-Complex`.

### Growth Canvas / Growth Engine
A visual system for treating imagery and transformation as a manipulable substrate. Concepts include seeds, growth rules, latency, anomalies, tracking, editable tables, and a canvas-oriented interaction model.

Possible repository: `Growth-Canvas`.

### Liminal / transformation games
Interactive prototypes such as Liminal Gains, including growth mechanics, two-player hotseat interaction, growth orbs, and relationship mechanics.

Possible repositories: `Liminal-Gains`, `Big-Bruteforce`.

### Myth / Facility canon
Recurring adult-male fictional settings and mythic characters, including the Facility, Grokthar, Ursalon, Privathor, HRoVath & Jeff, Chaddoltus, Brockthar, Tabbryx, Brograntimax, and Domithicus. These should be preserved as distinct canon objects when enough material accumulates, with cross-links back to the Complex.

Possible repositories: `Facility`, `Muscle-Myth`, and individual god repositories when justified by scope.

### BodyLounger / old-web research
A provenance-first research archive for the historical ecosystem around BodyLounger, Sarge's Locker, Hulum's Cave, muscle-growth animation, creators, labels, mirrors, and archival trails. The current GEEHUB implementation is deliberately metadata/link based and does not redistribute restricted media.

Current implementation: static browser, searchable records, facets, chronology-oriented metadata, provenance fields, and local curation support.

## Additional project families

- Image/video enhancement and content-aware media tooling.
- Content discovery and recommendation systems.
- Retro/Y2K/Heisei-inspired interface and media experiments.
- HTML/JavaScript and Python game prototypes.
- Research and writing systems around dialogue, impressionability, media, religion, and philosophy.
- Experimental assistants and coaches built around growth, discovery, and iterative transformation.

## Archive rules

Every substantial artifact should carry provenance when possible: where an idea came from, what it changed, and what it became.

Links are preferable to copies when the underlying material is copyrighted or access-restricted. User-supplied or permissibly stored assets can be attached to a project when appropriate.

The umbrella should remain navigable. A new repository should earn its independence through scope, not merely because a folder became large.

## Repository naming convention

Use short, memorable names for major worlds and systems. GEEHUB remains the index. Individual repositories can evolve at their own pace and may link back here through a standard `GEEHUB` section in their README.

## Collection registry

The machine-readable collection registry is maintained in `projects.json` and `hub/projects.json`. The two files currently contain 106 stable IDs and serve different presentation needs: the root file preserves the wider catalogue and metadata; the Hub file supplies the groups, statuses, summaries, tags, and paths used by the browser. These are 106 points in the GEEHUB constellation, not 106 active assignments. Some entries are worlds or tools; others are chapters, characters, canon records, research references, experiments, or concepts. The two historical IDs `the-complex` / `complex` and `big-bruteforce` / `bruteforce` remain separate for compatibility and are cross-linked rather than silently renamed. `hub/validate-projects.py --check-root` checks ID parity, and the regression suite runs in the data-validation workflow. New entries should identify what kind of record they represent and should not be promoted to a continuing project merely to make them visible.

## Detailed Maps

GEEHUB now has a persistent multi-scale spatial map system in `geo-cyberspace/detailed-maps.json` with four linked scales: WORLD, KINGDOM, VEYRTHALIS, and COMPLEX. The map model preserves coordinates, terrain layers, passages, places, characters, and memory as data. `worldspace/maps.html` is the browser-facing map surface; it reads the same map corpus and lets the viewer move between scales and layers without flattening the geography into decorative imagery.
