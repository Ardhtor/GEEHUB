/**
 * Convert a locally verified frame sequence into typed media-bridge inputs.
 * The returned sidecar documents must be written to their URIs before staging.
 * Binary mask pixels and body/face disjointness are verified by frame-sequence-worker.
 * The upstream model's anatomical segmentation accuracy remains unverified.
 */
import { createHash } from "node:crypto";
import { addBridgeFrameSet, validateBridgeManifest } from "./bridge-manifest.js";
import { validateFrameSequencePackage } from "./frame-sequence.js";

const PREFIX = "dropbox://GEEHUB/";
const isText = value => typeof value === "string" && value.trim().length > 0;
const digest = value => createHash("sha256").update(value, "utf8").digest("hex");

function safeDropboxUri(uri) {
  if (!isText(uri) || !uri.startsWith(PREFIX)) return false;
  const relative = uri.slice(PREFIX.length);
  return relative.split("/").every(segment =>
    segment && segment !== "." && segment !== ".." &&
    !segment.includes("\\") && !segment.includes("%") &&
    !segment.includes(":") && !segment.includes("\0")
  );
}

function sidecar(document) {
  const content = JSON.stringify(document, null, 2) + "\n";
  return { content, checksum: digest(content) };
}

function sameFormat(a, b) {
  return a.width === b.width && a.height === b.height && a.fps === b.fps;
}

/**
 * Prepare immutable segmentation and landmark frame sets from a successful
 * inspectFrameSequenceFiles() result. No manifest or sidecar is written here.
 */
