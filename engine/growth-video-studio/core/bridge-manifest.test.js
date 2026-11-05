import test from "node:test";
import assert from "node:assert/strict";
import { createGrowthState, createChildState, BASELINE } from "./growth-state.js";
import { REQUIRED_ANCHORS } from "./landmark-track.js";
import { createRenderJob } from "./render-job.js";
import {
  createBridgeManifest, addBridgeFrameSet, queueBridgeRenderJob,
  startBridgeRenderJob, failBridgeRenderJob, completeBridgeRenderJob,
  validateBridgeManifest
} from "./bridge-manifest.js";

const source = () => ({
  id: "source-1", name: "source.mp4",
  uri: "dropbox://GEEHUB/Bridge/incoming/source.mp4",
  duration: 2, width: 720, height: 1280
});
const frame = timeSeconds => ({
  timeSeconds,
  landmarks: Object.fromEntries(REQUIRED_ANCHORS.map(key => [
    key, { x: 0.5, y: 0.5, confidence: 0.99 }
  ]))
});
function portableJob() {
  const baseline = createGrowthState(BASELINE, { id: "base" });
  const grown = createChildState(baseline, {
    stature: 1.1, torsoLength: 1.05, armLength: 1.1,
    thighLength: 1.1, shoulderSpan: 1.2, chestDepth: 1.15,
    armMass: 1.2, thighMass: 1.2, calfMass: 1.1
  }, { id: "grown" });
  const result = createRenderJob({
    source: { name: "source.mp4", duration: 2, width: 720, height: 1280 },
    growthStates: [baseline, grown],
    landmarkFrames: [frame(0), frame(0.1)],
    settings: { fps: 24 }
  });
  assert.equal(result.valid, true);
  return result.job;
}
function manifest() {
  return createBridgeManifest({
    projectId: "project-1",
    source: source(),
    manifestId: "bridge-1"
  });
}
function withRequiredFrameSets(manifestValue) {
  let current = addBridgeFrameSet(manifestValue, {
    id: "segmentation-1", role: "segmentation",
    uri: "dropbox://GEEHUB/FrameEvidence/segmentation-1.json",
    firstFrame: 0, lastFrame: 1, frameCount: 2,
    width: 720, height: 1280, fps: 24, checksum: "a".repeat(64),
    metadata: { sequenceId: "sequence-1" }
  });
  current = addBridgeFrameSet(current, {
    id: "landmarks-1", role: "landmarks",
    uri: "dropbox://GEEHUB/FrameEvidence/landmarks-1.json",
    firstFrame: 0, lastFrame: 1, frameCount: 2,
    width: 720, height: 1280, fps: 24, checksum: "b".repeat(64),
    metadata: { sequenceId: "sequence-1" }
  });
  return current;
}
function queue(manifestValue) {
  const prepared = manifestValue.frameSets.some(item => item.role === "segmentation")
    ? manifestValue : withRequiredFrameSets(manifestValue);
  return queueBridgeRenderJob(prepared, {
    id: "render-1",
    jobUri: "dropbox://GEEHUB/Bridge/incoming/render-1.json",
    portableJob: portableJob(),
    inputFrameSetIds: ["segmentation-1", "landmarks-1"],
    outputUri: "dropbox://GEEHUB/Exports/source-growth.mp4",
    renderer: "resolve-free"
  });
}

test("creates a version-zero manifest with an immutable source", () => {
  const result = manifest();
  assert.equal(result.schema, "geehub.media-bridge");
  assert.equal(result.revision, 0);
  assert.equal(result.source.immutable, true);
  assert.equal(validateBridgeManifest(result).valid, true);
});

