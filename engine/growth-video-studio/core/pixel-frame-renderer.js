/**
 * Rasterize a validated body deformation into a transparent RGBA layer.
 *
 * The source frame is read-only. Pixels outside the destination mesh remain
 * transparent in the returned layer, so a later compositor can combine this
 * body layer with the untouched source/background and protected identity layer.
 * This module does not encode PNG files or infer segmentation semantics.
 */
import { validateWarpMesh } from "./mesh-warp.js";

const MAX_PIXELS = 12_000_000;
const EPSILON = 1e-9;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function signedArea([a, b, c]) {
  return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function barycentric(point, [a, b, c], area) {
  const first = cross(b.x - point.x, b.y - point.y, c.x - point.x, c.y - point.y) / area;
  const second = cross(c.x - point.x, c.y - point.y, a.x - point.x, a.y - point.y) / area;
  return [first, second, 1 - first - second];
}

function containsPixelCenter(point, triangle, area) {
  const weights = barycentric(point, triangle, area);
  return weights.every(value => value >= -EPSILON);
}

function triangleOverlapsMask(triangle, mask) {
  const area = signedArea(triangle);
  const minX = Math.max(0, Math.ceil(Math.min(...triangle.map(point => point.x)) - 0.5));
  const maxX = Math.min(mask.width - 1, Math.floor(Math.max(...triangle.map(point => point.x)) - 0.5));
  const minY = Math.max(0, Math.ceil(Math.min(...triangle.map(point => point.y)) - 0.5));
  const maxY = Math.min(mask.height - 1, Math.floor(Math.max(...triangle.map(point => point.y)) - 0.5));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (mask.pixels[y * mask.width + x] !== 255) continue;
      if (containsPixelCenter({ x: x + 0.5, y: y + 0.5 }, triangle, area)) return true;
    }
  }
  return false;
}

function validateMask(mask, label, width, height, frame) {
  if (!mask || mask.frame !== frame || mask.width !== width || mask.height !== height ||
      !(mask.pixels instanceof Uint8Array) || mask.pixels.length !== width * height) {
    fail("pixel-frame-mask-invalid", "A decoded " + label + " mask matching this source frame is required");
  }
  let foreground = 0;
  for (const value of mask.pixels) {
    if (value !== 0 && value !== 255) {
      fail("pixel-frame-mask-not-binary", "The " + label + " mask must contain only 0 and 255");
    }
    if (value === 255) foreground += 1;
  }
  if (!foreground) fail("pixel-frame-mask-empty", "The " + label + " mask cannot be empty");
}

function triangleLeavesBodyMask(triangle, mask) {
  const area = signedArea(triangle);
  const minX = Math.max(0, Math.ceil(Math.min(...triangle.map(point => point.x)) - 0.5));
  const maxX = Math.min(mask.width - 1, Math.floor(Math.max(...triangle.map(point => point.x)) - 0.5));
  const minY = Math.max(0, Math.ceil(Math.min(...triangle.map(point => point.y)) - 0.5));
  const maxY = Math.min(mask.height - 1, Math.floor(Math.max(...triangle.map(point => point.y)) - 0.5));
  let sampledPixels = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!containsPixelCenter({ x: x + 0.5, y: y + 0.5 }, triangle, area)) continue;
      sampledPixels += 1;
      if (mask.pixels[y * mask.width + x] !== 255) return true;
    }
  }
  return sampledPixels === 0;
}

