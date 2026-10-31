/**
 * GEEHUB Growth Video Studio — deterministic growth-state core.
 * This module describes body-state targets; it does not deform pixels or meshes.
 */
export const REGIONS = Object.freeze([
  "stature", "torsoLength", "shoulderSpan", "chestDepth",
  "armLength", "armMass", "thighLength", "thighMass", "calfMass"
]);

export const BASELINE = Object.freeze({
  stature: 1, torsoLength: 1, shoulderSpan: 1, chestDepth: 1,
  armLength: 1, armMass: 1, thighLength: 1, thighMass: 1, calfMass: 1
});

const clamp01 = value => Math.max(0, Math.min(1, value));
const smoothstep = t => { const x = clamp01(t); return x * x * (3 - 2 * x); };

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a finite positive number`);
  return value;
}

export function createGrowthState(input = {}, metadata = {}) {
  const body = {};
  for (const region of REGIONS) body[region] = finitePositive(input[region] ?? BASELINE[region], region);
  return Object.freeze({
    id: metadata.id ?? cryptoSafeId(),
    parentId: metadata.parentId ?? null,
    createdAt: metadata.createdAt ?? new Date().toISOString(),
    body: Object.freeze(body),
    identityLock: Object.freeze({
      face: true, facialLandmarks: true, expression: true, sourceMotion: true,
      ...(metadata.identityLock ?? {})
    }),
    note: metadata.note ?? ""
  });
}

function cryptoSafeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `growth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Targets are absolute multipliers relative to the original baseline. */
export function createChildState(parent, targets, metadata = {}) {
  if (!parent?.body) throw new TypeError("A parent growth state is required");
  const body = { ...parent.body, ...targets };
  for (const region of REGIONS) {
    finitePositive(body[region], region);
    if (body[region] + 1e-9 < parent.body[region]) throw new RangeError(`${region} cannot regress below its parent state`);
  }

  // Height increases require corresponding limb and torso length increases.
  if (body.armLength + 1e-9 < body.stature) throw new RangeError("Arm length must keep pace with stature");
  if (body.thighLength + 1e-9 < body.stature) throw new RangeError("Thigh length must keep pace with stature");
  if (body.torsoLength + 1e-9 < body.stature * 0.9) throw new RangeError("Torso length is inconsistent with stature");

  return createGrowthState(body, { ...metadata, parentId: parent.id });
}

export function interpolateGrowth(from, to, t, easing = smoothstep) {
  if (!from?.body || !to?.body) throw new TypeError("Two growth states are required");
  const phase = clamp01(t), e = easing(phase), body = {};
  for (const region of REGIONS) body[region] = from.body[region] + (to.body[region] - from.body[region]) * e;
  return Object.freeze({ phase, easedPhase: e, body: Object.freeze(body), identityLock: to.identityLock });
}

export function sampleGrowthTimeline(states, timeSeconds, durationSeconds) {
  if (!Array.isArray(states) || states.length < 2) throw new TypeError("Timeline requires at least two approved states");
  if (!(durationSeconds > 0) || !Number.isFinite(timeSeconds)) throw new TypeError("A positive duration and finite time are required");
  const position = clamp01(timeSeconds / durationSeconds) * (states.length - 1);
  const index = Math.min(states.length - 2, Math.floor(position));
  return interpolateGrowth(states[index], states[index + 1], position - index);
}

export function validateGrowthSequence(states) {
  const errors = [];
  if (!Array.isArray(states) || states.length < 2) return { valid: false, errors: ["At least two states are required"] };
  states.forEach((state, index) => {
    if (!state?.body) { errors.push(`State ${index} has no body model`); return; }
    for (const region of REGIONS) {
      if (!Number.isFinite(state.body[region]) || state.body[region] <= 0) errors.push(`State ${index}: invalid ${region}`);
      if (index > 0 && state.body[region] + 1e-9 < states[index - 1].body[region]) errors.push(`State ${index}: ${region} regresses`);
    }
    if (!state.identityLock?.face || !state.identityLock?.facialLandmarks) errors.push(`State ${index}: identity lock is not complete`);
  });
  return { valid: errors.length === 0, errors };
}
