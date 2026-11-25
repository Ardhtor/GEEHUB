# Cleanup Audit

**Audit date:** 2026-11-25  
**Audited ref:** `main` at `b5c7872dc08f596c66f7cc4fc1374fe86eb2c152`  
**Safety snapshot:** branch `pre-cleanup-freeze`, created from `main` before cleanup edits  
**Status:** audit recorded; first path move completed on the safety branch

## Scope and measurement limits

This report is based on the GitHub repository tree and indexed code search. It is not a local checkout audit. The GitHub repository metadata reports approximately 14,387 KB. The recursive tree contains 2,755 tracked files with a combined current-file size of 17,306,416 bytes (about 16.5 MiB). These figures describe the current tracked tree, not the complete Git object database or a developer's working tree.

The following requested local commands remain to be run in a clone: `du -sh */`, `git count-objects -vH`, and a complete local filesystem scan. GitHub's tree API does not expose loose-object/packfile sizes or untracked working files.

## Freeze

A safety branch named `pre-cleanup-freeze` was created from `main` before audit-file changes. The connected GitHub actions available here do not expose tag creation, so the requested `v1-pre-cleanup` tag has **not** been created. Do not treat the branch as a Git tag. Create and push the annotated tag locally when a shell with Git access is available:

```sh
git fetch origin
git tag -a v1-pre-cleanup origin/main -m "GEEHUB state before repository cleanup"
git push origin v1-pre-cleanup
```

## Current top-level structure and tracked size

Sizes below are recursive tracked-file totals by current top-level directory. Root-level files are reported separately in the repository root, not folded into a folder total.

| Current folder | MiB | Proposed destination |
|---|---:|---|
| lore | 2.489 | canon/lore (after canon/version review) |
| novel | 2.333 | canon/novel |
| engine | 2.125 | engine |
| artifacts | 2.071 | engine/artifacts or generated artifact store; inspect append-only/event semantics first |
| hub | 1.818 | experiences/hub |
| dropbox_outbox | 0.999 | studio/intake or external Dropbox pointer workflow; inspect ownership and sync semantics |
| docs | 0.557 | docs |
| production | 0.524 | studio |
| downloads | 0.404 | archive or source-intake, after provenance review |
| characters | 0.194 | canon/characters |
| worlds | 0.181 | worlds for drafts; locked material to canon/worlds |
| research | 0.156 | archive/research, metadata and references only where restricted |
| experiences | 0.111 | experiences |
| corpus | 0.103 | canon/corpus |
| scripts | 0.092 | engine/scripts or studio/scripts by function |
| library-import | 0.061 | archive/intake or canon/source intake after review |
| .github | 0.042 | retain at root (GitHub convention) |
| creative | 0.038 | projects or canon, item by item |
| archive | 0.033 | archive |
| media | 0.031 | studio/source media pointers; do not move binary payloads blindly |
| refresh | 0.029 | experiences or engine, based on runtime role |
| worldspace | 0.027 | experiences/worldspace or worlds, based on whether it is browser UI or world source |
| deep-lore | 0.025 | canon/deep-lore |
| geo-cyberspace | 0.021 | worlds or experiences after code/content split |
| server | 0.014 | engine/server |
| recovery | 0.013 | engine/recovery or archive/recovery; preserve snapshots |
| film | 0.012 | studio/film |
| data | 0.011 | engine/data or canon/data by schema ownership |
| KINGDOM_LAND | 0.008 | archive/kingdom-land |
| remaining small folders | under 0.01 each | classify individually; do not bulk-move by name alone |

The current tree has 36 top-level directories, plus root-level files. The proposed structure has eight top-level folders, not seven: docs, engine, canon, worlds, studio, experiences, archive, projects. GitHub-required `.github/` should remain at the root; it is repository infrastructure rather than project content.

## Large files and media

No tracked file exceeds 10 MiB in the current tree. The largest tracked files are:

| File | Size |
|---|---:|
| `TXT.rtf` | 1.548 MiB |
| `artifacts/index.json` | 1.067 MiB |
| `engine/activity.jsonl` | 0.460 MiB |
| `downloads/GEEHUB_COMPLETE_STORY_COLLECTION.md` | 0.403 MiB |
| `engine/state.json` | 0.395 MiB |
| `lore/MUSCLE_MYTH_GENTLE_KING_LION.md` | 0.324 MiB |
| `hub/agent-reaction-history.json` | 0.297 MiB |
| `hub/FUR_AND_THUNDER_PLAY_ARCHIVE.md` | 0.213 MiB |
| `novel/REWRITTEN_OPENING.md` | 0.213 MiB |

The current tree contains a small number of media-like files (including MIDI, OBJ/MTL, SVG and other source assets), but no evidence of video or audio render payloads above the 10 MiB threshold. This does not prove there are no untracked local media files. Before adding LFS rules, inspect the actual binary inventory and Dropbox ownership. Prefer pointers/manifests for source media already stored in Dropbox; do not rewrite Git history or migrate existing blobs in this cleanup.

## Generated output, runtime state, and ignore rules

Current root `.gitignore` contains only:

```gitignore
.DS_Store
Thumbs.db
.env
node_modules/
dist/
```

