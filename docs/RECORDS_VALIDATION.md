# Canonical records validation

`records.json` is the source index for the BodyLounger Research Archive. It is deliberately plain JSON so the browser can load it without a build step, but plain JSON alone does not make the archive dependable: a missing field, duplicate ID, malformed URL, or unexpected enum value can silently reduce search quality.

`validate-records.py` makes the contract executable without adding a package manager or changing the browser surface. Run it from the repository root:

```bash
python3 validate-records.py
```

A different JSON file can be checked during editing or review:

```bash
python3 validate-records.py path/to/records.json
```

The validator checks the fields described by `schema.json`, plus practical integrity rules needed by `app.js`:

- required fields are present;
- IDs are non-empty and unique;
- labels are an array of non-empty strings;
- `year` is an integer or `null`;
- `source_type` and `status` use the documented values;
- source and archive links are valid HTTP(S) URLs;
- provenance and descriptive text are not blank.

This is a repository-side guard, not a claim that every external link is live. Link reachability belongs to a separate observation workflow because availability changes over time and should be recorded as provenance rather than treated as a permanent property of the record.
