# Hulum's Cave — Historical Video Corpus

**Purpose:** Make Hulum's Cave's own video history the primary research spine for GEEHUB's video, character, growth, sound, and continuity systems.

**Status:** Active, source-led historical extraction. This document separates creator-documented facts, public archive metadata, directly inspected video evidence, and engineering hypotheses. It is an evolving corpus, not a definitive account of the creator's private production methods.

## Why this corpus exists

Hulum's Cave is not merely a visual style reference. The creator describes a 15-year practice of CG growth images and animation. The public Patreon archive exposes a substantial sequence of finished videos, work-in-progress posts, archived older works, technical experiments, and a later transition into generative video. GEEHUB should reconstruct that development as a history of works and techniques, then use the actual videos as primary evidence for motion, staging, character continuity, sound, and production grammar.

The corpus is organized around individual works and their production histories. Other creators are comparative references only.

## Evidence classes

- **Creator statement:** a direct statement by Hulum's Cave in a public post or profile.
- **Archive metadata:** title, date, sequence number, or post type visible in the creator's public archive.
- **Video observation:** a property directly visible or audible in an inspected source file, with timestamps and evidence frames.
- **Engineering interpretation:** a proposed explanation or implementation derived from observations; never presented as knowledge of private project files.
- **Unverified lead:** a title, date, or technique that requires the original post, video, or creator confirmation.

A title and a work-in-progress label do not establish what a video looks or sounds like. A date in the public archive is a post date, not necessarily a creation date.

## Historical outline

### Early archive and foundational works

The creator profile states that they have been making CG growth images and animations for 15 years. The public archive preserves older works and categories including Flash Games, Old Shorts, The Forest, Ultra Size 1 & 2, Ultra Size 3, 4 & 5, Marine Growth, Locker Room Growth (Archive), Hairy Grower (Archive), Quality Assurance Growth Counsellor (Archive), Bulls Gym Series (Archive), Max-Gazm (Archive), Valentine's Day Growth (Archive), Bedroom Growth Technical Study (Archive), Quick Growth (Archive), and Daddy Growth Part 1 & 2 (Archive).

These titles establish a rich early catalogue and recurring settings or formats. They do not, by themselves, establish chronology within the period, software, rig architecture, exact story content, or whether a work was originally Flash, Maya, or another format. The older Flash Games and Old Shorts archive entries are high-priority retrieval targets: locate original playable files and videos before attempting recreation.

### Forest, laboratory, and long-form scene development

The archive includes a sustained Forest Growth work-in-progress sequence, posts about audio, successive WIPs, and a final video titled in the woods, including a 1080p version. It also includes Laboratory Growth with multiple WIP posts, a “+40sec of growth” update, lighting and time-of-day decisions, and a final release. Other entries include Loft Growth with sound, Storeroom Growth, Glory Hole Growth, and Ultra Size works.

This is a significant research cluster because it preserves not only finished titles but production decisions and intermediate versions. The forest sequence is a direct historical ancestor worth comparing with the creator's much later statement that Camping Growth has a slight nod to an old forest growth video, while explicitly not being a reboot. The laboratory sequence may reveal how growth duration, staging, environment, lighting, and sound were developed together. Archive labels alone do not prove exact visual or audio behavior; inspect the posts and media.

### Recurring settings, remakes, and character-led projects

The public archive shows a concentration of repeatable settings and revisited formats: Locker Room Growth, Storeroom Growth, Bedroom Growth Remake, Bed Growth Remake, Office Growth Remake, Hairy Grower Reboot, Fantasy/Transformation Growth, Deal with the Devil, Bus Stop Growth, Daddy Growth, Edging Growth, and GrowthMaxxx.

Study this period as a project genealogy rather than a flat title list. Remakes and reboots provide comparison pairs: they can reveal what the creator deliberately retained, changed, simplified, or improved. WIP sequences can expose the order in which scenes, characters, animation, audio, and final editing were developed. GrowthMaxxx is especially important because it has a long WIP trail and a documented final release on 6 May 2025; the public final post notes that Max narrates the last part and credits a patron who had contributed audio to Edging Growth.

