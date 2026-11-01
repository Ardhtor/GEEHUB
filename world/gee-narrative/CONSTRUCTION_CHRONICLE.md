# GEEHUB — The Construction Chronicle

The chronicle is the living narrative of GEEHUB becoming a working world-making instrument. It is written from inside the construction process, not as promotional copy and not as a retrospective summary.

## Opening entry — The first machine

At first there was a clip: a body in a room, already moving, already carrying its own history. The first task was not to replace it. The task was to discover how a machine could change what happened to that body without losing the person who was there.

The first frame became a witness. The timeline became a measuring instrument. Resolve received the source and gave it a place to remain intact. Around it, GEEHUB began to construct separate spaces for evidence, growth passes, and the final image. The six marks—Baseline, Desire, Growth, Stress, Mutation, New Baseline—were not yet transformations. They were the first grammar by which a transformation could be made accountable.

The machine learned an important distinction early: arranging a process is not the same as performing it. A bin is not a body model. A marker is not a measurement. A curve is not a deformation. The chronicle keeps these distinctions visible because the world must be able to tell the difference between what it has imagined, what it has measured, and what it has actually made.

## The workshop acquires a memory

The repository became the first stable memory of the machine. Codex instructions describe how work should continue. Skills preserve repeatable methods. Resolve scripts establish the editorial room. Dropbox is designated as the exchange space for assets, evidence, bridge records, and exports. None of these rooms is the world by itself. Their connections are the beginning of the world.

GEEHUB's construction is therefore recorded as a sequence of working discoveries. Each entry should identify the artifact created, the capability it actually provides, the evidence that it works, and the next unresolved operation. The story must advance when the machine advances; it must not invent progress to make the story sound complete.

## The governing image

A frame is a surface carrying evidence of a body. A sequence is a body changing through time. A world is the set of relations that makes that change legible: joints, silhouette, weight, fabric, floor, walls, camera, light, sound, and the people who recognize the subject.

The intended sensation is escalation with continuity. Scale may become startling; identity must remain. Growth should be felt in the whole scene, not merely in a swollen patch of pixels. The room may become too small. Fabric may pull. The camera may need to look upward. Yet every consequence must arise from a coherent state, not from arbitrary distortion.

## 2026-10-31 — The body acquires an articulated measure

The measuring frame now converts a tracked source pose and two approved body states into a second set of joint positions. The feet remain planted. Stature lengthens the lower leg; thigh length changes the segment above the knee; torso length carries the neck and shoulders upward; shoulder breadth and arm length can be adjusted independently. The face center travels with the neck without changing its offset, and it is kept outside the body-mesh anchor list.

The mapped joints can now be handed to the existing triangle-warp primitive when a caller supplies a body-only mesh. The instrument also measures the resulting projected height and marks any joint that leaves the frame. That gives the director evidence for a camera reframe instead of letting the subject disappear beyond the image. Chest depth and regional mass remain beyond this instrument until a silhouette mask, depth estimate, or 3D body representation is available.

This is a geometry pass, not an automatic body scan. Four focused tests exercise baseline stability, articulated segment scaling, shoulder breadth, face offset, ground contact, frame-bound detection, invalid growth, and the supplied-triangle render call. The broader temporary core harness then exposed a diagnostic-order fault in the growth curve: a channel falling below one was rejected as an invalid scale before the validator reported that it had regressed. The validator now checks cumulative order before the minimum-scale bound. The local core harness now passes all fifteen test cases. No source footage has been processed, no segmentation model has run, and no Resolve render has been verified.

The next construction is the bridge manifest: one versioned record through which source media, tracked frames, creative intent, render jobs, and resulting artifacts can pass without losing their lineage.

## 2026-11-01 — The bridge receives its first numbered envelope

The exchange bench now has a versioned manifest: `engine/growth-video-studio/core/bridge-manifest.js`. It gives the source clip an immutable identity, then records measured frame sets, render-job references, output destinations, and the artifacts that eventually return. Each change creates a new revision and leaves an event behind, so a later worker can tell which state it received and what happened after it.

The first job can only enter the queue if it is the existing GEEHUB growth-render-job format, contains both growth states and landmark evidence, and describes the same source name, duration, and dimensions as the protected source record. Its job JSON and rendered output have separate exchange paths. The manifest reserves those paths, refusing collisions with source footage or other frame assets. A running job may finish only by returning an artifact at its reserved destination with a caller-supplied SHA-256 digest; the manifest checks its format but does not read the output bytes. Failure remains a recorded failure; it does not become an empty success.

Eight focused tests now describe the contract: source immutability, revision branching, frame-set registration, source matching, output-path reservation, successful completion, explicit failure, and corruption detection. The packaging workflow has also been given a Node 22 test step before it creates the portable mirror. The eight focused bridge tests were then run in a temporary Node 22.16.0 harness using copies of the branch module and its required core dependencies: all eight passed. Syntax checks also passed for the bridge module and test file. The full studio test suite was not run, and the repository status endpoint did not expose a GitHub Actions result, so CI execution remains unverified.

The envelope is not yet a courier. The module stores URIs and metadata; it does not move media bytes, write to Dropbox, read from Resolve, or render a frame. No local application was touched in this pass. The next instrument belongs at the Resolve door: a small Lua consumer that can inspect a manifest safely, report what it understands, and leave source media and existing edits untouched.

## Chronicle rule

Every future entry must be grounded in repository changes, tested behavior, user-confirmed runtime results, or clearly labeled proposals. Do not write an implementation as if it has run. Do not turn missing capabilities into lore that disguises their absence. The narrative is the machine's construction record, and the construction record is part of the machine.
