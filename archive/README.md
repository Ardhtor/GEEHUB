# CHAT ARCHIVE

Raw-first archive for exported ChatGPT conversations.

Principles:
- preserve conversation text + message order
- preserve timestamps and thread boundaries when supplied
- preserve source/export provenance
- attach assets to the conversation/message that references them
- never silently rewrite raw text
- derived tags, links, summaries, and relationships live beside raw records
- canon and experiments remain distinct
- missing/ambiguous provenance is marked, not guessed

Layout:
- `records.json` — conversation index + metadata
- `threads/` — one preserved record per conversation
- `assets/` — conversation-associated assets
- `derived/` — indexes, relationships, optional summaries

Import contract:
1. Export ChatGPT data.
2. Preserve the export unchanged as the source archive.
3. Parse conversations into stable records.
4. Copy/reference associated assets without replacing originals.
5. Generate derived indexes only after raw ingestion.

This directory is the archive layer for GEEHUB; it is not a lore layer.
