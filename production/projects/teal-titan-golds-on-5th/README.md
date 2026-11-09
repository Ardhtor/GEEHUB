# THE TEAL TITAN OF GOLD'S ON 5TH

**Project ID:** `teal-titan-golds-on-5th`  
**Status:** active production design / source media pending  
**World:** Gold's on 5th  
**Subject:** Marcus, a fictional adult bodybuilder  
**Format:** six-second short-form master, 420p delivery, 24 fps; optional extended trailer cut

## The project

Marcus takes three dry scoops of an experimental pre-workout. His skin turns vivid teal; his traps, chest, arms and legs enlarge in a continuous, increasingly impossible transformation. The gym's response supplies the comedy. The final image is a monumental, balanced physique under the warm late-evening lights, with Marcus still posing.

The humour is played straight. The transformation is not a slideshow: each stage inherits the previous silhouette, and the body remains recognisably Marcus throughout.

## Manifest layout

The compatibility production manifest remains at the project root. Extended time-coded and provenance records live in `07_MANIFESTS/`: `timeline.json`, `provenance.json`, and `asset_register.json`. Validate them with `python3 engine/video/validate_timeline.py`.

## Character lineage

The production subject name **Marcus** is the working fictional incarnation used by this Gold's on 5th short. The wider GEEHUB character is **Teal Titan**, whose user-established creative lineage personifies the combined creative libido of Hulum's Cave and Joey. This is a creative premise, not a claim about either person's private feelings, endorsement, or collaboration. The character record is [TEAL_TITAN.md](../../../characters/records/TEAL_TITAN.md); the machine-readable source sequence and evidence boundaries are in [TEAL_TITAN_LINEAGE.json](../../../research/relationships/TEAL_TITAN_LINEAGE.json). Dropbox `22`, `3333`, `4444`, and the anticipated fifth video must be treated as distinct source records. Do not infer the contents of an uninspected file from its filename or sequence position.

## Theme song and Stage 4 reference