test("frame sets create a new revision and never mutate the prior manifest", () => {
  const original = manifest();
  const next = addBridgeFrameSet(original, {
    id: "landmarks-1", role: "landmarks",
    uri: "dropbox://GEEHUB/Bridge/incoming/landmarks-1.json",
    frameCount: 2, firstFrame: 0, width: 720, height: 1280, fps: 24
  });
  assert.equal(original.frameSets.length, 0);
  assert.equal(original.revision, 0);
  assert.equal(next.revision, 1);
  assert.equal(next.parentRevision, 0);
  assert.equal(next.frameSets[0].sourceAssetId, "source-1");
  assert.equal(validateBridgeManifest(next).valid, true);
});

test("rejects a frame set that would reuse the source URI", () => {
  assert.throws(() => addBridgeFrameSet(manifest(), {
    id: "bad-frames", role: "landmarks",
    uri: source().uri, frameCount: 2, width: 720, height: 1280, fps: 24
  }), /already reserved/);
});

test("queues only a render job tied to the immutable source", () => {
  const result = queue(manifest());
  assert.equal(result.revision, 3);
  assert.equal(result.renderJobs[0].status, "queued");
  assert.equal(result.renderJobs[0].sourceAssetId, "source-1");
  assert.equal(validateBridgeManifest(result).valid, true);
});

test("refuses to queue a render job without typed segmentation and landmark inputs", () => {
  assert.throws(() => queueBridgeRenderJob(manifest(), {
    id: "render-missing-evidence",
    jobUri: "dropbox://GEEHUB/Bridge/incoming/missing-evidence.json",
    portableJob: portableJob(),
    inputFrameSetIds: [],
    outputUri: "dropbox://GEEHUB/Exports/missing-evidence.mp4"
  }), /exactly one segmentation frame set; requires exactly one landmarks frame set/);
});

test("rejects mismatched source and duplicate output paths", () => {
  const root = manifest();
  const wrong = portableJob();
  wrong.source.name = "other.mp4";
  assert.throws(() => queueBridgeRenderJob(root, {
    jobUri: "dropbox://GEEHUB/Bridge/incoming/wrong.json",
    portableJob: wrong,
    outputUri: "dropbox://GEEHUB/Exports/wrong.mp4"
  }), /does not match/);
  const queued = queue(root);
  assert.throws(() => queueBridgeRenderJob(queued, {
    jobUri: "dropbox://GEEHUB/Bridge/incoming/second.json",
    portableJob: portableJob(),
    outputUri: "dropbox://GEEHUB/Exports/source-growth.mp4"
  }), /new, distinct/);
});

test("a running render records a checksummed artifact at its reserved output", () => {
  let current = queue(manifest());
  current = startBridgeRenderJob(current, "render-1");
  current = completeBridgeRenderJob(current, "render-1", {
    id: "artifact-1",
    uri: "dropbox://GEEHUB/Exports/source-growth.mp4",
    mediaType: "video/mp4",
    checksum: "a".repeat(64),
    metadata: { width: 720, height: 1280, fps: 24 }
  });
  assert.equal(current.revision, 5);
  assert.equal(current.renderJobs[0].status, "completed");
  assert.equal(current.renderJobs[0].artifactId, "artifact-1");
  assert.equal(current.artifacts[0].jobId, "render-1");
  assert.equal(validateBridgeManifest(current).valid, true);
});

test("failed jobs remain explicit and do not create output artifacts", () => {
  let current = queue(manifest());
  current = startBridgeRenderJob(current, "render-1");
  current = failBridgeRenderJob(current, "render-1", "Renderer unavailable");
  assert.equal(current.renderJobs[0].status, "failed");
  assert.equal(current.artifacts.length, 0);
  assert.equal(validateBridgeManifest(current).valid, true);
  assert.throws(() => completeBridgeRenderJob(current, "render-1", {}), /Only running/);
});

test("manifest validation detects broken references and event history", () => {
  const current = queue(manifest());
  const corrupted = structuredClone(current);
  corrupted.renderJobs[0].inputFrameSetIds = ["missing-frame-set"];
  corrupted.events.pop();
  const result = validateBridgeManifest(corrupted);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes("missing or duplicate frame set")));
  assert.ok(result.errors.some(error => error.includes("Event history")));
});
