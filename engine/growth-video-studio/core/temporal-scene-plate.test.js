import test from "node:test";
import assert from "node:assert/strict";
import { buildTemporalScenePlate } from "./temporal-scene-plate.js";
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

test("reconstructs body-hidden pixels from stable opaque donors and records provenance", () => {
  const frames = makeFrames();
  const original = frames.map(frame => Buffer.from(frame.source.data));
  const plate = buildTemporalScenePlate(frames, makeRegistration(frames));
  assert.equal(plate.schema, "geehub.temporal-scene-plate");
  assert.equal(plate.status, "ready-for-composite");
  assert.deepEqual(Array.from(plate.plate.data.slice(0, 4)), [20, 30, 40, 255]);
  assert.deepEqual(Array.from(plate.plate.data.slice(4, 8)), [0, 0, 0, 0]);
  assert.equal(plate.coverageMask[0], 255);
  assert.equal(plate.coverageMask[1], 0);
  assert.equal(plate.provenanceFrameIndex[0], 11);
  assert.equal(plate.donorCount[0], 2);
  assert.deepEqual(plate.counts, {
    hiddenPixels: 1, reconstructedPixels: 1, unresolvedPixels: 0, coverageRatio: 1
  });
  frames.forEach((frame, index) => assert.deepEqual(Array.from(frame.source.data), Array.from(original[index])));
});

test("never uses protected-face pixels as background donors", () => {
  const frames = makeFrames();
  frames[1].faceMask.pixels[0] = 255;
  const plate = buildTemporalScenePlate(frames, makeRegistration(frames));
  assert.equal(plate.status, "partial");
  assert.equal(plate.donorCount[0], 1);
  assert.equal(plate.coverageMask[0], 0);
  assert.equal(plate.unresolvedMask[0], 255);
});

test("leaves a hole unresolved when donor colours are temporally unstable", () => {
  const frames = makeFrames();
  frames[2].source.data.set([180, 160, 140, 255], 0);
  const plate = buildTemporalScenePlate(frames, makeRegistration(frames));
  assert.equal(plate.status, "partial");
  assert.equal(plate.maxChannelSpread[0], 160);
  assert.equal(plate.coverageMask[0], 0);
  assert.equal(plate.unresolvedMask[0], 255);
});

test("does not claim a plate when the sequence contains no body-hidden pixels", () => {
  const frames = makeFrames().map(frame => ({
    ...frame, bodyMask: { ...frame.bodyMask, pixels: new Uint8Array(2) }
  }));
  const plate = buildTemporalScenePlate(frames, makeRegistration(frames));
  assert.equal(plate.status, "no-body-holes");
  assert.equal(plate.counts.hiddenPixels, 0);
  assert.equal(plate.counts.coverageRatio, 1);
});

test("requires fixed-camera identity transforms", () => {
  const frames = makeFrames();
  const registration = makeRegistration(frames);
  registration.frames[1].transform.translateX = 0.25;
  registration.checksum = cameraRegistrationChecksum(registration);
  assert.throws(() => buildTemporalScenePlate(frames, registration), {
    code: "scene-plate-camera-transform-unsupported"
  });
});

test("rejects camera-registration evidence whose checksum no longer matches", () => {
  const frames = makeFrames();
  const registration = makeRegistration(frames);
  registration.verificationMethod = "tampered-after-measurement";
  assert.throws(() => buildTemporalScenePlate(frames, registration), {
    code: "scene-plate-camera-registration-invalid"
  });
});

test("rejects missing or unverified camera registration", () => {
  const frames = makeFrames();
  const registration = makeRegistration(frames);
  registration.status = "proposed";
  registration.checksum = cameraRegistrationChecksum(registration);
  assert.throws(() => buildTemporalScenePlate(frames, registration), {
    code: "scene-plate-camera-registration-invalid"
  });
});

test("rejects overlapping body and protected-face masks", () => {
  const frames = makeFrames();
  frames[0].faceMask.pixels[0] = 255;
  assert.throws(() => buildTemporalScenePlate(frames, makeRegistration(frames)), {
    code: "scene-plate-mask-overlap"
  });
});

test("rejects non-binary masks and mismatched source dimensions", () => {
  const frames = makeFrames();
  frames[1].bodyMask.pixels[1] = 127;
  assert.throws(() => buildTemporalScenePlate(frames, makeRegistration(frames)), {
    code: "scene-plate-mask-not-binary"
  });
  const otherFrames = makeFrames();
  otherFrames[2].source.width = 1;
  assert.throws(() => buildTemporalScenePlate(otherFrames, makeRegistration(otherFrames)), {
    code: "scene-plate-source-invalid"
  });
});

test("rejects camera-registration frame or timestamp mismatch", () => {
  const frames = makeFrames();
  const registration = makeRegistration(frames);
  registration.frames[1].timeSeconds = 1.25;
  registration.checksum = cameraRegistrationChecksum(registration);
  assert.throws(() => buildTemporalScenePlate(frames, registration), {
    code: "scene-plate-camera-frame-mismatch"
  });
});

test("enforces bounded frame-pixel work before allocating the plate", () => {
  const frames = makeFrames();
  assert.throws(() => buildTemporalScenePlate(frames, makeRegistration(frames), {
    maxSamples: 5
  }), { code: "scene-plate-sample-limit" });
});
