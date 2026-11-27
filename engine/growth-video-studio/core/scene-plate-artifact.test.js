import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decodeRgbaPng } from "./rgba-png.js";
import { buildTemporalScenePlate } from "./temporal-scene-plate.js";
import { writeTemporalScenePlateArtifact } from "./scene-plate-artifact.js";
import { cameraRegistrationChecksum } from "./camera-registration.js";

function makeFrame(frame, timeSeconds, {
  color = [10, 20, 30], bodyAtZero = false, faceAtZero = false
} = {}) {
  const data = new Uint8Array([...color, 255, 90, 100, 110, 255]);
  const body = new Uint8Array([bodyAtZero ? 255 : 0, 0]);
  const face = new Uint8Array([faceAtZero ? 255 : 0, 0]);
  return {
    frame, timeSeconds,
    source: { width: 2, height: 1, data },
    bodyMask: { width: 2, height: 1, pixels: body },
    faceMask: { width: 2, height: 1, pixels: face }
  };
}

function makeFrames() {
  return [
    makeFrame(10, 0, { color: [200, 10, 10], bodyAtZero: true }),
    makeFrame(11, 1, { color: [20, 30, 40] }),
    makeFrame(12, 2, { color: [22, 32, 42] })
  ];
}

function makeRegistration(frames) {
  const registration = {
    schema: "geehub.camera-registration-evidence", schemaVersion: 1,
    id: "camera-lock-001", status: "verified",
    mode: "fixed-camera", coordinateSpace: "source-pixel",
    verificationMethod: "operator-fixed-camera", width: 2, height: 1,
    frames: frames.map(frame => ({
      frame: frame.frame, timeSeconds: frame.timeSeconds,
      transform: { translateX: 0, translateY: 0, scale: 1, rotationDegrees: 0 }
    }))
  };
  registration.checksum = cameraRegistrationChecksum(registration);
  return registration;
}

function buildPlate(frames = makeFrames()) {
  const registration = makeRegistration(frames);
  return {
    plate: buildTemporalScenePlate(frames, registration),
    registration
  };
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "geehub-scene-plate-artifact-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("writes lossless plate, binary masks, donor provenance, and a final digest receipt", async () => {
  await withTemporaryDirectory(async directory => {
    const frames = makeFrames();
    const original = frames.map(frame => Array.from(frame.source.data));
    const { plate, registration } = buildPlate(frames);
    const originalPlate = Array.from(plate.plate.data);
    const originalCoverage = Array.from(plate.coverageMask);
    const originalUnresolved = Array.from(plate.unresolvedMask);
    assert.deepEqual(plate.frameTimesSeconds, [0, 1, 2]);
    const result = await writeTemporalScenePlateArtifact({
      plate, cameraRegistration: registration,
      outputDirectory: path.join(directory, "plate")
    });
    const receiptBytes = await readFile(result.receiptPath);
    const receipt = JSON.parse(receiptBytes.toString("utf8"));
    assert.equal(receipt.schema, "geehub.temporal-scene-plate-artifact-receipt");
    assert.equal(receipt.status, "complete");
    assert.equal(receipt.repairStatus, "ready-for-composite");
    assert.equal(receipt.readyForComposite, true);
    assert.equal(receipt.cameraRegistrationIndependentlyVerified, false);
    assert.equal(receipt.sourceFrameDerivationVerified, false);

    const plateBytes = await readFile(path.join(result.outputDirectory, "scene-plate.png"));
    assert.equal(digest(plateBytes), receipt.files.plate.sha256);
    const decodedPlate = decodeRgbaPng(plateBytes);
    assert.deepEqual(Array.from(decodedPlate.data), originalPlate);

    const coverageBytes = await readFile(path.join(result.outputDirectory, "coverage-mask.png"));
    const unresolvedBytes = await readFile(path.join(result.outputDirectory, "unresolved-mask.png"));
    assert.equal(digest(coverageBytes), receipt.files.coverageMask.sha256);
    assert.equal(digest(unresolvedBytes), receipt.files.unresolvedMask.sha256);
    assert.equal(coverageBytes.length, receipt.files.coverageMask.byteLength);
    assert.equal(unresolvedBytes.length, receipt.files.unresolvedMask.byteLength);
    const coverage = decodeRgbaPng(coverageBytes);
    const unresolved = decodeRgbaPng(unresolvedBytes);
    assert.deepEqual(Array.from(coverage.data.slice(0, 4)), [255, 255, 255, 255]);
    assert.deepEqual(Array.from(coverage.data.slice(4, 8)), [0, 0, 0, 255]);
    assert.deepEqual(Array.from(unresolved.data.slice(0, 4)), [0, 0, 0, 255]);

    const provenance = await readFile(path.join(result.outputDirectory, "donor-provenance.bin"));
    assert.equal(digest(provenance), receipt.files.donorProvenance.sha256);
    assert.equal(provenance.length, 2 * 7);
    assert.equal(provenance.length, receipt.files.donorProvenance.byteLength);
    assert.equal(provenance.readInt32LE(0), 11);
    assert.equal(provenance.readUInt16LE(4), 2);
    assert.equal(provenance[6], 2);
    assert.equal(provenance.readInt32LE(7), -1);
    assert.equal(receipt.provenanceLayout.recordStrideBytes, 7);
    assert.equal(digest(receiptBytes), result.receiptSha256);
    assert.deepEqual(frames.map(frame => Array.from(frame.source.data)), original);
    assert.deepEqual(Array.from(plate.plate.data), originalPlate);
    assert.deepEqual(Array.from(plate.coverageMask), originalCoverage);
    assert.deepEqual(Array.from(plate.unresolvedMask), originalUnresolved);
  });
});

