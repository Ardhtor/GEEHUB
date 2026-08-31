# BodyLounger Research Archive

A local-first, metadata-first research browser for tracing the historical web ecosystem around BodyLounger, Sarge's Locker, Hulum's Cave, muscle-growth animation, related creators, labels, and archival sources.

## What it does

The browser treats the archive as a graph of references rather than a folder of media. Each record keeps its source URL, optional archive URL, date context, creator/subject, labels, provenance note, status, and adult-content metadata visible. Search spans the full record, while facets provide quick navigation by label, creator, source type, status, and era.

The interface is intentionally dense and old-web-adjacent: large index, small metadata, fast filtering, source links, and provenance placed next to the record instead of hidden behind prose.

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/src/
```

A plain static server is enough. No build step or package installation is required.

## Archive policy

This project stores references and metadata rather than copying or redistributing age-restricted media. External source links may lead to material with their own access controls; the repository does not attempt to bypass those controls.

## Data

Records are stored in `data/records.json` and documented by `data/schema.json`. The initial dataset is intentionally small and provenance-oriented so new discoveries can be added cleanly.

## Roadmap

- Add an import pipeline for bookmark exports and saved URLs.
- Add duplicate detection by canonical URL and title similarity.
- Add a chronology view that groups sources by year.
- Add a provenance graph showing how archive copies and mirrors relate.
- Add optional local thumbnails only when the user supplies or has permission to store them.
- Add snapshots/hashes for text metadata to document when a source was observed.
