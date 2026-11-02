# GEEHUB // DROPBOX PRODUCTION PIPELINE

## Operating principle

Dropbox is the durable production shelf. GEEHUB engines create products; the artifact stream records provenance; the local outbox protects work until storage is available; Dropbox keeps the actual products and their manifests.

`history` is the record of what happened. `simulation_state` is the model state that generated an outcome. A product manifest can reference both, but neither is substituted for the other.

## Desktop flow

1. Open GEEHUB in desktop Chrome or Edge.
2. Select **CONNECT DROPBOX FOLDER** and choose the local Dropbox-synced `GEEHUB` directory. If the Dropbox root is selected instead, the bridge creates/uses its `GEEHUB` child.
3. Grant read/write permission. The browser remembers the directory handle where supported.
4. Existing local GEEHUB artifacts are recovered into the outbox. New artifact emissions and products from connected engines are queued automatically.
5. The bridge writes files into the selected local folder. The Dropbox desktop client performs the cloud synchronization.

This bridge uses the browser File System Access API; it does not request or store a Dropbox password or API token. It requires a desktop Chromium browser and a locally synchronized Dropbox folder. It does not pretend that a browser-only static page can write directly to cloud Dropbox without an authenticated storage path.

## Dropbox layout

- `/GEEHUB/Creations/Video/YYYY/<title>__<id>/` — MP4, WebM, MOV.
- `/GEEHUB/Creations/Audio/YYYY/<title>__<id>/` — WAV, MP3 and generated sound.
- `/GEEHUB/Creations/Images/YYYY/<title>__<id>/` — renders, frames and images.
- `/GEEHUB/Creations/3D/YYYY/<title>__<id>/` — models and geometry.
- `/GEEHUB/Creations/Writing/YYYY/<title>__<id>/` — books, chapters and passages.
- `/GEEHUB/Creations/Other/YYYY/<title>__<id>/` — remaining product types.
- `/GEEHUB/artifacts/manifests/<id>.json` — provenance and product pointer.
- `/GEEHUB/state/simulations/<id>.json` — optional saved simulation state.

The existing Dropbox folders `Creations`, `artifacts`, `production`, `state`, `chapters`, `worlds` and `assets` are retained; this design adds structure inside them rather than replacing them.

## Engine contract

A generator publishes the actual file, not a description of a file:

```js
await window.GEEHUB_PRODUCTION.publish({
  title: "Seven Wells — Forest Pass",
  kind: "video",
  blob: renderedVideoBlob,
  filename: "seven-wells-forest-pass.mp4",
  source: "GEEHUB video engine",
  lineage: { world: "Veyrthalis", scene: "Seven Wells" },
  simulation_state: currentWorldState,
  history_refs: ["world-event-000134"],
  canon: "experiment"
});
```

For text-first artifact emissions, the bridge wraps `GEEHUB_ARTIFACTS.emit` and preserves the artifact body as a Markdown payload. Other engines can publish directly or dispatch `geehub:artifact` with a product record.

## Reliability and boundaries

- Pending products are held in IndexedDB until the Dropbox folder is connected and writable.
- Each product has a stable ID and a separate JSON manifest.
- The payload and manifest are written separately; a failed write remains queued for another attempt.
- Existing history is never overwritten by simulation output.
- Canon status is metadata, not an automatic promotion.
- The export button exports pending metadata. It does not claim to package binary payloads.
- Cloud synchronization is completed by the Dropbox desktop client after local file creation; this repository change does not prove that a particular machine has completed a cloud sync.

## Next integrations

Video, audio, image, 3D, book and simulation engines should call `GEEHUB_PRODUCTION.publish` as their final production step. This keeps the output pipeline independent of the generator: new engines inherit the same provenance and storage behavior.
