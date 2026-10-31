# AI-native creative direction

GEEHUB is not a fixed editing macro with an AI label attached. The editing framework is the substrate; an AI director is the active creative operator that can reinterpret the source, propose transformations, manipulate the edit, inspect results, and revise them.

## Governing principle

**Natural-language intent is the control surface. The editable project is the shared state. Rendering is an executable consequence of that state.**

The user should be able to say things like:
- Make him taller and much heavier, but preserve his face and long-limbed proportions.
- Let the growth arrive gradually, then accelerate as the room becomes too small.
- Keep the original movement; make the clothing and environment respond.
- That pass is too smooth. Make the escalation more startling.
- Keep the first half, replace the second half, and show me the difference.

The director translates these into editable operations rather than flattening them into a one-off output.

## AI director responsibilities

1. **Read** — inspect source footage, frames, motion, subject identity, scene layout, audio, and existing edit state.
2. **Interpret** — translate user language into a structured creative intent, preserving ambiguity as adjustable hypotheses rather than silently hard-coding guesses.
3. **Compose** — build or modify a scene/edit graph: shots, frame ranges, subject tracks, transforms, masks, materials, camera, lighting, sound, and transitions.
4. **Execute** — select available models and tools for segmentation, tracking, generation, deformation, compositing, and rendering.
5. **Inspect** — compare outputs against the intent and source evidence; detect drift, temporal wobble, identity loss, proportion errors, and discontinuities.
6. **Revise** — alter only the relevant operations, preserve good passes, and keep alternatives available.
7. **Explain by evidence** — report what changed, what was generated, what remains uncertain, and which version is active.

## Editable project model

The AI should operate on a persistent graph, not a single prompt string. Nodes represent source media, shots, subjects, masks, landmarks, motion tracks, geometry, materials, effects, audio, and outputs. Edges express dependencies and temporal relationships. Each node has:
- a stable ID and version;
- editable parameters and constraints;
- provenance (source, model, tool, prompt/intent, timestamp);
- confidence or validation status where applicable;
- links to preview and rendered artifacts.

Operations are non-destructive. The original source is immutable. Every AI change is an operation that can be inspected, adjusted, reordered, disabled, branched, or reverted.

## Creative controls

Expose semantic controls first, with technical controls available underneath:
- scale, height, mass, limb length, shoulder/chest/arm/leg emphasis;
- growth onset, rate, acceleration, pauses, peaks, and settling;
- identity preservation and facial stability;
- anatomy/proportion constraints;
- clothing response and material tension;
- environment response and scale cues;
- camera perspective, framing, motion, and continuity;
- realism, texture, lighting, and sound.

The AI may derive lower-level parameters from these controls, but it must keep the mapping inspectable and editable.

## Evidence and feedback loop

Each render pass should retain reference frames and measurable evidence: tracked landmarks, masks, subject bounds, temporal confidence, and validation notes. Evidence is not itself the creative decision. It helps the director decide what to adjust and lets the user see why a pass succeeded or failed.

A useful loop is: intent → editable graph → generated pass → visual inspection → targeted revision. It must be possible to interrupt the loop and directly edit any control.

## Roles of the editing framework

DaVinci Resolve remains useful as an editorial surface and finishing environment: bins, timelines, tracks, markers, sound, review, and final export. It should not dictate the intelligence of GEEHUB. The AI director owns interpretation and orchestration; specialized models perform image/video operations; Resolve is one of several execution and finishing endpoints.

## Product boundary

The current Resolve Lua scripts establish editorial organization only. They do not yet implement this AI director, automatic segmentation, body tracking, deformation, or video generation. This document defines the intended architecture, not a claim that those capabilities already exist.
