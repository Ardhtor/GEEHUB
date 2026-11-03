# Hulum's Cave — Mechanical Rig & Deformation Reference

**Purpose:** Creator-facing technical reference for planning a compatible GEEHUB character-growth system.

**Evidence status:** This document combines (1) visual observations from the supplied clips `22.mp4` and `3333.mp4`, and (2) a reverse-engineered hypothesis about historical Hulum's Cave production methods. It is not a verified description of the creator's private Maya scenes, rig files, node graph, or AI training setup.

## 1. Pipeline eras

```js
const pipeline = {
  mayaEra: {
    window: "approx. 2018 → mid-2025",
    endpoint: "GrowthMaxxx — reported final major fully Maya-animated project",
    dcc: "Autodesk Maya",
    model: "hand-authored deformation + animated growth targets + secondary dynamics"
  },
  generativeEra: {
    window: "2025 → present",
    methods: ["generative video", "reference-led consistency", "custom growth LoRAs", "upscaling"],
    model: "image/video synthesis; not necessarily a persistent mechanical character rig"
  }
};
```

Tool names and dates above are supplied research claims, not independently verified by the two clips inspected.

## 2. Maya-era character foundation

```js
const skeleton = {
  type: "hierarchical biped",
  spine: "multi-joint chain; torso volume and posture controls",
  limbs: "FK/IK arms and legs; optional twist helpers",
  neckHead: "independent neck/head controls for silhouette balance",
  regionalHelpers: ["deltoid", "pectoral", "glute", "quadriceps"],
  optionalSpecializedChains: ["secondary soft-tissue controls"]
};
```

Design intent: maintain a stable identity and readable silhouette while poses and body proportions change. Twist joints and regional helpers are plausible solutions to deformation problems, not confirmed components of Hulum's original rigs.

## 3. Deformation stack

```js
const deformation = {
  base: "skinned character mesh",
  primary: "sculpted blendShape targets",
  secondary: "regional joint scaling",
  correctives: "pose- and growth-dependent corrective shapes",
  smoothing: "optional lattice / wrap / delta-Mush-style cleanup",
  surface: "material or texture detail varied by growth stage"
};
```

Suggested target library:

```js
const targets = [
  "baseline",
  "early growth",
  "intermediate hypertrophy",
  "heavy bulk",
  "extreme silhouette",
  "regional muscle corrections"
];
```

Use a master attribute to coordinate the target library:

```js
const growthDriver = {
  input: "growth_amount: 0..1",
  outputs: [
    "blendShape weights",
    "regional scale",
    "corrective activation",
    "surface-detail intensity"
  ],
  curve: "establish → accelerate → hold or continue"
};
```

Keep pose and growth as separate channels. A flex pose must not be interpreted as a body-size increase; a growth pass must not silently alter the character's face, costume identity, or camera.

## 4. Muscle and soft-tissue design

```js
const muscleSystem = {
  approach: "sculpted regional targets; avoid assuming full muscle-fibre simulation",
  priorities: [
    "volume change",
    "muscle-shape change",
    "silhouette continuity",
    "surface-detail timing",
    "controlled secondary motion"
  ],
  validationViews: ["front", "three-quarter", "side"]
};
```

For GEEHUB, first solve the large forms and their transitions. Fine veins, striations, and skin detail should support the volume rather than substitute for it. Soft secondary motion is an optional finishing layer, not a prerequisite for a coherent rig.

## 5. Clothing and secondary systems

```js
const secondarySystems = {
  cloth: {
    candidate: "nCloth or equivalent cloth simulation",
    visualRole: ["fit", "tension", "folds", "collision", "stretch"],
    rule: "only simulate behavior that the shot actually shows"
  },
  fluids: "optional shot-specific effects",
  hair: "texture, opacity, or geometry changes where required",
  softMotion: "subtle delayed response for large moving forms"
};
```

The supplied clips show dark shorts, but do not demonstrate cloth stretching, tearing, or displacement. Those behaviors belong in the general research hypothesis, not in the observed-shot notes.

## 6. Animation and shot grammar

```js
const growthPass = [
  "establish baseline",
  "introduce trigger",
  "show continuous intermediate change",
  "check front / three-quarter / side continuity",
  "reach target state",
  "hold final silhouette"
];

const visualSignals = [
  "silhouette change",
  "regional volume change",
  "proportion shift",
  "surface detail progression",
  "cloth response, if visible",
  "secondary motion, if useful"
];
```

A genuine growth passage must show measurable shape change across comparable views. Camera crop, perspective, pose, arm position, and body orientation can all make a figure appear larger without any actual deformation.

## 7. Era classification — provisional

```js
const classification = {
  reportedMayaEra: [
    "early cloth / fluids tests",
    "Storeroom / Locker Room / Bedroom / Office remakes",
    "Laboratory Growth",
    "Hairy Grower",
    "GrowthMaxxx"
  ],
  reportedGenerativeOrHybridEra: [
    "Daddy Growth public redo",
    "Neighborhood Growth",
    "After Glow",
    "Gym Growth shorts",
    "Blackridge",
    "Growth Serum X related material"
  ]
};
```

Treat title-level classification as provisional until each work is inspected or the creator explicitly documents its production method.

## 8. GEEHUB implementation rules

```js
const creatorRules = {
  identity: "one persistent character identity",
  controls: "separate pose, growth, expression, camera and cloth",
  growth: "one master parameter with regional overrides",
  deformation: "intermediate shapes, not abrupt model swaps",
  continuity: "preserve face, costume and recognizable landmarks",
  validation: "compare normalized silhouettes across multiple views",
  evidence: "label observed facts separately from inferred mechanisms"
};
```

## 9. Link to the first video readings

The two supplied clips are short pose showcases, not confirmed growth sequences:

- `22.mp4`: frontal stance, arm raise / flex, hands-at-waist reset, repeated flex hold.
- `3333.mp4`: related frontal presentation, sustained flex, then an oblique / near-side turn.

Their strongest direct contribution is a reusable pose and staging vocabulary. They do not prove the use of Maya, blendShapes, skinClusters, nCloth, LoRAs, or any particular solver.

See [Hulum's Cave — First Video Readings](HULUMS_CAVE_FIRST_READINGS_2026-11-03.md) for the source-specific observations and temporal notes.

## 10. Next technical pass

1. Build a proportion / landmark sheet from the source frames.
2. Create neutral, front-flex, hands-at-waist, and oblique-turn pose states.
3. Keep pose animation independent from the growth driver.
4. Prototype a unified deformable mesh and inspect shoulder, chest, hip, thigh, elbow, and knee transitions.
5. Add staged growth targets only after the base silhouette is stable.
6. Render front and side comparison frames at matched camera scale.
7. Record every tested deformation and its result in the GEEHUB build log.

**Core principle:** `growth = controlled shape change + identity continuity`.
