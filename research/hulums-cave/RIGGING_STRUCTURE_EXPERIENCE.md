# Hulum's Cave — Rigging, Structure, and Experiential Grammar

**Research role:** technical and experiential synthesis  
**Parent corpus:** [HISTORICAL_VIDEO_CORPUS.md](HISTORICAL_VIDEO_CORPUS.md)  
**Related systems:** Discovery Engine, Teal Titan, Imagine Studio, `engine/video/rigged_character.py`  
**Evidence status:** mixed — public archive evidence, prior direct observations, and research synthesis requiring source-level verification

## The central proposition

Hulum's Cave is best studied as a long-running practice of sustained bodily transformation, not as a collection of isolated images of large bodies. The defining production problem is continuity: a character remains recognizably himself while the body changes over an extended duration, the camera gives that change legibility, and the surrounding scene registers the consequences. A successful GEEHUB translation must therefore preserve temporal continuity, body identity, spatial feedback, and sound—not merely reproduce a final silhouette.

This document separates four kinds of statement. Public archive metadata establishes that a work or WIP exists and may establish its post date. Creator statements establish what the creator has publicly said about a process or intention. Direct media observations establish what can be seen or heard in an inspected file. Technical explanations of the underlying rig remain hypotheses unless supported by creator disclosure or sufficiently diagnostic source evidence.

## Historical and production context

The creator's public profile describes a practice spanning approximately fifteen years of CG growth images and animation. The public archive preserves older categories and titles, including Flash Games, Old Shorts, The Forest, Ultra Size, Marine Growth, Locker Room Growth, Bulls Gym Series, Quality Assurance Growth Counsellor, and early Daddy Growth material. The later archive documents long WIP sequences, remakes, recurring environments, serialized stories, and experiments with generative video.

A useful working periodization is:

1. **Early archive and exploratory period.** Older shorts, Flash-era material, early 3D experiments, and foundational scenario formats. The archive confirms the existence of historical categories; exact dates, software, authorship of individual archived files, and technical methods still require work-by-work verification.
2. **Maya-centred CG development.** The research synthesis identifies Maya as the principal long-term production environment and points to early dynamic cloth and fluid milestones around 2018, followed by body-hair systems, progressive body changes, and longer takes. These are important leads, but each milestone should be tied to a dated creator post, tutorial, project file, or directly inspectable artifact before being treated as established technical history.
3. **Long-form scene and remake development.** Forest, Laboratory, Loft, Storeroom, Locker Room, Office, Bedroom, and related projects offer a way to study how familiar spaces become transformation stages. WIP-to-final pairs are especially valuable because they may expose changes in timing, scene construction, animation, sound, and rendering.
4. **Hybrid and generative experimentation.** Public creator updates describe custom LTX LoRAs, tests with MiniMax, and the use of reference images to improve motion fluidity. This is evidence of experimentation with AI-assisted workflows; it does not prove that every recent project is generated or that conventional CG rigging has been abandoned.

The periods should be treated as overlapping production tendencies rather than hard boundaries. A creator may use conventional CG, compositing, simulation, and generative tools in the same project or across adjacent projects.

## Rigging and deformation: the problem GEEHUB must solve

The visible production ideal is a continuous change in body volume while identity and anatomical relationships remain legible. The research synthesis proposes progressive scaling and morph targets on a deformable mesh, with muscle regions and other body regions driven together or in parallel. This is a plausible family of methods, not a verified description of Hulum's Cave's private rig.

For GEEHUB, the more useful question is not "which exact Maya node did the creator use?" but "what behavior must the character system reproduce?" The character must maintain a coherent surface; growth must travel through connected anatomical regions; joints must not collapse; the silhouette must change at a controlled rate; secondary motion and clothing response must follow the primary deformation; and the animation must support long holds without looking frozen.

A practical implementation can combine:
- a stable identity mesh and skeleton for recognizable proportions and pose;
- regional deformation controls for shoulders, chest, back, arms, waist, hips, and legs;
- morph or corrective shapes for silhouette changes that ordinary joint scaling cannot preserve;
- a continuous growth envelope that drives related regions with deliberate offsets;
- secondary motion for soft tissue, clothing, hair, and environmental contact;
- camera-aware checks so perspective or pose changes are not mistaken for actual growth.

