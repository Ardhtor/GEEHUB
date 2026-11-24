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
- `/GEEHUB/chapters` contains the Book II Chapter I–VII and Chapter IX Paper mirrors, alongside other independent story documents. Chapter VIII is stored under `/GEEHUB/AI`.
- `/GEEHUB/production` contains `assets`, `scenes`, `recipes`, `projects`, and `references`, plus the Visual Taste & Comic Production System Paper document.
- `/GEEHUB/maps`, `/GEEHUB/corpus`, and `/GEEHUB/state` were empty in the direct-child checks. Their GitHub counterparts are active; do not mistake these Dropbox folders for populated mirrors.
- `/GEEHUB/DREAM_MATERIAL` exists and was recently modified, but its contents were not inspected in this pass.

## Verified Book II manuscript alignment

The Dropbox Paper document **GEEHUB Production Priority — Book II, then Book III** is synchronized to `novel/PRODUCTION_PRIORITY.md` at Paper revision 14. It reflects the current nine-chapter sequence, the 35,572-word baseline after the first ending-compression pass, and the next editorial phase: a body-level line edit through Chapters I–IX in canonical order, beginning with Chapter I.

All nine current chapter manuscripts have Dropbox Paper counterparts. Their Markdown bodies were read back and compared with the current GitHub sources; all nine match.

| Chapter | Dropbox location | Paper revision | GitHub source blob |
| --- | --- | ---: | --- |
| I — The Lost Country | [Open in Dropbox](https://www.dropbox.com/scl/fi/gpx1ba1ijqb6qhfv7igop/Book-II-Chapter-I_-The-Lost-Country.paper?dl=0) | 2 | `a91901b1ab8ca5b85b8c09956e8a838f60aff9f7` |
| II — The Keepers of the Old Trail | [Open in Dropbox](https://www.dropbox.com/scl/fi/56huamrqeyap5qjx6xet4/Book-II-Chapter-II_-The-Keepers-of-the-Old-Trail.paper?dl=0) | 3 | `0ef434c0b1d5b1c2ddd9db60ea892666237188dc` |
| III — The Place That Moved | [Open in Dropbox](https://www.dropbox.com/scl/fi/3nobiaemjom4v9z454106/Book-II-Chapter-III_-The-Place-That-Moved.paper?dl=0) | 3 | `5f6498b354af34b49fe02d8c2cb35509a4c0ecb2` |
| IV — The Promises That Keep | [Open in Dropbox](https://www.dropbox.com/scl/fi/64o1zoq6rm7gw06iascz0/Book-II-Chapter-IV_-The-Promises-That-Keep.paper?dl=0) | 2 | `bd85a9bca132296bd7e428b72a58905ae4c4e164` |
| V — Four Mansions | [Open in Dropbox](https://www.dropbox.com/scl/fi/rybvh6xiotg0e3k7h46pm/Book-II-Chapter-V_-Four-Mansions.paper?rlkey=wtw4jngbq18h1eov3ov1vvhhg&dl=0) | 2 | `1bd08c1b52d38df531ff7d40933e8a2af99bad05` |
| VI — The Game Between the Houses | [Open in Dropbox](https://www.dropbox.com/scl/fi/eakqhvj3umson5vqvbiz2/Book-II-Chapter-VI_-The-Game-Between-the-Houses-1.paper?rlkey=ys3jabjo22qumf94pc8hkldc5&dl=0) | 2 | `e7b3a3303c9009d36d58343777944d5131b3ca22` |
| VII — The Contest That Never Ends | [Open in Dropbox](https://www.dropbox.com/scl/fi/hcjkee5qazq4fghe1b5nj/Book-II-Chapter-VII_-The-Contest-That-Never-Ends.paper?rlkey=ndsz2zhqjx8jidfd157ksvfut&dl=0) | 3 | `75c8bca41e19253a7f4fe01545ceec9799b7984b` |
| VIII — A Day in the Open Pavilion | [Open in Dropbox](https://www.dropbox.com/scl/fi/01ob51oqn637f1kekwqu4/Book-II-Chapter-VIII_-A-Day-in-the-Open-Pavilion.paper?dl=0) | 3 | `d36fa5711621a5e062e8c7820d950bade48348fb` |
| IX — The Narrow Turn | [Open in Dropbox](https://www.dropbox.com/scl/fi/l0mu87ykjjvzt7eq2h5ck/Book-II-Chapter-IX_-The-Narrow-Turn.paper?dl=0) | 2 | `1c4ef8c06bda7a9475d6318f5d7009bbecbc1a03` |

The [Book II Completion Register](../novel/BOOK_II_COMPLETION_REGISTER.md) records the same links, Paper revisions, and GitHub source fingerprints. Refresh and verify a mirror after every subsequent source edit.

### Chapter VI duplicate handling

Two Chapter VI Paper files exist. The suffixed `(1)` file linked in the table is revision 2 and matches the current GitHub manuscript. The unsuffixed file is an older alternate whose body does not match the current source. The suffixed file is canonical; the unsuffixed file remains preserved as a stale alternate and has not been deleted.

## AI runtime status

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