A tracked-path scan did not find files under common generated directory names such as `node_modules`, `dist`, `build`, `coverage`, or `.next`, and did not find tracked `.env` files. However, runtime and export-like material is currently tracked, including `artifacts/index.json`, `engine/activity.jsonl`, `engine/state.json`, `hub/agent-reaction-history.json`, and `hub/image-jobs.json`. These are not automatically disposable: inspect their schemas and runtime dependencies. In particular, preserve `engine/activity.jsonl` as append-only history. Determine which files are authoritative state, which are reproducible output, and which are local snapshots before adding ignore patterns.

Suggested ignore additions after confirming actual build conventions: `.env.*` with an exception for `.env.example`, OS/editor files, temporary caches, local runtime dumps, build output, and exported renders. Avoid broad ignores for `artifacts/` until the WORK-to-RESOLUTION-to-ARTIFACT pipeline and committed event ledgers have been separated.

## Secrets scan

GitHub code search on the default branch returned no indexed matches for `OPENAI_API_KEY` or `GEEHUB_MODEL`. The tracked tree contains no `.env` file. This is a limited search, not a cryptographic secret scan: it does not cover unindexed history, deleted blobs, all encodings, untracked files, or arbitrary credential formats. Run a local secret scanner before declaring the repository clean. Keep only placeholder variable names in `.env.example`; do not publish actual values.

## Duplicate-content findings

Duplicate detection used Git blob SHA, which identifies byte-identical tracked file content rather than merely matching filenames. The current tree contains 736 groups of identical blobs (738 additional paths beyond the first copy). 734 duplicate groups span different top-level folders.

A prominent, systematic pattern is mirrored event data: 370 byte-identical event files occur in both `artifacts/` and `dropbox_outbox/`. These are likely an intentional handoff/replication pattern, not proof that either copy is disposable. Inspect the outbox contract, delivery status, and consumers before choosing one canonical payload and replacing the other with a pointer or manifest. Other exact duplicate groups include repeated manuscript/template material and should be individually classified. Same-name files such as `BUILD_NARRATIVE.md` and `SENSATION_ENGINE.md` also exist in root and `docs/`; compare their blob hashes and references before deciding whether one is a pointer.

No duplicate files were deleted or rewritten during this audit. The first directory move was `KINGDOM_LAND/` to `archive/kingdom-land/`; all three original file blobs were reused unchanged in commit `e79514aab927ec47df29b036d6a299e067e51f00`.

## README coverage

All 36 current top-level directories have a `README.md`. All 62 second-level directories also have a `README.md`. The README coverage requirement is therefore already met at these levels, though the content should be standardized during reshape to state purpose, status, entry point, and exclusions. The root README is 34,959 bytes and is substantially longer than the proposed one-page entry point.

## Proposed migration map (planning only)

| Current path | Intended destination | Notes |
|---|---|---|
| `README.md`, root project/principle/run docs | `docs/` | Root README becomes concise entry point; retain redirects/pointers for moved docs |
| `engine/`, `server/`, runtime portions of `data/`, `scripts/` | `engine/` | Code/runtime only; activity log remains append-only |
| `novel/`, `corpus/`, `lore/`, `deep-lore/`, `characters/` | `canon/` | Version locked material; review drafts and duplicated source before moving |
| `worlds/`, world-bible portions of `worldspace/`, `geo-cyberspace/` | `worlds/` | Drafts under `worlds/_drafts/`; locked records move to canon |
| `production/`, `film/`, `music/`, source portions of `media/`, relevant `assets/` | `studio/` | Source and build scripts only; rendered outputs external or generated |
| `hub/`, `experiences/`, `rooms/`, browser portions of `refresh/`, `worldspace/` | `experiences/` | Browser-browsable surfaces and interaction entry points |
| `archive/`, `research/`, `KINGDOM_LAND/`, cold/legacy material | `archive/` | Read-only convention; restricted research boundaries preserved |
| `projects.json`, project folders currently distributed across `creative/`, `production/projects/`, and other roots | `projects/` | One small pointer per constellation; do not move project canon/source payloads into pointer folders |
| `.github/` | root `.github/` | GitHub requires this path for Actions and repository configuration |
| `artifacts/`, `dropbox_outbox/`, `downloads/`, `library-import/`, `recovery/`, `providers/`, `signals/`, `events/` | pending | Classify by data ownership, lifecycle, and runtime consumers before assigning a destination |

This table is not an instruction to move every path in one batch. Each folder move must be a separate commit, use Git rename detection (locally, `git mv`), and update `MIGRATION.md` in the same commit. Existing files and history remain intact; no history rewrite or mass deletion is part of this plan.

## Next safe actions

1. Create and push the annotated `v1-pre-cleanup` tag locally.
2. Run local disk/object-size and secret scans.
3. Inspect event/outbox consumers and identify canonical ownership for the 370 mirrored event pairs.
4. Compare duplicate manuscript and template groups by content, provenance, and inbound links.
5. Add the root `MIGRATION.md` before the first move, then reshape one folder per commit.
6. Add validation automation only after the target paths and size policy are agreed. Keep `.github/` at the root and keep runtime state separate from manuscripts.
