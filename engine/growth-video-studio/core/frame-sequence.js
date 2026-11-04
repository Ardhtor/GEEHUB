/**
 * Frame-sequence intake contract for GEEHUB growth video.
 *
 * This validates model-produced segmentation and landmark metadata without
 * pretending to run a segmentation model or inspect mask pixels. The local
 * worker separately verifies each referenced PNG's bytes and dimensions.
 */
import { validateFrameSequence as validateEvidenceContinuity } from "./frame-evidence.js";
import { REQUIRED_ANCHORS, validateLandmarkTrack } from "./landmark-track.js";

export const FRAME_SEQUENCE_SCHEMA = "geehub.frame-sequence";
export const FRAME_SEQUENCE_VERSION = 1;

const IDENTITY_ANCHORS = Object.freeze(["leftEye", "rightEye", "nose", "chin"]);
const ALL_REQUIRED_ANCHORS = Object.freeze([...new Set([...REQUIRED_ANCHORS, ...IDENTITY_ANCHORS])]);
const DROPBOX_PREFIX = "dropbox://GEEHUB/";
const isText = value => typeof value === "string" && value.trim().length > 0;
const isPositiveInt = value => Number.isInteger(value) && value > 0;
const isUnit = value => Number.isFinite(value) && value >= 0 && value <= 1;
const isSha256 = value => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

function safeDropboxUri(uri) {
  if (!isText(uri) || !uri.startsWith(DROPBOX_PREFIX)) return false;
  const relative = uri.slice(DROPBOX_PREFIX.length);
  const segments = relative.split("/");
  return segments.length > 0 && segments.every(segment =>
    segment && segment !== "." && segment !== ".." &&
    !segment.includes("\\") && !segment.includes("%") &&
    !segment.includes(":") && !segment.includes("\0")
  );
}

function validateMask(mask, role, format, frame, errors, warnings, seenUris) {
  if (!mask) {
    warnings.push({ frame, code: "mask-pending", role });
    return false;
  }
  let valid = true;
  const add = (code, detail = {}) => {
    errors.push({ frame, code, role, ...detail });
    valid = false;
  };
  if (mask.role !== role) add("mask-role-mismatch", { expected: role, actual: mask.role });
  if (!safeDropboxUri(mask.uri)) add("mask-uri-unsafe-or-unsupported");
  else {
    if (seenUris.has(mask.uri)) add("mask-uri-reused", { uri: mask.uri });
    seenUris.add(mask.uri);
  }
  if (mask.width !== format.width || mask.height !== format.height) {
    add("mask-dimensions-mismatch", { width: mask.width, height: mask.height });
  }
  if (!isSha256(mask.checksum)) add("mask-checksum-missing-or-invalid");
  if (role === "body" && mask.excludesFace !== true) {
    add("body-mask-must-declare-face-exclusion");
  }
  if (role === "face" && mask.protectsIdentity !== true) {
    add("face-mask-must-declare-identity-protection");
  }
  return valid;
}

