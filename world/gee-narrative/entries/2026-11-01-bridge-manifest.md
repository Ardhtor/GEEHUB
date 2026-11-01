# Chronicle entry — 2026-11-01: The bridge receives its first numbered envelope

## What changed

Added `engine/growth-video-studio/core/bridge-manifest.js` and eight focused tests. The version-one manifest records an immutable source, typed frame-set references, portable render-job paths, output artifacts, and append-only revision events. Render jobs are accepted only when their source metadata matches the protected source and the portable job contains growth states and landmark evidence. The manifest reserves distinct job and output URIs and rejects collisions with source media or other exchange assets.

Jobs can move from queued to running and then to completed or failed. Completion requires an artifact at the reserved output URI with a SHA-256 digest. Failure is retained as a failure and does not create an artifact. The package workflow was updated to run the growth-video core test suite with Node 22 before packaging.

## What it can do now

It can create and validate versioned exchange records, register measured frame-set references, queue the existing GEEHUB growth render-job format, record job execution state, and link a verified output artifact to its source and job.

## Evidence

- New implementation: `engine/growth-video-studio/core/bridge-manifest.js`.
- New tests: `engine/growth-video-studio/core/bridge-manifest.test.js` (eight cases authored).
- CI workflow: `.github/workflows/package-geehub.yml` now runs `npm test` using Node 22 before packaging.
- The GitHub commit-status endpoint returned no status checks for the workflow-file commit. The tests have not yet been confirmed as executed by CI.

## What remains unresolved

The manifest records URIs; it does not write or transfer media bytes. No Dropbox exchange occurred, no Resolve Lua consumer read the manifest, no frame worker consumed a job, and no video was rendered. The local Mac/Resolve runtime remains unverified.

## Next construction

Add a Resolve Free Lua consumer that reads a versioned incoming manifest, validates its source and job references, and writes a safe audit/result record without overwriting source footage or existing edits.