A 4 September 2024 public post marks Fantasy/Transformation Growth as finished and says the creator wanted to take it further but was returning to a larger project. A 1 April 2024 Deal with the Devil P2 WIP post includes a production-time/support update. These are creator statements about project context, not direct evidence of scene content.

### Generative and hybrid experiments

The public archive shows Growth Serum X WIP posts beginning in July 2025, followed by a long sequence of WIP updates and a final release. It also records New Model Tests, CG Training Vids, Bed Growth AI, Military Growth, Storeroom Growth Experiment, Quick Gym Growth, After Glow Growth, Neighborhood Growth, and a public redo of Daddy Growth.

A later creator update explicitly describes Gym Growth as a quick LTX test using a new LoRA. The most recent multi-video update describes an LTX LoRA trained for a specific growth effect and used across multiple videos; experiments comparing MiniMax with an earlier LTX version of After Glow Growth; a focus on reference images to keep motion fluid; and a new Camping Growth WIP. The creator says Camping Growth has a slight nod to an old forest growth video but is not a reboot.

This supports a documented transition in practice: from long-running CG animation to generative/hybrid workflows using reference images, model-specific experiments, and custom LoRAs. It does not establish that all recent work is fully AI-generated or that a mechanical rig has been replaced in every case.

### Current serialized work and continuity

The public archive includes numbered projects such as Blackridge 1, Blackridge 2, and Growing with Coach, with WIP and final posts. The Blackridge 2 final post describes adding an officer's climax and foreshadowing a character named Bane from the first video, then returning to Growing with Coach. This is direct evidence of cross-installment character continuity and deliberate foreshadowing in at least this series.

The latest multi-video update identifies three numbered items: 86 Cock Growth Training, 85 After Glow Growth MM, and 84 Camping Growth WIP1. Capture these as archive identifiers, not as an exact chronology of production without further evidence.

## Directly inspected GEEHUB source readings

The repository's media/HULUMS_CAVE_FIRST_READINGS_2026-11-03.md records two supplied short vertical clips, 22.mp4 and 3333.mp4, both 6.04 seconds, 24 fps, 448×672, sampled at 8 and then 24 frames. The observed character is an adult bald, bearded, blue-green male figure in dark grey shorts, staged in a warm industrial-gym environment. The camera is predominantly low and frontal. The action is a sequence of deliberate bodybuilding poses: arms lowered, raised/spread, double-biceps display, hands-at-waist reset, repeated flex hold; the second clip ends with an oblique/near-side turn.

The critical finding is that these two clips are pose showcases, not verified progressive growth animations. Apparent changes in size must not be mislabeled as growth: arm position, orientation, framing, and camera crop change the apparent silhouette. The clips provide useful character, pose, and staging evidence, but do not reveal the creator's private rig or software stack.

Dropbox currently contains /3333.mp4 (file id id:tbdqPXHGULQAAAAAAAACSg, 2,340,964 bytes) and a separate source register for the SnapVid and WhatsApp clips. The repository's media/HULUMS_CAVE_SOURCE_REGISTER.json records the latter as canonical originals with same-size possible duplicates. Matching size or filename is not proof of duplication. The 22.mp4 file was not found by exact-name Dropbox search during this pass. The existence of /3333.mp4 does not prove it is byte-for-byte identical to the earlier inspected local clip; verify checksum and media metadata.

## Extraction program: every video becomes a historical specimen

For every work, build a linked record with these layers:

1. **Identity and provenance:** canonical title, alternate titles, archive post URL, post date, work number if present, original filename, Dropbox file ID/path, checksum, media probe, access/inspection status.
2. **Production genealogy:** WIP posts in order, setup posts, technical notes, revisions, final post, public release, remake/reboot relationships, sequel/prequel relationships, character links, and known collaborators.
3. **Temporal structure:** shot boundaries, timestamps, cuts, holds, transitions, loops, repeated poses, acceleration/deceleration, and duration of each growth or transformation passage.
4. **Camera and staging:** shot size, camera height, lens/perspective cues, axis, movement, subject position, crop changes, environment geometry, and relation between subject and room.
5. **Character and deformation:** identity anchors, base proportions, pose states, regional shape changes, height/limb changes, silhouette landmarks, facial continuity, wardrobe, cloth response, and secondary motion.
6. **Sound:** whether sound exists, source/music/effects/voice, onset timing, texture, pitch, rhythm, stretch/strain cues, room tone, silence, mix level, and how audio changes across WIPs/final versions.
7. **Render/material language:** geometry, shading, skin response, muscle transitions, clothing materials, lighting, shadows, reflections, background, render artifacts, resolution, compression, and visible post-processing.
8. **Narrative and sensation:** premise, trigger, cause-and-effect, character relationships, escalation logic, emotional pacing, held payoff, and what the ending leaves unresolved. This layer must follow the actual clip rather than generic assumptions.
9. **Technical inference:** possible rig, deformation, simulation, compositing, or generative method, each with explicit confidence and alternative explanations.
10. **GEEHUB translation:** reusable assets, pose controls, growth curves, camera recipes, audio motifs, reference-image strategy, continuity locks, and test cases.

