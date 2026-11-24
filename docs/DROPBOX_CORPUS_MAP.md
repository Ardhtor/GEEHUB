# Dropbox Corpus Map

**Snapshot:** 24 November 2026  
**Purpose:** record the verified relationship between the active Dropbox production workspace and the GitHub GEEHUB repository. This is a point-in-time inventory, not a claim of automatic synchronisation or a complete content audit.

## Source roles

GitHub repository `Ardhtor/GEEHUB` is the current source for application code, schemas, project registries, world and spatial state, manuscript Markdown, continuity records, and the browser-facing Atlas. Its README, Project Atlas, Universal Growth Engine, and project registries provide the navigational and governance layer.

The active Dropbox workspace is `/GEEHUB`. It holds production material, media, Paper documents, and working folders. The two stores are related but are not an always-on mirror. Each item retains its exact source path and revision.

## Verified Dropbox structure

The immediate children of `/GEEHUB` include `AI`, `chapters`, `worlds`, `production`, `DREAM_MATERIAL`, `state`, `_engine`, `Creations`, `maps`, `assets`, `characters`, `experiments`, `corpus`, and `Space Cowboy`.

Selected direct-child checks on 24 November found:

- `/GEEHUB/AI` contains the GEEHUB AI Build 0.1 specification, Presence Charter, Cross-Book Chapter Influence Protocol, Production Priority Paper, Live Wand Session 001, the Book II Chapter VIII Paper companion, the Ian Kistner/Gabe/Kirk relationship branch, and the *God as an Eclectic Mouse* three-book motif.
- `/GEEHUB/chapters` contains the Book II Chapter I–VI and Chapter IX Paper mirrors, alongside other independent story documents. Chapter VIII is stored under `/GEEHUB/AI`.
- `/GEEHUB/production` contains `assets`, `scenes`, `recipes`, `projects`, and `references`, plus the Visual Taste & Comic Production System Paper document.
- `/GEEHUB/maps`, `/GEEHUB/corpus`, and `/GEEHUB/state` were empty in the direct-child checks. Their GitHub counterparts are active; do not mistake these Dropbox folders for populated mirrors.
- `/GEEHUB/DREAM_MATERIAL` exists and was recently modified, but its contents were not inspected in this pass.

## Verified manuscript alignment

The Dropbox Paper document **GEEHUB Production Priority — Book II, then Book III** is synchronized to `novel/PRODUCTION_PRIORITY.md` at Paper revision 13. It reflects the current nine-chapter sequence, the 35,381-word baseline, first expansion passes for Chapters I–VI, and the next revision cursor at Chapter VII.

The Book II Paper mirrors were read back and compared with their GitHub sources. All four Markdown bodies match exactly:

| Chapter | Dropbox location | Paper revision | GitHub source blob |
| --- | --- | ---: | --- |
| I — The Lost Country | [Open in Dropbox](https://www.dropbox.com/scl/fi/gpx1ba1ijqb6qhfv7igop/Book-II-Chapter-I_-The-Lost-Country.paper?dl=0) | 1 | `6046e63dc0f749f0caeab24d9f2e7407fb143a90` |
| II — The Keepers of the Old Trail | [Open in Dropbox](https://www.dropbox.com/scl/fi/56huamrqeyap5qjx6xet4/Book-II-Chapter-II_-The-Keepers-of-the-Old-Trail.paper?dl=0) | 2 | `cefe0de1ed3ce967b441766693b00dc90cd66c88` |
| III — The Place That Moved | [Open in Dropbox](https://www.dropbox.com/scl/fi/3nobiaemjom4v9z454106/Book-II-Chapter-III_-The-Place-That-Moved.paper?dl=0) | 2 | `70de36cdf943b591208ab0ca2d9dd82a75d1b979` |
| IV — The Promises That Keep | [Open in Dropbox](https://www.dropbox.com/scl/fi/64o1zoq6rm7gw06iascz0/Book-II-Chapter-IV_-The-Promises-That-Keep.paper?dl=0) | 1 | `e071f970e3b353cb32ff48067c6fe50774db60dc` |
| V — Four Mansions | [Open in Dropbox](https://www.dropbox.com/scl/fi/rybvh6xiotg0e3k7h46pm/Book-II-Chapter-V_-Four-Mansions.paper?dl=0) | 2 | `1bd08c1b52d38df531ff7d40933e8a2af99bad05` |
| VI — The Game Between the Houses | [Open in Dropbox](https://www.dropbox.com/scl/fi/pj1ayynqqr8wgne9ogf4u/Book-II-Chapter-VI_-The-Game-Between-the-Houses.paper?dl=0) | 2 | `d3efe404cda13eeac0336545db1a785db784105d` |
| VIII — A Day in the Open Pavilion | [Open in Dropbox](https://www.dropbox.com/scl/fi/01ob51oqn637f1kekwqu4/Book-II-Chapter-VIII_-A-Day-in-the-Open-Pavilion.paper?dl=0) | 2 | `d1e1d17fdb467570042bcf1a60c0f3f573bbb579` |
| IX — The Narrow Turn | [Open in Dropbox](https://www.dropbox.com/scl/fi/l0mu87ykjjvzt7eq2h5ck/Book-II-Chapter-IX_-The-Narrow-Turn.paper?dl=0) | 1 | `d9be1ad55e028e2cd388dd43386b0b0ceb99bb42` |

The [Book II Completion Register](../novel/BOOK_II_COMPLETION_REGISTER.md) records these links, Paper revisions, and GitHub source fingerprints. Chapter VII remains to be mirrored after its revision pass. GitHub remains the canonical source; Dropbox Paper is the production and reading surface. A mirror must be refreshed and verified after its source chapter changes. Chapter VI has a second Dropbox Paper file with a `(1)` suffix at revision 1; it is an older variant missing one accepted safety-and-route sentence. The unsuffixed revision 2 is the canonical mirror because its body matches GitHub. The older variant remains preserved and has not been deleted.

The **GEEHUB AI — Build 0.1** Paper document is a foundation specification, not a deployed or trained AI model. Its target runtime files and provider configuration remain implementation work. Any implementation must connect to the existing event-inscription, activity, artifact, continuity, and state systems; it must not introduce a second event log, canon store, artifact ledger, or project registry.

## Snapshots and recovery

`/GEEHUB_COPY` is a separately retained snapshot whose root listing was last modified on 5 November 2026. `/GEEHUB_RECOVERY_2026-11-15` is a separately named recovery snapshot dated 15 November 2026. They have not been merged into `/GEEHUB` or deleted. Treat both as rollback sources until their contents have been compared at file level.

## Consolidation rules

1. Keep `/GEEHUB` as the active Dropbox workspace.
2. Keep GitHub as the source for current code, registries, runtime state, manuscripts, and continuity Markdown.
3. Preserve original media and its Dropbox path; attach derivatives and generated outputs as linked records rather than overwriting sources.
4. Synchronize a Paper mirror only after comparing it with the current GitHub source and recording the revision.
5. Do not copy folders wholesale from older snapshots. Compare file IDs, hashes where available, modification dates, and provenance first.
6. Do not claim Dropbox sync or the GEEHUB AI runtime is automated until a real, verified service performs those operations.
7. Recheck this inventory before moving, renaming, merging, or deleting Dropbox material.

This map records the state actually inspected. Unlisted descendants, unreviewed media, and unexamined recovery contents remain unclassified rather than presumed absent.
