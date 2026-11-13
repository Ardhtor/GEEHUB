/**
 * Prepare a source-linked render job from registered segmentation and landmark
 * sidecars. This creates a queued manifest and a portable job payload; it does
 * not render pixels or claim that mask semantics have been verified.
 */
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { createRenderJob } from "./render-job.js";
import { queueBridgeRenderJob, validateBridgeManifest } from "./bridge-manifest.js";
import { validateFrameSequencePackage } from "./frame-sequence.js";
import { createMaskMeshEvidence } from "./frame-sequence-bridge.js";
import { REQUIRED_ANCHORS } from "./landmark-track.js";

export const RENDER_FRAME_EVIDENCE_SCHEMA = "geehub.render-frame-evidence";
const FRAME_SET_SCHEMA = "geehub.frame-set-evidence";
const RANGE_FIELDS = ["firstFrame", "lastFrame", "frameCount", "width", "height", "fps"];
const IDENTITY_ANCHORS = ["leftEye", "rightEye", "nose", "chin"];
const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex");
const isSha256 = value => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const isDropboxUri = value => {
  if (typeof value !== "string" || !value.startsWith("dropbox://GEEHUB/")) return false;
  const relative = value.slice("dropbox://GEEHUB/".length);
  return relative.split("/").every(part => part && part !== "." && part !== ".." &&
    !part.includes("\\") && !part.includes("%") && !part.includes(":") && !part.includes("\0"));
};

function selectFrameSets(manifest, sequenceId) {
  const matching = manifest.frameSets.filter(item =>
    (!sequenceId || item.metadata?.sequenceId === sequenceId) &&
    ["segmentation", "landmarks", "deformation"].includes(item.role));
  const segmentation = matching.filter(item => item.role === "segmentation");
  const landmarks = matching.filter(item => item.role === "landmarks");
  const deformation = matching.filter(item => item.role === "deformation");
  if (segmentation.length !== 1 || landmarks.length !== 1 || deformation.length !== 1) {
    throw new Error("Select one sequence with exactly one segmentation, landmarks, and deformation frame set");
  }
  const [maskSet] = segmentation;
  const [landmarkSet] = landmarks;
  const [meshSet] = deformation;
  if (!maskSet.metadata?.sequenceId ||
      maskSet.metadata.sequenceId !== landmarkSet.metadata?.sequenceId ||
      maskSet.metadata.sequenceId !== meshSet.metadata?.sequenceId) {
    throw new Error("Segmentation, landmarks, and deformation frame sets must share a sequence id");
  }
  for (const field of RANGE_FIELDS) {
    if (maskSet[field] !== landmarkSet[field] || maskSet[field] !== meshSet[field]) {
      throw new Error("Segmentation, landmarks, and deformation frame sets disagree on " + field);
    }
  }
  if (![maskSet, landmarkSet, meshSet].every(item => isSha256(item.checksum))) {
    throw new Error("Registered frame-set sidecars require SHA-256 checksums");
  }
  if (meshSet.metadata?.evidenceSchema !== "geehub.mask-mesh-evidence.v1" ||
      !isSha256(meshSet.metadata?.topologyId) ||
      !Number.isInteger(meshSet.metadata?.vertexCount) || meshSet.metadata.vertexCount < 1 ||
      !Number.isInteger(meshSet.metadata?.triangleCount) || meshSet.metadata.triangleCount < 1) {
    throw new Error("Registered deformation frame set lacks exact topology metadata");
  }
  return { segmentation: maskSet, landmarks: landmarkSet, deformation: meshSet };
}