## Comparative extraction rules

- Compare a remake with its earlier version at matched story beats and camera views.
- Compare WIP and final versions to identify what changed during production.
- Compare old and new versions of the same character to identify persistent identity anchors.
- Separate actual deformation from pose, camera, crop, perspective, and orientation.
- Preserve sound as a first-class temporal channel. Never infer that a clip is silent from an image-only preview.
- Record exact timestamps and evidence frame IDs for every claim about motion.
- Mark inaccessible or locked media as uninspected. Public metadata can establish that a post exists, not what its video contains.
- Do not reverse-engineer proprietary files or claim certainty about hidden production methods from rendered output alone.

## Priority extraction batches

**Batch A — early foundations:** Flash Games, Old Shorts, The Forest, Ultra Size 1–5, Marine Growth, Loft Growth, and the earliest archived character/setting projects. Retrieve original playable files and source videos; establish actual chronology and toolchain.

**Batch B — long-form CG development:** Forest Growth WIPs and final, Laboratory Growth WIPs and final, Storeroom Growth, Locker Room Growth, Glory Hole Growth. Extract growth duration, staging, camera, sound, and scene construction.

**Batch C — remakes and project genealogy:** Bedroom/Bed, Office, Locker Room, Storeroom remakes; Hairy Grower Reboot; Daddy Growth; Deal with the Devil; Bus Stop Growth; Edging Growth; GrowthMaxxx. Pair each WIP sequence with its final video.

**Batch D — generative transition:** Growth Serum X, New Model Tests, CG Training Vids, Bed Growth AI, Military Growth, Quick Gym Growth, After Glow, Neighborhood Growth, Daddy Growth public redo. Extract reference-frame use, model/LoRA disclosures, fluidity strategies, and differences between source and generated motion.

**Batch E — current serialized work:** Blackridge 1/2, Growing with Coach, Camping Growth, After Glow Growth MM, and training experiments. Extract serial continuity, character reuse, narrative callbacks, and current model comparisons.

## Immediate engineering consequences for GEEHUB

The first priority is not another generic creator-search script. It is a source-to-corpus extractor that ingests Hulum's Cave archive posts and original media into a durable project genealogy. Build:
- research/hulums-cave/works.json — normalized work catalogue and relations;
- research/hulums-cave/post-index.json — archive posts, dates, titles, WIP/final role, and links;
- research/hulums-cave/annotations/ — one timestamped annotation per source video;
- research/hulums-cave/relations.json — remake, sequel, reboot, reference, character, and technique links;
- scripts/extract_hulums_archive.py — imports permitted public metadata and local/Dropbox source manifests without bypassing access controls;
- scripts/validate_hulums_corpus.py — checks provenance, chronology, evidence class, timestamps, and unresolved claims.

Then connect accepted findings to engine/video/analyze_source.py, the rigged character path, Imagine presets, audio design, and the production template. The historical corpus remains the authority; production presets are derived interpretations.

## Public source register

