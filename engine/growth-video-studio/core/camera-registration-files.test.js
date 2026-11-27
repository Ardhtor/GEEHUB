import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import {
  mkdir, mkdtemp, readFile, rm, writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addBridgeFrameSet, createBridgeManifest } from "./bridge-manifest.js";
import { encodeRgbaPng } from "./rgba-png.js";
import {
  estimateFixedCameraRegistrationFromFiles,
  readCameraRegistrationArtifact
} from "./camera-registration-files.js";
import { cameraRegistrationChecksum } from "./camera-registration.js";

const WIDTH = 128;
const HEIGHT = 96;
const FPS = 2;
const SOURCE_CHECKSUM = "c".repeat(64);
const OPTIONS = {
  maxPixels: WIDTH * HEIGHT,
  estimatorOptions: {
    sampleStep: 4,
    minSamples: 24,
    maxSamples: 2000,
    minPatchStd: 2,
    maxMedianDescriptorError: 0.5,
    minTranslationImprovement: 0.04,
    minTranslationImprovementRatio: 0.15
  }
};

const digest = bytes => createHash("sha256").update(bytes).digest("hex");

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
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(output.subarray(4, 8 + data.length)), 8 + data.length);
  return output;
}

function encodeBinaryMask(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 0;
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    Buffer.from(pixels).copy(raw, y * (width + 1) + 1, y * width, (y + 1) * width);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function makeTexture() {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const value = (x * 37 + y * 53 + (x * y * 11) % 97) % 256;
      const offset = (y * WIDTH + x) * 4;
      data[offset] = value;
      data[offset + 1] = (value * 3 + 17) % 256;
      data[offset + 2] = (value * 7 + 31) % 256;
      data[offset + 3] = 255;
    }
  }
  return data;
}

function shiftImage(data, dx, dy) {
  const shifted = new Uint8Array(data.length);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const sourceX = x - dx;
      const sourceY = y - dy;
      if (sourceX < 0 || sourceX >= WIDTH || sourceY < 0 || sourceY >= HEIGHT) continue;
      const sourceOffset = (sourceY * WIDTH + sourceX) * 4;
      const targetOffset = (y * WIDTH + x) * 4;
      shifted.set(data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return shifted;
}

function shiftMask(pixels, dx, dy) {
  const shifted = new Uint8Array(pixels.length);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const sourceX = x - dx;
      const sourceY = y - dy;
      if (sourceX < 0 || sourceX >= WIDTH || sourceY < 0 || sourceY >= HEIGHT) continue;
      shifted[y * WIDTH + x] = pixels[sourceY * WIDTH + sourceX];
    }
  }
  return shifted;
}

function makeMasks(dx = 0, dy = 0) {
  const body = new Uint8Array(WIDTH * HEIGHT);
  const face = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 20; y < 76; y += 1) {
    for (let x = 44; x < 84; x += 1) body[y * WIDTH + x] = 255;
  }
  for (let y = 24; y < 42; y += 1) {
    for (let x = 56; x < 72; x += 1) {
      body[y * WIDTH + x] = 0;
      face[y * WIDTH + x] = 255;
    }
  }
  return {
    body: shiftMask(body, dx, dy),
    face: shiftMask(face, dx, dy)
  };
}

