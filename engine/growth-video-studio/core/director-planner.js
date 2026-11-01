/**
 * Semantic command interpreter and plan compiler.
 * This is a deterministic starter parser, designed to be replaced or
 * augmented by a connected multimodal language model. It never claims that
 * a missing renderer or generative model has executed an effect.
 */
import { CAPABILITY_GROUPS, createCapabilityReport } from "./capability-registry.js";

const id = prefix => prefix + "-" + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
const includesAny = (text, words) => words.some(word => text.includes(word));
const unique = values => [...new Set(values)];

export function interpretCreativeDirection(instruction) {
  const text = String(instruction ?? "").trim();
  if (!text) throw new TypeError("Give the director an instruction.");
  const lower = text.toLowerCase();
  const actions = [];
  const capabilities = new Set(["video-metadata", "frame-extraction"]);
  const constraints = ["preserve-source", "preserve-subject-identity", "preserve-source-motion", "preserve-audio-unless-directed"];
  const semantic = {};
  const requested = [];
  const add = (action, needs, detail = {}) => {
    actions.push({ id: id("intent"), action, detail });
    needs.forEach(capability => capabilities.add(capability));
  };

  if (includesAny(lower, ["taller", "height", "stature", "longer legs", "longer limbs"])) {
    semantic.stature = "increase";
    semantic.limbLength = "increase";
    add("transform-subject-proportions", ["person-segmentation", "body-landmarks", "identity-preserving-video-edit", "mesh-deformation"]);
  }
  if (includesAny(lower, ["heavier", "bigger", "mass", "muscular", "muscle", "thicker", "grow", "growth"])) {
    semantic.muscularMass = "increase";
    add("progressive-physique-growth", ["person-segmentation", "face-tracking", "body-landmarks", "identity-preserving-video-edit", "mesh-deformation"]);
  }
  if (includesAny(lower, ["face", "identity", "recognizable", "same person"])) constraints.push("face-lock");
  if (includesAny(lower, ["clothes", "clothing", "fabric", "shirt", "shorts"])) {
    add("construct-clothing-response", ["person-segmentation", "garment-simulation", "compositing"]);
  }
  if (includesAny(lower, ["room", "environment", "wall", "floor", "roof", "break", "react", "surroundings"])) {
    add("construct-environment-response", ["scene-detection", "depth-estimation", "environment-reaction", "compositing"]);
  }
  if (includesAny(lower, ["camera", "angle", "perspective", "reframe", "zoom"])) add("direct-camera", ["camera-tracking", "compositing"]);
  if (includesAny(lower, ["light", "lighting", "shadow", "atmosphere"])) add("adjust-light-and-atmosphere", ["relighting", "compositing"]);
  if (includesAny(lower, ["sound", "music", "audio", "impact"])) add("construct-sound-design", ["audio-analysis", "audio-edit"]);
  if (includesAny(lower, ["cut", "edit", "rearrange", "pace", "transition", "sequence"])) add("reshape-edit", ["timeline-edit", "retiming", "transitions"]);
  if (includesAny(lower, ["create", "build", "make", "generate", "asset", "mesh", "prop", "object", "scene"])) {
    add("construct-new-visual-assets", ["image-generation", "video-generation", "mesh-generation", "material-generation", "environment-generation"]);
  }
  if (includesAny(lower, ["finished", "export", "render", "video"])) add("render-and-export", ["video-render", "mp4-export"]);
  if (!actions.length) add("interpret-and-stage-edit", ["scene-detection", "timeline-edit"]);
  const all = Object.values(CAPABILITY_GROUPS).flat();
  return {
    id: id("direction"), sourceText: text, createdAt: new Date().toISOString(),
    semantic, actions, constraints: unique(constraints),
    requiredCapabilities: [...capabilities].filter(name => all.includes(name)),
    requestedOutputs: requested
  };
}

export function compileDirectorPlan(direction, registry) {
  const report = createCapabilityReport(registry, direction.requiredCapabilities);
  const steps = direction.actions.map(action => {
    const needs = Object.entries(action.detail);
    return {
      id: id("step"), intentAction: action.action,
      status: "ready",
      note: "Prepared for connected execution; no media has been changed yet."
    };
  });
  const missingByAction = direction.actions.map(action => {
    const mapping = {
      "transform-subject-proportions": ["person-segmentation", "body-landmarks", "identity-preserving-video-edit", "mesh-deformation"],
      "progressive-physique-growth": ["person-segmentation", "face-tracking", "body-landmarks", "identity-preserving-video-edit", "mesh-deformation"],
      "construct-clothing-response": ["person-segmentation", "garment-simulation", "compositing"],
      "construct-environment-response": ["scene-detection", "depth-estimation", "environment-reaction", "compositing"],
      "direct-camera": ["camera-tracking", "compositing"],
      "adjust-light-and-atmosphere": ["relighting", "compositing"],
      "construct-sound-design": ["audio-analysis", "audio-edit"],
      "reshape-edit": ["timeline-edit", "retiming", "transitions"],
      "construct-new-visual-assets": ["image-generation", "video-generation", "mesh-generation", "material-generation", "environment-generation"],
      "render-and-export": ["video-render", "mp4-export"],
      "interpret-and-stage-edit": ["scene-detection", "timeline-edit"]
    };
    return { action: action.action, missing: (mapping[action.action] ?? []).filter(capability => !registry.has(capability)) };
  }).filter(item => item.missing.length);
  return {
    schema: "geehub.director-plan.v1", direction, capabilityReport: report,
    steps, missingByAction,
    status: report.missing.length ? "blocked-by-capabilities" : "ready-to-execute",
    canExecute: report.missing.length === 0,
    safety: { sourceImmutable: true, destructiveOperations: false, previewFirst: true }
  };
}
