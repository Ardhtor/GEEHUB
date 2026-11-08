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
  const segmentationPath = path.join(root, "GEEHUB", "Bridge", "evidence", "segmentation.json");
  const landmarksPath = path.join(root, "GEEHUB", "Bridge", "evidence", "landmarks.json");
  await mkdir(path.dirname(segmentationPath), { recursive: true });
  await writeFile(segmentationPath, segmentationText);
  await writeFile(landmarksPath, landmarksText);

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
  return { temp, root, manifestPath, growthPath, bundlePath, maskFilePaths: maskFiles.map(file => file.filePath) };
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
  assert.equal(manifest.revision, 3);
  assert.equal(manifest.renderJobs[0].status, "queued");
  assert.equal(job.frameEvidence.sequenceId, sequenceId);
  assert.equal(job.frameEvidence.pixelSemanticsVerified, false);
  assert.equal(job.landmarkFrames.length, 2);
});

test("preparation CLI refuses a mask changed after registration", async t => {
  const f = await fixture(t);
  await writeFile(f.maskFilePaths[0], "changed mask bytes");
  const result = runCli(f);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Registered mask files failed reinspection/);
  await assert.rejects(lstat(f.bundlePath), { code: "ENOENT" });
});
