# Maya-era frame grammar

GEEHUB uses the simple, legible production language of older Maya workflows as its native interface. This is a deliberate constraint: familiar frame types and scene objects are the user-facing vocabulary. Complex inference and rendering remain implementation details.

## Native scene vocabulary

- **Scene** — the complete shot and its dependencies.
- **Frame** — one sampled instant in the shot.
- **Keyframe** — an authored state at a specific frame.
- **Timeline** — ordered frames, keyframes, and playback range.
- **Camera** — framing, lens, movement, and perspective.
- **Mesh** — connected deformable geometry.
- **Joint** — a pivot and articulation point in a rig.
- **Material** — surface response, color, roughness, and texture.
- **Light** — illumination and shadow source.
- **Animation curve** — interpolation between keyframes.
- **Render layer** — a separable visual contribution such as subject, clothing, environment, or effects.

## Growth shot grammar

A growth shot is a scene containing a source performance, a subject rig, a deformable body mesh, materials, a camera, and a timeline.

Growth is authored as keyframes on recognizable channels: stature, torso length, shoulder span, chest depth, arm mass, arm length, thigh mass, thigh length, and calf mass. Animation curves interpolate those values over time. The rig and mesh translate those values into coherent deformation while retaining the source pose and motion.

The face is a protected identity region. The body mesh is continuous across neighboring frames. Clothing follows the body as a material-bearing surface. Camera perspective and environment interaction communicate scale; they must not substitute for coherent anatomy.

## Minimal authoring model

A user should be able to understand a shot by inspecting its timeline and selecting a frame, mesh, joint, material, camera, or light. The interface should feel like a compact older Maya workspace: viewport, timeline, channel values, scene hierarchy, and a render/playback panel.

Do not expose tracking confidence, segmentation tensors, model routing, or inference graphs as the primary creative language. Those are diagnostic details behind the scene. When automatic analysis is uncertain, show a clear marker on the affected frame and allow correction through ordinary frame and mesh controls.

## Compatibility rule

The internal renderer may use modern models and algorithms, but every generated result must map back to this frame grammar. A render job is not complete until it can be inspected as a sequence of frames, keyframes, meshes, materials, camera decisions, and render layers.

## First playable milestone

1. Load a source clip into a scene.
2. Show its frames on a timeline.
3. Create or correct a body mesh and joints on a selected frame.
4. Set growth keyframes on the named body channels.
5. Interpolate the animation curve.
6. Preview the deformed frames in sequence.
7. Export a playable video while preserving source audio where supported.

The first milestone prioritizes a visible, inspectable Maya-like workflow over opaque one-click generation.