The existing `engine/video/rigged_character.py` path—fused metaball-derived anatomy, a hierarchical skeleton, and distance-based vertex weights—is a useful prototype for continuous surface construction. It is not yet evidence of a production-equivalent Maya rig. Its next evaluation should measure surface continuity, joint deformation, silhouette preservation, growth interpolation, and stable identity across a long animation. It should also compare a purely rig-driven pass with a hybrid pass that uses corrective shapes or image/video generation only where they add demonstrable value.

### Verification questions for each technical claim

- Is the source an explicit creator statement, a visible result, or an engineering inference?
- Is Maya named in the post or project, or inferred from visual style?
- Is the change a mesh deformation, skeletal scaling, morph target, simulation, compositing effect, or a combination?
- Does the same character remain topologically and visually continuous across the shot?
- Are cloth, hair, fluid, and soft-tissue effects simulated, hand-keyed, generated, or composited?
- Does a WIP expose the technique, or only an intermediate visual state?

## Scenario architecture and choreography

The recurring structure is scenario-framed rather than dependent on a complicated plot. A recognizable place gives the viewer a baseline. A trigger introduces the anomaly. The extended transformation occupies the central duration. The room, clothing, furniture, camera, and other characters register the change. The ending either establishes a new scale or leaves the process unresolved.

The structure can be expressed as a sequence of dramatic functions:

**Establish → Trigger → Sustain → Register → Escalate → Hold or Continue**

- **Establish:** make the place and character readable before the transformation dominates.
- **Trigger:** introduce a serum, experiment, spell, encounter, unexplained force, or other scenario mechanism. The trigger need not be fully explained.
- **Sustain:** let the transformation unfold in time. Avoid replacing the central event with a montage of disconnected size states.
- **Register:** show the body interacting with clothing, furniture, architecture, lighting, and other characters.
- **Escalate:** increase the magnitude or consequence while preserving the continuity of the original movement.
- **Hold or continue:** allow the new state to be read, or end with the sense that the process has not finished.

The archive's remakes are especially important. A remake is not merely another entry with a familiar title; it is a comparison opportunity. Record what remains invariant (scenario, character premise, key pose, location, or ending) and what changes (duration, camera, animation, fluids, sound, render quality, or narrative framing). Only direct comparison can establish the actual differences.

## Experiential grammar: duration, attention, and feedback

The experience is temporal and attentional rather than mechanically interactive. The viewer is asked to remain with a change long enough to perceive its inevitability. The work's force can come from an unbroken passage, a carefully held pose, a slow camera adjustment, a growing mismatch between body and room, or the delayed arrival of sound and environmental response.

A GEEHUB analysis should therefore annotate not only what changes, but how long the viewer is made to attend to it. For each shot, record the onset of the transformation, the first unmistakable change, acceleration and deceleration, holds, camera movement, region of visual emphasis, environmental response, and the final state. Note where the viewer is given time to compare the changed body against an earlier baseline.

Camera movement should be treated as part of the choreography. A slow orbit can reveal volume; a fixed low angle can make a silhouette accumulate authority; a closer framing can make a local change legible while hiding the whole-body scale. These are possible functions to test against the actual videos, not universal claims about every Hulum's Cave release.

Environmental feedback is equally important. Clothing strain, contact with furniture, restricted movement, altered room scale, light response, and the behavior of secondary characters can make a transformation feel consequential. The environment should not merely decorate the subject; it should provide a stable measuring instrument against which change becomes visible.

## Sound as a structural layer

Sound must be investigated as part of the animation rather than appended as generic atmosphere. The archive contains explicit sound-related clues, including Loft Growth with sound and forest audio posts. Public post labels establish that sound was foregrounded in those projects, but the actual audio must be inspected before its content or function is described.

For each source, preserve the original audio and annotate:
- exact onset and offset of each salient event;
- continuous beds, room tone, ambience, and silence;
- transient texture and perceived material;
- pitch movement, duration, repetition, and dynamic envelope;
- synchronization with body movement, deformation, clothing, and environmental contact;
- whether the sound appears diegetic, designed, musical, vocal, or uncertain.

The key production test is synchronization. A sound that arrives just before, during, or after a deformation event creates a different perception of weight and causality. Long-form work should be examined for changes in sound density and texture over time, not only for isolated effects. Never infer audio from a silent frame sequence or from a title.

