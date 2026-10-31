---
name: growth-video-pipeline
description: Develop GEEHUB's identity-preserving, temporally coherent physique-growth video pipeline.
---

# Growth video pipeline

1. Preserve the original subject identity and source footage continuity.
2. Model growth as a sequence of measured states, not a one-frame size change.
3. Track body landmarks, silhouette, height, limb lengths, muscle volumes, clothing boundaries, and environmental contact.
4. Separate evidence/landmark extraction, segmentation, deformation, temporal stabilization, compositing, and encoding into testable stages.
5. Use explicit confidence and validation data. Never invent measurements when upstream detection has not supplied them.
6. Test temporal consistency across adjacent frames and across the full clip.
7. Keep the six-stage narrative available: Baseline, Desire, Growth, Stress, Mutation, New Baseline.
8. Distinguish implemented pixel operations from metadata, placeholders, and editorial organization.
9. Preserve audio and source timing unless the requested output specifies otherwise.
