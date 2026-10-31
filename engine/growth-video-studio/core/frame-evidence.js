/**
 * GEEHUB frame evidence layer.
 *
 * Stores measured frame observations separately from artistic growth intent.
 * A renderer can consume these records without treating estimates as facts.
 */

export const EVIDENCE_VERSION = 1;

export const LANDMARK_GROUPS = Object.freeze({
  identity: ["leftEye", "rightEye", "nose", "chin"],
  torso: ["leftShoulder", "rightShoulder", "sternum", "navel", "pelvis"],
  leftArm: ["leftElbow", "leftWrist"],
  rightArm: ["rightElbow", "rightWrist"],
  leftLeg: ["leftHip", "leftKnee", "leftAnkle"],
  rightLeg: ["rightHip", "rightKnee", "rightAnkle"],
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function createFrameEvidence({
  frame,
  time,
  landmarks = {},
  identityConfidence = 0,
  poseConfidence = 0,
  segmentation = null,
  camera = null,
  sceneAnchors = [],
  source = "manual",
}) {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new TypeError("frame must be a non-negative integer");
  }
  if (!Number.isFinite(time) || time < 0) {
    throw new TypeError("time must be a non-negative number");
  }

  const normalizedLandmarks = {};
  for (const [name, point] of Object.entries(landmarks)) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    normalizedLandmarks[name] = {
      x: point.x,
      y: point.y,
      confidence: clamp01(Number(point.confidence ?? 1)),
    };
  }

  return Object.freeze({
    version: EVIDENCE_VERSION,
    frame,
    time,
    source,
    identityConfidence: clamp01(identityConfidence),
    poseConfidence: clamp01(poseConfidence),
    landmarks: normalizedLandmarks,
    segmentation,
    camera,
    sceneAnchors: [...sceneAnchors],
  });
}

export function interpolateLandmarks(from, to, amount) {
  const t = clamp01(amount);
  const names = new Set([
    ...Object.keys(from?.landmarks ?? {}),
    ...Object.keys(to?.landmarks ?? {}),
  ]);
  const result = {};

  for (const name of names) {
    const a = from?.landmarks?.[name];
    const b = to?.landmarks?.[name];
    if (!a || !b) {
      result[name] = a ?? b;
      continue;
    }
    result[name] = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      confidence: Math.min(a.confidence, b.confidence),
    };
  }
  return result;
}

export function validateFrameSequence(frames, {
  maxLandmarkStep = 0.12,
  minIdentityConfidence = 0.65,
  requireIdentityAnchors = true,
} = {}) {
  const issues = [];
  const ordered = [...frames].sort((a, b) => a.frame - b.frame);

  for (let i = 0; i < ordered.length; i += 1) {
    const current = ordered[i];
    if (i > 0 && current.frame === ordered[i - 1].frame) {
      issues.push({ frame: current.frame, code: "duplicate-frame" });
    }
    if (current.identityConfidence < minIdentityConfidence) {
      issues.push({ frame: current.frame, code: "identity-confidence-low" });
    }
    if (requireIdentityAnchors) {
      for (const name of LANDMARK_GROUPS.identity) {
        if (!current.landmarks?.[name]) {
          issues.push({ frame: current.frame, code: "identity-anchor-missing", landmark: name });
        }
      }
    }

    const previous = ordered[i - 1];
    if (!previous) continue;
    for (const [name, point] of Object.entries(current.landmarks ?? {})) {
      const prior = previous.landmarks?.[name];
      if (!prior) continue;
      const distance = Math.hypot(point.x - prior.x, point.y - prior.y);
      if (distance > maxLandmarkStep) {
        issues.push({
          frame: current.frame,
          code: "landmark-discontinuity",
          landmark: name,
          distance,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    frameCount: ordered.length,
    issues,
  };
}

export function createRenderEvidenceManifest({
  source,
  width,
  height,
  fps,
  frames = [],
  growthCurve = [],
  policies = {},
}) {
  if (!source) throw new TypeError("source asset is required");
  if (!(width > 0) || !(height > 0) || !(fps > 0)) {
    throw new TypeError("positive width, height, and fps are required");
  }

  const validation = validateFrameSequence(frames, policies.validation);
  return {
    schema: "geehub.growth-evidence",
    version: EVIDENCE_VERSION,
    source,
    format: { width, height, fps },
    continuity: validation,
    evidence: frames,
    growthCurve,
    policies: {
      preserveIdentity: true,
      preserveSourceMotion: true,
      preserveCameraUnlessDirected: true,
      cumulativeGrowth: true,
      deformClothingAndEnvironment: true,
      ...policies,
    },
    renderReady: validation.valid && frames.length > 1 && growthCurve.length > 0,
  };
}
