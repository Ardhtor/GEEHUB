import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addBridgeFrameSet, createBridgeManifest } from "./bridge-manifest.js";
import { encodeRgbaPng, decodeRgbaPng } from "./rgba-png.js";
import { extractSourceFrames } from "./source-frame-extractor.js";

const sha256 = value => createHash("sha256").update(value).digest("hex");

async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "geehub-source-extract-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dropboxRoot = path.join(root, "Dropbox");
  const sourceDirectory = path.join(dropboxRoot, "GEEHUB", "Sources");
  const sidecarDirectory = path.join(dropboxRoot, "GEEHUB", "FrameSets");
  const outputDirectory = path.join(root, "extracted");
  await Promise.all([mkdir(sourceDirectory, { recursive: true }), mkdir(sidecarDirectory, { recursive: true })]);
  const sourceBytes = Buffer.from("synthetic immutable video");
  const sourcePath = path.join(sourceDirectory, "source.mov");
  await writeFile(sourcePath, sourceBytes);
  const sourceChecksum = sha256(sourceBytes);
  const source = {
    id: "source-001",
    name: "source.mov",
    uri: "dropbox://GEEHUB/Sources/source.mov",
    width: 8,
    height: 8,
    duration: 1,
    checksum: options.declaredSourceChecksum ?? sourceChecksum,
    immutable: true
  };
  let manifest = createBridgeManifest({ projectId: "growth-test", source, manifestId: "bridge-test" });
  const frames = [
    { frame: 0, timeSeconds: 0, bodyMask: {}, faceMask: {} },
    { frame: 1, timeSeconds: 0.5, bodyMask: {}, faceMask: {} }
  ];
  const sidecar = {
    schema: "geehub.frame-set-evidence",
    schemaVersion: 1,
    role: "segmentation",
    sourceAssetId: source.id,
    sequenceId: "sequence-001",
    firstFrame: 0,
    lastFrame: 1,
    frameCount: 2,
    width: 8,
    height: 8,
    fps: 2,
    pixelSemanticsVerified: false,
    frames
  };
  const sidecarBytes = Buffer.from(JSON.stringify(sidecar));
  const sidecarPath = path.join(sidecarDirectory, "segmentation.json");
  await writeFile(sidecarPath, sidecarBytes);
  manifest = addBridgeFrameSet(manifest, {
    id: "segmentation-001",
    role: "segmentation",
    uri: "dropbox://GEEHUB/FrameSets/segmentation.json",
    firstFrame: 0,
    lastFrame: 1,
    frameCount: 2,
    width: 8,
    height: 8,
    fps: 2,
    checksum: sha256(sidecarBytes),
    metadata: { sequenceId: "sequence-001" }
  });
  const manifestPath = path.join(root, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  const framePngs = [0, 1].map(frame => encodeRgbaPng({
    width: 8, height: 8,
    data: Buffer.from(Array.from({ length: 8 * 8 * 4 }, (_, index) =>
      index % 4 === 3 ? 255 : (index + frame) % 256))
  }));
  let extractionMode = "complete";
  let mutateSource = false;
  let secondTimestamp = 4.5;
  const calls = [];
  const execute = async (binary, args) => {
    calls.push({ binary, args });
    if (args[0] === "-version") {
      return { stdout: binary + " version 7.1\n", stderr: "" };
    }
    if (binary === "ffprobe") {
      return {
        stdout: JSON.stringify({
          streams: [{ index: 0, width: 8, height: 8, avg_frame_rate: "2/1" }],
          frames: [
            { best_effort_timestamp_time: "4.000000", width: 8, height: 8 },
            { best_effort_timestamp_time: String(secondTimestamp), width: 8, height: 8 }
          ]
        }),
        stderr: ""
      };
    }
    if (binary === "ffmpeg") {
      if (mutateSource) await writeFile(sourcePath, Buffer.concat([sourceBytes, Buffer.from("changed")]));
      const pattern = args.at(-1);
      const directory = path.dirname(pattern);
      const start = Number(args[args.indexOf("-start_number") + 1]);
      const count = extractionMode === "missing-last" ? 1 : 2;
      for (let offset = 0; offset < count; offset += 1) {
        const frame = start + offset;
        await writeFile(
          path.join(directory, "frame-" + String(frame).padStart(9, "0") + ".png"),
          extractionMode === "wrong-dimensions" ? encodeRgbaPng({ width: 4, height: 8, data: Buffer.alloc(4 * 8 * 4, 255) }) : framePngs[offset]
        );
      }
      return { stdout: "", stderr: "" };
    }
    throw new Error("Unexpected tool invocation: " + binary);
  };
  const run = overrides => extractSourceFrames({
    manifestPath,
    segmentationFrameSetId: "segmentation-001",
    outputDirectory,
    dropboxRoot,
    execute,
    ...overrides
  });
  return {
    root, dropboxRoot, sourcePath, sourceBytes, sourceChecksum,
    manifestPath, outputDirectory, calls,
    setMode: value => { extractionMode = value; },
    setSecondTimestamp: value => { secondTimestamp = value; },
    mutate: () => { mutateSource = true; },
    run
  };
}

