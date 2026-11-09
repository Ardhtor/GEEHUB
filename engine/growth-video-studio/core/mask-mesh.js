/**
 * Build a face-excluding, fixed-index grid mesh from verified binary masks.
 *
 * The grid is laid over each frame's body bounds. Candidate triangles are
 * retained only when every pixel centre they cover is body foreground and
 * protected-face background in every supplied frame. Vertex IDs and triangle
 * IDs therefore remain identical across the sequence. This is a conservative
 * 2D correspondence mesh, not semantic segmentation or a 3D body model.
 */
import { createHash } from "node:crypto";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function inspectMask(mask, label, width, height) {
  if (!mask || mask.width !== width || mask.height !== height ||
      !(mask.pixels instanceof Uint8Array) || mask.pixels.length !== width * height) {
    fail("mask-mesh-format-invalid", label + " mask pixels or dimensions are invalid");
  }
  let foregroundPixels = 0;
  let left = width, top = height, right = -1, bottom = -1;
  for (let index = 0; index < mask.pixels.length; index += 1) {
    const value = mask.pixels[index];
    if (value !== 0 && value !== 255) {
      fail("mask-mesh-pixels-not-binary", label + " mask contains a non-binary sample");
    }
    if (value !== 255) continue;
    foregroundPixels += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  if (!foregroundPixels) fail("mask-mesh-mask-empty", label + " mask has no foreground pixels");
  return {
    pixels: mask.pixels,
    foregroundPixels,
    bounds: { left, top, right, bottom }
  };
}

function makeRowPrefix(mask, width, height) {
  const PrefixArray = width <= 65535 ? Uint16Array : Uint32Array;
  const stride = width + 1;
  const prefix = new PrefixArray(height * stride);
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * width;
    const prefixOffset = y * stride;
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      if (mask[sourceOffset + x] === 255) count += 1;
      prefix[prefixOffset + x + 1] = count;
    }
  }
  return { values: prefix, stride };
}

function pointAt(bounds, column, row, columns, rows) {
  return {
    x: bounds.left + 0.5 + (bounds.right - bounds.left) * column / columns,
    y: bounds.top + 0.5 + (bounds.bottom - bounds.top) * row / rows
  };
}

function triangleRowRange(points, scanY) {
  const intersections = [];
  for (let index = 0; index < 3; index += 1) {
    const first = points[index];
    const second = points[(index + 1) % 3];
    if ((first.y <= scanY && scanY < second.y) ||
        (second.y <= scanY && scanY < first.y)) {
      const amount = (scanY - first.y) / (second.y - first.y);
      intersections.push(first.x + (second.x - first.x) * amount);
    }
  }
  if (intersections.length < 2) return null;
  const minimum = Math.min(...intersections);
  const maximum = Math.max(...intersections);
  return {
    first: Math.ceil(minimum - 0.5 - 1e-9),
    last: Math.floor(maximum - 0.5 + 1e-9)
  };
}

function triangleArea(points) {
  const [a, b, c] = points;
  return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}

function connectedTriangleComponents(triangles) {
  const adjacency = triangles.map(() => new Set());
  const edgeOwners = new Map();
  triangles.forEach((triangle, index) => {
    for (const [first, second] of [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]]
    ]) {
      const key = first < second ? first + ":" + second : second + ":" + first;
      const owner = edgeOwners.get(key);
      if (owner === undefined) edgeOwners.set(key, index);
      else {
        adjacency[index].add(owner);
        adjacency[owner].add(index);
      }
    }
  });

  const visited = new Set();
  const components = [];
  for (let start = 0; start < triangles.length; start += 1) {
    if (visited.has(start)) continue;
    const component = [];
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const current = queue.pop();
      component.push(current);
      for (const neighbour of adjacency[current]) {
        if (visited.has(neighbour)) continue;
        visited.add(neighbour);
        queue.push(neighbour);
      }
    }
    components.push(component);
  }
  return components;
}

