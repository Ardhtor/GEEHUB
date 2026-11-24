import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decodeRgbaPng, encodeRgbaPng } from "./rgba-png.js";
import { buildTemporalScenePlate } from "./temporal-scene-plate.js";
import { writeTemporalScenePlateArtifact } from "./scene-plate-artifact.js";
import { composeGrowthFrameFiles } from "./complete-frame-file-compositor.js";

const videoChecksum = "c".repeat(64);
const planChecksum = "d".repeat(64);
const cameraChecksum = "a".repeat(64);

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodeGrayMask(width, height, pixels) {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width, width)
      .copy(raw, y * (width + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function makeFrame(frame, timeSeconds, {
  body = [], face = [2],
  colors = [[200, 10, 10], [10, 20, 30], [40, 50, 60]]
} = {}) {
  const data = new Uint8Array(colors.flatMap(color => [...color, 255]));
  const bodyPixels = new Uint8Array(3);
  const facePixels = new Uint8Array(3);
  for (const pixel of body) bodyPixels[pixel] = 255;
  for (const pixel of face) facePixels[pixel] = 255;
  return {
    frame, timeSeconds,
    source: { width: 3, height: 1, data },
    bodyMask: { width: 3, height: 1, pixels: bodyPixels },
    faceMask: { width: 3, height: 1, pixels: facePixels }
  };
}

function makeFrames(partial = false) {
  return [
    makeFrame(10, 0, { body: [0] }),
    makeFrame(11, 1, {
      body: [1],
      face: partial ? [0, 2] : [2],
      colors: [[20, 30, 40], [210, 20, 20], [40, 50, 60]]
    }),
    makeFrame(12, 2, {
      face: partial ? [0, 2] : [2],
      colors: [[22, 32, 42], [22, 32, 42], [40, 50, 60]]
    }),
    makeFrame(13, 3, {
      face: partial ? [0, 2] : [2],
      colors: [[21, 31, 41], [21, 31, 41], [40, 50, 60]]
    })
  ];
}

function makeRegistration(frames) {
  return {
    schema: "geehub.camera-registration-evidence",
    schemaVersion: 1,
    id: "camera-lock-001",
    checksum: cameraChecksum,
    status: "verified",
    mode: "fixed-camera",
    coordinateSpace: "source-pixel",
    verificationMethod: "operator-fixed-camera",
    width: 3,
    height: 1,
    frames: frames.map(frame => ({
      frame: frame.frame,
      timeSeconds: frame.timeSeconds,
      transform: { translateX: 0, translateY: 0, scale: 1, rotationDegrees: 0 }
    }))
  };
}

async function writeJson(filePath, value) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n");
  await writeFile(filePath, bytes);
  return { bytes, sha256: digest(bytes) };
}

async function makeFixture({ partial = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "geehub-frame-composite-"));
  const sourceDirectory = path.join(root, "source");
  const batchDirectory = path.join(root, "batch");
  const maskDirectory = path.join(root, "masks");
  const sceneDirectory = path.join(root, "scene-plate");
  await Promise.all([
    mkdir(sourceDirectory), mkdir(batchDirectory), mkdir(maskDirectory)
  ]);
  const frames = makeFrames(partial);
  const frame = frames[0];
  const registration = makeRegistration(frames);
  const plate = buildTemporalScenePlate(frames, registration);
  await writeTemporalScenePlateArtifact({
    plate,
    cameraRegistration: registration,
    outputDirectory: sceneDirectory
  });

  const sourceName = "frame-000000010.png";
  const sourcePath = path.join(sourceDirectory, sourceName);
  const sourceBytes = encodeRgbaPng({
    width: 3, height: 1, data: frame.source.data
  });
  await writeFile(sourcePath, sourceBytes);

  const bodyMaskPath = path.join(maskDirectory, "frame-10-body.png");
  const faceMaskPath = path.join(maskDirectory, "frame-10-face.png");
  const bodyMaskBytes = encodeGrayMask(3, 1, frame.bodyMask.pixels);
  const faceMaskBytes = encodeGrayMask(3, 1, frame.faceMask.pixels);
  await writeFile(bodyMaskPath, bodyMaskBytes);
  await writeFile(faceMaskPath, faceMaskBytes);

  const bodyData = new Uint8Array([
    80, 120, 160, partial ? 0 : 255,
    80, 120, 160, 255,
    0, 0, 0, 0
  ]);
  const bodyLayerBytes = encodeRgbaPng({ width: 3, height: 1, data: bodyData });
  const bodyLayerName = "frame-10.body.png";
  const bodyLayerPath = path.join(batchDirectory, bodyLayerName);
  await writeFile(bodyLayerPath, bodyLayerBytes);
  const bodyLayerReceiptName = bodyLayerName + ".receipt.json";
  const bodyLayerReceiptPath = path.join(batchDirectory, bodyLayerReceiptName);
  const sourceHash = digest(sourceBytes);
  const bodyMaskHash = digest(bodyMaskBytes);
  const faceMaskHash = digest(faceMaskBytes);
  const bodyLayerHash = digest(bodyLayerBytes);
  const bodyReceipt = {
    schema: "geehub.growth-frame-file-receipt.v1",
    status: "written",
    frame: 10,
    timeSeconds: 0,
    topologyId: "topology-001",
    vertexCount: 3,
    triangleCount: 1,
    inputs: {
      sourceFrame: { file: sourceName, sha256: sourceHash },
      bodyMask: { file: path.basename(bodyMaskPath), sha256: bodyMaskHash },
      protectedFaceMask: { file: path.basename(faceMaskPath), sha256: faceMaskHash },
      deformationPlan: { file: "frame-10.plan.json", sha256: planChecksum }
    },
    output: {
      file: bodyLayerName,
      path: bodyLayerPath,
      sha256: bodyLayerHash,
      byteLength: bodyLayerBytes.length,
      encoding: "png/rgba8"
    },
    raster: {
      coveredPixels: partial ? 1 : 2,
      renderedTriangles: 1,
      interpolation: "bilinear-premultiplied-alpha",
      pixelSemanticsVerified: false
    },
    sourceFrameUnmodified: true,
    outputCreatedExclusively: true
  };
  const bodyReceiptWrite = await writeJson(bodyLayerReceiptPath, bodyReceipt);

  const index = {
    schema: "geehub.source-frame-index",
    schemaVersion: 1,
    sourceAssetId: "asset-001",
    sourceChecksum: videoChecksum,
    sequenceId: "sequence-001",
    firstFrame: 10,
    lastFrame: 10,
    format: { width: 3, height: 1, fps: 1, frameCount: 1 },
    derivation: {
      schema: "geehub.source-frame-extraction",
      schemaVersion: 1,
      method: "ffmpeg-image2-png",
      sourceUri: "dropbox://GEEHUB/source/test.mp4",
      sourceChecksum: videoChecksum,
      streamIndex: 0,
      avgFrameRate: "1/1",
      timestampBasis: "best-effort-timestamp",
      timestampOriginSeconds: 0,
      timestampToleranceSeconds: 0.000001,
      probedFrameCount: 1,
      extractedFrameCount: 1,
      ffmpegVersion: "ffmpeg test fixture",
      ffprobeVersion: "ffprobe test fixture",
      sourceUnchangedAfterExtraction: true
    },
    frames: [{
      frame: 10,
      timeSeconds: 0,
      sourceTimestampSeconds: 0,
      sourceTimeFromOriginSeconds: 0,
      file: sourceName,
      sha256: sourceHash
    }]
  };
  const indexPath = path.join(sourceDirectory, "source-frame-index.json");
  const indexWrite = await writeJson(indexPath, index);

  const batchFrame = {
    frame: 10,
    timeSeconds: 0,
    sourceFrame: { file: sourceName, sha256: sourceHash },
    bodyMaskSha256: bodyMaskHash,
    protectedFaceMaskSha256: faceMaskHash,
    deformationPlanSha256: planChecksum,
    output: { file: bodyLayerName, sha256: bodyLayerHash, byteLength: bodyLayerBytes.length },
    receipt: { file: bodyLayerReceiptName, sha256: bodyReceiptWrite.sha256 },
    coveredPixels: partial ? 1 : 2,
    renderedTriangles: 1
  };
  const batchReceipt = {
    schema: "geehub.growth-frame-batch-receipt.v1",
    status: "complete",
    jobId: "job-001",
    manifestId: "manifest-001",
    manifestRevision: 1,
    sourceAssetId: "asset-001",
    sourceChecksum: videoChecksum,
    sequenceId: "sequence-001",
    sourceFrameIndex: {
      file: path.basename(indexPath),
      sha256: indexWrite.sha256
    },
    firstFrame: 10,
    lastFrame: 10,
    frameCount: 1,
    allFramesAccountedFor: true,
    sourceFramesUnmodified: true,
    sourceFrameDerivationVerified: true,
    sourceFramePixelsRevalidated: true,
    sourceFrameDerivationVerification: {
      schema: "geehub.source-frame-derivation-verification.v1",
      status: "verified",
      sourceChecksum: videoChecksum,
      streamIndex: 0,
      timestampBasis: "best-effort-timestamp",
      timestampOriginSeconds: 0,
      probedFrameCount: 1,
      extractedFrameCount: 1,
      pixelMatchedFrameCount: 1,
      extractionTools: { ffmpeg: "ffmpeg test fixture", ffprobe: "ffprobe test fixture" },
      verificationTools: { ffmpeg: "ffmpeg test fixture", ffprobe: "ffprobe test fixture" }
    },
    pixelSemanticsVerified: false,
    frames: [batchFrame]
  };
  const batchReceiptPath = path.join(batchDirectory, "sequence.receipt.json");
  await writeJson(batchReceiptPath, batchReceipt);

  return {
    root, sourcePath, bodyMaskPath, faceMaskPath: faceMaskPath,
    bodyLayerPath, batchReceiptPath, indexPath, sceneDirectory,
    outputPath: path.join(root, "complete-frame.png")
  };
}