function samplePremultipliedBilinear(frame, x, y, bodyMask, faceMask, output, outputOffset) {
  // Mesh coordinates describe pixel centres at (x + 0.5, y + 0.5).
  const sampleX = Math.max(0, Math.min(frame.width - 1, x - 0.5));
  const sampleY = Math.max(0, Math.min(frame.height - 1, y - 0.5));
  const x0 = Math.floor(sampleX);
  const y0 = Math.floor(sampleY);
  const x1 = Math.min(frame.width - 1, x0 + 1);
  const y1 = Math.min(frame.height - 1, y0 + 1);
  const fx = sampleX - x0;
  const fy = sampleY - y0;
  const samples = [
    [y0 * frame.width + x0, (1 - fx) * (1 - fy)],
    [y0 * frame.width + x1, fx * (1 - fy)],
    [y1 * frame.width + x0, (1 - fx) * fy],
    [y1 * frame.width + x1, fx * fy]
  ];
  let alpha = 0;
  let totalWeight = 0;
  const premultiplied = [0, 0, 0];
  for (const [pixel, weight] of samples) {
    if (weight === 0 || bodyMask.pixels[pixel] !== 255 || faceMask.pixels[pixel] === 255) continue;
    const offset = pixel * 4;
    const sampleAlpha = frame.data[offset + 3];
    alpha += sampleAlpha * weight;
    totalWeight += weight;
    for (let channel = 0; channel < 3; channel += 1) {
      premultiplied[channel] += frame.data[offset + channel] * sampleAlpha * weight;
    }
  }
  if (!(totalWeight > 0)) {
    fail("pixel-frame-source-sample-outside-body", "Bilinear sampling has no body-foreground source pixels");
  }
  if (alpha > 0) {
    for (let channel = 0; channel < 3; channel += 1) {
      output[outputOffset + channel] = premultiplied[channel] / alpha;
    }
  }
  output[outputOffset + 3] = alpha / totalWeight;
}

/**
 * Return a transparent RGBA body layer for one validated deformation plan.
 *
 * sourceFrame is { frame, width, height, data } with row-major RGBA bytes.
 * bodyMask and protectedFaceMask are decoded binary masks for the same frame.
 */
