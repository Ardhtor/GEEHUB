import test from "node:test";
import assert from "node:assert/strict";
import { BASELINE, createGrowthState, createChildState } from "./growth-state.js";
import { REGIONS } from "./growth-state.js";
import { buildStableMaskMesh } from "./mask-mesh.js";
import { prepareGrowthDeformationSequence } from "./render-plan-sequence.js";

function makeMask(width, height, predicate) {
  const pixels = new Uint8Array(width * height);
  let foregroundPixels = 0;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!predicate(x, y)) continue;
      pixels[y * width + x] = 255;
      foregroundPixels += 1;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  return {
    width, height, pixels, foregroundPixels,
    bounds: foregroundPixels ? { left, top, right, bottom } : null
  };
}

function makeFrame(frame, shift = 0, timeSeconds = frame / 2) {
  const width = 28, height = 30;
  const bodyMask = makeMask(width, height, (x, y) =>
    x >= 3 + shift && x <= 23 + shift && y >= 9 && y <= 27
  );
  const faceMask = {
    ...makeMask(width, height, (x, y) =>
      x >= 11 + shift && x <= 15 + shift && y >= 2 && y <= 8
    ),
    frame
  };
  const points = {
    faceCenter: [0.50, 0.08], neck: [0.50, 0.20],
    leftShoulder: [0.40, 0.25], rightShoulder: [0.60, 0.25],
    leftElbow: [0.30, 0.40], rightElbow: [0.70, 0.40],
    leftWrist: [0.25, 0.55], rightWrist: [0.75, 0.55],
    leftHip: [0.45, 0.50], rightHip: [0.55, 0.50],
    leftKnee: [0.44, 0.72], rightKnee: [0.56, 0.72],
    leftAnkle: [0.43, 0.95], rightAnkle: [0.57, 0.95]
  };
  const dx = shift / width;
  const landmarkFrame = {
    frame,
    timeSeconds,
    landmarks: Object.fromEntries(Object.entries(points).map(([name, [x, y]]) => [
      name, { x: x + dx, y, confidence: 0.99 }
    ]))
  };
  return { frame, timeSeconds, bodyMask, faceMask, landmarkFrame };
}

function growthStates(grownScale = 1.04) {
  const baseline = createGrowthState(BASELINE, { id: "baseline" });
  const grown = createChildState(baseline, Object.fromEntries(
    REGIONS.map(region => [region, grownScale])
  ), { id: "grown" });
  return [baseline, grown];
}

function setup(times = [0, 0.5, 1]) {
  const evidence = times.map((time, index) => makeFrame(index, index, time));
  const maskMesh = buildStableMaskMesh(evidence.map(frame => ({
    frame: frame.frame,
    timeSeconds: frame.timeSeconds,
    bodyMask: frame.bodyMask,
    faceMask: frame.faceMask
  })), { columns: 6, rows: 8 });
  assert.equal(maskMesh.status, "ready");
  return {
    evidence,
    maskMesh,
    landmarkFrames: evidence.map(frame => frame.landmarkFrame),
    protectedFaceMasks: evidence.map(frame => frame.faceMask)
  };
}

test("prepares one fixed-topology plan per source timestamp across the source duration", () => {
  const input = setup();
  const result = prepareGrowthDeformationSequence({
    ...input,
    growthStates: growthStates(),
    sourceDurationSeconds: 1
  });
  assert.equal(result.schema, "geehub.render-plan-sequence");
  assert.equal(result.status, "ready-for-render");
  assert.equal(result.renderable, true);
  assert.equal(result.frameCount, 3);
  assert.equal(result.firstFrame, 0);
  assert.equal(result.lastFrame, 2);
  assert.deepEqual(result.growthStateIds, ["baseline", "grown"]);
  assert.equal(result.frames[0].growth.requestedStatureRatio, 1);
  assert.ok(Math.abs(result.frames[1].growth.requestedStatureRatio - 1.02) < 1e-6);
  assert.ok(Math.abs(result.frames[2].growth.requestedStatureRatio - 1.04) < 1e-6);
  assert.ok(result.frames.every(frame => frame.renderable));
  assert.ok(result.frames.every(frame => frame.topologyId === input.maskMesh.topologyId));
  assert.deepEqual(result.frames[0].vertexIds, result.frames[2].vertexIds);
});

test("rejects frame timestamps outside the immutable source duration", () => {
  const input = setup([0, 0.5, 1.1]);
  assert.throws(() => prepareGrowthDeformationSequence({
    ...input,
    growthStates: growthStates(),
    sourceDurationSeconds: 1
  }), error => error.code === "render-plan-source-time-outside-duration");
});

test("rejects mismatched protected-face and landmark frame identities", () => {
  const input = setup();
  const wrongFaces = input.protectedFaceMasks.map(mask => ({ ...mask }));
  wrongFaces[1].frame = 9;
  assert.throws(() => prepareGrowthDeformationSequence({
    ...input,
    protectedFaceMasks: wrongFaces,
    growthStates: growthStates(),
    sourceDurationSeconds: 1
  }), error => error.code === "render-plan-face-mask-frame-mismatch");

  const wrongLandmarks = input.landmarkFrames.map(frame => ({ ...frame }));
  wrongLandmarks[1].frame = 9;
  assert.throws(() => prepareGrowthDeformationSequence({
    ...input,
    landmarkFrames: wrongLandmarks,
    growthStates: growthStates(),
    sourceDurationSeconds: 1
  }), error => error.code === "render-plan-landmark-frame-mismatch");
});

test("temporal failure blocks every generated frame plan", () => {
  const input = setup();
  const result = prepareGrowthDeformationSequence({
    ...input,
    growthStates: growthStates(1.08),
    sourceDurationSeconds: 1,
    temporalLimits: {
      maxDisplacementVelocityBodyHeightsPerSecond: 0.0001,
      maxDisplacementAccelerationBodyHeightsPerSecondSquared: 40
    }
  });
  assert.equal(result.renderable, false);
  assert.equal(result.status, "blocked-temporal-instability");
  assert.ok(result.temporal.violations.length > 0);
  assert.ok(result.frames.every(frame => frame.renderable === false));
});

test("rejects invalid growth states before constructing frame plans", () => {
  const input = setup();
  const states = growthStates();
  states[1] = { ...states[1], body: { ...states[1].body, stature: 0.9 } };
  assert.throws(() => prepareGrowthDeformationSequence({
    ...input,
    growthStates: states,
    sourceDurationSeconds: 1
  }), error => error.code === "render-plan-growth-sequence-invalid");
});
