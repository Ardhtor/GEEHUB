# Portable jam validation

`index.html` exports saved Narrative Jammer work as `geehub-jams.json`. The browser can import that file, but a portable artifact should also be inspectable outside the browser before it is archived or merged into another workflow.

`validate-jams.py` is a dependency-free check for the current export contract. It verifies that the root is an array and that each saved jam carries:

- `title` — a human-readable artifact name.
- `brief` — the concrete instruction produced by the jammer.
- `createdAt` — the provenance timestamp.
- `from` — the project ids that generated the collision.

Run it with Python 3:

```bash
python3 hub/validate-jams.py geehub-jams.json
```

The validator is intentionally narrower than a schema migration tool. It does not rewrite files, fetch external media, or infer missing provenance. A failure should remain visible so the export can be corrected at its source.

This is the next layer of the local-first loop:

**make → save → export → validate → move → import**

The surface stays simple; the artifact becomes safer to preserve and hand off.
