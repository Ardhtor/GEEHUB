/**
 * Transfer articulated growth landmarks onto a fixed-index mask mesh.
 *
 * The local affine field is evaluated in source-pixel coordinates. A single
 * topology is reused for every frame; each frame receives its own tracked
 * source surface and target surface. Rendering is refused when the mapped
 * surface folds, leaves the frame, or crosses the protected face mask.
 */
import { REGIONS } from "./growth-state.js";
import { buildGrowthTargetLandmarks, GROWTH_MESH_ANCHORS } from "./growth-mesh.js";
import { renderMeshWarp, validateWarpMesh } from "./mesh-warp.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function signedArea(points) {
  const [a, b, c] = points;
  return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}

function solveAffineAt(point, source, target, epsilonPixels) {
  const epsilonSquared = epsilonPixels * epsilonPixels;
  const rows = source.map((anchor, index) => {
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared <= 1e-12) return { exact: target[index] };
    const confidence = anchor.confidence ?? 1;
    return {
      anchor,
      target: target[index],
      weight: confidence / ((distanceSquared + epsilonSquared) ** 2)
    };
  });
  const exact = rows.find(row => row.exact);
  if (exact) return { x: exact.exact.x, y: exact.exact.y };

  const active = rows.filter(row => row.weight > 0 && Number.isFinite(row.weight));
  if (active.length < 3) {
    fail("mesh-deformation-anchor-confidence-insufficient", "At least three confident body anchors are required");
  }
  const maximumWeight = Math.max(...active.map(row => row.weight));
  const weighted = active.map(row => ({ ...row, weight: row.weight / maximumWeight }));
  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
  if (!(totalWeight > 0)) {
    fail("mesh-deformation-anchor-confidence-insufficient", "Body anchor weights have no usable support");
  }

  const mean = key => weighted.reduce((sum, row) => sum + row[key] * row.weight, 0) / totalWeight;
  const sourceMean = {
    x: weighted.reduce((sum, row) => sum + row.anchor.x * row.weight, 0) / totalWeight,
    y: weighted.reduce((sum, row) => sum + row.anchor.y * row.weight, 0) / totalWeight
  };
  const targetMean = {
    x: mean("target.x"),
    y: mean("target.y")
  };

  let xx = 0, xy = 0, yy = 0;
  let xToX = 0, yToX = 0, xToY = 0, yToY = 0;
  for (const row of weighted) {
    const sx = row.anchor.x - sourceMean.x;
    const sy = row.anchor.y - sourceMean.y;
    const tx = row.target.x - targetMean.x;
    const ty = row.target.y - targetMean.y;
    const weight = row.weight;
    xx += weight * sx * sx;
    xy += weight * sx * sy;
    yy += weight * sy * sy;
    xToX += weight * sx * tx;
    yToX += weight * sy * tx;
    xToY += weight * sx * ty;
    yToY += weight * sy * ty;
  }

  const determinant = xx * yy - xy * xy;
  if (!Number.isFinite(determinant) || determinant <= 1e-12) {
    fail("mesh-deformation-anchor-geometry-degenerate", "Tracked body anchors do not span a stable 2D affine field");
  }
  const a00 = (xToX * yy - yToX * xy) / determinant;
  const a01 = (yToX * xx - xToX * xy) / determinant;
  const a10 = (xToY * yy - yToY * xy) / determinant;
  const a11 = (yToY * xx - xToY * xy) / determinant;
  const dx = point.x - sourceMean.x;
  const dy = point.y - sourceMean.y;
  return {
    x: targetMean.x + a00 * dx + a01 * dy,
    y: targetMean.y + a10 * dx + a11 * dy
  };
}

function pointInTriangle(point, triangle, area) {
  const [a, b, c] = triangle;
  const first = ((b.x - point.x) * (c.y - point.y) -
    (b.y - point.y) * (c.x - point.x)) / area;
  const second = ((c.x - point.x) * (a.y - point.y) -
    (c.y - point.y) * (a.x - point.x)) / area;
  const third = 1 - first - second;
  return first >= -1e-9 && second >= -1e-9 && third >= -1e-9;
}

function triangleOverlapsMask(points, mask) {
  const area = signedArea(points);
  if (Math.abs(area) < 1e-8) return true;
  const minX = Math.max(0, Math.ceil(Math.min(...points.map(point => point.x)) - 0.5));
  const maxX = Math.min(mask.width - 1, Math.floor(Math.max(...points.map(point => point.x)) - 0.5));
  const minY = Math.max(0, Math.ceil(Math.min(...points.map(point => point.y)) - 0.5));
  const maxY = Math.min(mask.height - 1, Math.floor(Math.max(...points.map(point => point.y)) - 0.5));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (mask.pixels[y * mask.width + x] !== 255) continue;
      if (pointInTriangle({ x: x + 0.5, y: y + 0.5 }, points, area)) return true;
    }
  }
  return false;
}

