import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createGrowthState, createChildState, BASELINE } from "./growth-state.js";
import { REQUIRED_ANCHORS } from "./landmark-track.js";
import { createBridgeManifest, addBridgeFrameSet, validateBridgeManifest } from "./bridge-manifest.js";
import { prepareBridgeRenderJob } from "./bridge-render-job.js";
import { validateFrameSequencePackage } from "./frame-sequence.js";
import { buildStableMaskMesh } from "./mask-mesh.js";
import { createMaskMeshEvidence } from "./frame-sequence-bridge.js";

const sha = value => createHash("sha256").update(value, "utf8").digest("hex");
const source = {
  id: "source-01", name: "source.mp4", uri: "dropbox://GEEHUB/Assets/source.mp4",
  duration: 2, width: 32, height: 48, immutable: true
};
const sequenceId = "sequence-01";
const range = { firstFrame: 0, lastFrame: 1, frameCount: 2, width: 32, height: 48, fps: 24 };
const anchors = [...new Set([...REQUIRED_ANCHORS, "leftEye", "rightEye", "nose", "chin"])];

function makeGrowthStates() {
  const baseline = createGrowthState(BASELINE, { id: "baseline" });
  const grown = createChildState(baseline, {
    stature: 1.1, torsoLength: 1.05, shoulderSpan: 1.15, chestDepth: 1.12,
    armLength: 1.1, armMass: 1.15, thighLength: 1.1, thighMass: 1.12, calfMass: 1.08
  }, { id: "grown" });
  return [baseline, grown];
}

function makeDocuments() {
  const segmentation = {
    schema: "geehub.frame-set-evidence", schemaVersion: 1, role: "segmentation",
    sequenceId, sourceAssetId: source.id, ...range, pixelSemanticsVerified: false,
    frames: [0, 1].map(frame => ({
      frame, timeSeconds: frame / 24, model: "test-segmenter", confidence: 0.98,
      bodyMask: {
        uri: "dropbox://GEEHUB/FrameEvidence/body-" + frame + ".png",
        checksum: String(frame + 1).repeat(64).slice(0, 64), excludesFace: true
      },
      faceMask: {
        uri: "dropbox://GEEHUB/FrameEvidence/face-" + frame + ".png",
        checksum: String(frame + 3).repeat(64).slice(0, 64), protectsIdentity: true
      }
    }))
  };
  const landmarks = {
    schema: "geehub.frame-set-evidence", schemaVersion: 1, role: "landmarks",
    sequenceId, sourceAssetId: source.id, ...range,
    frames: [0, 1].map(frame => ({
      frame, timeSeconds: frame / 24, identityConfidence: 0.99, poseConfidence: 0.98,
      landmarks: Object.fromEntries(anchors.map((name, index) => [name, {
        x: 0.45 + index * 0.002, y: 0.2 + index * 0.003, confidence: 0.99
      }]))
    }))
  };
  const segmentationText = JSON.stringify(segmentation, null, 2) + "\n";
  const landmarksText = JSON.stringify(landmarks, null, 2) + "\n";
  const sequence = {
    schema: "geehub.frame-sequence", schemaVersion: 1,
    id: sequenceId, source: structuredClone(source),
    format: { width: range.width, height: range.height, fps: range.fps, frameCount: range.frameCount },
    firstFrame: range.firstFrame, startTimeSeconds: 0,
    frames: segmentation.frames.map((frame, index) => {
      const track = landmarks.frames[index];
      return {
        frame: frame.frame, timeSeconds: frame.timeSeconds,
        sourceAssetId: source.id, width: range.width, height: range.height,
        identityConfidence: track.identityConfidence, poseConfidence: track.poseConfidence,
        landmarks: structuredClone(track.landmarks),
        segmentation: {
          sourceAssetId: source.id, frame: frame.frame, width: range.width, height: range.height,
          model: frame.model, confidence: frame.confidence,
          bodyMask: { ...frame.bodyMask, role: "body", width: range.width, height: range.height },
          faceMask: { ...frame.faceMask, role: "face", width: range.width, height: range.height }
        }
      };
    })
  };
  const sequenceCheck = validateFrameSequencePackage(sequence);
  assert.equal(sequenceCheck.valid, true, JSON.stringify(sequenceCheck.errors));
  assert.equal(sequenceCheck.structurallyReady, true);

  const bodyPixels = new Uint8Array(range.width * range.height);
  const facePixels = new Uint8Array(range.width * range.height);
  for (let y = 12; y <= 45; y += 1) {
    for (let x = 4; x <= 27; x += 1) bodyPixels[y * range.width + x] = 255;
  }
  for (let y = 3; y <= 9; y += 1) {
    for (let x = 13; x <= 18; x += 1) facePixels[y * range.width + x] = 255;
  }
  const maskMesh = buildStableMaskMesh(sequence.frames.map(frame => ({
    frame: frame.frame, timeSeconds: frame.timeSeconds,
    bodyMask: { width: range.width, height: range.height, pixels: bodyPixels },
    faceMask: { width: range.width, height: range.height, pixels: facePixels }
  })), { columns: 2, rows: 2, minTriangles: 1 });
  assert.equal(maskMesh.status, "ready");
  const deformationDocument = createMaskMeshEvidence(maskMesh, sequence, sequenceCheck);
  const deformationText = JSON.stringify(deformationDocument, null, 2) + "\n";
  return { segmentationText, landmarksText, deformationText, sequence, maskMesh, deformationDocument };
}

