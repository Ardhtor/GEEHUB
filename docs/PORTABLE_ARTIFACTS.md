# Portable Artifacts

The Narrative Jammer already creates a useful object: a small brief that turns a collision between projects into something that can be made. Those briefs are saved locally and can be exported as `geehub-jams.json`.

That export is not a backup of the application. It is a handoff format for the work produced by the application.

## Current record shape

Each saved jam currently contains:

- `title` — a readable name for the study;
- `brief` — the actionable instruction;
- `createdAt` — an ISO timestamp for sequence and provenance;
- `from` — the IDs of the two constellation nodes that generated the collision.

The `from` field is important. It means a brief can be traced back to the constellation rather than treated as an anonymous prompt.

## Why export comes before import

Export is the smallest useful portability step because it lets a session leave its browser without requiring a server, database, package manager, or account system. It also keeps the surface honest: the browser owns the current working set, while the downloaded JSON is an explicit artifact that can be inspected, archived, committed, or merged by hand.

Import should come later and should not silently overwrite local work. A safe import path will need to validate the record shape, preserve original timestamps, deduplicate stable records, and report what was added or skipped. Until then, export is deliberately one-way and transparent.

## Design rule

A generated idea is more valuable when it can leave the moment that produced it without losing its origin.

The practical sequence is:

**encounter → save → export → inspect → make → re-enter the constellation**

This is a persistence feature, but it also supports instantaneity: the brief can be captured while it is still alive, before explanation or later editing changes what first appeared.
