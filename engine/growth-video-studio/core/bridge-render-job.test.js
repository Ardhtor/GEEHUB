import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createGrowthState, createChildState, BASELINE } from "./growth-state.js";
import { REQUIRED_ANCHORS } from "./landmark-track.js";
import { createBridgeManifest, addBridgeFrameSet, validateBridgeManifest } from "./bridge-manifest.js";
import { prepareBridgeRenderJob } from "./bridge-render-job.js";

const sha = value => createHash("sha256").update(value, "utf8").digest("hex");
const source = {
  id: "source-01", name: "source.mp4", uri: "dropbox://GEEHUB/Assets/source.mp4",
  duration: 2, width: 720, height: 1280, immutable: true
};
const sequenceId = "sequence-01";
const range = { firstFrame: 0, lastFrame: 1, frameCount: 2, width: 720, height: 1280, fps: 24 };
const anchors = [...new Set([...REQUIRED_ANCHORS, "leftEye", "rightEye", "nose", "chin"])];

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
  return {
    segmentationText: JSON.stringify(segmentation, null, 2) + "\n",
    landmarksText: JSON.stringify(landmarks, null, 2) + "\n"
  };
}

function makeGrowthStates() {
  const baseline = createGrowthState(BASELINE, { id: "baseline" });
  const grown = createChildState(baseline, {
    stature: 1.1, torsoLength: 1.05, shoulderSpan: 1.15, chestDepth: 1.12,
    armLength: 1.1, armMass: 1.15, thighLength: 1.1, thighMass: 1.12, calfMass: 1.08
  }, { id: "grown" });
  return [baseline, grown];
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
  return manifest;
}

function prepare(overrides = {}) {
  const documents = makeDocuments();
  const manifest = makeManifest(documents);
  return prepareBridgeRenderJob({
    manifest,
    segmentationSidecar: documents.segmentationText,
    landmarksSidecar: documents.landmarksText,
    growthStates: makeGrowthStates(),
    jobId: "render-01",
    jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-01.json",
    outputUri: "dropbox://GEEHUB/Exports/render-01.mp4",
    ...overrides
  });
}

test("prepares a queued job from checksummed segmentation, landmarks, and growth states", () => {
  const result = prepare();
  assert.equal(result.manifest.revision, 3);
  assert.equal(result.manifest.renderJobs[0].status, "queued");
  assert.deepEqual(result.manifest.renderJobs[0].inputFrameSetIds, ["segmentation-01", "landmarks-01"]);
  assert.equal(result.portableJob.frameEvidence.sequenceId, sequenceId);
  assert.equal(result.portableJob.frameEvidence.pixelSemanticsVerified, false);
  assert.equal(result.portableJob.landmarkFrames.length, 2);
  assert.equal(result.portableJob.landmarkFrames[1].frame, 1);
  assert.equal(validateBridgeManifest(result.manifest).valid, true);
});

test("does not mutate the registered parent manifest", () => {
  const documents = makeDocuments();
  const manifest = makeManifest(documents);
  const original = structuredClone(manifest);
  prepareBridgeRenderJob({
    manifest, segmentationSidecar: documents.segmentationText,
    landmarksSidecar: documents.landmarksText, growthStates: makeGrowthStates(),
    jobId: "render-02", jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-02.json",
    outputUri: "dropbox://GEEHUB/Exports/render-02.mp4"
  });
  assert.deepEqual(manifest, original);
});

test("refuses a sidecar whose actual bytes differ from its registered checksum", () => {
  const documents = makeDocuments();
  assert.throws(() => prepareBridgeRenderJob({
    manifest: makeManifest(documents),
    segmentationSidecar: documents.segmentationText + "tampered",
    landmarksSidecar: documents.landmarksText,
    growthStates: makeGrowthStates(),
    jobId: "render-03", jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-03.json",
    outputUri: "dropbox://GEEHUB/Exports/render-03.mp4"
  }), /SHA-256 does not match/);
});

test("refuses mask declarations that do not preserve the face", () => {
  const documents = makeDocuments();
  const segmentation = JSON.parse(documents.segmentationText);
  segmentation.frames[0].bodyMask.excludesFace = false;
  documents.segmentationText = JSON.stringify(segmentation, null, 2) + "\n";
  assert.throws(() => prepareBridgeRenderJob({
    manifest: makeManifest(documents),
    segmentationSidecar: documents.segmentationText,
    landmarksSidecar: documents.landmarksText,
    growthStates: makeGrowthStates(),
    jobId: "render-04", jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-04.json",
    outputUri: "dropbox://GEEHUB/Exports/render-04.mp4"
  }), /face-exclusion/);
});

test("refuses misaligned segmentation and landmark timestamps", () => {
  const documents = makeDocuments();
  const landmarks = JSON.parse(documents.landmarksText);
  landmarks.frames[1].timeSeconds += 0.02;
  documents.landmarksText = JSON.stringify(landmarks, null, 2) + "\n";
  const manifest = makeManifest(documents);
  assert.throws(() => prepareBridgeRenderJob({
    manifest, segmentationSidecar: documents.segmentationText,
    landmarksSidecar: documents.landmarksText, growthStates: makeGrowthStates(),
    jobId: "render-05", jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-05.json",
    outputUri: "dropbox://GEEHUB/Exports/render-05.mp4"
  }), /temporally aligned/);
});

test("refuses a low-confidence identity track", () => {
  const documents = makeDocuments();
  const landmarks = JSON.parse(documents.landmarksText);
  landmarks.frames[1].identityConfidence = 0.4;
  documents.landmarksText = JSON.stringify(landmarks, null, 2) + "\n";
  const manifest = makeManifest(documents);
  assert.throws(() => prepareBridgeRenderJob({
    manifest, segmentationSidecar: documents.segmentationText,
    landmarksSidecar: documents.landmarksText, growthStates: makeGrowthStates(),
    jobId: "render-06", jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-06.json",
    outputUri: "dropbox://GEEHUB/Exports/render-06.mp4"
  }), /confidence is below/);
});
