import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, lstat, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { createBridgeManifest, addBridgeFrameSet } from "./bridge-manifest.js";
import { createGrowthState, createChildState, BASELINE } from "./growth-state.js";
import { REQUIRED_ANCHORS } from "./landmark-track.js";
import { decodeBinaryMaskPng } from "./mask-pixels.js";
import { buildStableMaskMesh } from "./mask-mesh.js";
import { validateFrameSequencePackage } from "./frame-sequence.js";
import { createMaskMeshEvidence } from "./frame-sequence-bridge.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, "../tools/prepare-bridge-render-job.js");
const sha = value => createHash("sha256").update(value).digest("hex");
const source = {
  id: "cli-source", name: "cli-source.mp4", uri: "dropbox://GEEHUB/Assets/cli-source.mp4",
  duration: 1, width: 16, height: 24, immutable: true
};
const sequenceId = "cli-sequence";
const range = { firstFrame: 0, lastFrame: 1, frameCount: 2, width: 16, height: 24, fps: 24 };
const anchors = [...new Set([...REQUIRED_ANCHORS, "leftEye", "rightEye", "nose", "chin"])];

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
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function pngMask(width, height, role) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const rows = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    const row = y * (width + 1);
    for (let x = 0; x < width; x += 1) {
      const face = x >= 6 && x <= 9 && y >= 2 && y <= 5;
      const body = x >= 2 && x <= width - 3 && y >= 7 && y <= height - 3;
      rows[row + 1 + x] = (role === "face" ? face : body) ? 255 : 0;
    }
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

