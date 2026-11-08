# Hulum's Cave — Build Log

## 2026-09-28

### Build target
The production target is to create new Hulum's Cave videos, not generic social posts and not still-image mood boards. The videos should reproduce the recognizable form and choreography of the Hulum's Cave format while using original GEEHUB material: camera placement and movement, shot duration, environmental reveals, spatial transitions, object appearances, pauses, and episode endings.

### Current production batch
Initial target: 10 new Hulum's Cave videos.

### Visual direction
Current social-video direction explicitly excludes Japanese styling. The intended language is an uncanny, cinematic CG world: explorable spaces, restrained camera movement, environmental oddities, architecture, objects, atmosphere, and the feeling that the place already exists.

### Asset generation
Adobe image generation is the current working source-asset generator. First environment seed generated successfully: dark redwood forest at night, amber fog, hidden underground facility with cold blue light, Florentine/Victorian architectural traces, tactile cinematic realism, no people posing, no text, no logos, no UI.

First Adobe output URL: https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:eeb18a79-5164-45aa-94f4-a66b2b957e71
Request ID: 7ca5a7bf-6331-48b7-a41c-a0dc220a697b

### Choreography rule
Do not treat a generated still as the finished episode. Each video is to be constructed as a sequence whose movement and timing are part of the replication: establish place, move through it, reveal a spatial anomaly or object, hold on the discovery, and end with a memorable environmental change or unresolved continuation. This is a production rule, not a flowchart.

### Social outlets
TikTok: Tyler Brock
YouTube: @gravesbroden
X: @cumpassionately
The social workflow is an outlet for newly generated Hulum's Cave material. No publishing/scheduling completion is claimed unless an authenticated publishing tool succeeds.

### Build accounting rule
Every substantive build change, generated asset, production decision, successful tool operation, failed operation, and unresolved limitation should be recorded here with the date. Do not claim an artifact exists unless it was actually generated or committed.

### Tool limitation recorded
The prior attempt to create the video directly with the built-in image-generation path hit an image-generation rate limit; the available image model could not produce video. Adobe image generation subsequently succeeded for the first source asset. Adobe video rendering tools are available for timeline rendering when valid Adobe asset IDs and a timeline are available.


## 2026-10-26 — Shared inertia / cold-electric pass

### Repository research
Re-read the existing Hulum's Cave build log, asset forge + manifest, Luke/Bwomph generator + asset manifest, Video Realm design note, and browser-native video forge. The core production strategy is already present: short atmospheric CG scenes, place-first choreography, deliberate pauses and reveals, persistent asset lineage, and real WebM export with procedural sound. The weak point was that the video forge's lighting palette was mixed warm/cool and its two figures moved with slightly independent timing; the named Shared Inertia scene did not yet exist.

### Changes committed
- Added a Shared Inertia scene option to the video forge.
- Shifted the base environment toward cold-electric cyan / steel-blue / graphite, including floor tracers, overhead light and haze.
- Synchronized the two figures' arm-swing phase to imply one shared motion field rather than two disconnected loops.
- Added a restrained moving pair of electric elliptical traces and a memory label to the Shared Inertia scene.
- Kept the existing preview and WebM + procedural-audio export path intact.

### Production principle: the original Bwomph of shared inertia
The first Bwomph is not merely a size jump. It is the instant two bodies, the camera, and the room seem to inherit one momentum. Let the camera's slow creep, figure motion, light pulse, environmental drift and sound envelope share a common timing source. Let the effect remain understated: a tiny delay, a held frame, a light arriving just after the movement, and a room that seems to remember the movement after the figures stop. Each new video should vary the space and event, while retaining this shared temporal signature.

### Verification boundary
The code and build notes were committed to the repository. The browser video forge has not been launched in a live browser in this turn, so the new scene has not yet been rendered or playback-tested. The original Hulum's Cave source videos were not available in the files inspected here; this pass deepens the existing GEEHUB implementation and production notes rather than claiming a frame-by-frame analysis of unseen originals.


## 2026-11-01 — Unified rig foundation

### Repository inspection
Confirmed that the local Blender + FFmpeg runner, source-footage analyzer, browser Studio bridge, and procedural growth scene already exist. The current Blender blocking character is assembled from separate ellipsoids and limb primitives. That is useful for fast layout but does not yet provide the continuous deformable surface and skeleton expected from a Maya-style character workflow.

### Change committed
- Added `engine/video/rigged_character.py`.
- The module builds a single fused metaball-derived anatomical surface, converts it to a smooth mesh, creates a hierarchical deform skeleton, and assigns normalized distance-based vertex weights.
- Includes an optional simple growth animation pass and returns the mesh and armature for downstream scene construction.

### Verification boundary
The new module is committed but has not been executed inside Blender in this session. It is a rig/geometry foundation, not yet wired into the production renderer's default character path. Next engineering step: run it in Blender, inspect deformation at shoulders/hips/elbows/knees, correct weight falloff, then integrate it into `blender_scene.py` and the Studio manifest.


## 2026-11-02 — Renderer integration / rigged character path

### Changes committed
- Parameterized the rigged character's growth animation with renderer-supplied start frame, end frame, and a restrained growth ceiling.
- Integrated the rigged character into `engine/video/blender_scene.py` behind the manifest option `character_model: "rigged"`; the existing separate-part blockout remains the default when the option is omitted.
- Adjusted the observation-room floor and uprights for the rigged mesh's full-height coordinate range.
- Updated the example manifest to demonstrate the rigged path and documented the opt-in switch and validation requirements.