async function withFixture(run, { movingCamera = false } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "geehub-camera-files-"));
  try {
    const dropboxRoot = path.join(directory, "dropbox");
    const mediaDirectory = path.join(dropboxRoot, "GEEHUB", "Segmentation");
    const frameDirectory = path.join(directory, "extracted");
    await mkdir(mediaDirectory, { recursive: true });
    await mkdir(frameDirectory);
    const base = makeTexture();
    const sidecarFrames = [];
    const indexFrames = [];
    const inputFrameDigests = [];

    for (let offset = 0; offset < 3; offset += 1) {
      const frame = 10 + offset;
      const timeSeconds = offset / FPS;
      const dx = movingCamera && offset > 0 ? 2 : 0;
      const dy = movingCamera && offset > 0 ? -1 : 0;
      const sourceBytes = encodeRgbaPng({
        width: WIDTH,
        height: HEIGHT,
        data: movingCamera ? shiftImage(base, dx, dy) : base
      });
      const sourceName = "frame-" + String(frame).padStart(9, "0") + ".png";
      await writeFile(path.join(frameDirectory, sourceName), sourceBytes);
      inputFrameDigests.push(digest(sourceBytes));

      const masks = makeMasks(dx, dy);
      const bodyBytes = encodeBinaryMask(WIDTH, HEIGHT, masks.body);
      const faceBytes = encodeBinaryMask(WIDTH, HEIGHT, masks.face);
      const bodyName = "body-" + frame + ".png";
      const faceName = "face-" + frame + ".png";
      await writeFile(path.join(mediaDirectory, bodyName), bodyBytes);
      await writeFile(path.join(mediaDirectory, faceName), faceBytes);
      const bodyUri = "dropbox://GEEHUB/Segmentation/" + bodyName;
      const faceUri = "dropbox://GEEHUB/Segmentation/" + faceName;

      sidecarFrames.push({
        frame,
        timeSeconds,
        bodyMask: {
          uri: bodyUri, width: WIDTH, height: HEIGHT,
          checksum: digest(bodyBytes), excludesFace: true
        },
        faceMask: {
          uri: faceUri, width: WIDTH, height: HEIGHT,
          checksum: digest(faceBytes), protectsIdentity: true
        }
      });
      indexFrames.push({
        frame,
        timeSeconds,
        sourceTimestampSeconds: 10 + timeSeconds,
        sourceTimeFromOriginSeconds: timeSeconds,
        file: sourceName,
        sha256: digest(sourceBytes)
      });
    }

    const sequenceId = "camera-file-sequence-001";
    const sidecar = {
      schema: "geehub.frame-set-evidence",
      schemaVersion: 1,
      role: "segmentation",
      sourceAssetId: "source-camera-file-test",
      sequenceId,
      firstFrame: 10,
      lastFrame: 12,
      frameCount: 3,
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      pixelSemanticsVerified: false,
      frames: sidecarFrames
    };
    const sidecarBytes = Buffer.from(JSON.stringify(sidecar, null, 2) + "\n");
    const sidecarUri = "dropbox://GEEHUB/Segmentation/segmentation-sidecar.json";
    await writeFile(path.join(mediaDirectory, "segmentation-sidecar.json"), sidecarBytes);

    const manifest = addBridgeFrameSet(createBridgeManifest({
      projectId: "camera-file-test",
      source: {
        id: "source-camera-file-test",
        name: "synthetic-camera-test.mp4",
        uri: "dropbox://GEEHUB/Media/synthetic-camera-test.mp4",
        duration: 8,
        width: WIDTH,
        height: HEIGHT,
        checksum: SOURCE_CHECKSUM,
        immutable: true
      }
    }), {
      id: "segmentation-camera-file-test",
      role: "segmentation",
      uri: sidecarUri,
      firstFrame: 10,
      lastFrame: 12,
      frameCount: 3,
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      checksum: digest(sidecarBytes),
      metadata: { sequenceId, pixelSemanticsVerified: false }
    });
    const manifestPath = path.join(directory, "bridge-manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const index = {
      schema: "geehub.source-frame-index",
      schemaVersion: 1,
      sourceAssetId: manifest.source.id,
      sourceChecksum: SOURCE_CHECKSUM,
      sequenceId,
      firstFrame: 10,
      lastFrame: 12,
      format: { width: WIDTH, height: HEIGHT, fps: FPS, frameCount: 3 },
      derivation: {
        schema: "geehub.source-frame-extraction",
        schemaVersion: 1,
        method: "ffmpeg-image2-png",
        sourceUri: manifest.source.uri,
        sourceChecksum: SOURCE_CHECKSUM,
        streamIndex: 0,
        avgFrameRate: "2/1",
        timestampBasis: "best_effort_timestamp_time",
        timestampOriginSeconds: 10,
        timestampToleranceSeconds: 0.001,
        probedFrameCount: 40,
        extractedFrameCount: 3,
        ffmpegVersion: "ffmpeg synthetic fixture",
        ffprobeVersion: "ffprobe synthetic fixture",
        sourceUnchangedAfterExtraction: true
      },
      frames: indexFrames
    };
    const indexPath = path.join(frameDirectory, "source-frame-index.json");
    await writeFile(indexPath, JSON.stringify(index, null, 2) + "\n");
    await run({
      directory, dropboxRoot, mediaDirectory, frameDirectory,
      manifest, manifestPath, index, indexPath, sidecar,
      sidecarPath: path.join(mediaDirectory, "segmentation-sidecar.json"),
      outputPath: path.join(directory, "camera-registration.json"),
      inputFrameDigests
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const runRegistration = fixture => estimateFixedCameraRegistrationFromFiles({
  manifestPath: fixture.manifestPath,
  segmentationFrameSetId: "segmentation-camera-file-test",
  sourceFrameIndexPath: fixture.indexPath,
  dropboxRoot: fixture.dropboxRoot,
  outputPath: fixture.outputPath,
  options: OPTIONS
});

test("measures the actual indexed PNGs and writes a manifest-bound camera artifact", async () => {
  await withFixture(async fixture => {
    const result = await runRegistration(fixture);
    assert.equal(result.status, "written");
    assert.equal(result.registration.status, "verified");
    assert.equal(result.cameraRegistrationIndependentlyVerified, true);
    assert.equal(result.sourceFrameDerivationVerified, false);
    assert.equal(result.registration.fileEvidence.status, "verified");
    assert.equal(result.registration.fileEvidence.frames.length, 3);
    assert.equal(result.registration.fileEvidence.sourceFramesVerifiedAgainstIndex, true);
    assert.equal(result.registration.fileEvidence.maskFilesVerifiedAgainstSidecar, true);
    assert.equal(result.registration.checksum, cameraRegistrationChecksum(result.registration));
    const readBack = await readCameraRegistrationArtifact(fixture.outputPath);
    assert.equal(readBack.registration.checksum, result.registration.checksum);
    assert.equal(readBack.sha256, result.artifactSha256);
    const receipt = JSON.parse((await readFile(result.receiptPath)).toString("utf8"));
    assert.equal(receipt.schema, "geehub.camera-registration-file-receipt.v1");
    assert.equal(receipt.cameraRegistration.sha256, result.artifactSha256);
    assert.equal(receipt.inputs.sourceFrameIndex.sha256, digest(
      await readFile(fixture.indexPath)
    ));
    assert.deepEqual(fixture.inputFrameDigests, result.registration.fileEvidence.frames.map(
      item => item.sourceFrame.sha256
    ));
  }, { movingCamera: false });
});

test("records measured translation as unverified instead of claiming a fixed camera", async () => {
  await withFixture(async fixture => {
    const result = await runRegistration(fixture);
    assert.equal(result.registration.status, "unverified");
    assert.equal(result.registration.mode, "unverified");
    assert.equal(result.cameraRegistrationIndependentlyVerified, false);
    assert.equal(result.registration.frames[1].measurement.reason, "camera-translation-detected");
    assert.deepEqual(result.registration.frames[1].measurement.estimatedTranslation, { x: 2, y: -1 });
    const readBack = await readCameraRegistrationArtifact(fixture.outputPath);
    assert.equal(readBack.registration.status, "unverified");
  }, { movingCamera: true });
});

test("rejects a source PNG changed after its frame index was written", async () => {
  await withFixture(async fixture => {
    const sourcePath = path.join(fixture.frameDirectory, fixture.index.frames[0].file);
    const bytes = await readFile(sourcePath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(sourcePath, bytes);
    await assert.rejects(runRegistration(fixture), {
      code: "camera-registration-source-frame-checksum-mismatch"
    });
  });
});

test("rejects a mask whose bytes differ from the registered segmentation sidecar", async () => {
  await withFixture(async fixture => {
    const uri = fixture.sidecar.frames[0].bodyMask.uri;
    const maskPath = path.join(fixture.dropboxRoot, "GEEHUB", uri.slice("dropbox://GEEHUB/".length));
    const bytes = await readFile(maskPath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(maskPath, bytes);
    await assert.rejects(runRegistration(fixture), {
      code: "camera-registration-mask-checksum-mismatch"
    });
  });
});

test("rejects a segmentation sidecar changed after manifest registration", async () => {
  await withFixture(async fixture => {
    await writeFile(fixture.sidecarPath, (await readFile(fixture.sidecarPath)).toString("utf8") + " ");
    await assert.rejects(runRegistration(fixture), {
      code: "camera-registration-sidecar-checksum-mismatch"
    });
  });
});

test("refuses an existing artifact path without replacing its contents", async () => {
  await withFixture(async fixture => {
    await writeFile(fixture.outputPath, "preserve");
    await assert.rejects(runRegistration(fixture), {
      code: "camera-registration-output-exists"
    });
    assert.equal((await readFile(fixture.outputPath)).toString("utf8"), "preserve");
  });
});

test("recomputes the persisted evidence checksum when an artifact is read", async () => {
  await withFixture(async fixture => {
    const result = await runRegistration(fixture);
    const record = JSON.parse((await readFile(fixture.outputPath)).toString("utf8"));
    record.fileEvidence.frames[0].sourceFrame.sha256 = "d".repeat(64);
    await writeFile(fixture.outputPath, JSON.stringify(record, null, 2) + "\n");
    await assert.rejects(readCameraRegistrationArtifact(fixture.outputPath), {
      code: "camera-registration-artifact-invalid"
    });
    assert.ok(result.artifactSha256);
  });
});

test("rejects a source-index timestamp that differs from its registered segmentation frame", async () => {
  await withFixture(async fixture => {
    fixture.index.frames[1].timeSeconds += 0.1;
    await writeFile(fixture.indexPath, JSON.stringify(fixture.index, null, 2) + "\n");
    await assert.rejects(runRegistration(fixture), {
      code: "camera-registration-frame-lineage"
    });
  });
});