test("extracts the registered source range and writes a checksummed index", async t => {
  const input = await fixture(t);
  const receipt = await input.run();
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.frameCount, 2);
  assert.equal(receipt.sourceFrameDerivationVerified, true);
  assert.equal(receipt.sourceUnmodified, true);
  assert.equal(receipt.index.derivation.timestampOriginSeconds, 4);
  assert.equal(receipt.index.frames[1].sourceTimestampSeconds, 4.5);
  assert.equal(receipt.index.frames[1].timeSeconds, 0.5);
  const indexBytes = await readFile(receipt.indexPath);
  assert.equal(sha256(indexBytes), receipt.indexChecksum);
  const index = JSON.parse(indexBytes.toString("utf8"));
  assert.equal(index.schema, "geehub.source-frame-index");
  assert.equal(index.frames.length, 2);
  const second = await readFile(path.join(input.outputDirectory, index.frames[1].file));
  assert.equal(decodeRgbaPng(second).width, 8);
  assert.deepEqual(await readFile(input.sourcePath), input.sourceBytes);
  assert.equal((await readdir(input.outputDirectory)).length, 3);
  assert.ok(input.calls.some(call => call.binary === "ffmpeg" && call.args.includes("-fps_mode")));
});

test("rejects source bytes that differ from the immutable manifest checksum", async t => {
  const input = await fixture(t, { declaredSourceChecksum: "a".repeat(64) });
  await assert.rejects(input.run(), error => error.code === "source-extract-source-checksum-mismatch");
  assert.equal(input.calls.length, 0);
});