function makeManifest(documents = makeDocuments()) {
  let manifest = createBridgeManifest({ projectId: "project-01", source, manifestId: "bridge-01" });
  manifest = addBridgeFrameSet(manifest, {
    id: "segmentation-01", role: "segmentation",
    uri: "dropbox://GEEHUB/Bridge/evidence/segmentation-01.json",
    ...range, checksum: sha(documents.segmentationText), metadata: { sequenceId }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "landmarks-01", role: "landmarks",
    uri: "dropbox://GEEHUB/Bridge/evidence/landmarks-01.json",
    ...range, checksum: sha(documents.landmarksText), metadata: { sequenceId }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "deformation-01", role: "deformation",
    uri: "dropbox://GEEHUB/Bridge/evidence/deformation-01.json",
    ...range, checksum: sha(documents.deformationText),
    metadata: {
      sequenceId, evidenceSchema: "geehub.mask-mesh-evidence.v1",
      topologyId: documents.deformationDocument.topologyId,
      vertexCount: documents.deformationDocument.vertexIds.length,
      triangleCount: documents.deformationDocument.triangles.length,
      faceExclusionVerified: true, pixelSemanticsVerified: false
    }
  });
  return manifest;
}

function prepareDocuments(documents, manifest = makeManifest(documents), overrides = {}) {
  return prepareBridgeRenderJob({
    manifest,
    segmentationSidecar: documents.segmentationText,
    landmarksSidecar: documents.landmarksText,
    deformationSidecar: documents.deformationText,
    sequence: documents.sequence,
    maskMesh: documents.maskMesh,
    growthStates: makeGrowthStates(),
    jobId: "render-01",
    jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-01.json",
    outputUri: "dropbox://GEEHUB/Exports/render-01.mp4",
    ...overrides
  });
}

function prepare(overrides = {}) {
  const documents = makeDocuments();
  return prepareDocuments(documents, makeManifest(documents), overrides);
}

test("prepares a queued job bound to all three registered evidence frame sets", () => {
  const result = prepare();
  assert.equal(result.manifest.revision, 4);
  assert.equal(result.manifest.renderJobs[0].status, "queued");
  assert.deepEqual(result.manifest.renderJobs[0].inputFrameSetIds,
    ["segmentation-01", "landmarks-01", "deformation-01"]);
  assert.equal(result.portableJob.frameEvidence.sequenceId, sequenceId);
  assert.equal(result.portableJob.frameEvidence.pixelSemanticsVerified, false);
  assert.equal(result.portableJob.frameEvidence.deformationFrameSetId, "deformation-01");
  assert.equal(result.portableJob.frameEvidence.deformationChecksum, sha(makeDocuments().deformationText));
  assert.equal(result.portableJob.frameEvidence.topologyId, result.topologyId);
  assert.equal(result.portableJob.frameEvidence.vertexCount, 9);
  assert.equal(result.portableJob.landmarkFrames.length, 2);
  assert.equal(result.frameSetIds.length, 3);
  assert.equal(validateBridgeManifest(result.manifest).valid, true);
});

