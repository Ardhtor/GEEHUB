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

export const DEFAULT_TEMPORAL_LIMITS = Object.freeze({
  maxDisplacementVelocityBodyHeightsPerSecond: 1.5,
  maxDisplacementAccelerationBodyHeightsPerSecondSquared: 40
});

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

  const sourceMean = {
    x: weighted.reduce((sum, row) => sum + row.anchor.x * row.weight, 0) / totalWeight,
    y: weighted.reduce((sum, row) => sum + row.anchor.y * row.weight, 0) / totalWeight
  };
  const targetMean = {
    x: weighted.reduce((sum, row) => sum + row.target.x * row.weight, 0) / totalWeight,
    y: weighted.reduce((sum, row) => sum + row.target.y * row.weight, 0) / totalWeight
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

function validateFaceMask(mask, width, height, frameNumber) {
  if (!mask || mask.frame !== frameNumber || mask.width !== width || mask.height !== height ||
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


function readTemporalLimits(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("mesh-deformation-temporal-limits-invalid", "Temporal limits must be an object");
  }
  const allowed = Object.keys(DEFAULT_TEMPORAL_LIMITS);
  if (Object.keys(input).some(key => !allowed.includes(key))) {
    fail("mesh-deformation-temporal-limits-invalid", "Temporal limits contain an unknown field");
  }
  const limits = { ...DEFAULT_TEMPORAL_LIMITS, ...input };
  for (const key of allowed) {
    if (!Number.isFinite(limits[key]) || limits[key] <= 0) {
      fail("mesh-deformation-temporal-limits-invalid", key + " must be finite and greater than zero");
    }
  }
  return limits;
}

function analyzeTemporalContinuity(maskMesh, frames, temporalLimits) {
  const limits = readTemporalLimits(temporalLimits);
  const usedVertices = [...new Set(maskMesh.triangles.flat())];
  if (!usedVertices.length) {
    fail("mesh-deformation-temporal-mesh-empty", "Temporal validation requires used mesh vertices");
  }

  const heights = maskMesh.frames.map((meshFrame, frameIndex) => {
    if (!Number.isInteger(meshFrame.frame) || !Number.isFinite(meshFrame.timeSeconds) ||
        !Array.isArray(meshFrame.sourcePoints)) {
      fail("mesh-deformation-time-order-invalid", "Every mesh frame requires a frame number, timestamp, and source points");
    }
    if (frameIndex > 0) {
      const previous = maskMesh.frames[frameIndex - 1];
      if (meshFrame.frame !== previous.frame + 1 || meshFrame.timeSeconds <= previous.timeSeconds) {
        fail("mesh-deformation-time-order-invalid", "Deformation frames must be contiguous with strictly increasing timestamps");
      }
    }
    const yValues = usedVertices.map(index => meshFrame.sourcePoints[index]?.y);
    if (yValues.some(value => !Number.isFinite(value))) {
      fail("mesh-deformation-temporal-mesh-invalid", "Used mesh vertices must have finite source coordinates");
    }
    const height = Math.max(...yValues) - Math.min(...yValues);
    if (!(height > 0)) {
      fail("mesh-deformation-temporal-mesh-invalid", "The used mesh must have non-zero body height");
    }
    return height;
  });

  const intervals = [];
  const violations = [];
  let maximumVelocity = 0;
  let maximumVelocityPeak = null;
  for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
    const previousFrame = frames[frameIndex - 1];
    const currentFrame = frames[frameIndex];
    const durationSeconds = currentFrame.timeSeconds - previousFrame.timeSeconds;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      fail("mesh-deformation-time-order-invalid", "Deformation timestamps must increase by a positive duration");
    }
    const bodyHeight = (heights[frameIndex - 1] + heights[frameIndex]) / 2;
    const velocities = new Map();
    let peak = { value: 0, vertexIndex: usedVertices[0] };
    for (const vertexIndex of usedVertices) {
      const previousOffset = {
        x: previousFrame.targetPoints[vertexIndex].x - previousFrame.sourcePoints[vertexIndex].x,
        y: previousFrame.targetPoints[vertexIndex].y - previousFrame.sourcePoints[vertexIndex].y
      };
      const currentOffset = {
        x: currentFrame.targetPoints[vertexIndex].x - currentFrame.sourcePoints[vertexIndex].x,
        y: currentFrame.targetPoints[vertexIndex].y - currentFrame.sourcePoints[vertexIndex].y
      };
      const velocity = {
        x: (currentOffset.x - previousOffset.x) / durationSeconds,
        y: (currentOffset.y - previousOffset.y) / durationSeconds
      };
      velocities.set(vertexIndex, velocity);
      const normalized = Math.hypot(velocity.x, velocity.y) / bodyHeight;
      if (normalized > peak.value) peak = { value: normalized, vertexIndex };
    }
    maximumVelocity = Math.max(maximumVelocity, peak.value);
    if (!maximumVelocityPeak || peak.value > maximumVelocityPeak.value) {
      maximumVelocityPeak = {
        value: peak.value,
        vertexId: maskMesh.vertexIds[peak.vertexIndex],
        fromFrame: previousFrame.frame,
        toFrame: currentFrame.frame
      };
    }
    intervals.push({
      fromFrame: previousFrame.frame,
      toFrame: currentFrame.frame,
      durationSeconds,
      maxDisplacementVelocityBodyHeightsPerSecond: peak.value,
      peakVertexId: maskMesh.vertexIds[peak.vertexIndex],
      velocities
    });
    if (peak.value > limits.maxDisplacementVelocityBodyHeightsPerSecond + 1e-9) {
      violations.push({
        type: "displacement-velocity",
        fromFrame: previousFrame.frame,
        toFrame: currentFrame.frame,
        vertexId: maskMesh.vertexIds[peak.vertexIndex],
        value: peak.value,
        limit: limits.maxDisplacementVelocityBodyHeightsPerSecond
      });
    }
  }

  let maximumAcceleration = null;
  let maximumAccelerationPeak = null;
  for (let intervalIndex = 1; intervalIndex < intervals.length; intervalIndex += 1) {
    const previousInterval = intervals[intervalIndex - 1];
    const currentInterval = intervals[intervalIndex];
    const elapsed = (previousInterval.durationSeconds + currentInterval.durationSeconds) / 2;
    const bodyHeight = (heights[intervalIndex - 1] + heights[intervalIndex] +
      heights[intervalIndex + 1]) / 3;
    let peak = { value: 0, vertexIndex: usedVertices[0] };
    for (const vertexIndex of usedVertices) {
      const previousVelocity = previousInterval.velocities.get(vertexIndex);
      const currentVelocity = currentInterval.velocities.get(vertexIndex);
      const acceleration = {
        x: (currentVelocity.x - previousVelocity.x) / elapsed,
        y: (currentVelocity.y - previousVelocity.y) / elapsed
      };
      const normalized = Math.hypot(acceleration.x, acceleration.y) / bodyHeight;
      if (normalized > peak.value) peak = { value: normalized, vertexIndex };
    }
    maximumAcceleration = Math.max(maximumAcceleration ?? 0, peak.value);
    if (!maximumAccelerationPeak || peak.value > maximumAccelerationPeak.value) {
      maximumAccelerationPeak = {
        value: peak.value,
        vertexId: maskMesh.vertexIds[peak.vertexIndex],
        fromFrame: maskMesh.frames[intervalIndex - 1].frame,
        throughFrame: maskMesh.frames[intervalIndex + 1].frame
      };
    }
    if (peak.value > limits.maxDisplacementAccelerationBodyHeightsPerSecondSquared + 1e-9) {
      violations.push({
        type: "displacement-acceleration",
        fromFrame: maskMesh.frames[intervalIndex - 1].frame,
        throughFrame: maskMesh.frames[intervalIndex + 1].frame,
        vertexId: maskMesh.vertexIds[peak.vertexIndex],
        value: peak.value,
        limit: limits.maxDisplacementAccelerationBodyHeightsPerSecondSquared
      });
    }
  }

  return {
    status: violations.length ? "blocked-temporal-instability" : "stable",
    valid: violations.length === 0,
    units: {
      velocity: "body-heights-per-second",
      acceleration: "body-heights-per-second-squared"
    },
    limits,
    maximumDisplacementVelocityBodyHeightsPerSecond: maximumVelocity,
    maximumDisplacementVelocityPeak: maximumVelocityPeak,
    maximumDisplacementAccelerationBodyHeightsPerSecondSquared: maximumAcceleration,
    maximumDisplacementAccelerationPeak: maximumAccelerationPeak,
    intervals: intervals.map(({ velocities, ...interval }) => interval),
    samples: usedVertices.length * intervals.length,
    violations
  };
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
      maskMesh.topologyStable !== true || maskMesh.connected !== true ||
      !Array.isArray(maskMesh.frames) || maskMesh.frames.length < 2) {
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
  if (!Array.isArray(maskMesh.vertexIds) || new Set(maskMesh.vertexIds).size !== maskMesh.vertexIds.length ||
      !Array.isArray(maskMesh.triangleIds) || maskMesh.triangleIds.length !== maskMesh.triangles?.length ||
      typeof maskMesh.topologyId !== "string" || !/^[a-f0-9]{64}$/i.test(maskMesh.topologyId) ||
      meshFrame.sourcePoints?.length !== maskMesh.vertexIds.length ||
      !Array.isArray(maskMesh.triangles) || maskMesh.triangles.length === 0) {
    fail("mesh-deformation-topology-invalid", "Mask-mesh vertices, triangle identities, or topology digest are incomplete");
  }
  validateFaceMask(protectedFaceMask, width, height, meshFrame.frame);

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
  const sourceValidation = validateWarpMesh(sourcePoints, sourcePoints, maskMesh.triangles);
  if (!sourceValidation.valid) {
    fail("mesh-deformation-source-mesh-invalid", sourceValidation.errors.join("; "));
  }
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
  epsilonPixels = 2,
  temporalLimits = {}
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
  const temporal = analyzeTemporalContinuity(maskMesh, frames, temporalLimits);
  if (!temporal.valid) {
    for (const frame of frames) {
      frame.renderable = false;
      frame.status = "blocked-temporal-instability";
      frame.validation.errors.push({
        code: "temporal-instability",
        violations: temporal.violations
      });
      frame.validation.temporalStatus = temporal.status;
    }
  }
  const ready = frames.every(frame => frame.renderable) && temporal.valid;
  return {
    schema: "geehub.growth-deformation-sequence",
    schemaVersion: 1,
    status: ready ? "ready-for-render" : temporal.valid ? "blocked" : temporal.status,
    renderable: ready,
    topologyId: maskMesh.topologyId,
    frameCount: count,
    vertexIds: [...maskMesh.vertexIds],
    triangleIds: [...maskMesh.triangleIds],
    temporal,
    frames,
    note: "Every frame uses the same vertex and triangle identities. Growth targets are checked for monotonicity, and per-vertex deformation offsets are checked against body-height-normalized velocity and acceleration limits using actual frame timestamps. A temporal failure blocks every frame in the sequence from the pixel renderer."
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
