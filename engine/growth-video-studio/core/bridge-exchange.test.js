import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, lstat, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBridgeManifest, addBridgeFrameSet, queueBridgeRenderJob } from "./bridge-manifest.js";
import { stageBridgeExchange, resolveDropboxUri } from "./bridge-exchange.js";

const sourceBytes = "immutable source video bytes";
const sourceChecksum = createHash("sha256").update(sourceBytes).digest("hex");
const segmentationContent = JSON.stringify({ schema: "geehub.frame-set-evidence", role: "segmentation" }) + "\n";
const landmarksContent = JSON.stringify({ schema: "geehub.frame-set-evidence", role: "landmarks" }) + "\n";
const deformationContent = JSON.stringify({ schema: "geehub.mask-mesh-evidence", role: "deformation" }) + "\n";
const checksum = value => createHash("sha256").update(value).digest("hex");

function portableJob() {
  return {
    schema: "geehub.growth-render-job",
    schemaVersion: 1,
    status: "ready-for-renderer",
    source: { name: "source.mp4", duration: 2, width: 720, height: 1280 },
    output: { width: 720, height: 1280, fps: 24, format: "mp4" },
    growthStates: [{ id: "baseline" }, { id: "grown" }],
    landmarkFrames: [{ timeSeconds: 0 }, { timeSeconds: 0.1 }],
    frameEvidence: {
      schema: "geehub.render-frame-evidence", schemaVersion: 1,
      sequenceId: "sequence-test",
      segmentationFrameSetId: "segmentation-test",
      landmarksFrameSetId: "landmarks-test",
      segmentationChecksum: checksum(segmentationContent),
      landmarksChecksum: checksum(landmarksContent),
      deformationFrameSetId: "deformation-test",
      deformationChecksum: checksum(deformationContent),
      topologyId: "c".repeat(64),
      vertexCount: 9,
      triangleCount: 8,
      firstFrame: 0, lastFrame: 1, frameCount: 2, width: 720, height: 1280, fps: 24,
      pixelSemanticsVerified: false
    },
    constraints: {
      protectFace: true,
      preserveSourceMotion: true,
      preserveGroundContact: true,
      deformBodyAsConnectedMesh: true,
      temporalStability: true
    }
  };
}

async function fixture(t) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "geehub-bridge-"));
  const root = path.join(temp, "Dropbox");
  const sourcePath = path.join(root, "GEEHUB", "Assets", "source.mp4");
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, sourceBytes);
  const payload = portableJob();
  const segmentationPath = path.join(root, "GEEHUB", "FrameEvidence", "segmentation-test.json");
  const landmarksPath = path.join(root, "GEEHUB", "FrameEvidence", "landmarks-test.json");
  const deformationPath = path.join(root, "GEEHUB", "FrameEvidence", "deformation-test.json");
  await mkdir(path.dirname(segmentationPath), { recursive: true });
  await writeFile(segmentationPath, segmentationContent);
  await writeFile(landmarksPath, landmarksContent);
  await writeFile(deformationPath, deformationContent);
  let manifest = createBridgeManifest({
    projectId: "project-test",
    source: {
      id: "source-test",
      name: "source.mp4",
      uri: "dropbox://GEEHUB/Assets/source.mp4",
      duration: 2,
      width: 720,
      height: 1280,
      checksum: sourceChecksum
    },
    manifestId: "bridge-test"
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "segmentation-test", role: "segmentation",
    uri: "dropbox://GEEHUB/FrameEvidence/segmentation-test.json",
    firstFrame: 0, lastFrame: 1, frameCount: 2, width: 720, height: 1280, fps: 24,
    checksum: checksum(segmentationContent),
    metadata: { sequenceId: "sequence-test" }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "landmarks-test", role: "landmarks",
    uri: "dropbox://GEEHUB/FrameEvidence/landmarks-test.json",
    firstFrame: 0, lastFrame: 1, frameCount: 2, width: 720, height: 1280, fps: 24,
    checksum: checksum(landmarksContent),
    metadata: { sequenceId: "sequence-test" }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "deformation-test", role: "deformation",
    uri: "dropbox://GEEHUB/FrameEvidence/deformation-test.json",
    firstFrame: 0, lastFrame: 1, frameCount: 2, width: 720, height: 1280, fps: 24,
    checksum: checksum(deformationContent),
    metadata: {
      sequenceId: "sequence-test", evidenceSchema: "geehub.mask-mesh-evidence.v1",
      topologyId: "c".repeat(64), vertexCount: 9, triangleCount: 8,
      faceExclusionVerified: true, pixelSemanticsVerified: false
    }
  });
  manifest = queueBridgeRenderJob(manifest, {
    id: "render-test",
    jobUri: "dropbox://GEEHUB/Bridge/incoming/render-test.json",
    portableJob: payload,
    inputFrameSetIds: ["segmentation-test", "landmarks-test", "deformation-test"],
    outputUri: "dropbox://GEEHUB/Exports/render-test.mp4",
    renderer: "resolve-free"
  });
  t.after(() => rm(temp, { recursive: true, force: true }));
  return { temp, root, sourcePath, manifest, payload, segmentationPath, landmarksPath, deformationPath };
}

