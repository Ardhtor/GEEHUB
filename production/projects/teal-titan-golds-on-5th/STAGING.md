# TEAL TITAN // SOURCE STAGING RUNBOOK

This runbook takes the selected original from the user's locally synced Dropbox folder, inspects it, and makes a checksum-verified working copy. It never edits, moves, renames, or deletes the Dropbox original.

## 0. Confirm the project folder

The canonical Dropbox destination is:

```text
/GEEHUB/production/projects/teal-titan-golds-on-5th/
  01_SOURCE/
  02_FRAMES/
  03_GROWTH_PASSES/
  04_COMPOSITES/
  05_EXPORTS/
  06_AUDIO/
  07_MANIFESTS/
```

Create these folders in the Dropbox desktop-synced `GEEHUB/production/projects/teal-titan-golds-on-5th` directory if they do not already exist. Do not create a second nested `GEEHUB/GEEHUB` directory. If the Dropbox desktop app is configured for online-only files, mark the chosen original **Available offline** and wait for sync to finish before staging.

On macOS, a common Dropbox root is:

```bash
$HOME/Library/CloudStorage/Dropbox
```

Some installations use `$HOME/Dropbox` or a team-specific CloudStorage folder. Use the actual local Dropbox root shown by Finder. The commands below allow it to be set explicitly.

## 1. Inspect before choosing

Open [Source Review](../../../engine/video/source-review.html?project=teal-titan-golds-on-5th) in desktop Chrome or Edge. Choose each candidate from the local Dropbox folder, one at a time. Compare the six sampled frames and the full player. The browser page does not upload or modify the video.

Candidate locations already found by metadata search:

- `SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4` at the Dropbox root.
- `WhatsApp Video 2026-10-31 at 02.10.14.mp4` at the Dropbox root.
- `grouba (1)/colossal_giant_bodybuilder.mp4`.

These are candidates, not confirmed matches. Do not infer the right source from its filename. Record the selected file's exact Dropbox path in the source report. If none matches the intended teal giant, stop and search the Dropbox library again rather than substituting an unrelated video.

## 2. Set local paths

Open Terminal and set `DROPBOX_ROOT` to the actual synced root. Set `GEEHUB_ROOT` to the local GEEHUB directory inside that Dropbox root. The latter is where the staged copy and project folders will live, so Dropbox desktop sync can upload the resulting media.

```bash
export DROPBOX_ROOT="$HOME/Library/CloudStorage/Dropbox"
export GEEHUB_ROOT="$DROPBOX_ROOT/GEEHUB"
export PROJECT="$GEEHUB_ROOT/production/projects/teal-titan-golds-on-5th"

mkdir -p "$PROJECT"/{01_SOURCE,02_FRAMES,03_GROWTH_PASSES,04_COMPOSITES,05_EXPORTS,06_AUDIO,07_MANIFESTS}
```

If the repository is checked out somewhere else, that is fine: run its staging script by absolute path, but keep `PROJECT` pointed at the Dropbox-synced project directory.

## 3. Stage exactly one selected original

From the repository root, run the command for the file actually selected in Source Review. Examples:

```bash
export GEEHUB_DROPBOX_ROOT="$DROPBOX_ROOT"

python3 engine/video/stage_dropbox_source.py \
  "SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4" \
  --project "$PROJECT"
```

For the WhatsApp candidate:

```bash
python3 engine/video/stage_dropbox_source.py \
  "WhatsApp Video 2026-10-31 at 02.10.14.mp4" \
  --project "$PROJECT"
```

For the nested candidate:

```bash
python3 engine/video/stage_dropbox_source.py \
  "grouba (1)/colossal_giant_bodybuilder.mp4" \
  --project "$PROJECT"
```

Run only the command for the source that passed visual inspection. The script waits for the file size to stabilize, copies it into `01_SOURCE/`, computes SHA-256 for both original and staged copy, compares the hashes, and writes a `.source.json` provenance sidecar. It uses a collision-safe destination name and leaves the Dropbox original untouched.

Expected success output includes:

- `"status": "staged"`
- `"verified": true`
- `"original_preserved": true`
- source path, staged path, provenance path and SHA-256.

If staging fails, do not use a partial copy. Resolve the reported sync/path issue and rerun. Do not manually rename or overwrite an existing staged source.

## 4. Probe and analyze the staged copy

Copy the exact staged path printed by the script. Then run:

```bash
STAGED_VIDEO="$(find "$PROJECT/01_SOURCE" -maxdepth 1 -type f \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' -o -iname '*.avi' -o -iname '*.mkv' -o -iname '*.webm' \) ! -name '*.source.json' -print | head -n 1)"

ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,avg_frame_rate \
  -of json "$STAGED_VIDEO" \
  > "$PROJECT/07_MANIFESTS/source-probe.json"

python3 engine/video/analyze_source.py "$STAGED_VIDEO" \
  --fps 2 --width 320 \
  --output "$PROJECT/07_MANIFESTS/source-analysis.json"
```

Requirements: Python 3, FFmpeg and FFprobe on PATH. The analysis records sampled timestamps, coarse frame-change values, possible cuts and motion intervals. It is not skeletal tracking or identity recognition.

## 5. Extract six review frames

Use the source duration reported by FFprobe. The following script extracts six frames at 2%, 20%, 38%, 56%, 74% and 94% of the duration into `02_FRAMES/`:

```bash
DURATION="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$STAGED_VIDEO")"
for spec in "01 0.02" "02 0.20" "03 0.38" "04 0.56" "05 0.74" "06 0.94"; do
  set -- $spec
  SECOND="$(python3 -c "print(float('$DURATION') * float('$2'))")"
  ffmpeg -hide_banner -loglevel error -y -ss "$SECOND" -i "$STAGED_VIDEO" \
    -frames:v 1 -q:v 2 "$PROJECT/02_FRAMES/source-$1.jpg"
done
```

Review the six frames together and compare them with the browser contact sheet. Choose the best identity/reference frame timestamps. Preserve all six review frames; do not overwrite the source.

## 6. Lock the baseline before generation

Do not begin a growth pass until the selected source has been opened and visually reviewed. Record:

- confirmed original Dropbox path and filename;
- staged filename and SHA-256 from the sidecar;
- duration, frame rate, width and height from FFprobe;
- selected face/identity reference timestamp;
- best chest/torso reference timestamp;
- full-body silhouette reference timestamp;
- any occlusion, camera movement, cuts or lighting changes that affect continuity.

For this project, the main review emphasis is the blue-green teal hue, face continuity, bilateral pectoral balance, chest projection, shoulder/trap transitions, height and limb-length scaling, and a stable full-body final pose. If the source does not provide a usable face or body reference, mark the missing reference explicitly instead of inventing continuity.

## 7. Sync and verify delivery

Wait for Dropbox desktop sync to finish. Confirm the staged source, `.source.json` sidecar, probe, analysis and six frames appear in the Dropbox project folder. Do not mark the source `source-verified` or the project `staged` until the visual review and checksum checks have both passed.

After generation, the actual MP4 master belongs in `05_EXPORTS/`; growth passes in `03_GROWTH_PASSES/`; composites in `04_COMPOSITES/`; audio in `06_AUDIO/`; and the final review plus manifest in `07_MANIFESTS/`. Keep the original and its sidecar in `01_SOURCE/`.

## Stop conditions

Stop before generation if the candidate is not visually the intended source, Dropbox is still syncing, the SHA-256 values differ, FFprobe cannot read the staged copy, or the source does not contain enough usable visual information to lock identity and proportions. Report the precise failure; do not silently choose another candidate or claim a render.
