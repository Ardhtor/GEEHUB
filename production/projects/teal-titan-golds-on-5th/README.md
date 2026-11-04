# THE TEAL TITAN OF GOLD'S ON 5TH

**Project ID:** `teal-titan-golds-on-5th`  
**Status:** active production design / source media pending  
**World:** Gold's on 5th  
**Subject:** Marcus, a fictional adult bodybuilder  
**Format:** six-second short-form master, 420p delivery, 24 fps; optional extended trailer cut

## The project

Marcus takes three dry scoops of an experimental pre-workout. His skin turns vivid teal; his traps, chest, arms and legs enlarge in a continuous, increasingly impossible transformation. The gym's response supplies the comedy. The final image is a monumental, balanced physique under the warm late-evening lights, with Marcus still posing.

The humour is played straight. The transformation is not a slideshow: each stage inherits the previous silhouette, and the body remains recognisably Marcus throughout.

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

## Production documents

- [Six-second shot design](SHOT_DESIGN.md)
- [Extended trailer voiceover](VOICEOVER.md)
- [Machine-readable production manifest](production.json)
- [Asset register and provenance gates](ASSET_REGISTER.json)
- [Imagine Engine preset](../../../engine/video/presets/teal-titan-golds-on-5th.json)

## Deliverables

- Six-second 420p MP4 master.
- Verified source and frame-selection record.
- Six ordered visual states / growth references.
- Transformation pass and composite.
- Sound design / generated audio record.
- Optional 30–45 second trailer voiceover cut.
- Final continuity and review report.

## Current state

The creative brief and shot progression are established. Dropbox search found three plausible source candidates: `/SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4`, `/WhatsApp Video 2026-10-31 at 02.10.14.mp4`, and `/grouba (1)/colossal_giant_bodybuilder.mp4`. Their metadata is recorded in `production.json`; none has been visually verified as the Teal Titan source yet. No render is claimed. The next production action is to inspect the candidate videos and lock Marcus's baseline from the correct source.

