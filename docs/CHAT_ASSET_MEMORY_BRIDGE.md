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


## Validation

Run the deterministic parser, matching, attachment, review, and privacy checks with `node engine/test_chat_asset_bridge.mjs`. The browser interface should also be opened through a local HTTP server or GitHub Pages and checked with both the curated seed and a real ChatGPT export.
