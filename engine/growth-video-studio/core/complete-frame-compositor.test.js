import test from "node:test";
import assert from "node:assert/strict";
import { composeGrowthFramePixels } from "./complete-frame-compositor.js";
import { buildTemporalScenePlate } from "./temporal-scene-plate.js";
import { cameraRegistrationChecksum } from "./camera-registration.js";

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
    bodyMask: { frame, width: 3, height: 1, pixels: bodyPixels },
    faceMask: { frame, width: 3, height: 1, pixels: facePixels }
  };
}

function makeFrames() {
  return [
    makeFrame(10, 0, { body: [0] }),
    makeFrame(11, 1, { body: [1], colors: [[20, 30, 40], [210, 20, 20], [40, 50, 60]] }),
    makeFrame(12, 2, { colors: [[22, 32, 42], [22, 32, 42], [40, 50, 60]] }),
    makeFrame(13, 3, { colors: [[21, 31, 41], [21, 31, 41], [40, 50, 60]] })
  ];
}

function makePlate(frames = makeFrames()) {
  const registration = {
    schema: "geehub.camera-registration-evidence", schemaVersion: 1,
    id: "camera-lock-001", status: "verified",
    mode: "fixed-camera", coordinateSpace: "source-pixel",
    verificationMethod: "operator-fixed-camera", width: 3, height: 1,
    frames: frames.map(frame => ({
      frame: frame.frame, timeSeconds: frame.timeSeconds,
      transform: { translateX: 0, translateY: 0, scale: 1, rotationDegrees: 0 }
    }))
  };
  registration.checksum = cameraRegistrationChecksum(registration);
  return buildTemporalScenePlate(frames, registration);
}

function makeBodyLayer(frame, {
  pixels = [], colors = new Map()
} = {}) {
  const data = new Uint8Array(3 * 4);
  const coverageMask = new Uint8Array(3);
  for (const pixel of pixels) {
    coverageMask[pixel] = 255;
    const color = colors.get(pixel) ?? [80, 120, 160, 255];
    data.set(color, pixel * 4);
  }
  return {
    schema: "geehub.growth-deformation-pixel-layer", schemaVersion: 1,
    status: "ready-body-layer", frame, width: 3, height: 1,
    data, coverageMask, coveredPixels: pixels.length,
    sourceFrameUnmodified: true, protectedMaskPixelsUntouched: true,
    pixelSemanticsVerified: false
  };
}

function compose(frames, bodyLayer) {
  const frame = frames[0];
  return composeGrowthFramePixels({
    sourceFrame: {
      frame: frame.frame, timeSeconds: frame.timeSeconds,
      width: 3, height: 1, data: frame.source.data
    },
    bodyMask: frame.bodyMask,
    protectedFaceMask: frame.faceMask,
    bodyLayer,
    scenePlate: makePlate(frames)
  });
}

test("composes a reconstructed current-body background and transformed body while preserving the face", () => {
  const frames = makeFrames();
  const original = Buffer.from(frames[0].source.data);
  const bodyLayer = makeBodyLayer(10, { pixels: [0, 1] });
  const result = compose(frames, bodyLayer);
  assert.equal(result.status, "complete-frame");
  assert.equal(result.readyForAssembly, true);
  assert.equal(result.readyForExport, false);
  assert.deepEqual(Array.from(result.data.slice(0, 4)), [80, 120, 160, 255]);
  assert.deepEqual(Array.from(result.data.slice(4, 8)), [80, 120, 160, 255]);
  assert.deepEqual(Array.from(result.data.slice(8, 12)), Array.from(original.slice(8, 12)));
  assert.equal(result.backgroundSource[0], 1);
  assert.equal(result.backgroundSource[1], 0);
  assert.equal(result.pixelSource[0], 2);
  assert.equal(result.pixelSource[2], 3);
  assert.equal(result.counts.reconstructedBackgroundPixels, 1);
  assert.equal(result.counts.transformedBodyPixels, 2);
  assert.equal(result.counts.protectedFacePixels, 1);
  assert.equal(result.counts.unresolvedPixels, 0);
  assert.deepEqual(Array.from(frames[0].source.data), Array.from(original));
});

test("does not replace background that is already visible in the current frame", () => {
  const frames = makeFrames();
  const original = Array.from(frames[0].source.data.slice(4, 8));
  const result = compose(frames, makeBodyLayer(10, { pixels: [0] }));
  assert.deepEqual(Array.from(result.data.slice(4, 8)), original);
  assert.equal(result.backgroundSource[1], 0);
});

