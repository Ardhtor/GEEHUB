# Local Manuscript Production Point

The numbered Northgate sequence is authored directly in the repository. Its source of truth is `novel/chapters/`; the chapter file, character records, relationship canon, indexes, and continuation register are updated together. A chapter is not considered integrated merely because its prose exists.

## Local route

1. Clone or open the `Ardhtor/GEEHUB` repository in a local working folder. The current manuscript is ordinary Markdown, so it can be edited with a local text editor without a model service.
2. From the repository root, run the local GEEHUB server with Node.js 20 or later:

   ```sh
   node server/geehub-server.mjs
   ```

3. Open `http://127.0.0.1:8788` for the local Hub. For example, `http://127.0.0.1:8788/novel/chapters/CHAPTER_LXXXIX_DUH_DUH.md` serves the latest chapter source. Open the corresponding file in the local editor when revising it; the server does not generate directory listings.
4. Use `hub/gee-studio.html` for audiovisual staging, shot direction, and media production. It is not a chapter editor.
5. Before accepting a chapter, update its local indexes and continuity records, inspect the diff, and commit the complete change set. Keep the novel source, local working copy, and remote Git history in agreement.

## What is and is not wired

The local server currently serves repository files and exposes bounded dialogue, inscription, and activity endpoints. It does **not** expose a chapter-file write endpoint or a dedicated browser manuscript editor. Editing a chapter therefore happens in the local repository through the editor, not by typing into GEEHUB Studio. The scheduled Tractus writer is also a separate system and does not currently target these numbered chapter files.

This is the closest working production point today: one local repository, one manuscript directory, one continuity set, and one local Hub server. It avoids splitting chapter text across separate documents or treating a chat draft as the sole source of truth. A dedicated chapter desk can be added later as a local interface over the same Markdown files, with explicit save/read-back and version checks.

## Current Northgate sequence

- [Chapter LXXXIX — Duh Duh!](./chapters/CHAPTER_LXXXIX_DUH_DUH.md)
- [Chapter directory index](./chapters/README.md)
- [Relationship canon](./RELATIONSHIP_CANON.md)
- [Continuation register](./CONTINUATION_REGISTER_2026-11-20.md)