test("rejects source PTS that do not match registered frame timestamps before extraction", async t => {
  const input = await fixture(t);
  input.setSecondTimestamp(4.7);
  await assert.rejects(input.run(), error => error.code === "source-extract-timestamp-mismatch");
  assert.ok(input.calls.some(call => call.binary === "ffprobe"));
  assert.equal(input.calls.some(call => call.binary === "ffmpeg"), false);
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("removes only its new output directory when ffmpeg omits a registered frame", async t => {
  const input = await fixture(t);
  input.setMode("missing-last");
  await assert.rejects(input.run(), error => error.code === "source-extract-output-frame-count");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("rejects PNG output with dimensions that differ from registered frames", async t => {
  const input = await fixture(t);
  input.setMode("wrong-dimensions");
  await assert.rejects(input.run(), error => error.code === "source-extract-png-dimensions");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});

test("preserves an existing output directory", async t => {
  const input = await fixture(t);
  await mkdir(input.outputDirectory);
  await writeFile(path.join(input.outputDirectory, "keep.txt"), "keep");
  await assert.rejects(input.run(), error => error.code === "source-extract-output-exists");
  assert.equal(await readFile(path.join(input.outputDirectory, "keep.txt"), "utf8"), "keep");
});

test("detects source mutation during ffmpeg extraction and rolls back its outputs", async t => {
  const input = await fixture(t);
  input.mutate();
  await assert.rejects(input.run(), error => error.code === "source-extract-source-mutated");
  await assert.rejects(readdir(input.outputDirectory), error => error.code === "ENOENT");
});


const hasFfmpegTools = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

test("extracts a real synthetic video through FFmpeg and FFprobe", { skip: !hasFfmpegTools }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "geehub-source-extract-real-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dropboxRoot = path.join(root, "Dropbox");
  const sourceDirectory = path.join(dropboxRoot, "GEEHUB", "Sources");
  const sidecarDirectory = path.join(dropboxRoot, "GEEHUB", "FrameSets");
  const outputDirectory = path.join(root, "extracted");
  await Promise.all([mkdir(sourceDirectory, { recursive: true }), mkdir(sidecarDirectory, { recursive: true })]);

  const sourcePath = path.join(sourceDirectory, "synthetic.mp4");
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-f", "lavfi",
    "-i", "color=c=blue:s=16x16:r=2:d=1", "-frames:v", "2",
    "-c:v", "mpeg4", "-q:v", "2", sourcePath
  ], { stdio: "pipe" });
  const sourceBytes = await readFile(sourcePath);
  const sourceChecksum = sha256(sourceBytes);
  const source = {
    id: "source-real-001",
    name: "synthetic.mp4",
    uri: "dropbox://GEEHUB/Sources/synthetic.mp4",
    width: 16,
    height: 16,
    duration: 1,
    checksum: sourceChecksum,
    immutable: true
  };
  let manifest = createBridgeManifest({ projectId: "growth-real-extract-test", source, manifestId: "bridge-real-test" });
  const sidecar = {
    schema: "geehub.frame-set-evidence",
    schemaVersion: 1,
    role: "segmentation",
    sourceAssetId: source.id,
    sequenceId: "sequence-real-001",
    firstFrame: 0,
    lastFrame: 1,
    frameCount: 2,
    width: 16,
    height: 16,
    fps: 2,
    pixelSemanticsVerified: false,
    frames: [
      { frame: 0, timeSeconds: 0, bodyMask: {}, faceMask: {} },
      { frame: 1, timeSeconds: 0.5, bodyMask: {}, faceMask: {} }
    ]
  };
  const sidecarBytes = Buffer.from(JSON.stringify(sidecar));
  const sidecarPath = path.join(sidecarDirectory, "segmentation.json");
  await writeFile(sidecarPath, sidecarBytes);
  manifest = addBridgeFrameSet(manifest, {
    id: "segmentation-real-001",
    role: "segmentation",
    uri: "dropbox://GEEHUB/FrameSets/segmentation.json",
    firstFrame: 0,
    lastFrame: 1,
    frameCount: 2,
    width: 16,
    height: 16,
    fps: 2,
    checksum: sha256(sidecarBytes),
    metadata: { sequenceId: "sequence-real-001" }
  });
  const manifestPath = path.join(root, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));

  const receipt = await extractSourceFrames({
    manifestPath,
    segmentationFrameSetId: "segmentation-real-001",
    outputDirectory,
    dropboxRoot
  });
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.sourceFrameDerivationVerified, true);
  assert.equal(receipt.frameCount, 2);
  assert.equal(receipt.index.derivation.timestampBasis, "best_effort_timestamp_time");
  assert.equal(receipt.index.frames[0].sourceTimestampSeconds, 0);
  assert.equal(receipt.index.frames[1].sourceTimeFromOriginSeconds, 0.5);
  for (const frame of receipt.index.frames) {
    const bytes = await readFile(path.join(outputDirectory, frame.file));
    assert.equal(sha256(bytes), frame.sha256);
    const decoded = decodeRgbaPng(bytes);
    assert.equal(decoded.width, 16);
    assert.equal(decoded.height, 16);
  }
  assert.deepEqual(await readFile(sourcePath), sourceBytes);
});