async function fixture(t) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "geehub-render-job-cli-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const root = path.join(temp, "Dropbox");
  const pngByRole = {
    body: pngMask(source.width, source.height, "body"),
    face: pngMask(source.width, source.height, "face")
  };
  const maskFiles = [];
  const frames = [0, 1].map(frame => {
    const makeMask = role => {
      const uri = "dropbox://GEEHUB/FrameEvidence/" + role + "-" + frame + ".png";
      const relative = uri.slice("dropbox://GEEHUB/".length);
      const filePath = path.join(root, "GEEHUB", ...relative.split("/"));
      const bytes = pngByRole[role];
      maskFiles.push({ filePath, bytes });
      return {
        uri,
        checksum: sha(bytes),
        ...(role === "body" ? { excludesFace: true } : { protectsIdentity: true })
      };
    };
    return {
      frame,
      timeSeconds: frame / 24,
      model: "test-segmenter",
      confidence: 0.99,
      bodyMask: makeMask("body"),
      faceMask: makeMask("face")
    };
  });
  for (const file of maskFiles) {
    await mkdir(path.dirname(file.filePath), { recursive: true });
    await writeFile(file.filePath, file.bytes);
  }
  const segmentationDocument = {
    schema: "geehub.frame-set-evidence", schemaVersion: 1, role: "segmentation",
    sequenceId, sourceAssetId: source.id, ...range, pixelSemanticsVerified: false,
    maskPixelAudit: {
      encoding: "png/grayscale8/binary",
      pixelDataVerified: true,
      faceExclusionVerified: true,
      pairsChecked: 2,
      disjointPairs: 2,
      overlapPixels: 0,
      frames: [0, 1].map(frame => ({
        frame, bodyForegroundPixels: 180, faceForegroundPixels: 16, overlapPixels: 0
      }))
    },
    frames
  };
  const landmarksDocument = {
    schema: "geehub.frame-set-evidence", schemaVersion: 1, role: "landmarks",
    sequenceId, sourceAssetId: source.id, ...range,
    frames: [0, 1].map(frame => ({
      frame, timeSeconds: frame / 24, identityConfidence: 0.99, poseConfidence: 0.98,
      landmarks: Object.fromEntries(anchors.map((name, index) => [name, {
        x: 0.35 + index * 0.001, y: 0.4 + index * 0.001, confidence: 0.99
      }]))
    }))
  };
  const segmentationText = JSON.stringify(segmentationDocument, null, 2) + "\n";
  const landmarksText = JSON.stringify(landmarksDocument, null, 2) + "\n";
  const sequence = {
    schema: "geehub.frame-sequence", schemaVersion: 1, id: sequenceId,
    source: structuredClone(source),
    format: { width: source.width, height: source.height, fps: range.fps, frameCount: range.frameCount },
    firstFrame: range.firstFrame, startTimeSeconds: 0,
    frames: segmentationDocument.frames.map((frame, index) => {
      const track = landmarksDocument.frames[index];
      return {
        frame: frame.frame, timeSeconds: frame.timeSeconds,
        sourceAssetId: source.id, width: source.width, height: source.height,
        identityConfidence: track.identityConfidence, poseConfidence: track.poseConfidence,
        landmarks: structuredClone(track.landmarks),
        segmentation: {
          sourceAssetId: source.id, frame: frame.frame, width: source.width, height: source.height,
          model: frame.model, confidence: frame.confidence,
          bodyMask: { ...frame.bodyMask, role: "body", width: source.width, height: source.height },
          faceMask: { ...frame.faceMask, role: "face", width: source.width, height: source.height }
        }
      };
    })
  };
  const sequenceCheck = validateFrameSequencePackage(sequence);
  assert.equal(sequenceCheck.valid, true, JSON.stringify(sequenceCheck.errors));
  const decodedBody = decodeBinaryMaskPng(pngByRole.body);
  const decodedFace = decodeBinaryMaskPng(pngByRole.face);
  const maskMesh = buildStableMaskMesh(sequence.frames.map(frame => ({
    frame: frame.frame, timeSeconds: frame.timeSeconds,
    bodyMask: decodedBody, faceMask: decodedFace
  })));
  assert.equal(maskMesh.status, "ready");
  const deformationDocument = createMaskMeshEvidence(maskMesh, sequence, sequenceCheck);
  const deformationText = JSON.stringify(deformationDocument, null, 2) + "\n";
  const segmentationPath = path.join(root, "GEEHUB", "Bridge", "evidence", "segmentation.json");
  const landmarksPath = path.join(root, "GEEHUB", "Bridge", "evidence", "landmarks.json");
  const deformationPath = path.join(root, "GEEHUB", "Bridge", "evidence", "deformation-mesh.json");
  await mkdir(path.dirname(segmentationPath), { recursive: true });
  await writeFile(segmentationPath, segmentationText);
  await writeFile(landmarksPath, landmarksText);
  await writeFile(deformationPath, deformationText);

  let manifest = createBridgeManifest({ projectId: "cli-project", source, manifestId: "cli-bridge" });
  manifest = addBridgeFrameSet(manifest, {
    id: "cli-segmentation", role: "segmentation",
    uri: "dropbox://GEEHUB/Bridge/evidence/segmentation.json",
    ...range, checksum: sha(segmentationText), metadata: { sequenceId }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "cli-landmarks", role: "landmarks",
    uri: "dropbox://GEEHUB/Bridge/evidence/landmarks.json",
    ...range, checksum: sha(landmarksText), metadata: { sequenceId }
  });
  manifest = addBridgeFrameSet(manifest, {
    id: "cli-deformation", role: "deformation",
    uri: "dropbox://GEEHUB/Bridge/evidence/deformation-mesh.json",
    ...range, checksum: sha(deformationText),
    metadata: {
      sequenceId, evidenceSchema: "geehub.mask-mesh-evidence.v1",
      topologyId: deformationDocument.topologyId,
      vertexCount: deformationDocument.vertexIds.length,
      triangleCount: deformationDocument.triangles.length,
      faceExclusionVerified: true, pixelSemanticsVerified: false
    }
  });

  const baseline = createGrowthState(BASELINE, { id: "cli-baseline" });
  const grown = createChildState(baseline, {
    stature: 1.1, torsoLength: 1.05, shoulderSpan: 1.15, chestDepth: 1.1,
    armLength: 1.1, armMass: 1.1, thighLength: 1.1, thighMass: 1.1, calfMass: 1.05
  }, { id: "cli-grown" });
  const manifestPath = path.join(temp, "registered-manifest.json");
  const growthPath = path.join(temp, "growth-states.json");
  const bundlePath = path.join(temp, "bundle");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await writeFile(growthPath, JSON.stringify([baseline, grown], null, 2));
  return { temp, root, manifestPath, growthPath, bundlePath,
    deformationPath, maskFilePaths: maskFiles.map(file => file.filePath) };
}

