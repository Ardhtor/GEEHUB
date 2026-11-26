import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateFixedCameraRegistration,
  cameraRegistrationChecksum
} from "./camera-registration.js";

function makeTexture(width, height) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = (x * 37 + y * 53 + (x * y * 11) % 97) % 256;
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = (value * 3 + 17) % 256;
      data[offset + 2] = (value * 7 + 31) % 256;
      data[offset + 3] = 255;
    }
  }
  return data;
}

function shiftImage(data, width, height, dx, dy) {
  const shifted = new Uint8Array(data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = x - dx;
      const sourceY = y - dy;
      const targetOffset = (y * width + x) * 4;
      if (sourceX < 0 || sourceX >= width || sourceY < 0 || sourceY >= height) continue;
      const sourceOffset = (sourceY * width + sourceX) * 4;
      shifted.set(data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return shifted;
}

function makeFrame(frame, timeSeconds, data, width = 64, height = 48) {
  const body = new Uint8Array(width * height);
  const face = new Uint8Array(width * height);
  for (let y = 12; y < 34; y += 1) {
    for (let x = 24; x < 40; x += 1) body[y * width + x] = 255;
  }
  for (let y = 14; y < 20; y += 1) {
    for (let x = 29; x < 35; x += 1) {
      body[y * width + x] = 0;
      face[y * width + x] = 255;
    }
  }
  return {
    frame, timeSeconds,
    source: { width, height, data },
    bodyMask: { width, height, pixels: body },
    faceMask: { width, height, pixels: face }
  };
}

const options = {
  maxTranslationPx: 3,
  sampleStep: 4,
  minSamples: 24,
  maxSamples: 2000,
  minPatchStd: 2,
  maxMedianDescriptorError: 0.5,
  minTranslationImprovement: 0.04,
  minTranslationImprovementRatio: 0.15
};

test("verifies a static textured background and emits identity transforms", () => {
  const base = makeTexture(64, 48);
  const frames = [
    makeFrame(10, 0, base),
    makeFrame(11, 0.5, Buffer.from(base)),
    makeFrame(12, 1, Buffer.from(base))
  ];
  const result = estimateFixedCameraRegistration(frames, options);
  assert.equal(result.status, "verified");
  assert.equal(result.mode, "fixed-camera");
  assert.equal(result.verificationMethod, "masked-background-normalized-patch-search-v1");
  assert.equal(result.summary.verifiedFrames, 2);
  assert.ok(result.frames.every(frame => frame.transform.translateX === 0 && frame.transform.translateY === 0));
  assert.equal(result.checksum, cameraRegistrationChecksum(result));
});

test("detects a two-pixel camera translation instead of asserting a fixed camera", () => {
  const base = makeTexture(64, 48);
  const frames = [
    makeFrame(10, 0, base),
    makeFrame(11, 0.5, shiftImage(base, 64, 48, 2, -1))
  ];
  const result = estimateFixedCameraRegistration(frames, options);
  assert.equal(result.status, "unverified");
  assert.equal(result.mode, "unverified");
  assert.equal(result.frames[1].measurement.reason, "camera-translation-detected");
  assert.deepEqual(result.frames[1].measurement.estimatedTranslation, { x: 2, y: -1 });
});

test("ignores changes confined to the masked body and protected-face regions", () => {
  const base = makeTexture(64, 48);
  const changed = Buffer.from(base);
  for (let y = 10; y < 36; y += 1) {
    for (let x = 22; x < 42; x += 1) {
      const offset = (y * 64 + x) * 4;
      changed[offset] = 255 - changed[offset];
      changed[offset + 1] = 255 - changed[offset + 1];
      changed[offset + 2] = 255 - changed[offset + 2];
    }
  }
  const result = estimateFixedCameraRegistration([
    makeFrame(10, 0, base), makeFrame(11, 0.5, changed)
  ], options);
  assert.equal(result.status, "verified");
});

test("returns unverified when the background has insufficient texture", () => {
  const flat = new Uint8Array(64 * 48 * 4);
  for (let index = 0; index < flat.length; index += 4) {
    flat[index] = 80; flat[index + 1] = 80; flat[index + 2] = 80; flat[index + 3] = 255;
  }
  const result = estimateFixedCameraRegistration([
    makeFrame(10, 0, flat), makeFrame(11, 0.5, Buffer.from(flat))
  ], options);
  assert.equal(result.status, "unverified");
  assert.ok(result.summary.reasonCodes.includes("insufficient-background-features"));
});

test("rejects a frame sequence with mismatched timestamps", () => {
  const base = makeTexture(64, 48);
  assert.throws(() => estimateFixedCameraRegistration([
    makeFrame(10, 0, base), makeFrame(11, 0, Buffer.from(base))
  ], options), { code: "camera-registration-frame-order" });
});

test("rejects overlapping or non-binary masks", () => {
  const base = makeTexture(64, 48);
  const overlap = [makeFrame(10, 0, base), makeFrame(11, 0.5, Buffer.from(base))];
  overlap[0].bodyMask.pixels[0] = 255;
  overlap[0].faceMask.pixels[0] = 255;
  assert.throws(() => estimateFixedCameraRegistration(overlap, options), {
    code: "camera-registration-mask-overlap"
  });
  const soft = [makeFrame(10, 0, base), makeFrame(11, 0.5, Buffer.from(base))];
  soft[0].bodyMask.pixels[0] = 127;
  assert.throws(() => estimateFixedCameraRegistration(soft, options), {
    code: "camera-registration-mask-not-binary"
  });
});

test("detects translations at the search boundary as unverified", () => {
  const base = makeTexture(64, 48);
  const frames = [
    makeFrame(10, 0, base),
    makeFrame(11, 0.5, shiftImage(base, 64, 48, 3, 0))
  ];
  const result = estimateFixedCameraRegistration(frames, options);
  assert.equal(result.status, "unverified");
  assert.equal(result.frames[1].measurement.reason, "camera-translation-search-boundary");
});

test("refuses excessive patch-search work before evaluating frame pairs", () => {
  const base = makeTexture(64, 48);
  assert.throws(() => estimateFixedCameraRegistration([
    makeFrame(10, 0, base), makeFrame(11, 0.5, Buffer.from(base))
  ], { ...options, maxComparisons: 1 }), {
    code: "camera-registration-comparison-limit"
  });
});

test("camera-registration checksums change when evidence changes", () => {
  const base = makeTexture(64, 48);
  const result = estimateFixedCameraRegistration([
    makeFrame(10, 0, base), makeFrame(11, 0.5, Buffer.from(base))
  ], options);
  const altered = { ...result, width: result.width + 1 };
  assert.notEqual(cameraRegistrationChecksum(altered), result.checksum);
});

test("does not mutate source pixels or either mask", () => {
  const base = makeTexture(64, 48);
  const frames = [
    makeFrame(10, 0, base),
    makeFrame(11, 0.5, Buffer.from(base))
  ];
  const before = frames.map(frame => ({
    source: Buffer.from(frame.source.data),
    body: Buffer.from(frame.bodyMask.pixels),
    face: Buffer.from(frame.faceMask.pixels)
  }));
  estimateFixedCameraRegistration(frames, options);
  frames.forEach((frame, index) => {
    assert.deepEqual(Buffer.from(frame.source.data), before[index].source);
    assert.deepEqual(Buffer.from(frame.bodyMask.pixels), before[index].body);
    assert.deepEqual(Buffer.from(frame.faceMask.pixels), before[index].face);
  });
});
