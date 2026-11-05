import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { REQUIRED_ANCHORS } from "./landmark-track.js";
import { validateFrameSequencePackage } from "./frame-sequence.js";
import { inspectFrameSequenceFiles } from "./frame-sequence-worker.js";
import { prepareFrameSequenceBridgeInputs } from "./frame-sequence-bridge.js";
import { createBridgeManifest, validateBridgeManifest } from "./bridge-manifest.js";

const identityAnchors = ["leftEye", "rightEye", "nose", "chin"];
const allAnchors = [...new Set([...REQUIRED_ANCHORS, ...identityAnchors])];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

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
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function png(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 0;
  const rows = Buffer.alloc(height * (width + 1));
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

function makeSequence() {
  const width = 16, height = 24, fps = 24;
  const source = {
    id: "source-01", name: "source.mp4", uri: "dropbox://GEEHUB/Assets/source.mp4",
    width, height, duration: 1, immutable: true
  };
  const frames = [0, 1].map(frame => {
    const landmarks = Object.fromEntries(allAnchors.map((name, index) => [name, {
      x: Math.min(0.95, 0.2 + index * 0.015 + frame * 0.001),
      y: Math.min(0.95, 0.2 + index * 0.012), confidence: 0.99
    }]));
    const mask = (role, folder) => ({
      role, uri: `dropbox://GEEHUB/FrameEvidence/${folder}/frame-${String(frame).padStart(6, "0")}.png`,
      width, height, checksum: "a".repeat(64),
      ...(role === "body" ? { excludesFace: true } : { protectsIdentity: true })
    });
    return {
      frame, timeSeconds: frame / fps, sourceAssetId: source.id, width, height,
      identityConfidence: 0.99, poseConfidence: 0.98, landmarks,
      segmentation: {
        sourceAssetId: source.id, frame, width, height,
        model: "test-segmenter", confidence: 0.97,
        bodyMask: mask("body", "body"), faceMask: mask("face", "face")
      }
    };
  });
  return {
    schema: "geehub.frame-sequence", schemaVersion: 1, id: "sequence-01",
    source, format: { width, height, fps, frameCount: 2 },
    firstFrame: 0, startTimeSeconds: 0, frames
  };
}

async function fixture(t, sequence = makeSequence()) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "geehub-frame-sequence-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const root = path.join(temp, "Dropbox");
  const bytes = png(sequence.format.width, sequence.format.height);
  for (const frame of sequence.frames) {
    for (const role of ["body", "face"]) {
      const mask = frame.segmentation[role + "Mask"];
      mask.checksum = sha(bytes);
      const relative = mask.uri.slice("dropbox://GEEHUB/".length);
      const file = path.join(root, "GEEHUB", ...relative.split("/"));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
  }
  return { temp, root, bytes, sequence };
}

test("accepts ordered source-matched frames with complete identity and mask evidence", () => {
  const result = validateFrameSequencePackage(makeSequence());
  assert.equal(result.valid, true);
  assert.equal(result.structurallyReady, true);
  assert.equal(result.completeMaskPairs, 2);
});

test("rejects out-of-order frames, source mismatch, and frame dimension drift", () => {
  const sequence = makeSequence();
  [sequence.frames[0], sequence.frames[1]] = [sequence.frames[1], sequence.frames[0]];
  sequence.frames[1].sourceAssetId = "other-source";
  sequence.frames[1].width += 1;
  const result = validateFrameSequencePackage(sequence);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === "frame-order-or-gap"));
  assert.ok(result.errors.some(error => error.code === "frame-source-mismatch"));
  assert.ok(result.errors.some(error => error.code === "frame-dimensions-mismatch"));
});

test("keeps a landmark-only sequence valid but not structurally ready", () => {
  const sequence = makeSequence();
  sequence.frames.forEach(frame => { frame.segmentation = null; });
  const result = validateFrameSequencePackage(sequence);
  assert.equal(result.valid, true);
  assert.equal(result.structurallyReady, false);
  assert.equal(result.warnings.filter(w => w.code === "segmentation-pending").length, 2);
});

test("rejects identity loss, low confidence, and abrupt temporal motion", () => {
  const sequence = makeSequence();
  delete sequence.frames[1].landmarks.leftEye;
  sequence.frames[1].identityConfidence = 0.2;
  sequence.frames[1].landmarks.nose.x = 0.95;
  const result = validateFrameSequencePackage(sequence);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === "required-landmark-invalid"));
  assert.ok(result.errors.some(error => error.code === "identity-confidence-below-threshold"));
  assert.ok(result.errors.some(error => error.code === "temporal-continuity-failed"));
});

