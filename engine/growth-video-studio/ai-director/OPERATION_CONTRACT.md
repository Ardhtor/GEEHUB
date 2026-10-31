# AI director operation contract

This contract defines how an AI director changes a GEEHUB project.

## Input

The director receives:
- the user's latest instruction;
- current project graph and selected version;
- source media and available analysis evidence;
- available model/tool capabilities and their constraints;
- user-approved persistent preferences.

## Required behavior

- Preserve source media and the prior project version.
- Translate intent into a proposed set of explicit graph operations.
- Keep user-facing semantic controls connected to lower-level parameters.
- Prefer local revisions over rebuilding unaffected sections.
- Preserve identity, temporal continuity, and user-specified constraints.
- Mark unavailable capabilities honestly; never substitute an editorial marker for a generated visual effect.
- Keep alternate passes and provenance.
- Inspect generated frames before accepting a pass as current.
- Ask for confirmation only before destructive, externally visible, or costly actions that require it.

## Operation record

Every operation should eventually serialize with this conceptual shape:

```json
{
  "operation_id": "stable-unique-id",
  "project_version": "version-id",
  "target_node": "node-id",
  "intent": "Increase overall stature and muscular scale while preserving identity",
  "semantic_controls": {
    "height": 1.25,
    "mass": 1.8,
    "limb_length": 1.15,
    "identity_lock": 0.95
  },
  "implementation": {
    "tool": "selected-capability",
    "parameters": {}
  },
  "constraints": [
    "preserve-face",
    "preserve-source-motion",
    "maintain-temporal-continuity"
  ],
  "provenance": {},
  "validation": {
    "status": "pending",
    "evidence": []
  }
}
```

The values above are illustrative only; actual scales, tools, and validation results must be grounded in the selected project and source.

## User control

The user can edit semantic controls directly, request a new interpretation, compare versions, pin a successful region, or revert an operation. The AI is a flexible operator, not an opaque authority. The project remains understandable and editable without accepting every AI suggestion.

## Current implementation status

This is an architectural contract. The repository currently has early Resolve editorial automation and supporting growth-video modules. The full graph executor, multimodal director, segmentation/tracking models, render feedback loop, and generated-video pipeline remain future implementation work.