/** Validate a complete sequence envelope before any frame worker consumes it. */
export function validateFrameSequencePackage(sequence, policies = {}) {
  const errors = [];
  const warnings = [];
  const add = (code, detail = {}) => errors.push({ code, ...detail });

  if (sequence?.schema !== FRAME_SEQUENCE_SCHEMA) add("unsupported-schema");
  if (sequence?.schemaVersion !== FRAME_SEQUENCE_VERSION) add("unsupported-schema-version");
  if (!isText(sequence?.id)) add("sequence-id-missing");

  const source = sequence?.source;
  const format = sequence?.format;
  const firstFrame = sequence?.firstFrame ?? 0;
  const startTimeSeconds = sequence?.startTimeSeconds ?? 0;
  if (!isText(source?.id) || !isText(source?.name) || !safeDropboxUri(source?.uri)) {
    add("source-reference-incomplete-or-unsafe");
  }
  if (source?.immutable !== true) add("source-must-be-immutable");
  if (source?.checksum !== undefined && !isSha256(source.checksum)) add("source-checksum-invalid");
  if (!isPositiveInt(source?.width) || !isPositiveInt(source?.height) ||
      !Number.isFinite(source?.duration) || source.duration <= 0) {
    add("source-format-incomplete");
  }
  if (!isPositiveInt(format?.width) || !isPositiveInt(format?.height) ||
      !Number.isFinite(format?.fps) || format.fps <= 0 ||
      !isPositiveInt(format?.frameCount)) {
    add("sequence-format-incomplete");
  }
  if (format && source && (format.width !== source.width || format.height !== source.height)) {
    add("sequence-format-does-not-match-source");
  }
  if (!Number.isInteger(firstFrame) || firstFrame < 0) add("first-frame-invalid");
  if (!Number.isFinite(startTimeSeconds) || startTimeSeconds < 0) add("start-time-invalid");

  const frames = Array.isArray(sequence?.frames) ? sequence.frames : [];
  if (!Array.isArray(sequence?.frames)) add("frames-must-be-an-array");
  if (frames.length < 2) add("at-least-two-frames-required");
  if (isPositiveInt(format?.frameCount) && frames.length !== format.frameCount) {
    add("frame-count-does-not-match-format", { expected: format.frameCount, actual: frames.length });
  }

  const seenMaskUris = new Set(source?.uri ? [source.uri] : []);
  let completeMaskPairs = 0;
  const trackFrames = [];
  const continuityFrames = [];
  const fps = Number.isFinite(format?.fps) && format.fps > 0 ? format.fps : 24;
  const timeTolerance = policies.timeToleranceSeconds ?? Math.max(0.0001, 0.25 / fps);
  const minIdentityConfidence = policies.minIdentityConfidence ?? 0.65;
  const minPoseConfidence = policies.minPoseConfidence ?? 0.5;
  const minSegmentationConfidence = policies.minSegmentationConfidence ?? 0.65;

  frames.forEach((frame, index) => {
    const expectedFrame = firstFrame + index;
    const expectedTime = startTimeSeconds + index / fps;
    if (!Number.isInteger(frame?.frame) || frame.frame !== expectedFrame) {
      add("frame-order-or-gap", { index, expected: expectedFrame, actual: frame?.frame });
    }
    if (!Number.isFinite(frame?.timeSeconds) || Math.abs(frame.timeSeconds - expectedTime) > timeTolerance) {
      add("frame-timestamp-mismatch", { frame: frame?.frame, expected: expectedTime, actual: frame?.timeSeconds });
    }
    if (frame?.sourceAssetId !== source?.id) add("frame-source-mismatch", { frame: frame?.frame });
    if (frame?.width !== format?.width || frame?.height !== format?.height) {
      add("frame-dimensions-mismatch", { frame: frame?.frame, width: frame?.width, height: frame?.height });
    }
    if (!isUnit(frame?.identityConfidence) || frame.identityConfidence < minIdentityConfidence) {
      add("identity-confidence-below-threshold", { frame: frame?.frame, value: frame?.identityConfidence });
    }
    if (!isUnit(frame?.poseConfidence) || frame.poseConfidence < minPoseConfidence) {
      add("pose-confidence-below-threshold", { frame: frame?.frame, value: frame?.poseConfidence });
    }

    const landmarks = frame?.landmarks;
    for (const name of ALL_REQUIRED_ANCHORS) {
      const point = landmarks?.[name];
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
          point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1 ||
          !isUnit(point.confidence)) {
        add("required-landmark-invalid", { frame: frame?.frame, landmark: name });
      }
    }
    if (Number.isFinite(frame?.timeSeconds) && landmarks) {
      trackFrames.push({ timeSeconds: frame.timeSeconds, landmarks });
      continuityFrames.push({
        frame: frame.frame,
        time: frame.timeSeconds,
        landmarks,
        identityConfidence: frame.identityConfidence
      });
    }

    const segmentation = frame?.segmentation;
    if (!segmentation) {
      warnings.push({ frame: frame?.frame, code: "segmentation-pending" });
      return;
    }
    if (segmentation.sourceAssetId !== source?.id || segmentation.frame !== frame?.frame ||
        segmentation.width !== format?.width || segmentation.height !== format?.height) {
      add("segmentation-lineage-or-format-mismatch", { frame: frame?.frame });
    }
    if (!isText(segmentation.model)) add("segmentation-model-missing", { frame: frame?.frame });
    if (!isUnit(segmentation.confidence)) {
      add("segmentation-confidence-invalid", { frame: frame?.frame });
    } else if (segmentation.confidence < minSegmentationConfidence) {
      warnings.push({ frame: frame?.frame, code: "segmentation-confidence-low", value: segmentation.confidence });
    }
    const bodyValid = validateMask(segmentation.bodyMask, "body", format || {}, frame?.frame, errors, warnings, seenMaskUris);
    const faceValid = validateMask(segmentation.faceMask, "face", format || {}, frame?.frame, errors, warnings, seenMaskUris);
    if (bodyValid && faceValid) completeMaskPairs += 1;
  });

  if (trackFrames.length === frames.length && frames.length >= 2 && Number.isFinite(fps)) {
    const tracking = validateLandmarkTrack(trackFrames, {
      maxGapSeconds: policies.maxGapSeconds ?? 1.5 / fps,
      minConfidence: policies.minLandmarkConfidence ?? 0.55
    });
    tracking.errors.forEach(message => add("landmark-track-invalid", { detail: message }));
  } else if (frames.length >= 2) {
    add("landmark-track-incomplete");
  }

  if (continuityFrames.length === frames.length && frames.length >= 2) {
    const continuity = validateEvidenceContinuity(continuityFrames, {
      maxLandmarkStep: policies.maxLandmarkStep ?? 0.12,
      minIdentityConfidence,
      requireIdentityAnchors: true
    });
    continuity.issues.forEach(issue => add("temporal-continuity-failed", { issue }));
  }

  const valid = errors.length === 0;
  const structurallyReady = valid && warnings.length === 0 && completeMaskPairs === frames.length;
  return {
    schema: "geehub.frame-sequence-validation.v1",
    valid,
    structurallyReady,
    frameCount: frames.length,
    firstFrame,
    lastFrame: frames.length ? frames[frames.length - 1]?.frame ?? null : null,
    sourceAssetId: source?.id ?? null,
    completeMaskPairs,
    expectedMaskPairs: frames.length,
    errors,
    warnings,
    pixelSemanticsVerified: false
  };
}
