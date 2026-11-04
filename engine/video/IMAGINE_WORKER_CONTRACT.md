# GEEHUB Imagine worker contract

**Status:** frontend and project-preset integration are present; the service implementation on port 8787 is not part of this repository. Do not describe the Imagine worker as installed or running unless its health check succeeds.

## Separation of production engines

- **Imagine short-form path:** browser UI at `imagine-studio.html`; expected worker base URL `http://127.0.0.1:8787`; six-second generation; provider output 480p; delivery target 420p MP4.
- **Local 3D path:** `gee_engine.py` at `http://127.0.0.1:8765`; Blender plus FFmpeg; procedural scene rendering; 10–600 second duration; local output under `~/Movies/GEEHUB/`.

These are separate services and payload formats. The 8765 Blender API is not a drop-in substitute for the Imagine worker. The Studio page links to the local 3D workbench as an alternate route.

## Browser contract

### Health

`GET /health`

Expected JSON:

```json
{
  "ok": true,
  "ready": true,
  "dropboxConfigured": false
}
```

`dropboxConfigured` is optional and describes the worker's own storage integration only. It does not describe the browser's File System Access / Dropbox desktop sync bridge.

### Generate

`POST /generate`

Content type: `application/json`

```json
{
  "prompt": "continuous six-second shot direction",
  "mode": "text",
  "sourceImage": null,
  "aspectRatio": "16:9",
  "duration": 6,
  "resolution": "480p",
  "generateAudio": true
}
```

The response must be JSON with a non-empty `jobId`. Image mode may carry a data URL in `sourceImage`; reject payloads above a documented size limit.

### Job status

`GET /jobs/{jobId}`

The UI polls until `status` is `done` or `failed`. An in-progress response may include:

```json
{
  "status": "generating",
  "progress": 45,
  "message": "Building the shot"
}
```

A completed response must include `videoPath` and may include `filename`:

```json
{
  "status": "done",
  "progress": 100,
  "videoPath": "/videos/job-id.mp4",
  "filename": "teal-titan-golds-on-5th-420p.mp4"
}
```

The `videoPath` must be fetchable by the browser from the same local origin and return MP4 bytes with CORS enabled. The worker is responsible for 480p provider generation and the 420p delivery transcode. A failed job returns `status: "failed"` and a concise `error`.

## Artifact publication

On completion the browser publishes the actual MP4 Blob through `window.GEEHUB_PRODUCTION.publish`. The record carries project ID, world, subject, format, continuity locks, anchor times, prompt and simulation state. The outbox stores the binary payload and a JSON manifest in the user-selected Dropbox-synced GEEHUB folder.

The browser's Dropbox bridge is File System Access API based; it requires the user to connect the local Dropbox folder in a desktop Chromium browser. It is not a direct cloud API or OAuth integration.

## Acceptance tests

1. Health check distinguishes worker online from worker offline.
2. Text mode submits a six-second prompt and returns a job ID.
3. Image mode accepts a supported first frame and rejects oversized files.
4. Polling reports progress, handles failure, and never treats a queued job as complete.
5. Completed output is a playable MP4, 420p delivery, six seconds, with expected audio behavior.
6. Teal Titan output preserves the preset project ID and source lineage.
7. Pectoral balance, teal colour, face continuity, silhouette progression and final hold pass visual review.
8. The exact MP4 Blob is queued to GEEHUB production; Dropbox sync is reported only after the desktop bridge confirms a successful write.

## Current boundary

The UI and project contract are implemented. The port-8787 worker is an external dependency and is not supplied by this repository. The local Blender engine on port 8765 is present but is a distinct, longer-form 3D renderer. Do not claim a Teal Titan master exists until a worker has generated it and the resulting MP4 has been reviewed.
