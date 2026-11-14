import test from "node:test";
import assert from "node:assert/strict";
import { renderGrowthDeformationPixels } from "./pixel-frame-renderer.js";

function makeFrame(width, height, frame = 12) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = x * 20;
      data[offset + 1] = y * 20;
      data[offset + 2] = 80;
      data[offset + 3] = 255;
    }
  }
  return { frame, width, height, data };
}

function makeFaceMask(width, height, frame = 12, points = [[7, 7]]) {
  const pixels = new Uint8Array(width * height);
  for (const [x, y] of points) pixels[y * width + x] = 255;
  return { frame, width, height, pixels };
}

function makePlan(sourcePoints, targetPoints = sourcePoints, frame = 12) {
  return {
    schema: "geehub.growth-deformation-frame",
    schemaVersion: 1,
    renderable: true,
    frame,
    topologyId: "a".repeat(64),
    sourcePoints,
    targetPoints,
    triangles: [[0, 1, 2]]
  };
}

const triangle = [
  { x: 1, y: 1 },
  { x: 6, y: 1 },
  { x: 1, y: 6 }
];

function pixel(layer, x, y) {
  const offset = (y * layer.width + x) * 4;
  return [...layer.data.slice(offset, offset + 4)];
}

test("baseline rasterization reproduces covered source pixels without mutating the frame", () => {
  const sourceFrame = makeFrame(8, 8);
  const original = new Uint8ClampedArray(sourceFrame.data);
  const plan = makePlan(triangle);
  const result = renderGrowthDeformationPixels({
    sourceFrame,
    plan,
    protectedFaceMask: makeFaceMask(8, 8)
  });

  assert.equal(result.status, "ready-body-layer");
  assert.equal(result.schema, "geehub.growth-deformation-pixel-layer");
  assert.ok(result.coveredPixels > 0);
  assert.equal(result.renderedTriangles, 1);
  assert.equal(result.sourceFrameUnmodified, true);
  assert.equal(result.protectedMaskPixelsUntouched, true);
  assert.deepEqual(pixel(result, 2, 2), pixel(sourceFrame, 2, 2));
  assert.deepEqual(sourceFrame.data, original);
  assert.equal(result.coverageMask[7 * 8 + 7], 0);
  assert.deepEqual(pixel(result, 7, 7), [0, 0, 0, 0]);
});

test("translation samples the source through the inverse destination triangle", () => {
  const sourceFrame = makeFrame(8, 8);
  const target = triangle.map(point => ({ x: point.x + 1, y: point.y }));
  const result = renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle, target),
    protectedFaceMask: makeFaceMask(8, 8)
  });

  assert.deepEqual(pixel(result, 3, 2), pixel(sourceFrame, 2, 2));
  assert.equal(result.coverageMask[2 * 8 + 3], 255);
});

test("source and destination triangles may not sample or cover protected face pixels", () => {
  const sourceFrame = makeFrame(9, 8);
  const sourceOverlap = makePlan(triangle);
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: sourceOverlap,
    protectedFaceMask: makeFaceMask(9, 8, 12, [[2, 2]])
  }), error => error.code === "pixel-frame-mesh-overlaps-protected-mask");

  const smallSource = [
    { x: 1, y: 1 },
    { x: 4, y: 1 },
    { x: 1, y: 4 }
  ];
  const shifted = smallSource.map(point => ({ x: point.x + 4, y: point.y }));
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(smallSource, shifted),
    protectedFaceMask: makeFaceMask(9, 8, 12, [[5, 1]])
  }), error => error.code === "pixel-frame-mesh-overlaps-protected-mask");
});

test("refuses folded geometry and mismatched frame identities", () => {
  const sourceFrame = makeFrame(8, 8);
  const reversed = [triangle[0], triangle[2], triangle[1]];
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle, reversed),
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-mesh-foldover");

  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle, triangle, 11),
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-plan-not-renderable");

  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle),
    protectedFaceMask: makeFaceMask(8, 8, 11)
  }), error => error.code === "pixel-frame-face-mask-invalid");
});

test("requires a complete RGBA source and a non-empty binary face mask", () => {
  const sourceFrame = makeFrame(8, 8);
  const plan = makePlan(triangle);
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame: { ...sourceFrame, data: new Uint8Array(8 * 8 * 3) },
    plan,
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-source-invalid");

  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan,
    protectedFaceMask: makeFaceMask(8, 8, 12, [])
  }), error => error.code === "pixel-frame-face-mask-empty");

  const softMask = makeFaceMask(8, 8);
  softMask.pixels[0] = 128;
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan,
    protectedFaceMask: softMask
  }), error => error.code === "pixel-frame-face-mask-not-binary");
});

test("refuses mesh vertices outside the source frame", () => {
  const sourceFrame = makeFrame(8, 8);
  const outside = [
    { x: 1, y: 1 },
    { x: 9, y: 1 },
    { x: 1, y: 6 }
  ];
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(outside),
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-mesh-out-of-bounds");
});