test("carries verified binary-mask and face-exclusion evidence into the render job", () => {
  const maskPixelAudit = {
    encoding: "png/grayscale8/binary",
    pixelDataVerified: true,
    faceExclusionVerified: true,
    pairsChecked: 2,
    disjointPairs: 2,
    overlapPixels: 0,
    frames: [0, 1].map(frame => ({
      frame, bodyForegroundPixels: 180, faceForegroundPixels: 16, overlapPixels: 0
    }))
  };
  const result = prepare({ maskPixelAudit });
  assert.equal(result.portableJob.frameEvidence.pixelDataVerified, true);
  assert.equal(result.portableJob.frameEvidence.faceExclusionVerified, true);
  assert.deepEqual(result.portableJob.frameEvidence.maskPixelAudit, maskPixelAudit);
  assert.throws(() => prepare({
    maskPixelAudit: { ...maskPixelAudit, overlapPixels: 1 }
  }), /body\/face overlap/);
});

test("does not mutate the registered parent manifest", () => {
  const documents = makeDocuments();
  const manifest = makeManifest(documents);
  const original = structuredClone(manifest);
  prepareDocuments(documents, manifest);
  assert.deepEqual(manifest, original);
});

test("refuses a sidecar whose actual bytes differ from its registered checksum", () => {
  const documents = makeDocuments();
  assert.throws(() => prepareDocuments(documents, makeManifest(documents), {
    segmentationSidecar: documents.segmentationText + "tampered"
  }), /SHA-256 does not match/);
});

test("refuses mask declarations that do not preserve the face", () => {
  const documents = makeDocuments();
  const segmentation = JSON.parse(documents.segmentationText);
  segmentation.frames[0].bodyMask.excludesFace = false;
  documents.segmentationText = JSON.stringify(segmentation, null, 2) + "\n";
  assert.throws(() => prepareDocuments(documents, makeManifest(documents)), /face-exclusion/);
});

test("refuses misaligned segmentation and landmark timestamps", () => {
  const documents = makeDocuments();
  const landmarks = JSON.parse(documents.landmarksText);
  landmarks.frames[1].timeSeconds += 0.02;
  documents.landmarksText = JSON.stringify(landmarks, null, 2) + "\n";
  assert.throws(() => prepareDocuments(documents, makeManifest(documents)), /temporally aligned/);
});

test("refuses a low-confidence identity track", () => {
  const documents = makeDocuments();
  const landmarks = JSON.parse(documents.landmarksText);
  landmarks.frames[1].identityConfidence = 0.4;
  documents.landmarksText = JSON.stringify(landmarks, null, 2) + "\n";
  assert.throws(() => prepareDocuments(documents, makeManifest(documents)), /confidence is below/);
});

test("refuses a registered mesh whose coordinates differ from a fresh mask-pixel reconstruction even when re-hashed", () => {
  const documents = makeDocuments();
  const altered = JSON.parse(documents.deformationText);
  altered.frames[0].sourcePoints[0].x += 0.25;
  documents.deformationText = JSON.stringify(altered, null, 2) + "\n";
  const manifest = makeManifest(documents);
  assert.throws(() => prepareDocuments(documents, manifest),
    /differs from a fresh mesh reconstructed from actual mask pixels/);
});

test("requires one deformation frame set for every newly prepared render job", () => {
  const documents = makeDocuments();
  const manifest = makeManifest(documents);
  manifest.frameSets = manifest.frameSets.filter(item => item.role !== "deformation");
  assert.throws(() => prepareDocuments(documents, manifest),
    /exactly one segmentation, landmarks, and deformation frame set/);
});
