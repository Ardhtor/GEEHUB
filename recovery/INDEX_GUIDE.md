# GEEHUB Recovery Continuity Index

The [machine-readable index](index.json) joins repository revisions, the canonical artifact registry, Dropbox snapshots, and restoration events. It is a coordination layer: it does not replace the underlying Git history, artifact records, or Dropbox version history.

The human-readable companion is the [GEEHUB Recovery Continuity Index in Dropbox Paper](https://www.dropbox.com/scl/fi/v8hyralak1a2e23dlv72w/GEEHUB-Recovery-Continuity-Index.paper?rlkey=7hebgx429apeok52tc30ajyuy&dl=0), stored inside the dated Dropbox recovery copy.\n\n## Current linked state

- GitHub repository: `Ardhtor/GEEHUB`, main commit `0104781b312f0a4aadd60ce0d9d8aabd5c99c437`.
- Canonical artifact identity source: `artifacts/index.json`. Existing artifact IDs and provenance remain authoritative; the recovery index does not re-key them.
- Git recovery baseline: `geehub-baseline-main-c578532`, seven tracked files at its recorded source revision.
- Dropbox snapshot: `/GEEHUB_RECOVERY_2026-11-15`, copied from `/GEEHUB`. The recursive inventory comparison found 47 matching entries: 13 files and 34 folders, totaling 16,565,892 file bytes.

The Dropbox comparison checked relative paths, object types, and file sizes. It did not calculate file-content hashes. Both Dropbox folders are in the same account, so this is a second in-account copy, not an independent/offline backup.

## Identity and provenance rules

Artifact identity comes from `artifacts/index.json`; a recovery snapshot gets its own snapshot ID and must never replace an artifact ID. Git records are identified by repository, branch, and full commit SHA. Dropbox records are identified by the exact returned path and Dropbox file ID. A verification event records the method and fields actually compared. A restore event must record its source snapshot/revision, destination, result, and whether content-level verification was completed.

## Operating sequence

1. Commit the intended repository state and record its full commit SHA.
2. Create a new immutable snapshot manifest from a clean checkout.
3. Copy the selected Dropbox production tree to a new dated recovery path; never overwrite an earlier snapshot.
4. Compare inventories, then calculate file hashes when content-level verification is available.
5. Append the snapshot and verification results to `index.json` without rewriting prior history.
6. Perform a restore drill into a separate destination and append the result. Never restore over canon or production by default.

## Remaining work

A real Dropbox restore drill, content-hash inventory, independently stored/offline backup, and GitHub branch rules remain outstanding. The successful Git restore integration test is not evidence that Dropbox restoration has been tested.