function validateFaceMask(mask, width, height) {
  if (!mask || mask.width !== width || mask.height !== height ||
      !(mask.pixels instanceof Uint8Array) || mask.pixels.length !== width * height) {
    fail("mesh-deformation-face-mask-invalid", "A decoded face mask matching the source frame is required");
  }
  let foreground = 0;
  for (const value of mask.pixels) {
    if (value !== 0 && value !== 255) {
      fail("mesh-deformation-face-mask-not-binary", "The protected face mask must contain only 0 and 255");
    }
    if (value === 255) foreground += 1;
  }
  if (!foreground) fail("mesh-deformation-face-mask-empty", "The protected face mask cannot be empty");
}

function bodyValues(input) {
  return input?.body ?? input;
}

/**
 * Build one frame's source-to-target vertex correspondence.
 *
 * landmarkFrame must include { frame, timeSeconds, landmarks }. The mask mesh
 * must be the ready result of buildStableMaskMesh. protectedFaceMask is the
 * decoded face mask for this exact frame, not a path or an unverified label.
 */
export function buildGrowthDeformationFrame({
  maskMesh,
  frameIndex,
  landmarkFrame,
  baselineBody,
  targetBody,
  protectedFaceMask,
  epsilonPixels = 2
}) {
  if (maskMesh?.schema !== "geehub.mask-mesh" || maskMesh.status !== "ready" ||
      maskMesh.topologyStable !== true || maskMesh.connected !== true) {
    fail("mesh-deformation-mask-mesh-not-ready", "A connected, stable mask mesh is required");
  }
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= maskMesh.frames.length) {
    fail("mesh-deformation-frame-index-invalid", "The requested mask-mesh frame index is invalid");
  }
  if (!Number.isFinite(epsilonPixels) || epsilonPixels <= 0 || epsilonPixels > 64) {
    fail("mesh-deformation-epsilon-invalid", "epsilonPixels must be greater than 0 and no greater than 64");
  }

  const width = maskMesh.sequence?.width;
  const height = maskMesh.sequence?.height;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    fail("mesh-deformation-format-invalid", "Mask-mesh dimensions are invalid");
  }
  const meshFrame = maskMesh.frames[frameIndex];
  if (!Number.isInteger(landmarkFrame?.frame) || landmarkFrame.frame !== meshFrame.frame ||
      !Number.isFinite(landmarkFrame.timeSeconds) ||
      Math.abs(landmarkFrame.timeSeconds - meshFrame.timeSeconds) > 1e-6) {
    fail("mesh-deformation-frame-evidence-mismatch", "Landmarks must match the selected mesh frame and timestamp");
  }
  if (!Array.isArray(maskMesh.vertexIds) || meshFrame.sourcePoints?.length !== maskMesh.vertexIds.length ||
      !Array.isArray(maskMesh.triangles) || maskMesh.triangles.length === 0) {
    fail("mesh-deformation-topology-invalid", "Mask-mesh vertices and triangles are incomplete");
  }
  validateFaceMask(protectedFaceMask, width, height);

  const mapping = buildGrowthTargetLandmarks(landmarkFrame, baselineBody, targetBody);
  const sourceAnchors = GROWTH_MESH_ANCHORS.map(name => ({
    x: landmarkFrame.landmarks[name].x * width,
    y: landmarkFrame.landmarks[name].y * height,
    confidence: landmarkFrame.landmarks[name].confidence ?? 1
  }));
  const targetAnchors = GROWTH_MESH_ANCHORS.map(name => ({
    x: mapping.landmarks[name].x * width,
    y: mapping.landmarks[name].y * height
  }));
  const sourcePoints = meshFrame.sourcePoints.map(point => ({ x: point.x, y: point.y }));
  const targetPoints = sourcePoints.map(point =>
    solveAffineAt(point, sourceAnchors, targetAnchors, epsilonPixels)
  );
  const validation = validateWarpMesh(sourcePoints, targetPoints, maskMesh.triangles);
  if (!validation.valid) {
    fail("mesh-deformation-warp-invalid", validation.errors.join("; "));
  }

  let foldedTriangles = 0;
  let sourceFaceOverlaps = 0;
  let targetFaceOverlaps = 0;
  for (const indices of maskMesh.triangles) {
    const sourceTriangle = indices.map(index => sourcePoints[index]);
    const targetTriangle = indices.map(index => targetPoints[index]);
    const sourceArea = signedArea(sourceTriangle);
    const targetArea = signedArea(targetTriangle);
    if (sourceArea * targetArea <= 0) foldedTriangles += 1;
    if (triangleOverlapsMask(sourceTriangle, protectedFaceMask)) sourceFaceOverlaps += 1;
    if (triangleOverlapsMask(targetTriangle, protectedFaceMask)) targetFaceOverlaps += 1;
  }

  const usedVertices = [...new Set(maskMesh.triangles.flat())];
  const outOfFrameVertices = usedVertices.filter(index => {
    const point = targetPoints[index];
    return point.x < 0 || point.x > width || point.y < 0 || point.y > height;
  });
  const errors = [];
  if (mapping.requiresReframe || outOfFrameVertices.length) {
    errors.push({
      code: "requires-reframe",
      anchors: mapping.outOfFrame,
      vertices: outOfFrameVertices.length
    });
  }
  if (foldedTriangles) errors.push({ code: "mesh-foldover", triangles: foldedTriangles });
  if (sourceFaceOverlaps) errors.push({ code: "source-face-overlap", triangles: sourceFaceOverlaps });
  if (targetFaceOverlaps) errors.push({ code: "target-face-overlap", triangles: targetFaceOverlaps });

  const status = errors.length === 0 ? "ready-for-render" :
    errors.some(error => error.code === "requires-reframe") ? "requires-reframe" :
      errors.some(error => error.code === "mesh-foldover") ? "blocked-foldover" :
        errors.some(error => error.code.includes("face-overlap")) ? "blocked-face-overlap" : "blocked";
  return {
    schema: "geehub.growth-deformation-frame",
    schemaVersion: 1,
    status,
    renderable: status === "ready-for-render",
    frame: meshFrame.frame,
    timeSeconds: meshFrame.timeSeconds,
    topologyId: maskMesh.topologyId,
    vertexIds: [...maskMesh.vertexIds],
    triangleIds: [...maskMesh.triangleIds],
    triangles: maskMesh.triangles.map(triangle => [...triangle]),
    sourcePoints,
    targetPoints,
    growth: {
      appliedChannels: [...mapping.appliedChannels],
      deferredChannels: [...mapping.deferredChannels],
      groundContact: mapping.groundContact,
      projectedStatureRatio: mapping.projectedStatureRatio,
      requestedStatureRatio: mapping.requestedStatureRatio
    },
    identity: {
      faceCenter: "tracked-anchor-only",
      facePixels: "protected-by-destination-triangle-mask-test",
      sourceMotion: "preserved-through-per-frame-landmark-input"
    },
    validation: {
      warp: validation,
      foldedTriangles,
      sourceFaceOverlaps,
      targetFaceOverlaps,
      outOfFrameVertices: outOfFrameVertices.length,
      errors
    },
    note: "The affine field moves the fixed-index body mesh using tracked articulated anchors. A renderable frame has no triangle foldovers, no destination overlap with the protected face mask, and no used vertex outside the frame. This does not prove anatomical mask semantics or temporal smoothness between detections."
  };
}