function parseSidecar(content, frameSet, role, sourceAssetId) {
  if (typeof content !== "string") throw new TypeError(role + " sidecar text is required");
  if (sha256(content) !== frameSet.checksum.toLowerCase()) {
    throw new Error(role + " sidecar SHA-256 does not match its registered frame set");
  }
  let document;
  try {
    document = JSON.parse(content);
  } catch {
    throw new TypeError(role + " sidecar is not valid JSON");
  }
  if (document?.schema !== FRAME_SET_SCHEMA || document.schemaVersion !== 1 ||
      document.role !== role) {
    throw new TypeError(role + " sidecar schema or role is invalid");
  }
  if (document.sourceAssetId !== sourceAssetId ||
      document.sequenceId !== frameSet.metadata.sequenceId) {
    throw new Error(role + " sidecar has a foreign source or sequence reference");
  }
  for (const field of RANGE_FIELDS) {
    if (document[field] !== frameSet[field]) {
      throw new Error(role + " sidecar disagrees with its manifest on " + field);
    }
  }
  if (!Array.isArray(document.frames) || document.frames.length !== frameSet.frameCount) {
    throw new Error(role + " sidecar frame count does not match its manifest");
  }
  if (role === "segmentation" && document.pixelSemanticsVerified !== false) {
    throw new Error("Segmentation pixel semantics must remain explicitly unverified");
  }
  let previousTime = -Infinity;
  document.frames.forEach((frame, index) => {
    const expectedFrame = frameSet.firstFrame + index;
    if (frame?.frame !== expectedFrame) {
      throw new Error(role + " sidecar frame order is incomplete at frame " + expectedFrame);
    }
    if (!Number.isFinite(frame.timeSeconds) || frame.timeSeconds < 0 ||
        frame.timeSeconds <= previousTime) {
      throw new Error(role + " sidecar timestamps must be finite and strictly increasing");
    }
    previousTime = frame.timeSeconds;
  });
  return document;
}

function parseDeformationSidecar(content, frameSet, sourceAssetId) {
  if (typeof content !== "string") throw new TypeError("deformation sidecar text is required");
  if (sha256(content) !== frameSet.checksum.toLowerCase()) {
    throw new Error("deformation sidecar SHA-256 does not match its registered frame set");
  }
  let document;
  try {
    document = JSON.parse(content);
  } catch {
    throw new TypeError("deformation sidecar is not valid JSON");
  }
  if (document?.schema !== "geehub.mask-mesh-evidence" ||
      document.schemaVersion !== 1 || document.role !== "deformation" ||
      document.sourceAssetId !== sourceAssetId ||
      document.sequenceId !== frameSet.metadata?.sequenceId ||
      document.pixelSemanticsVerified !== false) {
    throw new TypeError("deformation sidecar schema, role, or lineage is invalid");
  }
  for (const field of RANGE_FIELDS) {
    if (document[field] !== frameSet[field]) {
      throw new Error("deformation sidecar disagrees with its manifest on " + field);
    }
  }
  if (!Array.isArray(document.frames) || document.frames.length !== frameSet.frameCount) {
    throw new Error("deformation sidecar frame count does not match its manifest");
  }
  return document;
}

function reconstructExpectedMeshEvidence({
  sequence, maskMesh, manifest, selected, segmentationDocument, landmarkDocument
}) {
  const check = validateFrameSequencePackage(sequence);
  if (!check.valid || !check.structurallyReady) {
    throw new TypeError("Freshly reconstructed frame sequence is not structurally ready");
  }
  const source = sequence.source;
  const registered = selected.segmentation;
  if (sequence.id !== registered.metadata.sequenceId ||
      source?.id !== manifest.source.id || source?.name !== manifest.source.name ||
      source?.uri !== manifest.source.uri || source?.immutable !== true ||
      source?.width !== manifest.source.width || source?.height !== manifest.source.height ||
      Math.abs(source?.duration - manifest.source.duration) > 0.000001) {
    throw new Error("Fresh mesh reconstruction does not match the immutable bridge source");
  }
  if (sequence.format?.width !== registered.width ||
      sequence.format?.height !== registered.height ||
      sequence.format?.fps !== registered.fps ||
      sequence.format?.frameCount !== registered.frameCount ||
      check.firstFrame !== registered.firstFrame ||
      check.lastFrame !== registered.lastFrame) {
    throw new Error("Fresh mesh reconstruction does not match the registered sequence format");
  }
  if (!Array.isArray(sequence.frames) ||
      sequence.frames.length !== segmentationDocument.frames.length ||
      sequence.frames.length !== landmarkDocument.frames.length) {
    throw new Error("Fresh mesh reconstruction does not cover the registered frame range");
  }
  sequence.frames.forEach((frame, index) => {
    const masks = segmentationDocument.frames[index];
    const landmarks = landmarkDocument.frames[index];
    const body = frame.segmentation?.bodyMask;
    const face = frame.segmentation?.faceMask;
    if (frame.frame !== masks.frame || frame.frame !== landmarks.frame ||
        frame.timeSeconds !== masks.timeSeconds || frame.timeSeconds !== landmarks.timeSeconds ||
        frame.sourceAssetId !== manifest.source.id ||
        frame.identityConfidence !== landmarks.identityConfidence ||
        frame.poseConfidence !== landmarks.poseConfidence ||
        !isDeepStrictEqual(frame.landmarks, landmarks.landmarks) ||
        frame.segmentation?.model !== masks.model ||
        frame.segmentation?.confidence !== masks.confidence ||
        body?.uri !== masks.bodyMask?.uri || body?.checksum?.toLowerCase() !== masks.bodyMask?.checksum ||
        body?.excludesFace !== true ||
        face?.uri !== masks.faceMask?.uri || face?.checksum?.toLowerCase() !== masks.faceMask?.checksum ||
        face?.protectsIdentity !== true) {
      throw new Error("Fresh mesh reconstruction inputs differ from registered evidence at frame " + frame.frame);
    }
  });
  return createMaskMeshEvidence(maskMesh, sequence, check);
}

