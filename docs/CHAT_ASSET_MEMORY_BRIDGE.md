# Chat History ↔ World Asset Memory Bridge

**Status:** first local-first implementation  
**Interface:** hub/memory-bridge.html  
**Runtime module:** engine/chat_asset_bridge.js  
**Graph contract:** hub/chat-asset-memory.schema.json

## Purpose

The bridge makes a conversation passage and a world asset mutually discoverable. A character image should retain the request, approval, source image or generation record, observation passes, continuity decisions, derivative files, and the world entity it depicts. A chat passage should be able to lead back to the visual evidence and forward to the scene, model, environment, or production task it influenced.

This extends the Tractus event and artifact model. It does not replace engine/activity.jsonl, artifacts/index.json, the asset register, or the Visual Evidence Ledger. It connects them.

## Connected layers

The bridge reads the current repository records:

- projects.json — project, world, and system identities.
- hub/exchange.json — shared interaction events.
- engine/activity.jsonl — append-only occurrence history.
- artifacts/index.json — durable narrative, event, and production artifacts.
- lore/ASSET_INDEX.md — named asset specifications and lifecycle state.
- hub/visual_memory.json — temporal visual-memory sequence.
- media/HULUMS_CAVE_SOURCE_REGISTER.json — original media references and Dropbox identities.
- hub/chat_asset_memory.seed.json — explicitly captured conversation signals that are already known to this repository.

The importer accepts the standard ChatGPT data-export conversations.json structure, including conversation mapping records, and a simpler messages array form. It retains conversation identity, timestamps, roles, message IDs, attachment metadata, and short excerpts from relevant passages. It does not pretend that an attachment pointer is the same as an accessible image file.

## Index-first operating default

**Default rule: check synced files before interpreting, answering, or changing GEEHUB.** At the start of each GEEHUB work session, refresh the repository index and inspect the relevant current files rather than relying on remembered excerpts, prior chat summaries, or stale local snapshots. For a specific character, artwork, chapter, relationship, project, or system, follow its indexed links to the source record, related canon, asset/provenance entry, and any connected conversation signal. Treat the newest verified repository content as the current project state; preserve older versions as lineage rather than silently overwriting them.

The required sequence is: **REFRESH INDEX → IDENTIFY RELEVANT RECORDS → READ CONNECTED SOURCES → RECONCILE WITH THE CURRENT REQUEST → WRITE → FETCH AGAIN TO VERIFY.** If a source is unavailable, stale, or not actually synced, state that boundary and do not describe it as checked. A successful repository index refresh verifies only the public/repository records it loads; it does not imply that private ChatGPT history, the photo library, local files, or Dropbox have synced.

The Memory Bridge already runs `refresh()` automatically when the page opens and exposes a manual refresh control. Keep that behavior as the interface default. Imports and edits should build on the refreshed graph, and a write is not considered complete until the affected files have been fetched again and checked.

## Graph model

The exported graph uses stable node IDs and explicit directed edges. Node families include conversation, chat-signal, chat-attachment, asset, artifact, visual-source, project, world, event, and source-path.

Edges describe the relationship rather than merely placing two records in the same folder. Examples include contains_message, contains_attachment, requested_and_generated, approves_in_conversation, depicts, derived_from_event, derived_from_source, and may_inform. A proposed relation is always suggested; it becomes confirmed only after a person reviews it. Rejected candidates remain marked rejected, so later runs do not silently revive them as facts.

Candidate matching is deterministic and lexical. It compares message terms with asset titles, descriptions, lineage, and source paths. A match is a navigation suggestion, not semantic proof and not a canon decision. Exact IDs, explicit source paths, and recorded lineage take precedence over inferred similarity.

## Awareness indicators

The detail panel reports five separate indicators:

- **Source:** a source record, path, or conversation locator exists.
- **Visual:** an image/video URL, media reference, attachment, or visual-source record is present. This does not prove the binary is locally archived.
- **Continuity:** the node has a lineage, canonical asset ID, declared related nodes, or a conversation parent.
- **Canon:** the record's actual canon/status field, or unclassified when no status exists.
- **Connected:** at least one confirmed graph edge reaches another node.

These indicators must not be collapsed into one confidence score. An asset can be well sourced but visually unavailable; visually present but not yet linked; or linked to a character while still remaining an experiment. An unarchived conversation render is explicitly different from a file verified in Dropbox or the repository.

## Import and privacy

Open hub/memory-bridge.html through GitHub Pages or a local web server. Press **Refresh World Index**, then import the ChatGPT export JSON. Parsing and candidate linking happen in the browser. The page does not upload conversation content to GEEHUB, Dropbox, or a model service. The full text of imported messages stays in the page's in-memory session unless the user explicitly chooses to include it in an export. By default, only relevant excerpts and source locators are exported.