function runCli(f) {
  return spawnSync(process.execPath, [
    cli, f.manifestPath, f.growthPath, "cli-render-01", f.bundlePath
  ], {
    encoding: "utf8",
    env: { ...process.env, GEEHUB_DROPBOX_ROOT: f.root }
  });
}

test("preparation CLI rechecks actual masks and writes a queued job bundle", async t => {
  const f = await fixture(t);
  const result = runCli(f);
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.status, "prepared");
  assert.deepEqual(receipt.maskAudit, {
    checked: 4,
    verified: 4,
    pixelDataVerified: true,
    faceExclusionVerified: true,
    pairsChecked: 2,
    disjointPairs: 2,
    overlapPixels: 0,
    pixelSemanticsVerified: false
  });
  const job = JSON.parse(await readFile(receipt.jobFile, "utf8"));
  const manifest = JSON.parse(await readFile(receipt.manifestFile, "utf8"));
  assert.equal(manifest.revision, 4);
  assert.equal(manifest.renderJobs[0].status, "queued");
  assert.deepEqual(manifest.renderJobs[0].inputFrameSetIds,
    ["cli-segmentation", "cli-landmarks", "cli-deformation"]);
  assert.equal(job.frameEvidence.sequenceId, sequenceId);
  assert.equal(job.frameEvidence.deformationFrameSetId, "cli-deformation");
  assert.equal(job.frameEvidence.topologyId, receipt.meshAudit.topologyId);
  assert.equal(job.frameEvidence.vertexCount, receipt.meshAudit.vertexCount);
  assert.equal(job.frameEvidence.triangleCount, receipt.meshAudit.triangleCount);
  assert.equal(job.frameEvidence.pixelSemanticsVerified, false);
  assert.equal(job.frameEvidence.pixelDataVerified, true);
  assert.equal(job.frameEvidence.faceExclusionVerified, true);
  assert.equal(job.frameEvidence.maskPixelAudit.overlapPixels, 0);
  assert.equal(job.landmarkFrames.length, 2);
});

test("preparation CLI refuses a registered mesh that differs from a fresh mask-pixel rebuild even when re-hashed", async t => {
  const f = await fixture(t);
  const sidecar = JSON.parse(await readFile(f.deformationPath, "utf8"));
  sidecar.frames[0].sourcePoints[0].x += 0.25;
  const sidecarText = JSON.stringify(sidecar, null, 2) + "\n";
  await writeFile(f.deformationPath, sidecarText);
  const manifest = JSON.parse(await readFile(f.manifestPath, "utf8"));
  manifest.frameSets.find(item => item.id === "cli-deformation").checksum = sha(sidecarText);
  await writeFile(f.manifestPath, JSON.stringify(manifest, null, 2));
  const result = runCli(f);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /differs from a fresh mesh reconstructed from actual mask pixels/);
  await assert.rejects(lstat(f.bundlePath), { code: "ENOENT" });
});

test("preparation CLI refuses a registered pixel audit that no longer matches the files", async t => {
  const f = await fixture(t);
  const sidecarPath = path.join(f.root, "GEEHUB", "Bridge", "evidence", "segmentation.json");
  const sidecar = JSON.parse(await readFile(sidecarPath, "utf8"));
  sidecar.maskPixelAudit.frames[0].bodyForegroundPixels += 1;
  const sidecarText = JSON.stringify(sidecar, null, 2) + "\n";
  await writeFile(sidecarPath, sidecarText);
  const manifest = JSON.parse(await readFile(f.manifestPath, "utf8"));
  manifest.frameSets.find(item => item.id === "cli-segmentation").checksum = sha(sidecarText);
  await writeFile(f.manifestPath, JSON.stringify(manifest, null, 2));
  const result = runCli(f);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pixel audit differs from the re-inspected mask files/);
  await assert.rejects(lstat(f.bundlePath), { code: "ENOENT" });
});

test("preparation CLI refuses a mask changed after registration", async t => {
  const f = await fixture(t);
  await writeFile(f.maskFilePaths[0], "changed mask bytes");
  const result = runCli(f);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Registered mask files failed reinspection/);
  await assert.rejects(lstat(f.bundlePath), { code: "ENOENT" });
});
