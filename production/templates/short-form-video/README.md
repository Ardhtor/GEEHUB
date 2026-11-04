# GEEHUB // SHORT-FORM VIDEO PROJECT TEMPLATE

Use this template for six-second or similarly short video projects. Duplicate the template into `production/projects/<project-id>/`, then replace every `TODO` field before generation.

## Required project files

- `README.md` — human-facing project record, links, status and next action.
- `production.json` — machine-readable creative brief, format, continuity, escalation and lineage.
- `SHOT_DESIGN.md` — timecoded action and camera design.
- `ASSET_REGISTER.json` — source, reference, generated and delivery asset state.
- `VOICEOVER.md` — optional separate editorial narration.
- `review/continuity-review.json` — optional review results and rejection notes.

## Default project tree

```text
production/projects/<project-id>/
  01_SOURCE/
  02_FRAMES/
  03_GROWTH_PASSES/
  04_COMPOSITES/
  05_EXPORTS/
  06_AUDIO/
  07_MANIFESTS/
  review/
```

Dropbox is the canonical media shelf. GitHub holds project definitions, presets, scripts and provenance rules. Never overwrite original media. A staged copy must have a SHA-256 sidecar and must be traceable to the Dropbox source path or file ID.

## Status vocabulary

- `brief` — creative intent exists; no source or render work is claimed.
- `source-pending` — source candidates are being located.
- `source-verified` — the selected original has been opened and visually checked.
- `staged` — a working copy and provenance sidecar exist.
- `design-approved` — shot design and continuity locks are accepted.
- `ready-to-generate` — required inputs and generation service are available.
- `rendering` — an actual job is running.
- `rendered` — output file exists and metadata has been checked.
- `reviewed` — visual, motion and audio checks have passed.
- `delivered` — final output and manifest are stored in Dropbox.

Never advance a status because a plan or prompt has merely been written.

## Production gates

1. Source provenance: original file, path/file ID, size, duration, frame rate, dimensions and SHA-256.
2. Identity: stable adult character identity and reference frame selection when relevant.
3. Design: timecoded escalation with a clear start, transition, climax and held ending.
4. Continuity: silhouette, anatomy, material, lighting, wardrobe and spatial consistency.
5. Generation: actual worker health check and completed job response.
6. Delivery: playable file, expected duration, resolution, frame rate, audio and checksum.
7. Review: record defects, rejected frames and accepted revision.
8. Storage: actual media Blob/file and its manifest written to the Dropbox production tree.

## Engine selection

- Imagine short-form: port 8787 worker, six-second text/image-to-video, 480p provider render to 420p delivery. See `engine/video/IMAGINE_WORKER_CONTRACT.md`.
- Local 3D: port 8765 Blender/FFmpeg, procedural scene renderer. It is a separate route and does not implement the Imagine API.

## Starting a new project

Copy the template files, assign a unique project ID, fill the manifest, and add the project to both `projects.json` and `hub/projects.json`. Add a browser preset only when the project has stable, reusable direction. The final artifact record belongs in `artifacts/index.json` after the project is established; render claims require an actual output.