## A source-by-source extraction method

Each video becomes a specimen with linked visual, audio, and production annotations. At minimum, capture:

1. **Identity and provenance:** title, creator, canonical post, publication date, file origin, access state, checksum, duration, frame rate, dimensions, codecs.
2. **Version genealogy:** archive, WIP number, remake/reboot relation, final version, and creator statements about changes.
3. **Shot structure:** shot boundaries, scene transitions, total uninterrupted transformation duration, holds, and ending type.
4. **Character continuity:** face, head, neck, shoulders, height, limb proportions, mass distribution, clothing, and pose vocabulary.
5. **Deformation behavior:** onset, region order, interpolation, rate, corrective changes, secondary motion, and whether the source permits the underlying technique to be inferred.
6. **Camera grammar:** lens impression, angle, distance, movement, crop, orbit, framing changes, and viewpoint continuity.
7. **Environment response:** clothing, furniture, architecture, contact, lighting, and secondary-character reactions.
8. **Sound:** track structure, transient annotations, timing, texture, and synchronization.
9. **Experiential reading:** attention, anticipation, duration, escalation, spatial consequence, and the nature of the ending.
10. **GEEHUB translation:** a specific rig control, shot rule, sound cue, environment behavior, or production test derived from observed evidence.

Every annotation should include timestamps and a confidence/evidence label. A source that cannot be inspected can still have a metadata record, but its visual and audio fields must remain unobserved.

## Priority historical comparisons

**The Forest / in the woods.** Treat the older forest work, its audio-related posts, WIP sequence, and final release as one production genealogy. Compare it with the later Camping Growth statement that the new project nods to an earlier forest video but is not a reboot. This is a strong route into scene memory, environmental continuity, and how a creator revisits an earlier premise without simply reproducing it.

**Laboratory Growth.** Retrieve the full WIP chain, including the post describing more than forty seconds of additional growth, lighting/time-of-day decisions, and the final. Compare duration, staging, camera, scene state, and sound across versions. The research synthesis mentions laboratory passages exceeding ten minutes; verify the runtime and uninterrupted growth duration from the actual file before recording that as a fact.

**Loft Growth with sound.** Prioritize this as an audio specimen. Extract the complete sound track and synchronize its events to the visible action. Do not reduce the investigation to a contact sheet.

**Flash Games / Old Shorts.** Recover original playable or video files and establish format, authorship, date, and archive provenance. Compare the limitations and affordances of early delivery with later continuous CG work, without assuming that every archived item used the same technique.

**Remake pairs and hybrid experiments.** Compare original and remake versions where both are available. For recent LTX/MiniMax work, record creator statements and visible outputs separately; test reference-image continuity, motion coherence, temporal drift, and the boundary between CG source and generated enhancement.

## GEEHUB production consequences

The research points to a production architecture with four synchronized layers:

- **Character layer:** stable identity, anatomical continuity, deformable surface, rig controls, and corrective shapes.
- **Temporal layer:** a continuous transformation envelope, regional offsets, holds, acceleration, and a final-state policy.
- **World layer:** camera, clothing, furniture, architecture, lighting, and secondary-character response as measuring instruments for change.
- **Sound layer:** time-aligned ambience, transient events, material response, and sustained texture.

The Teal Titan preset should become a character-level continuity profile rather than a single target silhouette. Its source videos remain individually identified and independently inspected. Hulum's Cave supplies the historical production grammar; the character's user-defined Hulum's Cave × Joey lineage remains a GEEHUB creative interpretation, not a claim about private intent or collaboration.

## Current evidence boundary and next work

This synthesis combines the user's supplied research with the public Hulum's Cave archive chronology and the repository's existing observations of short clips 22.mp4 and 3333.mp4. Those two clips were previously characterized as pose showcases, not verified progressive-growth sequences. The Dropbox object named `3333.mp4` has not been checksum-matched to the earlier inspected copy. The actual video and audio for the Forest, Laboratory, and Loft works have not yet been decoded in this research pass.

The next meaningful increment is not another generic description. It is three complete source studies: Forest, Laboratory, and Loft. Each should include the original media identity, a timestamped shot map, frame evidence, an audio event map, version genealogy, and a concrete GEEHUB production translation. Until the media is available and inspected, keep technical claims about Maya rig internals and exact deformation methods as attributed leads rather than facts.