async function withFixture(options, run) {
  const fixture = await makeFixture(options);
  try {
    await run(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function compose(fixture) {
  return composeGrowthFrameFiles({
    sourcePath: fixture.sourcePath,
    bodyMaskPath: fixture.bodyMaskPath,
    protectedFaceMaskPath: fixture.faceMaskPath,
    bodyLayerPath: fixture.bodyLayerPath,
    batchReceiptPath: fixture.batchReceiptPath,
    sourceFrameIndexPath: fixture.indexPath,
    scenePlateDirectory: fixture.sceneDirectory,
    outputPath: fixture.outputPath
  });
}

test("writes a verified single-frame PNG and binds every persisted input receipt", async () => {
  await withFixture({}, async fixture => {
    const originalSource = await readFile(fixture.sourcePath);
    const result = await compose(fixture);
    assert.equal(result.status, "written");
    assert.equal(result.compositionStatus, "complete-frame");
    assert.equal(result.readyForAssembly, true);
    assert.equal(result.readyForExport, false);
    assert.equal(result.sourceFrameDerivationVerified, true);
    assert.equal(result.sourceDerivationVerificationInheritedFromBatchReceipt, true);
    assert.equal(result.cameraRegistrationIndependentlyVerified, false);
    assert.equal(result.pixelSemanticsVerified, false);
    assert.equal(result.outputCreatedExclusively, true);

    const outputBytes = await readFile(result.outputPath);
    const output = decodeRgbaPng(outputBytes);
    assert.deepEqual(Array.from(output.data.slice(0, 4)), [80, 120, 160, 255]);
    assert.deepEqual(Array.from(output.data.slice(4, 8)), [80, 120, 160, 255]);
    assert.deepEqual(Array.from(output.data.slice(8, 12)), [40, 50, 60, 255]);
    assert.equal(digest(outputBytes), result.output.sha256);
    assert.deepEqual(await readFile(fixture.sourcePath), originalSource);

    const receiptBytes = await readFile(result.receiptPath);
    const receipt = JSON.parse(receiptBytes.toString("utf8"));
    assert.equal(receipt.schema, "geehub.composited-growth-frame-file-receipt.v1");
    assert.equal(receipt.compositionStatus, "complete-frame");
    assert.equal(receipt.counts.unresolvedPixels, 0);
    assert.equal(receipt.readyForExport, false);
    assert.equal(digest(receiptBytes), result.receiptSha256);
  });
});

test("persists an unresolved frame as partial instead of concealing missing background", async () => {
  await withFixture({ partial: true }, async fixture => {
    const result = await compose(fixture);
    assert.equal(result.compositionStatus, "partial-frame");
    assert.equal(result.readyForAssembly, false);
    assert.equal(result.counts.unresolvedPixels, 1);
    const output = decodeRgbaPng(await readFile(result.outputPath));
    assert.deepEqual(Array.from(output.data.slice(0, 4)), [200, 10, 10, 255]);
  });
});

test("rejects a changed scene-plate PNG even when its receipt remains present", async () => {
  await withFixture({}, async fixture => {
    const platePath = path.join(fixture.sceneDirectory, "scene-plate.png");
    const bytes = await readFile(platePath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(platePath, bytes);
    await assert.rejects(compose(fixture), { code: "frame-composite-scene-file-digest-mismatch" });
  });
});

test("rejects a source frame whose pixels no longer match the extracted index", async () => {
  await withFixture({}, async fixture => {
    const bytes = await readFile(fixture.sourcePath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(fixture.sourcePath, bytes);
    await assert.rejects(compose(fixture), { code: "frame-composite-source-frame-mismatch" });
  });
});

test("rejects a mask changed after the body layer was rendered", async () => {
  await withFixture({}, async fixture => {
    const bytes = await readFile(fixture.bodyMaskPath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(fixture.bodyMaskPath, bytes);
    await assert.rejects(compose(fixture), { code: "frame-composite-body-receipt-invalid" });
  });
});

test("refuses a batch receipt that does not carry independent source-frame verification", async () => {
  await withFixture({}, async fixture => {
    const batch = JSON.parse((await readFile(fixture.batchReceiptPath)).toString("utf8"));
    batch.sourceFramePixelsRevalidated = false;
    await writeJson(fixture.batchReceiptPath, batch);
    await assert.rejects(compose(fixture), { code: "frame-composite-batch-receipt-invalid" });
  });
});

test("refuses an existing output without changing it", async () => {
  await withFixture({}, async fixture => {
    await writeFile(fixture.outputPath, "preserve");
    await assert.rejects(compose(fixture), { code: "frame-composite-output-exists" });
    assert.equal((await readFile(fixture.outputPath)).toString("utf8"), "preserve");
  });
});

test("refuses a pre-existing receipt without leaving a new PNG behind", async () => {
  await withFixture({}, async fixture => {
    await writeFile(fixture.outputPath + ".receipt.json", "preserve");
    await assert.rejects(compose(fixture), { code: "frame-composite-output-exists" });
    await assert.rejects(readFile(fixture.outputPath), { code: "ENOENT" });
  });
});

test("rejects a scene plate whose frame timestamp differs from the indexed source", async () => {
  await withFixture({}, async fixture => {
    const receiptPath = path.join(fixture.sceneDirectory, "scene-plate.receipt.json");
    const receipt = JSON.parse((await readFile(receiptPath)).toString("utf8"));
    receipt.frames[0].timeSeconds = 0.5;
    await writeJson(receiptPath, receipt);
    await assert.rejects(compose(fixture), { code: "compositor-frame-time-mismatch" });
  });
});