/**
 * Build a fixed-topology sequence from one growth target per source frame.
 * Growth channels may hold or increase, but may not regress between frames.
 */
export function buildGrowthDeformationSequence({
  maskMesh,
  landmarkFrames,
  baselineBody,
  targetBodies,
  protectedFaceMasks,
  epsilonPixels = 2
}) {
  const count = maskMesh?.frames?.length ?? 0;
  if (count < 2 || !Array.isArray(landmarkFrames) || !Array.isArray(targetBodies) ||
      !Array.isArray(protectedFaceMasks) || landmarkFrames.length !== count ||
      targetBodies.length !== count || protectedFaceMasks.length !== count) {
    fail("mesh-deformation-sequence-incomplete", "Landmarks, growth targets, and face masks must cover every mesh frame");
  }

  for (let index = 1; index < count; index += 1) {
    const previous = bodyValues(targetBodies[index - 1]);
    const current = bodyValues(targetBodies[index]);
    for (const region of REGIONS) {
      if (!Number.isFinite(previous?.[region]) || !Number.isFinite(current?.[region])) {
        fail("mesh-deformation-growth-state-invalid", "Every frame requires a complete growth body state");
      }
      if (current[region] + 1e-9 < previous[region]) {
        fail("mesh-deformation-growth-regression", region + " growth cannot regress between frames");
      }
    }
  }

  const frames = maskMesh.frames.map((_, index) => buildGrowthDeformationFrame({
    maskMesh,
    frameIndex: index,
    landmarkFrame: landmarkFrames[index],
    baselineBody,
    targetBody: targetBodies[index],
    protectedFaceMask: protectedFaceMasks[index],
    epsilonPixels
  }));
  const ready = frames.every(frame => frame.renderable);
  return {
    schema: "geehub.growth-deformation-sequence",
    schemaVersion: 1,
    status: ready ? "ready-for-render" : "blocked",
    renderable: ready,
    topologyId: maskMesh.topologyId,
    frameCount: count,
    vertexIds: [...maskMesh.vertexIds],
    triangleIds: [...maskMesh.triangleIds],
    frames,
    note: "Every frame uses the same vertex and triangle identities. Growth targets are checked for monotonicity; source-motion and mask changes remain per-frame inputs. Smoothness thresholds between adjacent deformations are a separate validation stage."
  };
}

/** Render one already-validated deformation plan into a caller-owned canvas. */
export function renderGrowthDeformationFrame(ctx, image, plan) {
  if (plan?.schema !== "geehub.growth-deformation-frame" || plan.renderable !== true) {
    fail("mesh-deformation-plan-not-renderable", "Only a ready-for-render deformation plan can reach the pixel renderer");
  }
  const rendered = renderMeshWarp(ctx, image, plan.sourcePoints, plan.targetPoints, plan.triangles);
  return { ...plan, renderedTriangles: rendered.renderedTriangles };
}
