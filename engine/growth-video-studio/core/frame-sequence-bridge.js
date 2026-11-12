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

function createMaskMeshEvidence(mesh, sequence, sequenceCheck) {
  if (mesh?.schema !== "geehub.mask-mesh" || mesh.schemaVersion !== 1 ||
      mesh.status !== "ready" || mesh.topologyStable !== true || mesh.connected !== true ||
      mesh.evidence?.faceExclusionVerified !== true ||
      mesh.evidence?.edgeConnected !== true || mesh.evidence?.pixelSemanticsVerified !== false) {
    throw new Error("A ready, connected, face-excluding mask mesh is required for bridge registration");
  }
  const grid = mesh.grid;
  if (!grid || !Number.isInteger(grid.columns) || grid.columns < 2 ||
      !Number.isInteger(grid.rows) || grid.rows < 2 ||
      !Number.isInteger(grid.vertexCount) || grid.vertexCount < 9 ||
      grid.vertexCount !== (grid.columns + 1) * (grid.rows + 1) ||
      !Array.isArray(mesh.vertexIds) || mesh.vertexIds.length !== grid.vertexCount ||
      new Set(mesh.vertexIds).size !== mesh.vertexIds.length ||
      mesh.vertexIds.some(id => !isText(id))) {
    throw new Error("Mask mesh vertex grid or identities are invalid");
  }
  if (!Array.isArray(mesh.triangles) || !mesh.triangles.length ||
      !Array.isArray(mesh.triangleIds) || mesh.triangleIds.length !== mesh.triangles.length ||
      new Set(mesh.triangleIds).size !== mesh.triangleIds.length ||
      mesh.triangleIds.some(id => !isText(id))) {
    throw new Error("Mask mesh triangle identities are invalid");
  }
  for (const triangle of mesh.triangles) {
    if (!Array.isArray(triangle) || triangle.length !== 3 ||
        new Set(triangle).size !== 3 ||
        triangle.some(index => !Number.isInteger(index) || index < 0 || index >= mesh.vertexIds.length)) {
      throw new Error("Mask mesh contains an invalid triangle index");
    }
  }
  if (!Array.isArray(mesh.usedVertexIds) || !mesh.usedVertexIds.length ||
      new Set(mesh.usedVertexIds).size !== mesh.usedVertexIds.length) {
    throw new Error("Mask mesh used-vertex references are invalid");
  }
  const usedVertexIds = new Set(mesh.usedVertexIds);
  if ([...usedVertexIds].some(id => !mesh.vertexIds.includes(id))) {
    throw new Error("Mask mesh used-vertex references are invalid");
  }
  const expectedUsedVertexIds = [...new Set(mesh.triangles.flat())]
    .sort((a, b) => a - b).map(index => mesh.vertexIds[index]);
  if (JSON.stringify([...usedVertexIds]) !== JSON.stringify(expectedUsedVertexIds)) {
    throw new Error("Mask mesh used-vertex list disagrees with its triangles");
  }
  const expectedSequence = {
    firstFrame: sequenceCheck.firstFrame,
    lastFrame: sequenceCheck.lastFrame,
    frameCount: sequence.frames.length,
    width: sequence.format.width,
    height: sequence.format.height
  };
  for (const [field, expected] of Object.entries(expectedSequence)) {
    if (mesh.sequence?.[field] !== expected) {
      throw new Error("Mask mesh disagrees with the source sequence on " + field);
    }
  }
  if (!Array.isArray(mesh.frames) || mesh.frames.length !== sequence.frames.length) {
    throw new Error("Mask mesh does not contain every source frame");
  }
  mesh.frames.forEach((frame, index) => {
    const sourceFrame = sequence.frames[index];
    if (frame.frame !== sourceFrame.frame || frame.timeSeconds !== sourceFrame.timeSeconds ||
        !Array.isArray(frame.sourcePoints) || frame.sourcePoints.length !== mesh.vertexIds.length) {
      throw new Error("Mask mesh frame coordinates are incomplete or temporally misaligned");
    }
    for (const point of frame.sourcePoints) {
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) ||
          point.x < 0 || point.x >= sequence.format.width ||
          point.y < 0 || point.y >= sequence.format.height) {
        throw new Error("Mask mesh contains a source coordinate outside the image");
      }
    }
  });
  const topology = {
    columns: grid.columns,
    rows: grid.rows,
    vertexIds: mesh.vertexIds,
    triangleIds: mesh.triangleIds,
    triangles: mesh.triangles
  };
  if (!/^[a-f0-9]{64}$/i.test(mesh.topologyId || "") ||
      digest(JSON.stringify(topology)) !== mesh.topologyId.toLowerCase()) {
    throw new Error("Mask mesh topology digest does not match its vertex and triangle identities");
  }
  return {
    schema: "geehub.mask-mesh-evidence",
    schemaVersion: 1,
    role: "deformation",
    sequenceId: sequence.id,
    sourceAssetId: sequence.source.id,
    firstFrame: sequenceCheck.firstFrame,
    lastFrame: sequenceCheck.lastFrame,
    frameCount: sequence.frames.length,
    width: sequence.format.width,
    height: sequence.format.height,
    fps: sequence.format.fps,
    pixelSemanticsVerified: false,
    topologyId: mesh.topologyId,
    grid: structuredClone(grid),
    vertexIds: [...mesh.vertexIds],
    usedVertexIds: [...usedVertexIds],
    triangleIds: [...mesh.triangleIds],
    triangles: mesh.triangles.map(triangle => [...triangle]),
    frames: mesh.frames.map(frame => ({
      frame: frame.frame,
      timeSeconds: frame.timeSeconds,
      bounds: structuredClone(frame.bounds),
      sourcePoints: frame.sourcePoints.map(point => ({ x: point.x, y: point.y }))
    })),
    coverage: structuredClone(mesh.coverage),
    evidence: {
      source: "decoded-binary-body-and-face-masks",
      faceExclusionVerified: true,
      edgeConnected: true,
      pixelSemanticsVerified: false
    }
  };
}

