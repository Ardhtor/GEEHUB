# CGI Assembly Medium

Status: active implementation direction  
Scope: GEEHUB's rendered world, character sculpting, asset plane, and persistent artifacts.

## Core rule

GEEHUB constructs subjects as persistent CGI objects. It does not treat each image as a separate answer. A subject is assembled from components; the assembled subject becomes the source for the next transformation. The same rule applies to props, architecture, terrain, and entire environments.

**Parts → assembled subject → experience → transformation → retained state.**

## What the user encounters

The rendered world is the primary surface. The user sees a place and the subject currently occupying it, not a dashboard explaining the place. The console is an in-world instrument for acting on the scene. The atlas remains available as a quiet, textured map with a pin for the current story location. History is recorded as events that alter what the world can show next.

## Object continuity

Each assembled subject has a stable identity and a mutable visual state.

- Identity anchors: face, identifying marks, characteristic posture, and other features that should survive transformation.
- Components: independently selectable and replaceable parts, each with its own geometry/material/pose state when supported.
- Assembly: a whole-body view that updates when components change.
- Transformation: a change is applied to the existing subject, preserving identity anchors unless the user explicitly requests otherwise.
- Versions: previous states remain inspectable and can become the source of a new branch.
- Provenance: each generated or imported asset records its source, prompt or transformation, parent state, and timestamp.

## Construction grammar

Use the same grammar at every scale:

1. **Part** — a mesh, material, prop, sound, texture, or spatial fragment.
2. **Assembly** — a character, object, room, or environmental grouping made from parts.
3. **Scene** — assemblies placed in a persistent space with lighting, camera, atmosphere, and spatial relationships.
4. **Event** — an action that changes a scene or subject.
5. **Memory** — the durable record of the event and resulting state.
6. **Narrative** — the world's account of what changed, grounded in those records.

## Practical build order

1. Make the current sculpt preview operate on named body components rather than one undifferentiated figure.
2. Keep a single selected subject and its assembled preview visible while component edits are made.
3. Add saved visual states and a compare/restore path so growth is cumulative rather than disposable.
4. Connect the subject's current state to the asset plane and scene window.
5. Record each accepted transformation in the artifact ledger and story history.
6. Extend the same component/assembly contract to props and environment assets.
7. Add animation only after the assembled state and continuity data are reliable.

## Visual direction

Use tangible, atmospheric CGI: substantial geometry, imperfect retro-CGI character, dense surface detail, spatial depth, amber environmental light, cool CRT-like highlights, and a sense that the place continues beyond the viewport. The interface should feel like a tool inside the world, not a presentation about the world.

## Acceptance test

A user can select a component, change it, see the assembled subject update in the same scene, preserve the result as a new state, and return to the previous state without losing the subject's identity. The world map, current location, and event record remain consistent with the active scene.

If a feature only creates another isolated image and cannot preserve its relationship to the subject or scene, it is a useful experiment but not yet part of the persistent CGI medium.