- Creator profile and stated 15-year CG practice: https://www.patreon.com/hulumscave/about
- Creator archive sitemap (year-grouped post chronology): https://www.patreon.com/hulumscave/sitemap
- Fantasy/Transformation Growth — Final Video (4 September 2024): https://www.patreon.com/hulumscave/posts/fantasy-growth-111378864
- Deal with the Devil P2 — Video WIP 4 (1 April 2024): https://www.patreon.com/hulumscave/posts/deal-with-devil-101449167
- GrowthMaxxx Final Video! (6 May 2025): https://www.patreon.com/posts/growthmaxxx-128246237
- Growth Serum X Video WIP 1 (17 July 2025): https://www.patreon.com/hulumscave/posts/growth-serum-x-1-134297752
- Growth Serum X Video WIP 2 (2 August 2025): https://www.patreon.com/posts/growth-serum-x-2-135582371
- Multiple Video Update (2026; creator's LTX/LoRA, MiniMax, After Glow, and Camping Growth notes): https://www.patreon.com/hulumscave/posts/multiple-video-173400472
- 89 Blackridge 2 — Final Video (2026 archive): https://www.patreon.com/hulumscave/posts/89-blackridge-2-169196706

**Access note:** Patreon may lock the full post or video behind membership. This corpus uses only visible public metadata and text. It does not claim to have inspected locked video payloads.

## Current state

- Historical archive chronology: first-pass extraction completed from the public sitemap.
- Creator-stated pipeline transition: partially documented from public posts.
- Two short supplied clips: first-pass visual and temporal reading exists in media/HULUMS_CAVE_FIRST_READINGS_2026-11-03.md.
- Dropbox source manifest: partially populated; /3333.mp4 confirmed present; exact 22.mp4 not found by name in current search.
- Full historical video-by-video extraction: pending original media retrieval and inspection.
- Audio extraction: pending direct access to original audio tracks.
- Private Maya scene/rig/LoRA details: unknown unless explicitly disclosed by the creator or supported by source files.

**Governing principle:** Hulum's Cave's videos are the historical evidence. The archive tells us where to look; the videos tell us what happened.


## Early blog comics and deleted-site recovery

A surviving 2009 forum archive provides direct historical evidence that Hulumulu published a comic called *Ultrasize* on the Hulumscave Blogspot site. On 9 October 2009 the creator announced Chapter 1 and said Chapters 2 and 3 would follow that weekend. The same thread records Chapter 2 on 27 October and Chapter 3 on 2 November. These entries establish publication and chapter sequence; the comic pages themselves have not yet been recovered or inspected in this research pass.

Known original post URLs, reconstructed from the forum's direct links:
- *Ultrasize* Chapter 1: http://hulumscave.blogspot.com/2009/10/ultrasize-chapter-1.html
- *Ultrasize* Chapter 2: http://hulumscave.blogspot.com/2009/10/ultrasize-chapter-2.html
- *Ultrasize* Chapter 3: http://hulumscave.blogspot.com/2009/11/ultrasize-chapter-3.html

The same 2009 thread links two additional Blogspot video posts on 25 October and a short video post on 3 November. Their original slugs are not fully legible in the surviving search excerpt; do not guess them. Recover those URLs from the original archived forum page before searching for captures.

The 2009 forum archive also preserves contemporary reader responses: Chapter 1 was explicitly identified as a comic; Chapter 3 was discussed as an ongoing story; and a bathroom growth animation was singled out for cinematic quality. These are reception clues, not substitutes for direct inspection.

Recovery status: forum-referenced comic; original post URLs reconstructed; Wayback captures and page images/media payloads not yet verified. Next step is to query Wayback CDX for each exact URL, inspect all timestamped captures, then follow image-host URLs from recovered HTML. Record each page image separately, preserving original order and dimensions. A missing image payload must remain marked missing; never reconstruct it from descriptions and label it recovered.

Source: https://archive.musclegrowth.net/threads/11751-p7.html


## Additional 2009 forum evidence — site migration, The Bully, and reuse

A broader search result from the same archived Evolution Forum thread exposes earlier posts on 29 September 2009. Hulumulu says they are archiving older work on a new site while continuing to post new work. This is an important clue for the deleted-site problem: the 2009 Blogspot was not necessarily the first or only home for the catalogue; it may have been a migration destination or a companion archive. Search the old site/domain history and linked file hosts as well as Blogspot captures.

The thread identifies The Bully as a particularly memorable earlier video. A forum participant links a QuickTime MOV hosted at Box.net (https://www.box.net/shared/static/yz3u77msfe.mov) and discusses it as The Bully. Another participant explicitly describes the animation's phase 3 and its final positioning. Hulumulu also says the creator is happy for another animator to make a video using the Quickie animation, provided the animation work is credited, and asks whether it can be reposted on the blog. This is direct evidence of an early collaborative/remix practice and a creator-approved credit condition for that specific reuse at that time; it is not blanket permission to reuse other works.

The same thread records audience discussion of The Bully's asymmetrical character dynamic and resistance to a conventional revenge-of-the-nerd ending. Treat this as contemporary reception and interpretation, not an authoritative synopsis. It suggests that preserving the original ending and character relation matters when reconstructing the work.

New recovery targets:
- The Bully QuickTime MOV, historically linked at Box.net: https://www.box.net/shared/static/yz3u77msfe.mov (current availability and provenance not verified).
- The 29 September 2009 statement about a new site and archiving older work: recover the preceding forum page(s) in the same thread to capture the exact site URL and any earlier catalogue links.
- Quickie animation and its derivative/remix thread: locate the 31 October 2009 forum thread linked from the archive, then record the original animation, derivative, credit, and repost relationship separately.

Archive note: direct Wayback page and CDX requests for the reconstructed Ultrasize Chapter 1 URL were attempted in this research pass, but the web retrieval interface returned an internal access error. This is not evidence that no Wayback capture exists. The archive status remains unverified until queried through the Wayback interface or another archive index.

Source: https://archive.musclegrowth.net/threads/11751-p7.html


## Recovered exact Blogspot references from the forum link graph

The surviving forum archive exposes two exact October 25, 2009 post paths. The first is `http://hulumscave.blogspot.com/2009/10/test-quickie.html`. The second is shown only as a truncated path ending `d-i-think.html`; its full slug is not recoverable from the visible archived text, so it remains unresolved. The same thread identifies the first video as “Quickie” in a later post, and a creator-approved derivative was posted by another animator on the forum on October 31. Hulumulu explicitly approved the derivative with credit for the animation work and offered to make additional animations for the collaborator. This is a documented example of modular animation being supplied for another artist's downstream video work.

The forum's November 3, 2009 post links a short new video with a partially visible slug ending `n-sometin.html`; the beginning of the slug is truncated in the archived text. Do not normalize this to a guessed title. The November 2 Chapter 3 announcement also says the creator was waiting on a ten-hour render before releasing several new videos. This is a creator-reported render duration, not a verified render-engine benchmark.

Contemporary responses distinguish at least two qualities worth investigating in the actual files: one viewer calls the bathroom growth video cinematic despite describing it as a straightforward muscle morph; another calls the Quickie video a favorite. These are audience descriptions only. The source video contents, exact scene order, and sound remain uninspected.

A November 1 discussion of The Bully is particularly revealing about narrative design. One viewer asks for a conventional reversal in which the smaller character gets revenge; another argues that the original's refusal of a standard “revenge of the nerd” scenario is precisely what makes it distinctive. This is evidence that the work's unusual power dynamic was noticed by its audience. Preserve the original ending and character relationship as unknown until the video itself is recovered; do not rewrite the premise from audience requests.

New confirmed/reconstructed targets:
- Quickie video post: http://hulumscave.blogspot.com/2009/10/test-quickie.html
- Second October 25 video post: `http://hulumscave.blogspot.com/2009/10/[slug unresolved; visible suffix d-i-think.html]`
- November 3 short video post: `http://hulumscave.blogspot.com/2009/11/[slug unresolved; visible suffix n-sometin.html]`
- Quickie derivative discussion: https://www.musclegrowth.org/forum/showthread.php?p=113391 (forum archive may preserve this under its own thread URL; exact archived target still to be located)
- The Bully MOV: https://www.box.net/shared/static/yz3u77msfe.mov (historical forum link; current availability unverified)

The forum archive identifies itself as a direct download of the Evolution Forum at closure and preserves posts from 2004–2014. Adjacent pages 6, 8, and 9 of this thread are next targets; the web retrieval interface currently fails to open those exact page URLs, so this is a retrieval limitation, not evidence that those pages are absent.

Source: https://archive.musclegrowth.net/threads/11751-p7.html


## Focused retrieval update — 8 November 2026

### Latest public video batch: post #86 / #85 / #84

A creator-authored Patreon post titled “Multiple Video Update” is dated October 26, 2026. It announces three new videos and gives useful production notes:

- **86 Cock Growth Training** — a set of videos made using an LTX LoRA trained for a specific growth effect. The creator says the LoRA was used in many videos, and that experiments with MiniMax were tried but put on hold because satisfactory results could be achieved without that approach. The post says the last two results were especially pleasing. Individual video titles and media are locked behind membership; do not infer their visual contents from the label.
- **85 After Glow Growth MM** — a MiniMax comparison against an earlier After Glow Growth made with LTX. The creator says the work tests methods based on good reference images to keep motion fluid, and calls the result useful but unfinished. This is a valuable comparison pair: recurring character/video concept, different generation system, and an explicit motion-continuity objective.
- **84 Camping Growth WIP1** — a camping scenario in which a man is zapped by aliens and grows uncontrollably. The creator explicitly says it nods to the much older Forest Growth video but is not a reboot. This establishes a creator-confirmed thematic lineage, not a shot-for-shot remake.

Source: https://www.patreon.com/hulumscave/posts/multiple-video-173400472
Access status: public post text visible; attached videos and new link/password are locked. No video-level observation is claimed.

### GrowthMaxxx final — production and audio credit

The May 6, 2025 final post confirms that Max narrates the final section. It also credits K Van, a patron who previously supplied audio for Edging Growth, for offering help. This makes the audio contribution a cross-project production link. Retrieve and inspect the final video and compare its narration/audio mix with Edging Growth; do not infer what K Van contributed beyond the creator's stated credit.

Source: https://www.patreon.com/posts/growthmaxxx-128246237
Access status: public excerpt visible; media locked.

### Priority video retrieval order revised

1. Obtain and inspect the actual files for **86 Cock Growth Training**, **85 After Glow Growth MM**, and **84 Camping Growth WIP1**, preserving the creator's access link only through the creator's own membership route.
2. Retrieve both **After Glow Growth** (LTX original) and **After Glow Growth MM** (MiniMax comparison) for matched-scene analysis: reference-image quality, identity stability, motion fluidity, temporal artifacts, and unfinished-versus-final status.
3. Retrieve the older **Forest Growth** and compare it with Camping Growth WIP1 only after both videos are inspected.
4. Retrieve **GrowthMaxxx** final and the relevant **Edging Growth** version to study narration and audio continuity.
5. Work backward through creator-posted final videos and their WIP sequences; prioritize actual video files over forum discussion or secondary reposts.

### Game recovery — status unresolved

The May 28, 2019 Reddit lost-media post contains a link whose displayed text is “Still looking for the first flash game! (billy)” and says that one Hulumscave game could be found there. The post itself does not expose the destination URL in the available search extract. The first game is therefore not identified or recovered. Treat “billy” as a lead embedded in the link label, not a confirmed game title or character. Next step is to resolve the post's outbound link and inspect its destination, then search the linked page's comments and archive snapshots for the SWF filename and original Hulumscave URL.

Source: https://www.reddit.com/r/u_girthandpower/comments/bu5s3o/

### Comic recovery — primary target remains Ultrasize

The 2009 Evolution Forum thread confirms creator-posted links to **Ultrasize Chapters 1, 2, and 3**, with Chapter 3 announced on November 2. The comic should be retrieved as page images or source files, not reconstructed from comments. Preserve page order, image dimensions, text, and chapter title pages. The thread also links **The Bully** as a MOV video, so it belongs in the video register rather than the comic register.

Known comic URLs:
- http://hulumscave.blogspot.com/2009/10/ultrasize-chapter-1.html
- http://hulumscave.blogspot.com/2009/10/ultrasize-chapter-2.html
- http://hulumscave.blogspot.com/2009/11/ultrasize-chapter-3.html

Source: https://archive.musclegrowth.net/threads/11751-p7.html


### Correction to earlier URL notation

The November 3, 2009 Blogspot path is **not** a verified exact URL. The archived forum text truncates the beginning of the slug and only exposes the ending `n-sometin.html`. The correct catalog entry is the month-level prefix `http://hulumscave.blogspot.com/2009/11/` with status `slug unresolved`; do not use or cite a fabricated complete URL. The same caution applies to the October 25 second video, whose visible slug suffix is `d-i-think.html`.
