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