export function renderGrowthDeformationPixels({
  sourceFrame,
  plan,
  bodyMask,
  protectedFaceMask
} = {}) {
  if (!sourceFrame || !Number.isInteger(sourceFrame.frame) ||
      !Number.isInteger(sourceFrame.width) || sourceFrame.width < 1 ||
      !Number.isInteger(sourceFrame.height) || sourceFrame.height < 1 ||
      !Number.isSafeInteger(sourceFrame.width * sourceFrame.height) ||
      sourceFrame.width * sourceFrame.height > MAX_PIXELS ||
      !(sourceFrame.data instanceof Uint8Array || sourceFrame.data instanceof Uint8ClampedArray) ||
      sourceFrame.data.length !== sourceFrame.width * sourceFrame.height * 4) {
    fail("pixel-frame-source-invalid", "A bounded RGBA source frame with a frame number is required");
  }
  if (plan?.schema !== "geehub.growth-deformation-frame" || plan.renderable !== true ||
      plan.frame !== sourceFrame.frame) {
    fail("pixel-frame-plan-not-renderable", "A ready deformation plan for the exact source frame is required");
  }
  validateMask(bodyMask, "body", sourceFrame.width, sourceFrame.height, sourceFrame.frame);
  validateMask(protectedFaceMask, "protected-face", sourceFrame.width, sourceFrame.height, sourceFrame.frame);
  for (let pixel = 0; pixel < bodyMask.pixels.length; pixel += 1) {
    if (bodyMask.pixels[pixel] === 255 && protectedFaceMask.pixels[pixel] === 255) {
      fail("pixel-frame-mask-overlap", "Body and protected-face masks overlap");
    }
  }

  const validation = validateWarpMesh(plan.sourcePoints, plan.targetPoints, plan.triangles);
  if (!validation.valid) {
    fail("pixel-frame-mesh-invalid", validation.errors.join("; "));
  }
  const points = [...plan.sourcePoints, ...plan.targetPoints];
  if (points.some(point => point.x < 0 || point.x > sourceFrame.width ||
      point.y < 0 || point.y > sourceFrame.height)) {
    fail("pixel-frame-mesh-out-of-bounds", "Source and destination mesh vertices must remain inside the frame");
  }

  const width = sourceFrame.width;
  const height = sourceFrame.height;
  const pixelCount = width * height;
  const data = new Uint8ClampedArray(pixelCount * 4);
  const coverageMask = new Uint8Array(pixelCount);
  const sampledSourceX = new Float32Array(pixelCount);
  const sampledSourceY = new Float32Array(pixelCount);
  let coveredPixels = 0;
  let renderedTriangles = 0;

  for (const indices of plan.triangles) {
    const sourceTriangle = indices.map(index => plan.sourcePoints[index]);
    const targetTriangle = indices.map(index => plan.targetPoints[index]);
    const sourceArea = signedArea(sourceTriangle);
    const targetArea = signedArea(targetTriangle);
    if (sourceArea * targetArea <= 0) {
      fail("pixel-frame-mesh-foldover", "A destination triangle reverses or collapses its source orientation");
    }
    if (triangleLeavesBodyMask(sourceTriangle, bodyMask)) {
      fail("pixel-frame-source-triangle-outside-body", "A source triangle samples outside body foreground");
    }
    if (triangleOverlapsMask(sourceTriangle, protectedFaceMask) ||
        triangleOverlapsMask(targetTriangle, protectedFaceMask)) {
      fail("pixel-frame-mesh-overlaps-protected-mask", "A source or destination triangle crosses protected face pixels");
    }

    const minX = Math.max(0, Math.ceil(Math.min(...targetTriangle.map(point => point.x)) - 0.5));
    const maxX = Math.min(width - 1, Math.floor(Math.max(...targetTriangle.map(point => point.x)) - 0.5));
    const minY = Math.max(0, Math.ceil(Math.min(...targetTriangle.map(point => point.y)) - 0.5));
    const maxY = Math.min(height - 1, Math.floor(Math.max(...targetTriangle.map(point => point.y)) - 0.5));
    let trianglePixels = 0;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const destinationPixel = { x: x + 0.5, y: y + 0.5 };
        const weights = barycentric(destinationPixel, targetTriangle, targetArea);
        if (weights.some(value => value < -EPSILON)) continue;
        const pixelIndex = y * width + x;
        if (protectedFaceMask.pixels[pixelIndex] === 255) {
          fail("pixel-frame-mesh-overlaps-protected-mask", "Raster coverage reached a protected face pixel");
        }
        const sourceX = weights.reduce((sum, weight, index) =>
          sum + sourceTriangle[index].x * weight, 0);
        const sourceY = weights.reduce((sum, weight, index) =>
          sum + sourceTriangle[index].y * weight, 0);

        if (coverageMask[pixelIndex]) {
          const difference = Math.hypot(
            sourceX - sampledSourceX[pixelIndex],
            sourceY - sampledSourceY[pixelIndex]
          );
          if (difference > 0.25) {
            fail("pixel-frame-mesh-overlap", "Overlapping destination triangles disagree on source sampling");
          }
          continue;
        }

        const outputOffset = pixelIndex * 4;
        samplePremultipliedBilinear(
          sourceFrame, sourceX, sourceY, bodyMask, protectedFaceMask, data, outputOffset
        );
        coverageMask[pixelIndex] = 255;
        sampledSourceX[pixelIndex] = sourceX;
        sampledSourceY[pixelIndex] = sourceY;
        coveredPixels += 1;
        trianglePixels += 1;
      }
    }
    if (trianglePixels > 0) renderedTriangles += 1;
  }

  if (!coveredPixels || !renderedTriangles) {
    fail("pixel-frame-empty-coverage", "The deformation mesh covers no output pixel centres");
  }
  return {
    schema: "geehub.growth-deformation-pixel-layer",
    schemaVersion: 1,
    status: "ready-body-layer",
    frame: sourceFrame.frame,
    width,
    height,
    data,
    coverageMask,
    coveredPixels,
    renderedTriangles,
    topologyId: plan.topologyId ?? null,
    interpolation: "bilinear-premultiplied-alpha",
    sourceFrameUnmodified: true,
    protectedMaskPixelsUntouched: true,
    pixelSemanticsVerified: false,
    note: "This is a transparent warped body layer. The source frame, background plate, and protected identity layer remain separate inputs for a later compositor; this function does not encode PNG files."
  };
}