The user-designated theme song is [The Teal Titan — YouTube](https://www.youtube.com/watch?v=PJuBIuQeZ2M), also titled in this canon **“Joey at Stage 4 Muscle Bwomph Growth.”** The supplied playlist position is [index 91](https://www.youtube.com/watch?v=PJuBIuQeZ2M&list=PLjPx8lSKXSwDHG3Y_jsx8XRC5XNTp-rUJ&index=91). This is the character's musical association, not a claim about the track's production or lyrics; its audio has not been independently inspected.

A conversation-supplied six-second vertical clip is registered as a provisional Stage 4 visual reference. It shows a monumental blue-green adult bodybuilder in gray shorts, posing in a warmly lit gym. Technical metadata and SHA-256 are recorded in `07_MANIFESTS/asset_register.json` and `provenance.json`. It remains session-supplied and not yet archived in Dropbox. Do not conflate its embedded audio with the YouTube theme-song link.

## Visual continuity locks

- Teal skin is a saturated blue-green, not emerald green and not cyan.
- Preserve the same adult face, head shape, hair and identifying details across the sequence when a verified source reference is available.
- The chest is the principal mass anchor. Both pectorals enlarge together in width, projection and thickness; keep their shape and left/right balance coherent at every stage.
- Traps, deltoids, arms, forearms, lats, thighs and calves grow in a connected anatomical system. Avoid isolated balloon muscles or triangular, cut-out anatomy.
- Height and limb length rise with mass. Preserve joints, stance, floor contact and a believable centre of gravity.
- Skin remains living skin with soft tonal variation and natural light falloff. Avoid stone, rubber, metallic gloss, harsh striations and gritty texture overlays.
- Wardrobe stretches and responds to the changing body. Do not allow clothing to erase the chest silhouette.
- The final form is a new baseline, not a one-frame distortion.

## Six-second escalation

| Time | State | Required visible change |
|---|---|---|
| 0.0–0.6 s | The scoop | Marcus is recognisable in the gym; teal colour begins to spread over skin. |
| 0.6–1.1 s | First mass | Deltoids round out, shoulders widen, traps begin to rise. |
| 1.1–2.0 s | The double biceps | Arms swell into rounded peaks; chest broadens evenly; he starts to pose. |
| 2.0–3.2 s | Proportion failure | Pecs deepen and widen together; lats flare; traps gain a second ridge; thighs and calves catch up. |
| 3.2–4.5 s | The roar | A controlled full-body flex; the gym reacts subtly; scale becomes unmistakable. |
| 4.5–6.0 s | The Titan | Monumental, balanced final physique; golden light catches teal skin; hold the pose long enough to read it. |

The source joke timings (0.0, 1.1 and 3.2 seconds) are preserved as anchor beats. Intermediate changes must be visible between them.

## Production workflow

1. Locate the original source video in Dropbox and preserve its original identity. Do not substitute a web clip or an unverified local file.
2. Stage a verified working copy in `01_SOURCE/`; record Dropbox path or file ID, checksum, duration, frame rate and dimensions.
3. Inspect the source at frame level. Build the identity and proportion reference from actual frames, not filename inference.
4. Generate or assemble six ordered transformation states. Approve the face and chest balance before producing the motion pass.
5. Use the Imagine Engine for the six-second 480p generation pass and its 420p MP4 finish. Use image-to-video when a verified first frame is available; otherwise use text-to-video.
6. Review motion continuity, anatomy, colour, pec balance, silhouette and the last-frame hold. Reject identity drift and skipped intermediate stages.
7. Save the master, source, frames, growth passes, composites, audio and provenance manifest to the Dropbox project folder.

## Dropbox production tree

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

GitHub holds this compact production specification and its manifests. Dropbox remains the source of truth for video, images, audio and rendered media. The original source is never overwritten.

## Production standard

This project follows the [reusable GEEHUB short-form video template](../../templates/short-form-video/README.md).

## Open the production surface

[Open Imagine Studio with the Teal Titan preset loaded](../../../engine/video/imagine-studio.html?project=teal-titan-golds-on-5th). The project panel displays the six escalation stages and links to the three Dropbox source candidates. [Open Source Review](../../../engine/video/source-review.html?project=teal-titan-golds-on-5th) to inspect a locally synced Dropbox video in the browser, capture six frames, and export a source report without uploading the video. [Open the local 3D Studio](../../../hub/gee-studio.html) for the separate Blender/FFmpeg path.

## Source staging

Follow the [Dropbox source staging runbook](STAGING.md) before any growth pass. It covers local Dropbox paths, visual candidate selection, checksum-verified staging, FFprobe metadata, six extracted review frames, baseline locking and sync verification. It explicitly preserves the original source.

## Production documents

- [Six-second shot design](SHOT_DESIGN.md)
- [Extended trailer voiceover](VOICEOVER.md)
- [Machine-readable production manifest](production.json)
- [Asset register and provenance gates](ASSET_REGISTER.json)
- [Imagine Engine preset](../../../engine/video/presets/teal-titan-golds-on-5th.json)
- [Imagine worker contract and acceptance tests](../../../engine/video/IMAGINE_WORKER_CONTRACT.md)
- [Dropbox source staging runbook](STAGING.md)

## Deliverables

- Six-second 420p MP4 master.
- Verified source and frame-selection record.
- Six ordered visual states / growth references.
- Transformation pass and composite.
- Sound design / generated audio record.
- Optional 30–45 second trailer voiceover cut.
- Final continuity and review report.

## Current state

The creative brief and shot progression are established. Dropbox search found three plausible source candidates: `/SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4`, `/WhatsApp Video 2026-10-31 at 02.10.14.mp4`, and `/grouba (1)/colossal_giant_bodybuilder.mp4`. Their metadata is recorded in `production.json`; none has been visually verified as the Teal Titan source yet. No render is claimed. The Imagine Studio now loads a six-state project monitor and exposes the three Dropbox preview candidates. Its port-8787 worker is a separate dependency not included in this repository; the local Blender engine on port 8765 is a different production path. The next production action is to visually inspect the Dropbox candidates, select the correct source, and lock Marcus's baseline.