/**
 * Prepare immutable segmentation, landmark, and mask-mesh frame sets from a
 * successful inspectFrameSequenceFiles() result. No sidecar is written here.
 */
export function prepareFrameSequenceBridgeInputs(
  manifest,
  sequence,
  audit,
  { segmentationUri, landmarksUri, deformationUri } = {}
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
      audit.meshReady !== true || audit.maskMesh?.status !== "ready" ||
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
      !safeDropboxUri(deformationUri) ||
      new Set([segmentationUri, landmarksUri, deformationUri]).size !== 3) {
    throw new TypeError("Three distinct safe Dropbox URIs are required for segmentation, landmarks, and deformation mesh sidecars");
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
  const deformationDocument = createMaskMeshEvidence(audit.maskMesh, sequence, sequenceCheck);

  const segmentationSidecar = sidecar(segmentationDocument);
  const landmarkSidecar = sidecar(landmarkDocument);
  const deformationSidecar = sidecar(deformationDocument);
  const metadata = {
    sequenceId: sequence.id,
    evidenceSchema: "geehub.frame-set-evidence.v1",
    auditSchema: audit.schema,
    pixelDataVerified: true,
    faceExclusionVerified: true,
    maskEncoding: audit.maskPixelAudit.encoding,
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
  next = addBridgeFrameSet(next, {
    id: "frame-sequence-" + sequence.id + "-deformation",
    role: "deformation",
    uri: deformationUri,
    ...range,
    checksum: deformationSidecar.checksum,
    metadata: {
      sequenceId: sequence.id,
      evidenceSchema: "geehub.mask-mesh-evidence.v1",
      topologyId: deformationDocument.topologyId,
      vertexCount: deformationDocument.vertexIds.length,
      triangleCount: deformationDocument.triangles.length,
      faceExclusionVerified: true,
      pixelSemanticsVerified: false
    }
  });

  return {
    manifest: next,
    frameSetIds: next.frameSets.slice(-3).map(item => item.id),
    documents: [
      { role: "segmentation", uri: segmentationUri, checksum: segmentationSidecar.checksum, content: segmentationSidecar.content },
      { role: "landmarks", uri: landmarksUri, checksum: landmarkSidecar.checksum, content: landmarkSidecar.content },
      { role: "deformation", uri: deformationUri, checksum: deformationSidecar.checksum, content: deformationSidecar.content }
    ],
    pixelSemanticsVerified: false
  };
}
