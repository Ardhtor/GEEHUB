import test from "node:test";
import assert from "node:assert/strict";
import { buildStableMaskMesh } from "./mask-mesh.js";

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

function frame(number, shift = 0) {
  const width = 28, height = 30;
  const face = (x, y) => x >= 11 + shift && x <= 15 + shift && y >= 2 && y <= 8;
  const body = (x, y) => x >= 3 + shift && x <= 23 + shift && y >= 2 && y <= 27 && !face(x, y);
  return {
    frame: number,
    timeSeconds: number / 24,
    bodyMask: makeMask(width, height, body),
    faceMask: makeMask(width, height, face)
  };
}

function insideTriangle(point, triangle) {
  const [a, b, c] = triangle;
  const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  const first = ((b.x - point.x) * (c.y - point.y) - (c.x - point.x) * (b.y - point.y)) / area;
  const second = ((c.x - point.x) * (a.y - point.y) - (a.x - point.x) * (c.y - point.y)) / area;
  const third = 1 - first - second;
  return first >= -1e-9 && second >= -1e-9 && third >= -1e-9;
}

test("builds a fixed-index mesh shared by adjacent moving mask frames", () => {
  const result = buildStableMaskMesh([frame(0), frame(1, 1)], { columns: 6, rows: 8 });
  assert.equal(result.status, "ready");
  assert.equal(result.topologyStable, true);
  assert.equal(result.connected, true);
  assert.equal(result.coverage.connectedComponents, 1);
  assert.equal(result.frames.length, 2);
  assert.ok(result.triangles.length > 0);
  assert.equal(result.vertexIds.length, 63);
  assert.equal(result.frames[0].sourcePoints.length, result.vertexIds.length);
  assert.equal(result.frames[1].sourcePoints[0].x - result.frames[0].sourcePoints[0].x, 1);
  assert.deepEqual(result.triangles, result.triangles.map(triangle => [...triangle]));
  assert.equal(result.evidence.faceExclusionVerified, true);
  assert.equal(result.evidence.pixelSemanticsVerified, false);
  assert.equal(result.topologyId.length, 64);
});

test("every retained triangle is wholly covered by body pixels and avoids protected-face pixels", () => {
  const frames = [frame(0), frame(1, 1)];
  const result = buildStableMaskMesh(frames, { columns: 6, rows: 8 });
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    const sourcePoints = result.frames[frameIndex].sourcePoints;
    const body = frames[frameIndex].bodyMask;
    const face = frames[frameIndex].faceMask;
    for (const indices of result.triangles) {
      const triangle = indices.map(index => sourcePoints[index]);
      const minX = Math.max(0, Math.floor(Math.min(...triangle.map(point => point.x))));
      const maxX = Math.min(body.width - 1, Math.ceil(Math.max(...triangle.map(point => point.x))));
      const minY = Math.max(0, Math.floor(Math.min(...triangle.map(point => point.y))));
      const maxY = Math.min(body.height - 1, Math.ceil(Math.max(...triangle.map(point => point.y))));
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          if (!insideTriangle({ x: x + 0.5, y: y + 0.5 }, triangle)) continue;
          const index = y * body.width + x;
          assert.equal(body.pixels[index], 255);
          assert.equal(face.pixels[index], 0);
        }
      }
    }
  }
});

test("rejects overlapping body and face masks", () => {
  const first = frame(0);
  first.bodyMask.pixels[3 * first.bodyMask.width + 12] = 255;
  assert.throws(
    () => buildStableMaskMesh([first, frame(1)]),
    error => error.code === "mask-mesh-face-overlap"
  );
});

test("rejects non-binary masks, changed dimensions, and discontinuous frame order", () => {
  const nonBinary = frame(0);
  nonBinary.bodyMask.pixels[0] = 127;
  assert.throws(
    () => buildStableMaskMesh([nonBinary, frame(1)]),
    error => error.code === "mask-mesh-pixels-not-binary"
  );
  const wrongSize = frame(1);
  wrongSize.faceMask = makeMask(27, 30, () => true);
  assert.throws(
    () => buildStableMaskMesh([frame(0), wrongSize]),
    error => error.code === "mask-mesh-format-invalid"
  );
  assert.throws(
    () => buildStableMaskMesh([frame(0), frame(2)]),
    error => error.code === "mask-mesh-frame-order-invalid"
  );
});

test("reports disconnected topology when an over-resolved grid fragments into islands", () => {
  const result = buildStableMaskMesh([frame(0), frame(1)], {
    columns: 64, rows: 64, minTriangles: 1
  });
  assert.equal(result.status, "disconnected");
  assert.equal(result.topologyStable, true);
  assert.equal(result.connected, false);
  assert.ok(result.coverage.connectedComponents > 1);
});

test("reports insufficient coverage when the configured stable-triangle minimum is not met", () => {
  const result = buildStableMaskMesh([frame(0), frame(1)], {
    columns: 2, rows: 2, minTriangles: 9
  });
  assert.equal(result.status, "insufficient-coverage");
  assert.equal(result.topologyStable, true);
  assert.equal(result.connected, true);
  assert.ok(result.triangles.length > 0);
  assert.ok(result.triangles.length < 9);
});