test("persists partial repair without hiding unresolved pixels or inventing donors", async () => {
  await withTemporaryDirectory(async directory => {
    const frames = makeFrames();
    frames[1].faceMask.pixels[0] = 255;
    const { plate, registration } = buildPlate(frames);
    assert.equal(plate.status, "partial");
    const result = await writeTemporalScenePlateArtifact({
      plate, cameraRegistration: registration,
      outputDirectory: path.join(directory, "partial")
    });
    const receipt = JSON.parse((await readFile(result.receiptPath)).toString("utf8"));
    assert.equal(receipt.repairStatus, "partial");
    assert.equal(receipt.readyForComposite, false);
    assert.equal(receipt.counts.unresolvedPixels, 1);
    const unresolved = decodeRgbaPng(await readFile(
      path.join(result.outputDirectory, "unresolved-mask.png")
    ));
    assert.deepEqual(Array.from(unresolved.data.slice(0, 4)), [255, 255, 255, 255]);
    const provenance = await readFile(path.join(result.outputDirectory, "donor-provenance.bin"));
    assert.equal(provenance.readInt32LE(0), -1);
    assert.equal(provenance.readUInt16LE(4), 1);
  });
});

test("refuses an existing output directory without changing its contents", async () => {
  await withTemporaryDirectory(async directory => {
    const output = path.join(directory, "existing");
    await mkdir(output);
    const marker = path.join(output, "keep.txt");
    await writeFile(marker, "preserve");
    const { plate, registration } = buildPlate();
    await assert.rejects(
      writeTemporalScenePlateArtifact({
        plate, cameraRegistration: registration, outputDirectory: output
      }),
      { code: "scene-plate-artifact-output-exists" }
    );
    assert.equal((await readFile(marker)).toString("utf8"), "preserve");
  });
});

test("rejects camera evidence that differs from the plate before creating output", async () => {
  await withTemporaryDirectory(async directory => {
    const { plate, registration } = buildPlate();
    registration.checksum = "b".repeat(64);
    const output = path.join(directory, "rejected");
    await assert.rejects(
      writeTemporalScenePlateArtifact({
        plate, cameraRegistration: registration, outputDirectory: output
      }),
      { code: "scene-plate-artifact-camera-mismatch" }
    );
    await assert.rejects(readFile(output), { code: "ENOENT" });
  });
});

test("rejects summary counts that do not match the pixel masks", async () => {
  await withTemporaryDirectory(async directory => {
    const { plate, registration } = buildPlate();
    plate.counts.reconstructedPixels += 1;
    await assert.rejects(
      writeTemporalScenePlateArtifact({
        plate, cameraRegistration: registration,
        outputDirectory: path.join(directory, "bad-counts")
      }),
      { code: "scene-plate-artifact-counts-invalid" }
    );
  });
});

test("rejects covered pixels whose donor provenance is missing", async () => {
  await withTemporaryDirectory(async directory => {
    const { plate, registration } = buildPlate();
    plate.provenanceFrameIndex[0] = -1;
    await assert.rejects(
      writeTemporalScenePlateArtifact({
        plate, cameraRegistration: registration,
        outputDirectory: path.join(directory, "bad-provenance")
      }),
      { code: "scene-plate-artifact-provenance-invalid" }
    );
  });
});

test("enforces total artifact byte limits before creating the destination", async () => {
  await withTemporaryDirectory(async directory => {
    const { plate, registration } = buildPlate();
    const output = path.join(directory, "too-large");
    await assert.rejects(
      writeTemporalScenePlateArtifact({
        plate, cameraRegistration: registration,
        outputDirectory: output, maxOutputBytes: 32
      }),
      { code: "scene-plate-artifact-output-too-large" }
    );
    await assert.rejects(readFile(output), { code: "ENOENT" });
  });
});
