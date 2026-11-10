import test from "node:test";
import assert from "node:assert/strict";
import { REGIONS } from "./growth-state.js";
import { buildStableMaskMesh } from "./mask-mesh.js";
import {
  buildGrowthDeformationFrame,
  buildGrowthDeformationSequence,
  renderGrowthDeformationFrame
} from "./mesh-deformation.js";

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

function maskFrame(number, shift = 0) {
  const width = 28, height = 30;
  const face = (x, y) => x >= 11 + shift && x <= 15 + shift && y >= 2 && y <= 8;
  const body = (x, y) => x >= 3 + shift && x <= 23 + shift && y >= 9 && y <= 27;
  return {
    frame: number,
    timeSeconds: number / 24,
    bodyMask: makeMask(width, height, body),
    faceMask: { ...makeMask(width, height, face), frame: number }
  };
}

const landmarks = (number, shift = 0) => {
  const dx = shift / 28;
  const source = {
    faceCenter: [0.50, 0.08], neck: [0.50, 0.20],
    leftShoulder: [0.40, 0.25], rightShoulder: [0.60, 0.25],
    leftElbow: [0.30, 0.40], rightElbow: [0.70, 0.40],
    leftWrist: [0.25, 0.55], rightWrist: [0.75, 0.55],
    leftHip: [0.45, 0.50], rightHip: [0.55, 0.50],
    leftKnee: [0.44, 0.72], rightKnee: [0.56, 0.72],
    leftAnkle: [0.43, 0.95], rightAnkle: [0.57, 0.95]
  };
  return {
    frame: number,
    timeSeconds: number / 24,
    landmarks: Object.fromEntries(Object.entries(source).map(([name, [x, y]]) => [
      name, { x: x + dx, y, confidence: 0.99 }
    ]))
  };
};

const body = overrides => Object.fromEntries(REGIONS.map(region => [
  region, overrides?.[region] ?? 1
]));
const setup = () => {
  const masks = [maskFrame(0), maskFrame(1, 1)];
  const maskMesh = buildStableMaskMesh(masks, { columns: 6, rows: 8 });
  assert.equal(maskMesh.status, "ready");
  return { masks, maskMesh };
};

test("baseline deformation preserves every mask-mesh vertex and the shared topology", () => {
  const { masks, maskMesh } = setup();
  const plan = buildGrowthDeformationFrame({
    maskMesh,
    frameIndex: 0,
    landmarkFrame: landmarks(0),
    baselineBody: body(),
    targetBody: body(),
    protectedFaceMask: masks[0].faceMask
  });
  assert.equal(plan.status, "ready-for-render");
  assert.equal(plan.renderable, true);
  assert.equal(plan.topologyId, maskMesh.topologyId);
  assert.deepEqual(plan.vertexIds, maskMesh.vertexIds);
  assert.deepEqual(plan.triangles, maskMesh.triangles);
  plan.sourcePoints.forEach((point, index) => {
    assert.ok(Math.abs(point.x - plan.targetPoints[index].x) < 1e-7);
    assert.ok(Math.abs(point.y - plan.targetPoints[index].y) < 1e-7);
  });
  assert.equal(plan.validation.sourceFaceOverlaps, 0);
  assert.equal(plan.validation.targetFaceOverlaps, 0);
});

test("articulated growth moves the stable surface without folding or covering the face", () => {
  const { masks, maskMesh } = setup();
  const plan = buildGrowthDeformationFrame({
    maskMesh,
    frameIndex: 0,
    landmarkFrame: landmarks(0),
    baselineBody: body(),
    targetBody: body({
      stature: 1.02, torsoLength: 1.02, shoulderSpan: 1.02,
      armLength: 1.02, thighLength: 1.02
    }),
    protectedFaceMask: masks[0].faceMask
  });
  assert.equal(plan.status, "ready-for-render");
  assert.ok(plan.targetPoints.some((point, index) =>
    Math.hypot(point.x - plan.sourcePoints[index].x, point.y - plan.sourcePoints[index].y) > 1e-5
  ));
  assert.equal(plan.validation.foldedTriangles, 0);
  assert.equal(plan.validation.sourceFaceOverlaps, 0);
  assert.equal(plan.validation.targetFaceOverlaps, 0);
});

test("two-frame deformation keeps vertex and triangle identities while source motion changes", () => {
  const { masks, maskMesh } = setup();
  const result = buildGrowthDeformationSequence({
    maskMesh,
    landmarkFrames: [landmarks(0), landmarks(1, 1)],
    baselineBody: body(),
    targetBodies: [body(), body()],
    protectedFaceMasks: masks.map(frame => frame.faceMask)
  });
  assert.equal(result.status, "ready-for-render");
  assert.equal(result.frameCount, 2);
  assert.equal(result.topologyId, maskMesh.topologyId);
  assert.deepEqual(result.frames[0].vertexIds, result.frames[1].vertexIds);
  assert.deepEqual(result.frames[0].triangleIds, result.frames[1].triangleIds);
  assert.ok(Math.abs(
    result.frames[1].sourcePoints[0].x - result.frames[0].sourcePoints[0].x - 1
  ) < 1e-9);
});

test("sequence growth cannot regress between adjacent frames", () => {
  const { masks, maskMesh } = setup();
  assert.throws(() => buildGrowthDeformationSequence({
    maskMesh,
    landmarkFrames: [landmarks(0), landmarks(1, 1)],
    baselineBody: body(),
    targetBodies: [body({ stature: 1.1 }), body({ stature: 1.05 })],
    protectedFaceMasks: masks.map(frame => frame.faceMask)
  }), error => error.code === "mesh-deformation-growth-regression");
});

test("render adapter draws only a ready deformation plan", () => {
  const { masks, maskMesh } = setup();
  const plan = buildGrowthDeformationFrame({
    maskMesh,
    frameIndex: 0,
    landmarkFrame: landmarks(0),
    baselineBody: body(),
    targetBody: body(),
    protectedFaceMask: masks[0].faceMask
  });
  const calls = { draw: 0 };
  const context = {
    save() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    clip() {}, transform() {}, restore() {}, drawImage() { calls.draw += 1; }
  };
  const result = renderGrowthDeformationFrame(context, {}, plan);
  assert.equal(result.renderedTriangles, maskMesh.triangles.length);
  assert.equal(calls.draw, maskMesh.triangles.length);
  assert.throws(() => renderGrowthDeformationFrame(context, {}, { ...plan, renderable: false }),
    error => error.code === "mesh-deformation-plan-not-renderable");
});

test("rejects mismatched frame evidence and missing protected-face pixels", () => {
  const { masks, maskMesh } = setup();
  const args = {
    maskMesh,
    frameIndex: 0,
    landmarkFrame: landmarks(1),
    baselineBody: body(),
    targetBody: body(),
    protectedFaceMask: masks[0].faceMask
  };
  assert.throws(() => buildGrowthDeformationFrame(args),
    error => error.code === "mesh-deformation-frame-evidence-mismatch");
  assert.throws(() => buildGrowthDeformationFrame({
    ...args, landmarkFrame: landmarks(0),
    protectedFaceMask: { ...masks[0].faceMask, frame: 1 }
  }), error => error.code === "mesh-deformation-face-mask-invalid");
  assert.throws(() => buildGrowthDeformationFrame({
    ...args, landmarkFrame: landmarks(0),
    protectedFaceMask: { ...makeMask(28, 30, () => false), frame: 0 }
  }), error => error.code === "mesh-deformation-face-mask-empty");
});
