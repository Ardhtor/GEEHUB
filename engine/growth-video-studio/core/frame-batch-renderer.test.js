import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import {
  mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBridgeManifest, addBridgeFrameSet, queueBridgeRenderJob } from "./bridge-manifest.js";
import { encodeRgbaPng, decodeRgbaPng } from "./rgba-png.js";
import { renderGrowthFrameBatchFiles } from "./frame-batch-renderer.js";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const sha256 = value => createHash("sha256").update(value).digest("hex");

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodeMask(width, height, pixels) {
  const rows = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    rows[y * (width + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width, width)
      .copy(rows, y * (width + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 0;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function makeSource(frame) {
  const width = 8, height = 8;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = x * 20;
      data[offset + 1] = y * 20;
      data[offset + 2] = 80 + frame;
      data[offset + 3] = 255;
    }
  }
  return encodeRgbaPng({ width, height, data });
}

function makeMasks() {
  const body = new Uint8Array(64).fill(255);
  const face = new Uint8Array(64);
  body[63] = 0;
  face[63] = 255;
  return { body: encodeMask(8, 8, body), face: encodeMask(8, 8, face) };
}

function makeGeometry() {
  const vertexIds = Array.from({ length: 9 }, (_, index) => "v" + index);
  const triangleIds = Array.from({ length: 8 }, (_, index) => "t" + index);
  const triangles = [
    [0, 1, 3], [1, 4, 3], [1, 2, 4], [2, 5, 4],
    [3, 4, 6], [4, 7, 6], [4, 5, 7], [5, 8, 7]
  ];
  const sourcePoints = [
    { x: 1, y: 1 }, { x: 4, y: 1 }, { x: 7, y: 1 },
    { x: 1, y: 4 }, { x: 4, y: 4 }, { x: 7, y: 4 },
    { x: 1, y: 6 }, { x: 4, y: 6 }, { x: 7, y: 6 }
  ];
  const topology = { columns: 2, rows: 2, vertexIds, triangleIds, triangles };
  return {
    vertexIds, triangleIds, triangles, sourcePoints,
    grid: { columns: 2, rows: 2, vertexCount: 9 },
    usedVertexIds: [...vertexIds],
    topologyId: sha256(JSON.stringify(topology))
  };
}

function makePlan(frame, timeSeconds, geometry) {
  return {
    schema: "geehub.growth-deformation-frame",
    schemaVersion: 1,
    status: "ready-for-render",
    renderable: true,
    frame,
    timeSeconds,
    topologyId: geometry.topologyId,
    vertexIds: geometry.vertexIds,
    triangleIds: geometry.triangleIds,
    triangles: geometry.triangles,
    sourcePoints: geometry.sourcePoints,
    targetPoints: geometry.sourcePoints.map(point => ({
      x: point.x + frame * 0.1,
      y: point.y
    }))
  };
}

async function putDropbox(root, uri, bytes) {
  const relative = uri.slice("dropbox://GEEHUB/".length);
  const target = path.join(root, "GEEHUB", ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return target;
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "geehub-frame-batch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dropboxRoot = path.join(root, "Dropbox");
  const sourceDirectory = path.join(root, "extracted-frames");
  const bundleDirectory = path.join(root, "prepared-job");
  await Promise.all([
    mkdir(dropboxRoot),
    mkdir(sourceDirectory),
    mkdir(bundleDirectory)
  ]);

  const sourceChecksum = sha256(Buffer.from("immutable-source-video"));
  const source = {
    id: "source-asset-1",
    name: "portrait-source.mov",
    uri: "dropbox://GEEHUB/Sources/portrait-source.mov",
    duration: 1,
    width: 8,
    height: 8,
    checksum: sourceChecksum,
    immutable: true
  };
  const sequenceId = "sequence-001";
  const geometry = makeGeometry();
  const times = [0, 0.5];
  const masks = makeMasks();
  const segmentationFrames = [];
  const landmarkFrames = [];
  const meshFrames = [];
  const sourceFrames = [];
  const sourceBytes = [];

  for (let index = 0; index < 2; index += 1) {
    const frame = index;
    const bodyUri = "dropbox://GEEHUB/Masks/body-" + frame + ".png";
    const faceUri = "dropbox://GEEHUB/Masks/face-" + frame + ".png";
    await putDropbox(dropboxRoot, bodyUri, masks.body);
    await putDropbox(dropboxRoot, faceUri, masks.face);
    segmentationFrames.push({
      frame, timeSeconds: times[index],
      bodyMask: { uri: bodyUri, checksum: sha256(masks.body), excludesFace: true },
      faceMask: { uri: faceUri, checksum: sha256(masks.face), protectsIdentity: true }
    });
    const landmarks = {
      faceCenter: { x: 0.5, y: 0.1 },
      neck: { x: 0.5, y: 0.2 },
      leftShoulder: { x: 0.35, y: 0.25 },
      rightShoulder: { x: 0.65, y: 0.25 },
      leftElbow: { x: 0.3, y: 0.4 },
      rightElbow: { x: 0.7, y: 0.4 },
      leftWrist: { x: 0.25, y: 0.55 },
      rightWrist: { x: 0.75, y: 0.55 },
      leftHip: { x: 0.45, y: 0.5 },
      rightHip: { x: 0.55, y: 0.5 },
      leftKnee: { x: 0.44, y: 0.72 },
      rightKnee: { x: 0.56, y: 0.72 },
      leftAnkle: { x: 0.43, y: 0.95 },
      rightAnkle: { x: 0.57, y: 0.95 },
      leftEye: { x: 0.47, y: 0.08 },
      rightEye: { x: 0.53, y: 0.08 },
      nose: { x: 0.5, y: 0.1 },
      chin: { x: 0.5, y: 0.14 }
    };
    landmarkFrames.push({
      frame, timeSeconds: times[index],
      identityConfidence: 0.99,
      poseConfidence: 0.99,
      landmarks
    });
    meshFrames.push({
      frame, timeSeconds: times[index],
      bounds: { left: 1, top: 1, right: 7, bottom: 6 },
      sourcePoints: geometry.sourcePoints
    });
    const bytes = makeSource(frame);
    sourceBytes.push(bytes);
    const file = "frame-" + frame + ".png";
    await writeFile(path.join(sourceDirectory, file), bytes, { flag: "wx" });
    sourceFrames.push({
      frame, timeSeconds: times[index], file, sha256: sha256(bytes)
    });
  }

  const segmentationDocument = {
    schema: "geehub.frame-set-evidence",
    schemaVersion: 1,
    role: "segmentation",
    sourceAssetId: source.id,
    sequenceId,
    firstFrame: 0, lastFrame: 1, frameCount: 2,
    width: 8, height: 8, fps: 2,
    pixelSemanticsVerified: false,
    frames: segmentationFrames
  };
  const landmarksDocument = {
    schema: "geehub.frame-set-evidence",
    schemaVersion: 1,
    role: "landmarks",
    sourceAssetId: source.id,
    sequenceId,
    firstFrame: 0, lastFrame: 1, frameCount: 2,
    width: 8, height: 8, fps: 2,
    frames: landmarkFrames
  };
  const deformationDocument = {
    schema: "geehub.mask-mesh-evidence",
    schemaVersion: 1,
    role: "deformation",
    sourceAssetId: source.id,
    sequenceId,
    firstFrame: 0, lastFrame: 1, frameCount: 2,
    width: 8, height: 8, fps: 2,
    pixelSemanticsVerified: false,
    topologyId: geometry.topologyId,
    grid: geometry.grid,
    vertexIds: geometry.vertexIds,
    usedVertexIds: geometry.usedVertexIds,
    triangleIds: geometry.triangleIds,
    triangles: geometry.triangles,
    frames: meshFrames,
    coverage: { ratio: 1 },
    evidence: {
      source: "decoded-binary-body-and-face-masks",
      faceExclusionVerified: true,
      edgeConnected: true,
      pixelSemanticsVerified: false
    }
  };
  const segmentationText = JSON.stringify(segmentationDocument, null, 2) + "\n";
  const landmarksText = JSON.stringify(landmarksDocument, null, 2) + "\n";
  const deformationText = JSON.stringify(deformationDocument, null, 2) + "\n";
  const segmentationUri = "dropbox://GEEHUB/Bridge/registered/segmentation.json";
  const landmarksUri = "dropbox://GEEHUB/Bridge/registered/landmarks.json";
  const deformationUri = "dropbox://GEEHUB/Bridge/registered/deformation.json";
  await Promise.all([
    putDropbox(dropboxRoot, segmentationUri, Buffer.from(segmentationText)),
    putDropbox(dropboxRoot, landmarksUri, Buffer.from(landmarksText)),
    putDropbox(dropboxRoot, deformationUri, Buffer.from(deformationText))
  ]);

  let manifest = createBridgeManifest({
    projectId: "growth-video-studio",
    projectVersion: "v001",
    source,
    manifestId: "bridge-001"
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "segmentation-001", role: "segmentation", uri: segmentationUri,
    firstFrame: 0, lastFrame: 1, frameCount: 2, width: 8, height: 8, fps: 2,
    checksum: sha256(Buffer.from(segmentationText)), metadata: { sequenceId }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "landmarks-001", role: "landmarks", uri: landmarksUri,
    firstFrame: 0, lastFrame: 1, frameCount: 2, width: 8, height: 8, fps: 2,
    checksum: sha256(Buffer.from(landmarksText)), metadata: { sequenceId }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "deformation-001", role: "deformation", uri: deformationUri,
    firstFrame: 0, lastFrame: 1, frameCount: 2, width: 8, height: 8, fps: 2,
    checksum: sha256(Buffer.from(deformationText)),
    metadata: {
      sequenceId,
      evidenceSchema: "geehub.mask-mesh-evidence.v1",
      topologyId: geometry.topologyId,
      vertexCount: geometry.vertexIds.length,
      triangleCount: geometry.triangles.length
    }
  });

  const frameEvidence = {
    schema: "geehub.render-frame-evidence",
    schemaVersion: 1,
    sequenceId,
    segmentationFrameSetId: "segmentation-001",
    landmarksFrameSetId: "landmarks-001",
    deformationFrameSetId: "deformation-001",
    segmentationChecksum: sha256(Buffer.from(segmentationText)),
    landmarksChecksum: sha256(Buffer.from(landmarksText)),
    deformationChecksum: sha256(Buffer.from(deformationText)),
    topologyId: geometry.topologyId,
    vertexCount: geometry.vertexIds.length,
    triangleCount: geometry.triangles.length,
    firstFrame: 0, lastFrame: 1, frameCount: 2,
    width: 8, height: 8, fps: 2,
    pixelDataVerified: true,
    faceExclusionVerified: true,
    maskPixelAudit: {
      encoding: "png/grayscale8/binary",
      pixelDataVerified: true,
      faceExclusionVerified: true,
      pairsChecked: 2,
      disjointPairs: 2,
      overlapPixels: 0,
      frames: [
        { frame: 0, bodyForegroundPixels: 63, faceForegroundPixels: 1, overlapPixels: 0 },
        { frame: 1, bodyForegroundPixels: 63, faceForegroundPixels: 1, overlapPixels: 0 }
      ]
    },
    pixelSemanticsVerified: false
  };
  const portableJob = {
    schema: "geehub.growth-render-job",
    schemaVersion: 1,
    status: "ready-for-renderer",
    source,
    output: { width: 8, height: 8, fps: 2, format: "mp4" },
    growthStates: [{ id: "baseline" }, { id: "grown" }],
    landmarkFrames,
    frameEvidence,
    constraints: {
      protectFace: true,
      preserveSourceMotion: true,
      preserveGroundContact: true,
      deformBodyAsConnectedMesh: true,
      garmentResponse: true,
      environmentResponse: true,
      temporalStability: true
    }
  };
  manifest = queueBridgeRenderJob(manifest, {
    id: "render-job-001",
    jobUri: "dropbox://GEEHUB/Bridge/incoming/jobs/render-job-001.json",
    portableJob,
    inputFrameSetIds: ["segmentation-001", "landmarks-001", "deformation-001"],
    outputUri: "dropbox://GEEHUB/Exports/render-job-001.mp4",
    renderer: "geehub-frame-worker"
  });

  const plans = times.map((time, frame) => makePlan(frame, time, geometry));
  const planBundle = {
    schema: "geehub.render-plan-bundle",
    schemaVersion: 1,
    status: "ready-for-render",
    jobId: "render-job-001",
    sequenceId,
    sourceAssetId: source.id,
    frameEvidence,
    planSequence: {
      schema: "geehub.render-plan-sequence",
      schemaVersion: 1,
      status: "ready-for-render",
      renderable: true,
      topologyId: geometry.topologyId,
      frameCount: 2,
      firstFrame: 0,
      lastFrame: 1,
      sourceDurationSeconds: 1,
      growthStateIds: ["baseline", "grown"],
      temporal: { status: "stable", violations: [] },
      frames: plans
    }
  };
  const sourceFrameIndex = {
    schema: "geehub.source-frame-index",
    schemaVersion: 1,
    sourceAssetId: source.id,
    sourceChecksum,
    sequenceId,
    firstFrame: 0,
    lastFrame: 1,
    format: { width: 8, height: 8, fps: 2, frameCount: 2 },
    frames: sourceFrames
  };

  const manifestPath = path.join(bundleDirectory, "job.manifest.json");
  const renderJobPath = path.join(bundleDirectory, "job.render-job.json");
  const deformationPlansPath = path.join(bundleDirectory, "job.deformation-plans.json");
  const sourceFrameIndexPath = path.join(sourceDirectory, "source-frame-index.json");
  await Promise.all([
    writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" }),
    writeFile(renderJobPath, JSON.stringify(portableJob, null, 2) + "\n", { flag: "wx" }),
    writeFile(deformationPlansPath, JSON.stringify(planBundle, null, 2) + "\n", { flag: "wx" }),
    writeFile(sourceFrameIndexPath, JSON.stringify(sourceFrameIndex, null, 2) + "\n", { flag: "wx" })
  ]);

  return {
    root, dropboxRoot, sourceDirectory, bundleDirectory,
    manifestPath, renderJobPath, deformationPlansPath, sourceFrameIndexPath,
    outputDirectory: path.join(root, "rendered-body-layers"),
    sourceFramePaths: sourceFrames.map(frame => path.join(sourceDirectory, frame.file)),
    sourceBytes, masks, segmentationUri, bodyMaskUri: segmentationFrames[0].bodyMask.uri,
    render: () => renderGrowthFrameBatchFiles({
      manifestPath, renderJobPath, deformationPlansPath, sourceFrameIndexPath,
      outputDirectory: path.join(root, "rendered-body-layers"), dropboxRoot
    })
  };
}

test("renders every registered frame and publishes a sequence receipt last", async t => {
  const input = await fixture(t);
  const result = await input.render();
  assert.equal(result.schema, "geehub.growth-frame-batch-receipt.v1");
  assert.equal(result.status, "complete");
  assert.equal(result.frameCount, 2);
  assert.equal(result.allFramesAccountedFor, true);
  assert.equal(result.sourceFramesUnmodified, true);
  assert.equal(result.sourceFrameDerivationVerified, false);
  assert.equal(result.pixelSemanticsVerified, false);
  assert.equal(result.frames.length, 2);
  assert.equal(result.frames[0].frame, 0);
  assert.equal(result.frames[1].frame, 1);
  assert.equal(result.registeredSidecars.landmarks.frameSetId, "landmarks-001");
  const sequenceReceiptBytes = await readFile(result.receiptPath);
  assert.equal(sha256(sequenceReceiptBytes), result.receiptSha256);
  assert.equal(JSON.parse(sequenceReceiptBytes.toString("utf8")).allFramesAccountedFor, true);
  for (let index = 0; index < result.frames.length; index += 1) {
    const frame = result.frames[index];
    const outputPath = path.join(input.outputDirectory, frame.output.file);
    const outputBytes = await readFile(outputPath);
    assert.equal(sha256(outputBytes), frame.output.sha256);
    assert.equal(decodeRgbaPng(outputBytes).width, 8);
    const frameReceipt = JSON.parse(await readFile(path.join(input.outputDirectory, frame.receipt.file), "utf8"));
    assert.equal(frameReceipt.inputs.sourceFrame.sha256, sha256(input.sourceBytes[index]));
    assert.equal(frameReceipt.inputs.bodyMask.sha256, sha256(input.masks.body));
    assert.equal(frameReceipt.inputs.protectedFaceMask.sha256, sha256(input.masks.face));
    assert.deepEqual(await readFile(input.sourceFramePaths[index]), input.sourceBytes[index]);
  }
  assert.equal((await readdir(input.outputDirectory)).length, 5);
});

test("rejects a changed registered mask before creating the output directory", async t => {
  const input = await fixture(t);
  const relative = input.bodyMaskUri.slice("dropbox://GEEHUB/".length);
  const bodyPath = path.join(input.dropboxRoot, "GEEHUB", ...relative.split("/"));
  await writeFile(bodyPath, Buffer.from("changed mask"));
  await assert.rejects(input.render(), error => error.code === "batch-mask-checksum-mismatch");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("rejects an altered registered sidecar even when its JSON remains readable", async t => {
  const input = await fixture(t);
  const relative = input.segmentationUri.slice("dropbox://GEEHUB/".length);
  const sidecarPath = path.join(input.dropboxRoot, "GEEHUB", ...relative.split("/"));
  await writeFile(sidecarPath, Buffer.from("{}"));
  await assert.rejects(input.render(), error => error.code === "batch-sidecar-checksum-mismatch");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("rejects a source frame whose bytes differ from the extraction index", async t => {
  const input = await fixture(t);
  await writeFile(input.sourceFramePaths[0], Buffer.from("changed source frame"));
  await assert.rejects(input.render(), error => error.code === "batch-source-frame-checksum-mismatch");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("rolls back earlier frame layers when a later frame cannot be decoded", async t => {
  const input = await fixture(t);
  const invalid = Buffer.from("not a PNG");
  await writeFile(input.sourceFramePaths[1], invalid);
  const index = JSON.parse(await readFile(input.sourceFrameIndexPath, "utf8"));
  index.frames[1].sha256 = sha256(invalid);
  await writeFile(input.sourceFrameIndexPath, JSON.stringify(index, null, 2) + "\n");
  await assert.rejects(input.render());
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("refuses an existing output directory without changing its contents", async t => {
  const input = await fixture(t);
  await mkdir(input.outputDirectory);
  const sentinel = path.join(input.outputDirectory, "keep.txt");
  await writeFile(sentinel, "preserve");
  await assert.rejects(input.render(), error => error.code === "EEXIST");
  assert.equal(await readFile(sentinel, "utf8"), "preserve");
});

test("rejects a symlinked registered mask path", async t => {
  const input = await fixture(t);
  const relative = input.bodyMaskUri.slice("dropbox://GEEHUB/".length);
  const bodyPath = path.join(input.dropboxRoot, "GEEHUB", ...relative.split("/"));
  const replacement = bodyPath + ".real";
  await writeFile(replacement, input.masks.body, { flag: "wx" });
  await rm(bodyPath);
  await symlink(replacement, bodyPath);
  await assert.rejects(input.render(), error => error.code === "batch-dropbox-symlink");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});


test("rejects a source-frame index entry that tries to escape its frame directory", async t => {
  const input = await fixture(t);
  const index = JSON.parse(await readFile(input.sourceFrameIndexPath, "utf8"));
  index.frames[0].file = "../frame-0.png";
  await writeFile(input.sourceFrameIndexPath, JSON.stringify(index, null, 2) + "\n");
  await assert.rejects(input.render(), error => error.code === "batch-source-frame-entry-invalid");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("rejects a plan whose source coordinates no longer match the registered mesh", async t => {
  const input = await fixture(t);
  const bundle = JSON.parse(await readFile(input.deformationPlansPath, "utf8"));
  bundle.planSequence.frames[0].sourcePoints[0].x += 0.25;
  await writeFile(input.deformationPlansPath, JSON.stringify(bundle, null, 2) + "\n");
  await assert.rejects(input.render(), error => error.code === "batch-plan-frame-mismatch");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});