function validateSegmentationFrames(document) {
  for (const frame of document.frames) {
    const body = frame.bodyMask;
    const face = frame.faceMask;
    if (!body || !face || !isDropboxUri(body.uri) || !isDropboxUri(face.uri)) {
      throw new Error("Every segmentation frame needs safe body and face mask references");
    }
    if (!isSha256(body.checksum) || !isSha256(face.checksum)) {
      throw new Error("Every body and face mask needs a SHA-256 checksum");
    }
    if (body.excludesFace !== true || face.protectsIdentity !== true) {
      throw new Error("Body face-exclusion and face identity-protection declarations are required");
    }
  }
}

function validateMaskPixelAudit(audit, frameSet) {
  if (audit === undefined || audit === null) return null;
  if (audit.encoding !== "png/grayscale8/binary" ||
      audit.pixelDataVerified !== true ||
      audit.faceExclusionVerified !== true ||
      audit.pairsChecked !== frameSet.frameCount ||
      audit.disjointPairs !== frameSet.frameCount ||
      audit.overlapPixels !== 0 ||
      !Array.isArray(audit.frames) ||
      audit.frames.length !== frameSet.frameCount) {
    throw new Error("Mask pixel audit is incomplete or reports body/face overlap");
  }
  audit.frames.forEach((frame, index) => {
    if (frame.frame !== frameSet.firstFrame + index ||
        !Number.isInteger(frame.bodyForegroundPixels) || frame.bodyForegroundPixels < 1 ||
        !Number.isInteger(frame.faceForegroundPixels) || frame.faceForegroundPixels < 1 ||
        frame.overlapPixels !== 0) {
      throw new Error("Mask pixel audit has invalid foreground evidence at frame " + (frameSet.firstFrame + index));
    }
  });
  return structuredClone(audit);
}

function validateLandmarkFrames(document) {
  const required = [...new Set([...REQUIRED_ANCHORS, ...IDENTITY_ANCHORS])];
  for (const frame of document.frames) {
    if (!Number.isFinite(frame.identityConfidence) || frame.identityConfidence < 0.65 ||
        frame.identityConfidence > 1 ||
        !Number.isFinite(frame.poseConfidence) || frame.poseConfidence < 0.55 ||
        frame.poseConfidence > 1) {
      throw new Error("Landmark frame identity or pose confidence is below the render threshold");
    }
    for (const name of required) {
      const point = frame.landmarks?.[name];
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
          point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1 ||
          (point.confidence !== undefined &&
           (!Number.isFinite(point.confidence) || point.confidence < 0.55 || point.confidence > 1))) {
        throw new Error("Landmark frame is missing a valid " + name + " anchor");
      }
    }
  }
}

/**
 * Build a render job from exact registered sidecar bytes and approved growth
 * states. The returned manifest is a new revision; the input remains unchanged.
 */