function triangleMaskStatus(frame, points, indices, width, height, prefixes) {
  const triangle = indices.map(index => points[index]);
  if (Math.abs(triangleArea(triangle)) < 1e-8) return "degenerate";

  for (const point of triangle) {
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    if (x < 0 || x >= width || y < 0 || y >= height) return "outside-body";
    const offset = y * width + x;
    if (frame.face.pixels[offset] === 255) return "protected-face";
    if (frame.body.pixels[offset] !== 255) return "outside-body";
  }

  const minY = Math.min(...triangle.map(point => point.y));
  const maxY = Math.max(...triangle.map(point => point.y));
  const firstRow = Math.max(0, Math.ceil(minY - 0.5 - 1e-9));
  const lastRow = Math.min(height - 1, Math.floor(maxY - 0.5 + 1e-9));
  let sampledPixels = 0;

  for (let y = firstRow; y <= lastRow; y += 1) {
    const range = triangleRowRange(triangle, y + 0.5);
    if (!range) continue;
    const first = Math.max(0, range.first);
    const last = Math.min(width - 1, range.last);
    if (first > last) continue;
    const count = last - first + 1;
    const bodyOffset = y * prefixes.body.stride;
    const faceOffset = y * prefixes.face.stride;
    const bodyCount = prefixes.body.values[bodyOffset + last + 1] -
      prefixes.body.values[bodyOffset + first];
    const faceCount = prefixes.face.values[faceOffset + last + 1] -
      prefixes.face.values[faceOffset + first];
    if (faceCount > 0) return "protected-face";
    if (bodyCount !== count) return "outside-body";
    sampledPixels += count;
  }
  return sampledPixels > 0 ? null : "no-pixel-coverage";
}

/**
 * Create one topology shared by every frame in a short sequence.
 *
 * Each frame is { frame, timeSeconds, bodyMask, faceMask }, where masks are
 * decoded by decodeBinaryMaskPng. The output keeps source-pixel coordinates;
 * it does not move pixels or apply growth.
 */
