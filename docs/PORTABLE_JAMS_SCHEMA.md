# Portable Jam Schema

`hub/portable-jams.schema.json` is the machine-readable contract for `geehub-jams.json` exports.

The schema keeps the handoff format deliberately small:

- `title` identifies the generated study.
- `brief` carries the actionable premise.
- `createdAt` preserves when the artifact was made.
- `from` preserves the constellation node IDs that supplied the collision.

Unknown fields are allowed so the format can grow without breaking older validators or importers. The browser currently remains permissive at the surface, while the command-line validator and this schema define the minimum provenance boundary.

## Why this is the next boundary

The jammer already supports local persistence, export, and merge-oriented import. A JSON Schema makes that format legible to other tools without introducing a package manager, a server, or a second application runtime. Future import/export utilities can validate against one shared contract rather than duplicating assumptions.

This is intentionally a contract, not a migration. Existing saved files remain valid if they contain the four required fields; extra metadata can be added later when a useful consumer exists.