export function prepareBridgeRenderJob({
  manifest,
  segmentationSidecar,
  landmarksSidecar,
  deformationSidecar,
  sequence,
  maskMesh,
  growthStates,
  settings = {},
  sequenceId,
  jobId,
  jobUri,
  outputUri,
  renderer = "resolve-free",
  maskPixelAudit
} = {}) {
  const manifestValidation = validateBridgeManifest(manifest);
  if (!manifestValidation.valid) {
    throw new TypeError("Invalid registered bridge manifest: " + manifestValidation.errors.join("; "));
  }
  const selected = selectFrameSets(manifest, sequenceId);
  const segmentationDocument = parseSidecar(
    segmentationSidecar, selected.segmentation, "segmentation", manifest.source.id
  );
  const landmarkDocument = parseSidecar(
    landmarksSidecar, selected.landmarks, "landmarks", manifest.source.id
  );
  validateSegmentationFrames(segmentationDocument);
  validateLandmarkFrames(landmarkDocument);
  const verifiedMaskPixelAudit = validateMaskPixelAudit(maskPixelAudit, selected.segmentation);

  for (let index = 0; index < segmentationDocument.frames.length; index += 1) {
    const maskFrame = segmentationDocument.frames[index];
    const landmarkFrame = landmarkDocument.frames[index];
    if (maskFrame.frame !== landmarkFrame.frame ||
        Math.abs(maskFrame.timeSeconds - landmarkFrame.timeSeconds) > 0.000001) {
      throw new Error("Segmentation and landmark observations are not temporally aligned");
    }
  }

  const deformationDocument = parseDeformationSidecar(
    deformationSidecar, selected.deformation, manifest.source.id
  );
  const expectedDeformationDocument = reconstructExpectedMeshEvidence({
    sequence,
    maskMesh,
    manifest,
    selected,
    segmentationDocument,
    landmarkDocument
  });
  if (!isDeepStrictEqual(deformationDocument, expectedDeformationDocument)) {
    throw new Error("Registered deformation mesh differs from a fresh mesh reconstructed from actual mask pixels");
  }
  if (selected.deformation.metadata.topologyId !== expectedDeformationDocument.topologyId ||
      selected.deformation.metadata.vertexCount !== expectedDeformationDocument.vertexIds.length ||
      selected.deformation.metadata.triangleCount !== expectedDeformationDocument.triangles.length) {
    throw new Error("Registered deformation topology metadata differs from the freshly reconstructed mesh");
  }

  const landmarkFrames = landmarkDocument.frames.map(frame => ({
    frame: frame.frame,
    timeSeconds: frame.timeSeconds,
    identityConfidence: frame.identityConfidence,
    poseConfidence: frame.poseConfidence,
    landmarks: structuredClone(frame.landmarks)
  }));
  const render = createRenderJob({
    source: manifest.source,
    growthStates,
    landmarkFrames,
    settings: { ...settings, fps: settings.fps ?? selected.landmarks.fps }
  });
  if (!render.valid) {
    throw new TypeError("Render job is not ready: " + render.errors.join("; "));
  }

  render.job.frameEvidence = {
    schema: RENDER_FRAME_EVIDENCE_SCHEMA,
    schemaVersion: 1,
    sequenceId: selected.segmentation.metadata.sequenceId,
    segmentationFrameSetId: selected.segmentation.id,
    landmarksFrameSetId: selected.landmarks.id,
    segmentationChecksum: selected.segmentation.checksum,
    landmarksChecksum: selected.landmarks.checksum,
    deformationFrameSetId: selected.deformation.id,
    deformationChecksum: selected.deformation.checksum,
    topologyId: expectedDeformationDocument.topologyId,
    vertexCount: expectedDeformationDocument.vertexIds.length,
    triangleCount: expectedDeformationDocument.triangles.length,
    ...Object.fromEntries(RANGE_FIELDS.map(field => [field, selected.segmentation[field]])),
    pixelDataVerified: verifiedMaskPixelAudit?.pixelDataVerified === true,
    faceExclusionVerified: verifiedMaskPixelAudit?.faceExclusionVerified === true,
    maskPixelAudit: verifiedMaskPixelAudit,
    pixelSemanticsVerified: false
  };

  const queuedManifest = queueBridgeRenderJob(manifest, {
    id: jobId,
    jobUri,
    portableJob: render.job,
    inputFrameSetIds: [selected.segmentation.id, selected.landmarks.id, selected.deformation.id],
    outputUri,
    renderer
  });

  return {
    manifest: queuedManifest,
    portableJob: render.job,
    jobId: queuedManifest.renderJobs.at(-1).id,
    sequenceId: selected.segmentation.metadata.sequenceId,
    frameCount: selected.segmentation.frameCount,
    frameSetIds: [selected.segmentation.id, selected.landmarks.id, selected.deformation.id],
    topologyId: expectedDeformationDocument.topologyId,
    maskPixelAudit: verifiedMaskPixelAudit,
    pixelSemanticsVerified: false
  };
}