test("keeps unresolved original-body pixels visible and marks the frame partial", () => {
  const frames = makeFrames();
  frames[1].faceMask.pixels[0] = 255;
  frames[2].faceMask.pixels[0] = 255;
  frames[3].faceMask.pixels[0] = 255;
  const result = compose(frames, makeBodyLayer(10, { pixels: [1] }));
  assert.equal(result.status, "partial-frame");
  assert.equal(result.readyForAssembly, false);
  assert.equal(result.unresolvedMask[0], 255);
  assert.equal(result.pixelSource[0], 4);
  assert.deepEqual(Array.from(result.data.slice(0, 4)), [200, 10, 10, 255]);
});

test("preserves a protected face even if the shared plate has a sample at that coordinate", () => {
  const frames = makeFrames();
  const plate = makePlate(frames);
  plate.coverageMask[2] = 255;
  plate.plate.data.set([1, 2, 3, 255], 8);
  plate.provenanceFrameIndex[2] = 11;
  plate.donorCount[2] = 2;
  plate.maxChannelSpread[2] = 1;
  plate.counts.hiddenPixels += 1;
  plate.counts.reconstructedPixels += 1;
  plate.counts.coverageRatio = 1;
  const originalFace = Array.from(frames[0].source.data.slice(8, 12));
  const result = composeGrowthFramePixels({
    sourceFrame: { frame: 10, timeSeconds: 0, width: 3, height: 1, data: frames[0].source.data },
    bodyMask: frames[0].bodyMask,
    protectedFaceMask: frames[0].faceMask,
    bodyLayer: makeBodyLayer(10, { pixels: [0] }),
    scenePlate: plate
  });
  assert.deepEqual(Array.from(result.data.slice(8, 12)), originalFace);
  assert.equal(result.pixelSource[2], 3);
});

test("uses source-over alpha when the transformed body has antialiased edges", () => {
  const frames = makeFrames();
  const bodyLayer = makeBodyLayer(10, { pixels: [0], colors: new Map([[0, [100, 100, 100, 128]]]) });
  const result = compose(frames, bodyLayer);
  assert.deepEqual(Array.from(result.data.slice(0, 4)), [61, 66, 71, 255]);
});

test("rejects a body layer that crosses protected face pixels", () => {
  const frames = makeFrames();
  assert.throws(() => compose(frames, makeBodyLayer(10, { pixels: [0, 2] })), {
    code: "compositor-body-layer-face-overlap"
  });
});

test("rejects source-frame and scene-plate timestamp mismatch", () => {
  const frames = makeFrames();
  const frame = frames[0];
  assert.throws(() => composeGrowthFramePixels({
    sourceFrame: { frame: 10, timeSeconds: 0.25, width: 3, height: 1, data: frame.source.data },
    bodyMask: frame.bodyMask, protectedFaceMask: frame.faceMask,
    bodyLayer: makeBodyLayer(10), scenePlate: makePlate(frames)
  }), { code: "compositor-frame-time-mismatch" });
});

test("rejects overlapping body and protected-face masks", () => {
  const frames = makeFrames();
  const scenePlate = makePlate(frames);
  frames[0].faceMask.pixels[0] = 255;
  const frame = frames[0];
  assert.throws(() => composeGrowthFramePixels({
    sourceFrame: {
      frame: frame.frame, timeSeconds: frame.timeSeconds,
      width: 3, height: 1, data: frame.source.data
    },
    bodyMask: frame.bodyMask,
    protectedFaceMask: frame.faceMask,
    bodyLayer: makeBodyLayer(10, { pixels: [1] }),
    scenePlate
  }), { code: "compositor-mask-overlap" });
});

test("rejects a scene plate that omits an original-body pixel without marking it unresolved", () => {
  const frames = makeFrames();
  const plate = makePlate(frames);
  plate.coverageMask[0] = 0;
  plate.unresolvedMask[0] = 0;
  plate.plate.data.fill(0, 0, 4);
  plate.provenanceFrameIndex[0] = -1;
  plate.donorCount[0] = 0;
  plate.maxChannelSpread[0] = 0;
  plate.counts.hiddenPixels -= 1;
  plate.counts.reconstructedPixels -= 1;
  plate.counts.coverageRatio = 1;
  assert.throws(() => composeGrowthFramePixels({
    sourceFrame: { frame: 10, timeSeconds: 0, width: 3, height: 1, data: frames[0].source.data },
    bodyMask: frames[0].bodyMask, protectedFaceMask: frames[0].faceMask,
    bodyLayer: makeBodyLayer(10, { pixels: [1] }), scenePlate: plate
  }), { code: "compositor-scene-plate-omits-hidden-pixel" });
});

test("rejects invalid body-layer coverage bytes and preserves every input", () => {
  const frames = makeFrames();
  const source = Buffer.from(frames[0].source.data);
  const bodyLayer = makeBodyLayer(10, { pixels: [0] });
  bodyLayer.data[4] = 10;
  assert.throws(() => compose(frames, bodyLayer), { code: "compositor-body-layer-outside-invalid" });
  assert.deepEqual(Array.from(frames[0].source.data), Array.from(source));
});
