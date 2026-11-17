/**
 * Build one source-timestamped deformation plan for every frame in a registered
 * sequence. The growth timeline is sampled in source-clip time, not frame index,
 * so trimmed or irregularly timed evidence does not compress the growth interval.
 */
import { sampleGrowthTimeline, validateGrowthSequence } from "./growth-state.js";
import { buildGrowthDeformationSequence } from "./mesh-deformation.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

/**
 * Prepare a deterministic plan sequence from the exact mask-derived mesh,
 * tracked landmarks, protected-face masks, and approved cumulative growth states.
 *
 * Frame timestamps are source-clip-relative seconds and must lie within the
 * immutable source duration. Every output plan retains the mesh's fixed topology.
 */
export function prepareGrowthDeformationSequence({
  maskMesh,
  landmarkFrames,
  protectedFaceMasks,
  growthStates,
  sourceDurationSeconds,
  epsilonPixels = 2,
  temporalLimits = {}
} = {}) {
  if (maskMesh?.schema !== "geehub.mask-mesh" || maskMesh.status !== "ready" ||
      maskMesh.topologyStable !== true || maskMesh.connected !== true ||
      !Array.isArray(maskMesh.frames) || maskMesh.frames.length < 2) {
    fail("render-plan-mask-mesh-not-ready", "A ready connected fixed-topology mask mesh is required");
  }
  const count = maskMesh.frames.length;
  if (!Array.isArray(landmarkFrames) || landmarkFrames.length !== count ||
      !Array.isArray(protectedFaceMasks) || protectedFaceMasks.length !== count) {
    fail("render-plan-evidence-incomplete", "Landmarks and protected-face masks must cover every mesh frame");
  }
  if (!Number.isFinite(sourceDurationSeconds) || sourceDurationSeconds <= 0) {
    fail("render-plan-source-duration-invalid", "The immutable source duration must be finite and positive");
  }
  const growth = validateGrowthSequence(growthStates);
  if (!growth.valid) {
    fail("render-plan-growth-sequence-invalid", growth.errors.join("; "));
  }
  if (growthStates.some(state => typeof state.id !== "string" || !state.id.trim())) {
    fail("render-plan-growth-state-id-missing", "Every approved growth state requires a stable id");
  }

  const firstFrame = maskMesh.frames[0];
  const lastFrame = maskMesh.frames[count - 1];
  if (!Number.isInteger(firstFrame?.frame) || !Number.isInteger(lastFrame?.frame) ||
      !Number.isFinite(firstFrame?.timeSeconds) || !Number.isFinite(lastFrame?.timeSeconds) ||
      lastFrame.timeSeconds <= firstFrame.timeSeconds) {
    fail("render-plan-frame-range-invalid", "The mesh must have an ordered source-time range");
  }

  maskMesh.frames.forEach((frame, index) => {
    const landmark = landmarkFrames[index];
    const faceMask = protectedFaceMasks[index];
    if (!Number.isInteger(frame.frame) || !Number.isFinite(frame.timeSeconds) ||
        frame.timeSeconds < 0 || frame.timeSeconds > sourceDurationSeconds + 1e-6) {
      fail("render-plan-source-time-outside-duration", "Frame " + frame.frame + " lies outside the immutable source duration");
    }
    if (landmark?.frame !== frame.frame || !Number.isFinite(landmark?.timeSeconds) ||
        Math.abs(landmark.timeSeconds - frame.timeSeconds) > 1e-6) {
      fail("render-plan-landmark-frame-mismatch", "Landmarks do not match mesh frame " + frame.frame);
    }
    if (faceMask?.frame !== frame.frame) {
      fail("render-plan-face-mask-frame-mismatch", "Protected-face mask does not match mesh frame " + frame.frame);
    }
  });

  const targetBodies = maskMesh.frames.map(frame =>
    sampleGrowthTimeline(growthStates, Math.min(frame.timeSeconds, sourceDurationSeconds), sourceDurationSeconds)
  );
  const sequence = buildGrowthDeformationSequence({
    maskMesh,
    landmarkFrames,
    baselineBody: growthStates[0],
    targetBodies,
    protectedFaceMasks,
    epsilonPixels,
    temporalLimits
  });

  return {
    schema: "geehub.render-plan-sequence",
    schemaVersion: 1,
    status: sequence.status,
    renderable: sequence.renderable,
    topologyId: sequence.topologyId,
    frameCount: sequence.frameCount,
    firstFrame: firstFrame.frame,
    lastFrame: lastFrame.frame,
    sourceDurationSeconds,
    growthStateIds: growthStates.map(state => state.id),
    temporal: sequence.temporal,
    frames: sequence.frames,
    note: "Growth states are sampled at each source timestamp over the immutable clip duration. Every plan shares the registered mask-mesh topology and is blocked when the sequence fails temporal or geometric validation."
  };
}