export function buildStableMaskMesh(frames, options = {}) {
  if (!Array.isArray(frames) || frames.length < 2) {
    fail("mask-mesh-sequence-too-short", "At least two decoded mask frames are required");
  }

  const firstBody = frames[0]?.bodyMask;
  const width = firstBody?.width;
  const height = firstBody?.height;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    fail("mask-mesh-format-invalid", "The first body mask has invalid dimensions");
  }

  let previousFrame = null;
  let previousTime = -Infinity;
  const preparedFrames = frames.map((frame, index) => {
    if (!Number.isInteger(frame?.frame) || frame.frame < 0 ||
        (previousFrame !== null && frame.frame !== previousFrame + 1)) {
      fail("mask-mesh-frame-order-invalid", "Mask mesh frames must be contiguous and ordered");
    }
    if (!Number.isFinite(frame.timeSeconds) || frame.timeSeconds < 0 ||
        frame.timeSeconds <= previousTime) {
      fail("mask-mesh-time-order-invalid", "Mask mesh timestamps must be finite and increasing");
    }
    previousFrame = frame.frame;
    previousTime = frame.timeSeconds;

    const body = inspectMask(frame.bodyMask, "Body", width, height);
    const face = inspectMask(frame.faceMask, "Face", width, height);
    for (let pixel = 0; pixel < body.pixels.length; pixel += 1) {
      if (body.pixels[pixel] === 255 && face.pixels[pixel] === 255) {
        fail("mask-mesh-face-overlap", "Body and protected-face masks overlap in frame " + frame.frame);
      }
    }
    return {
      frame: frame.frame,
      timeSeconds: frame.timeSeconds,
      body,
      face
    };
  });

  const minimumWidth = Math.min(...preparedFrames.map(item => item.body.bounds.right - item.body.bounds.left + 1));
  const minimumHeight = Math.min(...preparedFrames.map(item => item.body.bounds.bottom - item.body.bounds.top + 1));
  const columns = options.columns ?? Math.max(2, Math.min(12, Math.floor((minimumWidth - 1) / 3)));
  const rows = options.rows ?? Math.max(2, Math.min(18, Math.floor((minimumHeight - 1) / 3)));
  const minTriangles = options.minTriangles ?? 1;
  const maxVertices = options.maxVertices ?? 8192;
  if (!Number.isInteger(columns) || columns < 2 || columns > 64 ||
      !Number.isInteger(rows) || rows < 2 || rows > 96 ||
      !Number.isInteger(minTriangles) || minTriangles < 1 ||
      !Number.isInteger(maxVertices) || maxVertices < 9) {
    throw new TypeError("Mask mesh grid and limits must be positive bounded integers");
  }

  const vertexCount = (columns + 1) * (rows + 1);
  if (vertexCount > maxVertices) {
    fail("mask-mesh-grid-too-large", "Mask mesh grid exceeds the configured vertex limit");
  }

  const vertexIds = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      vertexIds.push("v:" + row + ":" + column);
    }
  }
  const framePoints = preparedFrames.map(frame => {
    const sourcePoints = [];
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        sourcePoints.push(pointAt(frame.body.bounds, column, row, columns, rows));
      }
    }
    return {
      frame: frame.frame,
      timeSeconds: frame.timeSeconds,
      bounds: frame.body.bounds,
      sourcePoints
    };
  });

  const candidates = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * (columns + 1) + column;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * (columns + 1) + column;
      const bottomRight = bottomLeft + 1;
      candidates.push({ id: "t:" + row + ":" + column + ":a", indices: [topLeft, topRight, bottomRight] });
      candidates.push({ id: "t:" + row + ":" + column + ":b", indices: [topLeft, bottomRight, bottomLeft] });
    }
  }

  let stable = candidates;
  const rejected = { degenerate: 0, outsideBody: 0, protectedFace: 0, noPixelCoverage: 0 };
  for (let frameIndex = 0; frameIndex < preparedFrames.length && stable.length; frameIndex += 1) {
    const frame = preparedFrames[frameIndex];
    const prefixes = {
      body: makeRowPrefix(frame.body.pixels, width, height),
      face: makeRowPrefix(frame.face.pixels, width, height)
    };
    const points = framePoints[frameIndex].sourcePoints;
    stable = stable.filter(candidate => {
      const reason = triangleMaskStatus(frame, points, candidate.indices, width, height, prefixes);
      if (!reason) return true;
      if (reason === "protected-face") rejected.protectedFace += 1;
      else if (reason === "no-pixel-coverage") rejected.noPixelCoverage += 1;
      else if (reason === "degenerate") rejected.degenerate += 1;
      else rejected.outsideBody += 1;
      return false;
    });
  }

  const triangles = stable.map(candidate => [...candidate.indices]);
  const triangleIds = stable.map(candidate => candidate.id);
  const used = [...new Set(triangles.flat())].sort((a, b) => a - b);
  const topology = {
    columns,
    rows,
    vertexIds,
    triangleIds,
    triangles
  };
  const topologyId = createHash("sha256").update(JSON.stringify(topology)).digest("hex");
  const hasStableTopology = triangles.length > 0;
  const components = connectedTriangleComponents(triangles);
  const connected = components.length === 1;
  const ready = triangles.length >= minTriangles && connected;
  const status = ready ? "ready" : triangles.length > 0 && !connected ? "disconnected" : "insufficient-coverage";

  return {
    schema: "geehub.mask-mesh",
    schemaVersion: 1,
    status,
    topologyId,
    topologyStable: hasStableTopology,
    connected,
    sequence: {
      firstFrame: preparedFrames[0].frame,
      lastFrame: preparedFrames[preparedFrames.length - 1].frame,
      frameCount: preparedFrames.length,
      width,
      height
    },
    grid: { columns, rows, vertexCount },
    vertexIds,
    usedVertexIds: used.map(index => vertexIds[index]),
    triangleIds,
    triangles,
    frames: framePoints,
    coverage: {
      candidateTriangles: candidates.length,
      stableTriangles: triangles.length,
      ratio: candidates.length ? triangles.length / candidates.length : 0,
      connectedComponents: components.length,
      componentSizes: components.map(component => component.length),
      rejected
    },
    evidence: {
      source: "decoded-binary-body-and-face-masks",
      faceExclusionVerified: hasStableTopology,
      pixelSemanticsVerified: false,
      topologyAcrossFrames: hasStableTopology ? "identical-triangle-and-vertex-identities" : "no-stable-triangles",
      edgeConnected: connected
    },
    note: "Triangles are retained only when every covered pixel centre is body foreground and protected-face background in every supplied frame. A ready mesh must also form one edge-connected component and meet the configured minimum coverage. This proves mask-relative coverage, not anatomical correctness of the upstream masks. No image pixels are altered."
  };
}
