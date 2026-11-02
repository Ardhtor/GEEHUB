# GEEHUB Imagine Engine

A Grok Imagine-inspired six-second video workflow for GEEHUB. This is an independent interface and local production bridge; it does not copy Grok's private software or weights.

## What it does

- Text-to-video and image-to-video.
- Six-second generation using `grok-imagine-video-1.5-lite`.
- Provider render at 480p, then FFmpeg conversion to a 420-pixel-high MP4 master.
- Optional generated audio.
- Local preview, download, and product manifest.
- Writes finished MP4s and manifests into a Dropbox-synced GEEHUB folder when configured.
- Uses the existing GEEHUB production outbox when available.

xAI currently documents 480p as its lowest output resolution. 420p is therefore a GEEHUB finishing preset: 480p is generated first, then resized locally. The 16:9 master is 746×420; 9:16 is 420×746; square is 420×420; 4:3 is 560×420.

## Requirements

- Node.js 20+
- FFmpeg available on PATH
- An xAI API key with video generation access
- Dropbox desktop installed and a local synced GEEHUB folder

## Start on Windows PowerShell

```powershell
$env:XAI_API_KEY="YOUR_XAI_API_KEY"
$env:GEEHUB_DROPBOX_DIR="$env:USERPROFILE\Dropbox\GEEHUB"
node engine/video/imagine-worker.mjs
```

## Start on macOS / Linux

```bash
export XAI_API_KEY="YOUR_XAI_API_KEY"
export GEEHUB_DROPBOX_DIR="$HOME/Dropbox/GEEHUB"
node engine/video/imagine-worker.mjs
```

Then open `engine/video/imagine-studio.html` from the deployed GEEHUB site or local web server. The local worker listens only on `127.0.0.1:8787`; the API key stays in the local process and is never sent to the browser.

If `GEEHUB_DROPBOX_DIR` is omitted, outputs go to `./dropbox-output` beside the process working directory. Set the variable to the local Dropbox-synced GEEHUB folder to make cloud synchronization automatic through the Dropbox desktop client.

## Pipeline

`Prompt / First Frame → xAI asynchronous video job → temporary 480p MP4 → FFmpeg 420p transcode → Dropbox Creations/Video/YYYY/title__id/ → manifest.json`

The browser UI polls the local worker. The worker polls xAI's generation endpoint, downloads the temporary provider result, transcodes it, then saves the finished product.

## Costs and limitations

The xAI docs currently list Imagine Video 1.5 Lite at $0.02 per second for 480p. A six-second generation is approximately $0.12 at that published rate, before taxes or account-specific pricing. The API is asynchronous and generation can take minutes. No live generation is possible until an xAI API key and the local worker are configured. The worker currently keeps job status in memory; restart clears the in-memory job list, but completed MP4s and manifests remain in Dropbox.