### Verification boundary
The integration is committed but has not been executed in Blender in this environment. The rigged path remains experimental. Required next check: run `python3 gee_engine.py doctor`, render the example manifest, and inspect the silhouette, mesh continuity, weight deformation at joints, growth passage and floor contact. Do not treat the rigged path as production-validated until that render has been inspected.

## 2026-11-02 — Dropbox video library made canonical

### Source-of-truth correction
Dropbox videos are the standard GEEHUB source material, not optional references. The Dropbox library is authoritative; local copies are staging/cache only and must retain a traceable link to the original Dropbox item.

### Dropbox discovery
Located source candidates in the connected Dropbox library, including `SnapVid.Net_YPBbLkvp9AQAKdpS_672p.mp4` and `WhatsApp Video 2026-10-31 at 02.10.14.mp4`. These are identified as Dropbox files; their visual contents have not yet been inspected in this step.

### Documentation change
Updated `engine/video/README.md` to establish Dropbox-first source selection, source identity preservation, and lineage through `01_SOURCE/`, `02_FRAMES/`, `03_GROWTH_PASSES/`, `04_COMPOSITES/`, and `05_EXPORTS/`.

### Implementation boundary
The current analyzer still accepts a local filesystem path. A Dropbox video therefore needs to be available through Dropbox desktop sync or staged locally before analysis. Direct Dropbox-to-engine ingestion remains an implementation task and is not claimed as complete.


## 2026-11-08 — Discovery Engine and Teal Titan lineage

### Discovery subsystem committed
- Added `research/creators/CREATOR_SCHEMA.json` and a seeded `ACTIVE_CREATORS.json` index.
- Added `research/discovery/DISCOVERY_PROTOCOL.md`, defining Research → Provenance → Relationship → Production, evidence states, source integrity, and the Hulum's Cave historical research spine.
- Added `scripts/discover_creators.py` for local manual intake and creator-index validation. It explicitly does not claim to run live platform searches.
- Added `scripts/validate_research.py` for creator, Teal Titan lineage, and Hulum's Cave catalogue validation.
- Added `docs/FINDING_AND_GENERATING_GROWTH_CONTENT.md` and a conservative SuperWaffle archival research stub.

### Teal Titan canon and source sequence
- Added `characters/records/TEAL_TITAN.md` and `research/relationships/TEAL_TITAN_LINEAGE.json`.
- Canon now records Teal Titan as the user's personification of the combined creative libido of Hulum's Cave and Joey. This is explicitly a creative interpretation, not a claim about private feelings, endorsement, or collaboration.
- The user-defined source sequence is Dropbox `22`, `3333`, `4444`, and an anticipated fifth video. `22` and `3333` have prior working observations; the Dropbox `3333.mp4` object has not yet been checksum-matched to those observations. `4444` and the fifth video remain uninspected / anticipated. No sequence contents are inferred from filenames.
- The existing Gold's on 5th project retains Marcus as its working fictional subject name and is linked as a production incarnation of the wider Teal Titan concept.

### Verification boundary
All new JSON records were fetched back from GitHub and parsed successfully. The Python validation scripts are committed but have not yet been executed in a Python runtime in this turn. No Dropbox video was decoded, no audio was extracted, and no new render is claimed.


## 2026-11-08 — Rigging, structure, and experiential synthesis

### Research document committed
- Added `research/hulums-cave/RIGGING_STRUCTURE_EXPERIENCE.md` and indexed it from the Hulum's Cave corpus README.
- The synthesis translates the supplied historical/technical account into a source-verifiable research framework: continuous deformation, scenario choreography, duration and attention, camera grammar, environmental feedback, sound synchronization, and a ten-layer per-video extraction method.
- It defines Forest, Laboratory Growth, Loft Growth with sound, Flash Games / Old Shorts, remake pairs, and recent hybrid experiments as concrete comparison batches.

### Engineering translation
- The existing rigged-character prototype is positioned as a testable response to the continuity problem, not as a claim that Hulum's Cave used the same internal rig.
- Maya, dynamic cloth/fluid milestones, morph-target methods, and exact long-form runtimes remain attributed research leads until tied to creator statements or directly inspected media.
- Teal Titan's character continuity is separated from source-file identity and camera/pose effects. The character preset should carry temporal, spatial, and sound behavior as well as a target silhouette.

### Verification boundary
The document and index were committed. No new Forest, Laboratory, or Loft video/audio file was decoded in this step. Existing source observations remain limited to the previously sampled short clips; the Dropbox `3333.mp4` identity remains unverified against the earlier local sample.


## 2026-11-08 — Regional deformation, continuity camera and measured preview

The Laboratory Serum passage has moved beyond a stage-only timing description. Ten regional growth channels now drive spatially weighted shape keys on the unified skin mesh and fitted wardrobe geometry. The head receives an explicit attenuation mask under whole-body scaling so the face remains an identity anchor. The torso shell, shorts and paired shoulder straps share the deformation timeline; this is still a geometric garment proxy, not a cloth solver.

The camera now reads the same growth profile as the body. It makes a gradual orbit and widens by moving back as the largest active regional channel increases, keeping focal length constant. The default preview now covers the full sixty seconds at reduced resolution; an eight-second opening preview would not have shown the main transformation.

After Blender constructs the scene, it measures evaluated world-space bounds for the skin and garment objects at 0, 12, 25, 42, 55 and the final frame, writing `07_MANIFESTS/growth_measurements.json`. This is a geometry-change diagnostic, not a realism score. The project still requires a real Blender render and visual review; no render is claimed by this repository update.
