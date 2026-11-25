# GEEHUB Migration Map

**Status:** planning map; no paths moved yet  
**Baseline:** `main` at `b5c7872dc08f596c66f7cc4fc1374fe86eb2c152`  
**Safety branch:** `pre-cleanup-freeze`  
**Rule:** preserve history and provenance. Each move is a separate commit, performed as a Git rename (`git mv` in a local checkout), with this map updated in that same commit. No history rewrite and no mass deletion.

The target structure has eight project folders, despite the shorthand “seven” used in the original proposal. GitHub's `.github/` directory remains at repository root because Actions and repository automation depend on that conventional path.

## Target root

```text
GEEHUB/
  .github/                 # GitHub platform configuration; stays at root
  README.md                # concise front door
  MIGRATION.md
  docs/
  engine/
  canon/
  worlds/
  studio/
  experiences/
  archive/
  projects/
```

## Existing top-level paths

| Existing path | Planned destination | Migration treatment |
|---|---|---|
| `.geehub/` | `engine/config/` or root config | Inspect runtime discovery and hidden metadata references first |
| `.github/` | `.github/` | Keep at root |
| `KINGDOM_LAND/` | `archive/kingdom-land/` | Case-normalize through a Git rename; retain historical README and links |
| `archive/` | `archive/` | Retain; merge other cold material only after provenance review |
| `artifacts/` | `engine/artifacts/` or external artifact store | Split append-only event ledgers from generated outputs before moving |
| `assets/` | `studio/assets/` | Separate source assets from generated renders |
| `characters/` | `canon/characters/` | Preserve individual records and indexes |
| `corpus/` | `canon/corpus/` | Preserve source provenance and analysis distinctions |
| `creations/` | `studio/creations/` or `archive/creations/` | Classify by source/build/output lifecycle |
| `creative/` | `projects/` plus linked canon/studio paths | Convert constellation folders to pointers; move actual sources only to their owning domain |
| `data/` | `engine/data/` or `canon/data/` | Split runtime data from authored canon |
| `deep-lore/` | `canon/deep-lore/` | Preserve links to related lore and source records |
| `docs/` | `docs/` | Retain; consolidate moved root documentation here |
| `downloads/` | `archive/intake/` or `canon/source-intake/` | Inspect every item; do not assume downloads are disposable |
| `dropbox_outbox/` | `studio/dropbox-outbox/` or external Dropbox pointer index | Preserve delivery semantics and mirrored payload provenance |
| `engine/` | `engine/` | Retain as runtime/code root; split canon content out if present |
| `events/` | `engine/events/` | Inspect event schema and consumers |
| `experiences/` | `experiences/` | Retain browser experiences |
| `film/` | `studio/film/` | Source and build scripts only; renders handled separately |
| `geo-cyberspace/` | `worlds/geo-cyberspace/` or `experiences/geo-cyberspace/` | Split world data from browser/runtime implementation |
| `hub/` | `experiences/hub/` | Retain browser-facing hub; separate runtime code where needed |
| `library-import/` | `archive/library-import/` or `canon/intake/` | Preserve import provenance and source identifiers |
| `lore/` | `canon/lore/` | Review draft/locked status before moving |
| `media/` | `studio/media-sources/` | Source pointers and metadata; binary payloads remain in Dropbox/LFS as appropriate |
| `music/` | `studio/music/` | Source, sessions, and build scripts; final renders external |
| `novel/` | `canon/novel/` | Preserve version lineage and manuscript indexes |
| `production/` | `studio/production/` | Retain source projects, templates, scripts, and manifests; keep final exports out |
| `providers/` | `engine/providers/` | Inspect connector/provider runtime role |
| `recovery/` | `archive/recovery/` or `engine/recovery/` | Preserve snapshots and recovery metadata; determine whether runtime needs live access |
| `refresh/` | `experiences/refresh/` or `engine/refresh/` | Separate browser surface from refresh service |
| `research/` | `archive/research/` | Keep research metadata/references; preserve special boundaries in its own README |
| `rooms/` | `experiences/rooms/` | Browser-browsable rooms and interaction surfaces |
| `scripts/` | `engine/scripts/` or `studio/scripts/` | Classify by runtime versus production responsibility |
| `server/` | `engine/server/` | Code only |
| `signals/` | `engine/signals/` or `canon/signals/` | Split runtime signals from authored/archived records |
| `worlds/` | `worlds/` | Drafts under `worlds/_drafts/`; locked material linked or moved to canon |
| `worldspace/` | `experiences/worldspace/` or `worlds/worldspace/` | Split interface from world bible/geography |

## Root-level files

| Existing path | Planned destination | Treatment |
|---|---|---|
| `README.md` | `README.md` | Rewrite as a concise front door; preserve detailed content in linked docs |
| `AUDIT_2026-10-05.md`, `BUILD_NARRATIVE.md`, `CANON.md`, `CONTRIBUTING.md`, `CURRENT_STATE_2026-09.md`, `FICTION_ENGINE.md`, `GEEHUB_STORAGE.md`, `HULUMS_CAVE_BUILD_LOG.md`, `PRODUCTION_LOG.md`, `PROJECT_ATLAS.md`, `PROJECT_LEDGER.md`, `PROPHECY.md`, `SENSATION_ENGINE.md`, `SHAKE_2026-09-06.md`, `THE_FIRST_MEN.md` | `docs/` or `canon/` by content | Move individually; canon texts are not documentation merely because they are Markdown |
| `TXT.rtf` | `archive/intake/` pending inspection | Preserve original bytes and provenance; do not merge or convert during migration |
| `app.js`, `style.css` | `experiences/` or `engine/` | Trace browser entry points and runtime imports before moving |
| `index.html`, `casebook.html`, `consumer.html`, `hulums-cave.html`, `size-game.html`, `zero-read.html` | `experiences/` | Check links, build/deploy configuration, and relative asset paths |
| `projects.json` | `projects/projects.json` | Preserve as project constellation index; update consumers in the same migration sequence |
| `records.json`, `schema.json`, `world.json` | `engine/` or `canon/` by schema ownership | Inspect consumers; separate runtime records from authored world canon |
| `validate-records.py` | `engine/scripts/` | Update invocation references after move |
| `LICENSE` | `LICENSE` | Keep at root |
| `.gitignore` | `.gitignore` | Expand only after local build/runtime inventory |
| Other root config files | root or `engine/` | Decide by tool convention and actual consumers |

## Cross-cutting rules

- `engine/activity.jsonl` remains append-only. Do not truncate, regenerate, or fold it into manuscript history.
- `artifacts/` is not blanket-ignored until event ledgers, manifests, and generated output have been separated.
- `dropbox_outbox/` mirrors are not deleted merely because identical bytes exist in `artifacts/`.
- Teal Titan remains a reusable studio template; project-specific output and canon stay in their respective destinations.
- BodyLounger research remains isolated under `archive/research/`, metadata and references only, with an explicit boundary README.
- Every target top-level and second-level folder has a short README stating purpose, status, entry point, and exclusions.
- Project constellation folders contain pointers (status, canon location, studio location, next step), not copies of the source material.
- Internal links, scripts, workflow paths, static-site routes, and runtime imports must be updated and tested with each move.
- Large media remains in Dropbox or Git LFS according to the reviewed asset policy; repository pointers retain source identity, ownership, and location metadata.

## Move log

No moves have been made yet.

| Commit | Old path | New path | Verification |
|---|---|---|---|
| — | — | — | — |
