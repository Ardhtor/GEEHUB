# GEEHUB Project Atlas

GEEHUB is the umbrella for the projects, worlds, tools, experiments, archives, characters, and conceptual systems developed across the ongoing work. It is an index and connective tissue, not a requirement that everything live in one codebase.

## Operating principle

Discover → synthesize → build → test → preserve → branch.

A project can begin as a note, become a prototype, grow into a standalone repository, and still remain linked from GEEHUB. Large recurring concepts get their own repositories when separation makes them easier to evolve.

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

## Project registry

The machine-readable project registry is now present in both `projects.json` (the repository-wide atlas) and `hub/projects.json` (the browser-facing constellation). Both files carry the same 109 stable project IDs while retaining their distinct presentation fields: the root atlas preserves the wider catalogue and project metadata; the Hub registry supplies the group, status, summary, tags, and relative paths used by the browser. The two historical IDs `the-complex` / `complex` and `big-bruteforce` / `bruteforce` remain separate for compatibility and are cross-linked rather than silently renamed. `hub/validate-projects.py --check-root` checks ID parity, and the regression suite runs in the data-validation workflow. New entries should be added to both registries in the same change, with a stable ID, a real path when one exists, and an explicit null path when the destination is not yet built.

## Detailed Maps

GEEHUB has two complementary spatial scopes. `world.json` and `hub/spatial-world.json` define the repository-wide planning map: 24 named territories, 24 canonical coordinate records, and 47 authored route edges connecting all 24 territories. The 42 route notes are preserved from `world.json#pleasureBits`, so the map's new connections come from existing relationship material rather than invented paths. `geo-cyberspace/detailed-maps.json` defines four scales: WORLD, KINGDOM, VEYRT (the Veyrthalis Expanse), and COMPLEX, with 8 landmarks, 6 regions, and 8 layer definitions. `worldspace/maps.html` and `worldspace/maps.js` provide the geographic navigation app, joining the canonical planning graph, local map corpus, and current encounter state. The root console's `engine/story-atlas.js` remains the narrative-position map with its live story pin and route preview. Unauthored local feature classes, including detailed character placements, remain explicitly unplaced rather than inferred.


## Dropbox production corpus

The verified Dropbox/GitHub boundary and the current status of the active `/GEEHUB` workspace are recorded in the [Dropbox Corpus Map](docs/DROPBOX_CORPUS_MAP.md). Use it before synchronizing or reorganizing production folders. The active workspace, older copy, and dated recovery snapshot remain distinct; snapshots are preserved until file-level comparison establishes what can safely be carried forward.