The bridge cannot silently read the user's private ChatGPT history or photo library. It requires a user-provided export or an explicitly pasted passage. This is a real boundary, not a missing status light. The repository's existing public records can be loaded automatically; private chat and photo sources cannot.

**Save Local Memory** stores the graph in that browser's local storage. **Export Memory Graph** creates a portable JSON file. The exported file can be placed in the user's private GEEHUB Dropbox corpus, or a reviewed/curated version can be committed to the repository. Do not commit a raw personal ChatGPT export to a public repository. Keep the original export private and unchanged.

## Review and promotion

The bridge never promotes a candidate match to canon. A suggested edge requires inspection of both endpoints and its evidence. Confirming an edge records a local review timestamp and note; exporting preserves that decision. Narrative canon still follows the Tractus canon-version and promotion contracts. A visual asset's binary must be archived and checked before its availability can be changed to verified_archive.

The first captured example is the Hephaestus Forge-Maker portrait. The conversation request and approval are registered, and the rendered image is marked rendered_in_chat_not_archived. Its character relationship is known because the user explicitly requested Hephaestus. The actual image file has not yet been added to this repository or Dropbox, so the bridge does not claim that the photo library is synced.

## Operating loop

CHAT PASSAGE → SIGNAL → ENTITY / ASSET CANDIDATES → HUMAN REVIEW → CONFIRMED EDGE → DERIVATIVE / WORLD CHANGE → NEW SOURCE TRACE

When a character image is revised, create a new asset version rather than overwriting the previous one. Keep the original image, crops, generated variants, annotated frames, and editable 3D components as separate records with explicit lineage. When a chat passage changes a character's appearance, preserve the passage and connect it to the relevant evidence pass. When the passage changes only tone, relationship, or world rules, connect it to those nodes without inventing a visual consequence.

## Current limits and next implementation boundary

The first implementation loads repository indexes, imports ChatGPT exports locally, suggests links, supports manual passage capture, confirms or rejects relations, stores a local browser snapshot, and exports a portable graph. It does not run continuously in the background, fetch private ChatGPT history, download private photo-library binaries, write directly to Dropbox, or automatically mutate canon. Those capabilities require explicit source access and a connected persistence service. The bridge is designed so those adapters can be added without changing the graph identity or provenance rules.

**The conversation supplies the signal. The source image supplies the evidence. The world asset carries the continuity. The graph keeps them answerable to one another.**



## Recognition and custody — the GEEHUB gap

GEEHUB names a persistent interval: **the gap between recognition and custody**. A thing may be noticed, named, interpreted, and connected to a world entity before its source file is held in the durable archive. A conversation may alter a character's direction before the passage has been captured in the corpus. A generated portrait may be approved while its binary remains available only in the originating chat. These are meaningful states, not clerical errors to be hidden by a single green indicator.

The bridge distinguishes four conditions: **known** (the subject or event has been identified); **referenced** (a traceable source locator exists); **preserved** (the original or a verified copy is stored in a durable, accessible location); and **integrated** (the preserved item is connected to the world record and downstream work). Each condition may be true or false independently. An item can be known but not referenced, referenced but not preserved, preserved but not integrated, or integrated while still experimental rather than canon. Never infer a later condition from an earlier one.

This gap is not a defect to cosmetically erase. It is a productive seam: where memory asks for evidence, where a character can be recognised before the archive is complete, and where a design remains open to correction. The interface should show missing custody as a visible, actionable absence, with source, last known location, next operation, and continuity risk. It must not fabricate previews, file paths, sync states, or provenance.

Hephaestus is the patron of this seam. He does not confuse a blueprint with a built object, a glowing furnace with a finished tool, or a tool's first successful use with a maintenance plan. He examines the material, records what is missing, makes the smallest useful bridge, tests it, and leaves the repair route intelligible to the next person. In the memory system, his discipline means preserving originals, recording derivatives as descendants rather than replacements, attaching each claim to its evidence, and designing every transfer so it can be inspected and reversed. Odin witnesses what is actually known; Hephaestus makes the known thing durable. Their functions cooperate without becoming interchangeable.

The gap shapes the wider world. GEEHUB is not a finished encyclopedia whose contents are merely retrieved. It is a living place whose inhabitants, objects, scenes, and histories can enter awareness at different speeds. A person can be present in a scene before their biography is complete. A district can be visited before its map is surveyed. A visual design can influence a character before its production asset is archived. Such partial presence must be represented honestly and retain a path toward fuller continuity. Uncertainty is not permission to invent; it is a state with boundaries, evidence, and a next possible action.

**World rule:** recognition may precede custody, but no system may claim preservation without a verified durable source. Every crossing from chat to world, reference to asset, draft to canon, or render to production must carry its provenance across the threshold.

## Validation

Run the deterministic parser, matching, attachment, review, and privacy checks with `node engine/test_chat_asset_bridge.mjs`. The browser interface should also be opened through a local HTTP server or GitHub Pages and checked with both the curated seed and a real ChatGPT export.
