# Chronicle entry — 2026-10-31: The body acquires an articulated measure

## What changed

Added core/growth-mesh.js and its focused tests. The mapper converts a tracked source frame plus baseline and target body states into target joint positions. Stature extends the ankle-to-knee segment, thigh length extends knee-to-hip, torso length carries the neck and shoulders relative to the hip center, shoulder span widens the shoulder pair, and arm length extends both arm segments. Ankles remain fixed. The face center follows the neck with its original offset and is excluded from the body-mesh anchor list. A render helper forwards mapped body anchors to the existing triangle warp when a caller supplies a valid body-only mesh. The broader test run also led to a correction in growth-curve validation order so a decreasing channel is reported as a cumulative regression before the minimum-scale check.

## What it can do now

It can calculate target positions for the supported 2D landmarks, report projected stature, flag anchors outside the frame, reject regressing or anatomically inconsistent growth, and invoke the existing Canvas warp with caller-supplied triangles.

## Evidence

Focused geometry tests: 4 passed, 0 failed. A temporary local core harness ran 15 of 15 current core test cases. The broader run exposed a growth-curve diagnostic-order issue; validation now reports cumulative regression before the minimum-scale bound. The geometry tests cover baseline stability, segment scaling, shoulder width, face offset, fixed ankles, out-of-frame detection, growth validation, and the triangle-render call. No source video, segmentation model, or Resolve runtime was used.

## What remains unresolved

Automatic segmentation, face-excluding mask generation, landmark detection, mesh triangulation, temporal mesh tracking, garment/environment response, and end-to-end video export remain unimplemented. Chest depth and regional mass channels are not represented by these centerline landmarks. Face pixels remain protected only when caller-provided triangles exclude the face region.

## Next construction

Define the versioned bridge manifest that carries immutable source references, frame evidence, creative operations, render jobs, and output lineage between the AI director, local renderer, and Resolve.