test("verifies actual PNG checksums and dimensions before geometry handoff", async t => {
  const f = await fixture(t);
  const audit = await inspectFrameSequenceFiles(f.sequence, { dropboxRoot: f.root });
  assert.equal(audit.readyForGeometry, true);
  assert.equal(audit.fileVerification.checked, 4);
  assert.equal(audit.fileVerification.verified, 4);
  assert.equal(audit.pixelSemanticsVerified, false);
});

test("prepares typed bridge frame sets from a file-verified sequence audit", async t => {
  const f = await fixture(t);
  const audit = await inspectFrameSequenceFiles(f.sequence, { dropboxRoot: f.root });
  const manifest = createBridgeManifest({
    projectId: "project-frame-sequence",
    source: {
      id: f.sequence.source.id,
      name: f.sequence.source.name,
      uri: f.sequence.source.uri,
      duration: f.sequence.source.duration,
      width: f.sequence.source.width,
      height: f.sequence.source.height,
      immutable: true
    }
  });
  const prepared = prepareFrameSequenceBridgeInputs(manifest, f.sequence, audit, {
    segmentationUri: "dropbox://GEEHUB/FrameEvidence/sequence-01/segmentation.json",
    landmarksUri: "dropbox://GEEHUB/FrameEvidence/sequence-01/landmarks.json"
  });
  assert.equal(prepared.manifest.frameSets.length, 2);
  assert.deepEqual(prepared.manifest.frameSets.map(item => item.role), ["segmentation", "landmarks"]);
  assert.equal(prepared.manifest.frameSets[0].metadata.sequenceId, f.sequence.id);
  assert.equal(prepared.documents[0].checksum, prepared.manifest.frameSets[0].checksum);
  assert.equal(prepared.documents[1].checksum, prepared.manifest.frameSets[1].checksum);
  assert.equal(JSON.parse(prepared.documents[0].content).frames.length, 2);
  assert.equal(JSON.parse(prepared.documents[1].content).frames.length, 2);
  assert.equal(prepared.pixelSemanticsVerified, false);
  assert.equal(validateBridgeManifest(prepared.manifest).valid, true);
});

test("refuses bridge registration when mask audit evidence is incomplete", async t => {
  const f = await fixture(t);
  const audit = await inspectFrameSequenceFiles(f.sequence, { dropboxRoot: f.root });
  audit.fileVerification.verified -= 1;
  const manifest = createBridgeManifest({
    projectId: "project-frame-sequence",
    source: {
      id: f.sequence.source.id, name: f.sequence.source.name,
      uri: f.sequence.source.uri, duration: f.sequence.source.duration,
      width: f.sequence.source.width, height: f.sequence.source.height,
      immutable: true
    }
  });
  assert.throws(() => prepareFrameSequenceBridgeInputs(manifest, f.sequence, audit, {
    segmentationUri: "dropbox://GEEHUB/FrameEvidence/sequence-01/segmentation.json",
    landmarksUri: "dropbox://GEEHUB/FrameEvidence/sequence-01/landmarks.json"
  }), /Every body and face mask must pass file verification/);
});

test("blocks a mask whose actual checksum differs from its descriptor", async t => {
  const f = await fixture(t);
  const mask = f.sequence.frames[0].segmentation.bodyMask;
  mask.checksum = "b".repeat(64);
  const audit = await inspectFrameSequenceFiles(f.sequence, { dropboxRoot: f.root });
  assert.equal(audit.readyForGeometry, false);
  assert.ok(audit.errors.some(error => error.code === "mask-file-verification-failed"));
});

test("refuses symlinked mask files", async t => {
  const f = await fixture(t);
  const mask = f.sequence.frames[0].segmentation.faceMask;
  const relative = mask.uri.slice("dropbox://GEEHUB/".length);
  const file = path.join(f.root, "GEEHUB", ...relative.split("/"));
  const outside = path.join(f.temp, "outside.png");
  await writeFile(outside, f.bytes);
  await rm(file);
  await symlink(outside, file);
  const audit = await inspectFrameSequenceFiles(f.sequence, { dropboxRoot: f.root });
  assert.equal(audit.readyForGeometry, false);
  assert.ok(audit.errors.some(error => error.detail?.includes("symlink")));
});
