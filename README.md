# BodyLounger Research Archive

A local-first, metadata-first research browser for tracing the historical web ecosystem around BodyLounger, Sarge's Locker, Hulum's Cave, muscle-growth animation, related creators, labels, and archival sources.

## What it does

The browser treats the archive as a graph of references rather than a folder of media. Each record keeps its source URL, optional archive URL, date context, creator/subject, labels, provenance note, status, and adult-content metadata visible. Search spans the full record, while facets provide quick navigation by label, creator, source type, status, and era.

The interface is intentionally dense and old-web-adjacent: large index, compact metadata, fast filtering, source links, and provenance beside the record.

The browser also supports a local research layer: add records in the UI, persist them in `localStorage`, and export the combined index as JSON. Built-in records remain read-only; local additions are clearly marked.

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

A plain static server is enough. No build step or package installation is required.

## GitHub Pages

The repository is intentionally a static site, so it can be served directly by GitHub Pages from the `main` branch root.

## Archive policy

This project stores references and metadata rather than copying or redistributing age-restricted media. External source links may lead to material with their own access controls; the repository does not attempt to bypass those controls.

## Data

The canonical built-in index is `records.json`, with its structure documented in `schema.json`.

Local additions are kept in browser storage and can be exported as `bodylounger-records.json` for review or later import work.

## Roadmap

- Bookmark import and URL canonicalization.
- Duplicate detection by canonical URL and title similarity.
- Chronology/timeline view.
- Provenance graph showing source, mirror, and archive relationships.
- Optional thumbnails only when the user supplies or has permission to store them.
- Observation timestamps and content hashes for metadata snapshots.
- A proper import/merge workflow for exported local records.