export function prepareFrameSequenceBridgeInputs(
  manifest,
  sequence,
  audit,
  { segmentationUri, landmarksUri } = {}
) {
  const manifestCheck = validateBridgeManifest(manifest);
  if (!manifestCheck.valid) {
    throw new TypeError("Invalid bridge manifest: " + manifestCheck.errors.join("; "));
  }
  const sequenceCheck = validateFrameSequencePackage(sequence);
  if (!sequenceCheck.valid || !sequenceCheck.structurallyReady) {
    throw new TypeError("Frame sequence is not structurally ready for bridge registration");
  }
  if (sequence.source?.immutable !== true ||
      sequence.source.id !== manifest.source.id ||
      sequence.source.name !== manifest.source.name ||
      sequence.source.uri !== manifest.source.uri ||
      sequence.source.width !== manifest.source.width ||
      sequence.source.height !== manifest.source.height ||
      Math.abs(sequence.source.duration - manifest.source.duration) > 0.000001 ||
      (sequence.source.checksum && manifest.source.checksum &&
       sequence.source.checksum.toLowerCase() !== manifest.source.checksum.toLowerCase())) {
    throw new Error("Frame sequence does not match the immutable bridge source");
  }
  if (audit?.schema !== "geehub.frame-sequence-audit.v1" ||
      audit.status !== "ready-for-geometry" || audit.readyForGeometry !== true ||
      audit.sequenceId !== sequence.id || audit.sourceAssetId !== manifest.source.id ||
      audit.pixelSemanticsVerified !== false ||
      audit.pixelDataVerified !== true || audit.faceExclusionVerified !== true ||
      audit.maskPixelAudit?.encoding !== "png/grayscale8/binary" ||
      audit.maskPixelAudit?.pairsChecked !== sequence.frames.length ||
      audit.maskPixelAudit?.disjointPairs !== sequence.frames.length ||
      audit.maskPixelAudit?.overlapPixels !== 0 ||
      audit.errors?.length !== 0) {
    throw new Error("A successful, source-matched frame-sequence file audit is required");
  }
  if (!sameFormat(audit.format || {}, sequence.format || {}) ||
      audit.frameCount !== sequence.format.frameCount ||
      audit.validation?.valid !== true ||
      audit.validation?.structurallyReady !== true ||
      audit.validation?.pixelSemanticsVerified !== false ||
      audit.validation?.firstFrame !== sequenceCheck.firstFrame ||
      audit.validation?.lastFrame !== sequenceCheck.lastFrame) {
    throw new Error("Frame-sequence audit does not describe the supplied sequence");
  }

  const expectedMaskCount = sequence.frames.length * 2;
  const maskAudit = audit.fileVerification;
  if (!maskAudit || maskAudit.checked !== expectedMaskCount ||
      maskAudit.verified !== expectedMaskCount ||
      !Array.isArray(maskAudit.masks) || maskAudit.masks.length !== expectedMaskCount) {
    throw new Error("Every body and face mask must pass file verification");
  }

  const expected = new Map();
  for (const frame of sequence.frames) {
    for (const role of ["body", "face"]) {
      const mask = frame.segmentation?.[role + "Mask"];
      if (!mask) throw new Error("Missing " + role + " mask in frame " + frame.frame);
      expected.set(frame.frame + ":" + role, mask);
    }
  }
  const seen = new Set();
  for (const verified of maskAudit.masks) {
    const key = verified.frame + ":" + verified.role;
    const descriptor = expected.get(key);
    if (!descriptor || seen.has(key) || verified.uri !== descriptor.uri ||
        verified.checksum !== descriptor.checksum.toLowerCase() ||
        verified.width !== sequence.format.width ||
        verified.height !== sequence.format.height) {
      throw new Error("Verified mask audit does not match the sequence descriptor: " + key);
    }
    seen.add(key);
  }
  if (seen.size !== expectedMaskCount) throw new Error("Frame-sequence mask audit is incomplete");
  if (maskAudit.masks.some(mask => mask.encoding !== "png/grayscale8/binary" ||
      !Number.isInteger(mask.foregroundPixels) || mask.foregroundPixels < 1)) {
    throw new Error("Every mask must have decoded, non-empty binary pixel evidence");
  }

  if (!safeDropboxUri(segmentationUri) || !safeDropboxUri(landmarksUri) ||
      segmentationUri === landmarksUri) {
    throw new TypeError("Distinct safe Dropbox URIs are required for segmentation and landmark sidecars");
  }

  const range = {
    firstFrame: sequenceCheck.firstFrame,
    lastFrame: sequenceCheck.lastFrame,
    frameCount: sequence.format.frameCount,
    width: sequence.format.width,
    height: sequence.format.height,
    fps: sequence.format.fps
  };
  const segmentationDocument = {
    schema: "geehub.frame-set-evidence",
    schemaVersion: 1,
    role: "segmentation",
    sequenceId: sequence.id,
    sourceAssetId: sequence.source.id,
    ...range,
    pixelSemanticsVerified: false,
    maskPixelAudit: {
      encoding: audit.maskPixelAudit.encoding,
      pixelDataVerified: audit.pixelDataVerified,
      faceExclusionVerified: audit.faceExclusionVerified,
      pairsChecked: audit.maskPixelAudit.pairsChecked,
      disjointPairs: audit.maskPixelAudit.disjointPairs,
      overlapPixels: audit.maskPixelAudit.overlapPixels,
      frames: structuredClone(audit.maskPixelAudit.frames)
    },
    frames: sequence.frames.map(frame => ({
      frame: frame.frame,
      timeSeconds: frame.timeSeconds,
      model: frame.segmentation.model,
      confidence: frame.segmentation.confidence,
      bodyMask: {
        uri: frame.segmentation.bodyMask.uri,
        checksum: frame.segmentation.bodyMask.checksum.toLowerCase(),
        excludesFace: frame.segmentation.bodyMask.excludesFace === true
      },
      faceMask: {
        uri: frame.segmentation.faceMask.uri,
        checksum: frame.segmentation.faceMask.checksum.toLowerCase(),
        protectsIdentity: frame.segmentation.faceMask.protectsIdentity === true
      }
    }))
  };
  const landmarkDocument = {
    schema: "geehub.frame-set-evidence",
    schemaVersion: 1,
    role: "landmarks",
    sequenceId: sequence.id,
    sourceAssetId: sequence.source.id,
    ...range,
    frames: sequence.frames.map(frame => ({
      frame: frame.frame,
      timeSeconds: frame.timeSeconds,
      identityConfidence: frame.identityConfidence,
      poseConfidence: frame.poseConfidence,
      landmarks: structuredClone(frame.landmarks)
    }))
  };

  const segmentationSidecar = sidecar(segmentationDocument);
  const landmarkSidecar = sidecar(landmarkDocument);
  const metadata = {
    sequenceId: sequence.id,
    evidenceSchema: "geehub.frame-set-evidence.v1",
    auditSchema: audit.schema,
    pixelSemanticsVerified: false
  };

  let next = addBridgeFrameSet(manifest, {
    id: "frame-sequence-" + sequence.id + "-segmentation",
    role: "segmentation",
    uri: segmentationUri,
    ...range,
    checksum: segmentationSidecar.checksum,
    metadata: { ...metadata, verifiedMaskCount: expectedMaskCount }
  });
  next = addBridgeFrameSet(next, {
    id: "frame-sequence-" + sequence.id + "-landmarks",
    role: "landmarks",
    uri: landmarksUri,
    ...range,
    checksum: landmarkSidecar.checksum,
    metadata: { ...metadata, verifiedFrameCount: sequence.frames.length }
  });

  return {
    manifest: next,
    frameSetIds: next.frameSets.slice(-2).map(item => item.id),
    documents: [
      { role: "segmentation", uri: segmentationUri, checksum: segmentationSidecar.checksum, content: segmentationSidecar.content },
      { role: "landmarks", uri: landmarksUri, checksum: landmarkSidecar.checksum, content: landmarkSidecar.content }
    ],
    pixelSemanticsVerified: false
  };
}
