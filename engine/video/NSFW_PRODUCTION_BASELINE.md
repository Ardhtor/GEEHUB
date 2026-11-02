# GEEHUB NSFW Production Baseline

Status: baseline requirement for character, rig, animation, and scene systems.

## Scope

GEEHUB is an adult-capable production environment. NSFW is a supported content
classification, not an exceptional project mode. Character and scene pipelines should
be designed so mature-rated projects do not require rebuilding the rig or asset schema.

The baseline includes:
- Adult character anatomy and proportion-aware deformation.
- Mature-rated character presentation, wardrobe states, and configurable coverage.
- Body, skin, cloth, and soft-tissue systems that remain technically consistent across
  clothed and non-explicit nude character states where permitted by the production brief.
- Project-level content-rating metadata so assets, shots, and exports retain their
  intended classification.
- Separate controls for anatomy, wardrobe, camera framing, and scene rating; do not
  bake wardrobe or rating assumptions into the skeleton.

## Character and scene safeguards

- All sexualized characters must be unambiguously adults.
- Do not create sexualized minor or youth-coded characters.
- Sexual content involving coercion or non-consent is not a supported production target.
- Do not infer consent, age, or identity from an image; use explicit project metadata.
- Keep real-person likeness and source-reference permissions distinct from fictional
  character design.

## Rigging requirements

- The skeleton must remain independent of clothing and content-rating state.
- Deformation layers should be modular: base skinning, joint correctives, muscle/soft
  tissue, cloth, and presentation controls.
- Wardrobe visibility and coverage are scene controls, not destructive mesh edits.
- Anatomy controls must preserve the established character proportions and continuity.
- Growth and physique changes must obey the project's declared stage cap. For Luke's
  current reproduction pass, phase four remains the maximum.

## Production handoff

Every project manifest should declare its content rating and adult-character status.
The renderer/exporter must preserve that metadata. A project marked NSFW should not be
silently converted to a general-audience presentation.

This baseline describes GEEHUB's project architecture. It does not override the
capabilities or content restrictions of any particular image, video, or 3D generation
service used in the pipeline.
