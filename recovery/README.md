# GEEHUB Recovery

This area defines repository-level recovery manifests and procedures. It is deliberately separate from the artifact ledger: the artifact index describes creative and production residue, while a recovery snapshot records exact repository file bytes at a known revision.

## Current baseline

`snapshots/baseline-main-c578532.json` records the initial protected baseline for the artifact registry, archive registry/schema, and the Tractus continuity and adaptive-memory contracts. It is anchored to commit `c578532d878fd8a1bb57422c5c91e01c23b83b9b`.

The seed baseline uses Git's content-addressed blob SHA-1 plus byte lengths because those values are available directly from the recorded repository tree. New snapshots created by the local utility include SHA-256 for each file and a SHA-256 self-checksum for the manifest.

## Commands

From a clean checkout:

```bash
python scripts/recovery_snapshot.py verify recovery/snapshots/baseline-main-c578532.json --source git
python scripts/recovery_snapshot.py create --output recovery/snapshots/<new-snapshot>.json
python scripts/recovery_snapshot.py verify recovery/snapshots/<new-snapshot>.json --source working
python scripts/recovery_snapshot.py restore recovery/snapshots/<new-snapshot>.json
```

A new snapshot refuses to run when files in its selected scope have uncommitted or untracked changes. It records the current commit, file sizes, SHA-256 digests, Git blob hashes, and manifest checksum. It does not overwrite an existing snapshot.

Restore reads the exact recorded Git revision and writes into `recovery/restored/<snapshot-id>/` by default. It never overwrites an existing destination unless `--overwrite` is supplied. Use `--in-place` only when intentionally restoring the original repository paths; that mode should be followed by review and validation before committing.

## Boundaries

These manifests cover tracked repository files only. They do not back up Dropbox, local media, external services, GitHub account state, credentials, or untracked files. A snapshot stored in the same GitHub repository is not an independent backup. Stage D remains incomplete until a second independently administered or offline copy exists and a restore drill has been recorded.
