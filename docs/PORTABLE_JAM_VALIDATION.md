# Portable jam validation

`hub/validate-jams.py` checks `geehub-jams.json` exports before they are archived, merged, or passed into another workflow.

The browser remains local-first, but it now treats `schemaVersion: 1` as the durable record marker. Generated records include that marker, exports include only records that satisfy the portable contract, and imports skip malformed records instead of persisting them silently. The command-line validator remains the stricter boundary for shared or durable data. Each record must contain:

- `schemaVersion`: integer `1` for the current browser/export shape;
- `title`: non-empty human-readable text;
- `brief`: non-empty generated brief text;
- `createdAt`: an ISO-8601 timestamp, including the browser's `Z` form;
- `from`: a non-empty array of non-empty project IDs preserving source lineage.

This is a provenance rule rather than a schema expansion for its own sake. A portable jam should remain understandable outside the browser that created it, and a record without a timestamp, source nodes, or an identifiable format version is difficult to place back into the constellation.

Run it with:

```sh
python hub/validate-jams.py geehub-jams.json
```

The dependency-free regression checks live in `hub/test-validate-jams.py` and are run by the repository workflow. The validator does not fetch URLs, reinterpret project status, or modify the export; external reachability and human review remain separate observations.
