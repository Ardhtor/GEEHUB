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

function makeBodyMask(width, height, frame = 12, backgroundPoints = [[7, 7]]) {
  const pixels = new Uint8Array(width * height);
  pixels.fill(255);
  for (const [x, y] of backgroundPoints) pixels[y * width + x] = 0;
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
    bodyMask: makeBodyMask(8, 8),
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
    bodyMask: makeBodyMask(8, 8),
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
    bodyMask: makeBodyMask(9, 8, 12, [[2, 2]]),
    protectedFaceMask: makeFaceMask(9, 8, 12, [[2, 2]])
  }), error => error.code === "pixel-frame-source-triangle-outside-body");

  const smallSource = [
    { x: 1, y: 1 },
    { x: 4, y: 1 },
    { x: 1, y: 4 }
  ];
  const shifted = smallSource.map(point => ({ x: point.x + 4, y: point.y }));
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(smallSource, shifted),
    bodyMask: makeBodyMask(9, 8, 12, [[5, 1]]),
    protectedFaceMask: makeFaceMask(9, 8, 12, [[5, 1]])
  }), error => error.code === "pixel-frame-mesh-overlaps-protected-mask");
});

test("refuses folded geometry and mismatched frame identities", () => {
  const sourceFrame = makeFrame(8, 8);
  const reversed = [triangle[0], triangle[2], triangle[1]];
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle, reversed),
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-mesh-foldover");

  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle, triangle, 11),
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-plan-not-renderable");

  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle),
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8, 11)
  }), error => error.code === "pixel-frame-mask-invalid");
});

test("requires a complete RGBA source and a non-empty binary face mask", () => {
  const sourceFrame = makeFrame(8, 8);
  const plan = makePlan(triangle);
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame: { ...sourceFrame, data: new Uint8Array(8 * 8 * 3) },
    plan,
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-source-invalid");

  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan,
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8, 12, [])
  }), error => error.code === "pixel-frame-mask-empty");

  const softMask = makeFaceMask(8, 8);
  softMask.pixels[0] = 128;
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan,
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: softMask
  }), error => error.code === "pixel-frame-mask-not-binary");
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
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-mesh-out-of-bounds");
});

test("refuses overlapping masks and body triangles that cross background pixels", () => {
  const sourceFrame = makeFrame(8, 8);
  const overlappingBody = makeBodyMask(8, 8);
  overlappingBody.pixels[7 * 8 + 7] = 255;
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle),
    bodyMask: overlappingBody,
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-mask-overlap");

  const bodyWithHole = makeBodyMask(8, 8, 12, [[3, 2], [7, 7]]);
  assert.throws(() => renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle),
    bodyMask: bodyWithHole,
    protectedFaceMask: makeFaceMask(8, 8)
  }), error => error.code === "pixel-frame-source-triangle-outside-body");
});

test("shared triangle edges rasterize once with matching source correspondence", () => {
  const sourceFrame = makeFrame(8, 8);
  const sourcePoints = [
    { x: 1, y: 1 },
    { x: 5, y: 1 },
    { x: 1, y: 5 },
    { x: 5, y: 5 }
  ];
  const targetPoints = sourcePoints.map(point => ({ x: point.x + 0.5, y: point.y }));
  const plan = {
    ...makePlan(sourcePoints, targetPoints),
    triangles: [[0, 1, 2], [1, 3, 2]]
  };
  const result = renderGrowthDeformationPixels({
    sourceFrame,
    plan,
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8)
  });
  assert.equal(result.renderedTriangles, 2);
  assert.ok(result.coveredPixels > 0);
});

test("bilinear sampling uses premultiplied alpha to avoid transparent-colour fringes", () => {
  const sourceFrame = makeFrame(8, 8);
  const opaque = (2 * 8 + 2) * 4;
  const transparent = (2 * 8 + 3) * 4;
  sourceFrame.data.set([255, 0, 0, 255], opaque);
  sourceFrame.data.set([0, 0, 255, 0], transparent);
  const target = triangle.map(point => ({ x: point.x + 0.5, y: point.y }));
  const result = renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(triangle, target),
    bodyMask: makeBodyMask(8, 8),
    protectedFaceMask: makeFaceMask(8, 8)
  });
  const sample = pixel(result, 3, 2);
  assert.equal(sample[0], 255);
  assert.equal(sample[1], 0);
  assert.equal(sample[2], 0);
  assert.ok(sample[3] >= 127 && sample[3] <= 128);
});

test("bilinear source taps never pull colour from a protected face pixel", () => {
  const sourceFrame = makeFrame(8, 8);
  for (const [x, y] of [[3, 1], [4, 1], [3, 2]]) {
    sourceFrame.data.set([255, 0, 0, 255], (y * 8 + x) * 4);
  }
  sourceFrame.data.set([0, 0, 255, 255], (2 * 8 + 4) * 4);
  const sourcePoints = [
    { x: 1, y: 1 },
    { x: 5, y: 1 },
    { x: 1, y: 5 }
  ];
  const targetPoints = sourcePoints.map(point => ({ x: point.x - 0.5, y: point.y - 0.5 }));
  const result = renderGrowthDeformationPixels({
    sourceFrame,
    plan: makePlan(sourcePoints, targetPoints),
    bodyMask: makeBodyMask(8, 8, 12, [[4, 2], [7, 7]]),
    protectedFaceMask: makeFaceMask(8, 8, 12, [[4, 2]])
  });
  assert.deepEqual(pixel(result, 3, 1), [255, 0, 0, 255]);
});