test("maps Dropbox URIs below the configured root and rejects traversal", () => {
  assert.equal(
    resolveDropboxUri("dropbox://GEEHUB/Bridge/incoming/job.json", "/tmp/Dropbox"),
    path.join("/tmp/Dropbox", "GEEHUB", "Bridge", "incoming", "job.json")
  );
  assert.throws(() => resolveDropboxUri("dropbox://GEEHUB/../../outside", "/tmp/Dropbox"), /Unsafe/);
  assert.throws(() => resolveDropboxUri("dropbox://GEEHUB/%2e%2e/outside", "/tmp/Dropbox"), /Unsafe/);
});

test("stages a verified source, job JSON, and manifest without creating the output", async t => {
  const f = await fixture(t);
  const receipt = await stageBridgeExchange({
    manifest: f.manifest,
    jobId: "render-test",
    portableJob: f.payload,
    dropboxRoot: f.root
  });
  const stagedJob = JSON.parse(await readFile(receipt.jobPath, "utf8"));
  const stagedManifest = JSON.parse(await readFile(receipt.manifestPath, "utf8"));
  assert.equal(stagedJob.schema, "geehub.growth-render-job");
  assert.equal(stagedManifest.id, "bridge-test");
  assert.equal(receipt.sourceChecksum, sourceChecksum);
  assert.equal(receipt.declaredSourceChecksum, sourceChecksum);
  assert.equal(receipt.status, "staged");
  assert.equal(receipt.outputCreated, false);
  assert.equal(receipt.frameSetVerification.checked, 3);
  assert.equal(receipt.frameSetVerification.verified, 3);
  assert.equal(await readFile(f.sourcePath, "utf8"), sourceBytes);
  await assert.rejects(lstat(receipt.outputPath), { code: "ENOENT" });
});

test("refuses a source whose actual SHA-256 differs from the manifest", async t => {
  const f = await fixture(t);
  f.manifest.source.checksum = "0".repeat(64);
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /does not match/);
  await assert.rejects(lstat(resolveDropboxUri("dropbox://GEEHUB/Bridge/incoming/manifest.json", f.root)), { code: "ENOENT" });
});

test("refuses a missing input frame-set sidecar", async t => {
  const f = await fixture(t);
  await rm(f.segmentationPath);
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /Input frame-set file is missing/);
});

test("refuses an input frame-set sidecar with the wrong checksum", async t => {
  const f = await fixture(t);
  await writeFile(f.landmarksPath, "tampered evidence");
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /SHA-256 does not match/);
});

test("keeps legacy v1 render payloads stageable without the additive frame-evidence field", async t => {
  const f = await fixture(t);
  delete f.payload.frameEvidence;
  const receipt = await stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  });
  assert.equal(receipt.status, "staged");
  assert.equal(receipt.frameSetVerification.verified, 2);
});

test("refuses stale frame-evidence references before writing an exchange", async t => {
  const f = await fixture(t);
  f.payload.frameEvidence.sequenceId = "stale-sequence";
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /frame evidence disagrees/);
  await assert.rejects(lstat(resolveDropboxUri("dropbox://GEEHUB/Bridge/incoming/manifest.json", f.root)), { code: "ENOENT" });
});

test("refuses a portable job whose deformation topology reference differs from the manifest", async t => {
  const f = await fixture(t);
  f.payload.frameEvidence.topologyId = "d".repeat(64);
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /deformation evidence disagrees/);
});

test("refuses to overwrite a reserved output file", async t => {
  const f = await fixture(t);
  const output = resolveDropboxUri(f.manifest.renderJobs[0].outputUri, f.root);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, "existing render");
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /output already exists/);
  assert.equal(await readFile(output, "utf8"), "existing render");
});

test("refuses to overwrite an existing manifest or job file", async t => {
  const f = await fixture(t);
  const manifestPath = resolveDropboxUri("dropbox://GEEHUB/Bridge/incoming/manifest.json", f.root);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, "keep this");
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /Manifest destination already exists/);
  assert.equal(await readFile(manifestPath, "utf8"), "keep this");
});

test("rejects a symlinked exchange directory before writing", async t => {
  const f = await fixture(t);
  const incoming = path.join(f.root, "GEEHUB", "Bridge", "incoming");
  const outside = path.join(f.temp, "outside");
  await mkdir(path.dirname(incoming), { recursive: true });
  await mkdir(outside);
  await symlink(outside, incoming, "dir");
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: f.payload, dropboxRoot: f.root
  }), /symlink/);
});

test("rejects a portable job with identity protection disabled", async t => {
  const f = await fixture(t);
  const altered = structuredClone(f.payload);
  altered.constraints.protectFace = false;
  await assert.rejects(stageBridgeExchange({
    manifest: f.manifest, jobId: "render-test",
    portableJob: altered, dropboxRoot: f.root
  }), /protectFace/);
});
