/**
 * Convert approved regional growth states into temporally trackable 2D body
 * landmarks. This is geometry preparation, not automatic segmentation.
 *
 * Feet remain fixed. Stature extends the lower leg, thighLength extends the
 * upper leg, and torso/arm channels extend their own articulated segments.
 * The face center follows the neck but is excluded from the body-mesh point
 * list; caller-provided body triangles must also exclude face pixels.
 */
import { REGIONS } from "./growth-state.js";
import { REQUIRED_ANCHORS, validateLandmarkFrame } from "./landmark-track.js";
import { renderMeshWarp } from "./mesh-warp.js";

export const GROWTH_MESH_ANCHORS = Object.freeze(
  REQUIRED_ANCHORS.filter((name) => name !== "faceCenter")
);

export const APPLIED_GEOMETRY_CHANNELS = Object.freeze([
  "stature", "torsoLength", "shoulderSpan", "armLength", "thighLength"
]);

export const DEFERRED_GEOMETRY_CHANNELS = Object.freeze([
  "chestDepth", "armMass", "thighMass", "calfMass"
]);

const sides = ["left", "right"];
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const addScaled = (origin, vector, scale, confidence) => ({
  x: origin.x + vector.x * scale,
  y: origin.y + vector.y * scale,
  confidence
});
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function readBody(value, label) {
  const body = value?.body ?? value;
  const result = {};
  for (const region of REGIONS) {
    const scale = body?.[region];
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new TypeError(label + "." + region + " must be a finite positive scale");
    }
    result[region] = scale;
  }
  return result;
}

/**
 * Build target 2D landmarks from a tracked source frame and two absolute body
 * states. Target state values are relative to the original baseline.
 *
 * Stature drives the ankle-to-knee segment. Explicit regional channels drive
 * the upper leg, torso, shoulder breadth, and arms without double-scaling.
 */
export function buildGrowthTargetLandmarks(frame, baselineInput, targetInput) {
  const tracking = validateLandmarkFrame(frame);
  if (!tracking.valid) throw new TypeError(tracking.errors.join("; "));

  const baseline = readBody(baselineInput, "baselineBody");
  const target = readBody(targetInput, "targetBody");
  for (const region of REGIONS) {
    if (target[region] + 1e-9 < baseline[region]) {
      throw new RangeError(region + " cannot regress below the baseline");
    }
  }
  if (target.armLength + 1e-9 < target.stature) {
    throw new RangeError("Arm length must keep pace with stature");
  }
  if (target.thighLength + 1e-9 < target.stature) {
    throw new RangeError("Thigh length must keep pace with stature");
  }
  if (target.torsoLength + 1e-9 < target.stature * 0.9) {
    throw new RangeError("Torso length is inconsistent with stature");
  }

  const source = frame.landmarks;
  const targetLandmarks = Object.fromEntries(REQUIRED_ANCHORS.map((name) => [
    name,
    { x: source[name].x, y: source[name].y, confidence: source[name].confidence }
  ]));
  const ratios = Object.fromEntries(REGIONS.map((region) => [region, target[region] / baseline[region]]));

  // Articulated legs scale outward from the original ankle positions.
  for (const side of sides) {
    const ankleName = side + "Ankle";
    const kneeName = side + "Knee";
    const hipName = side + "Hip";
    const ankle = source[ankleName];
    const knee = source[kneeName];
    const hip = source[hipName];
    targetLandmarks[kneeName] = addScaled(
      ankle, subtract(knee, ankle), ratios.stature, knee.confidence
    );
    targetLandmarks[hipName] = addScaled(
      targetLandmarks[kneeName], subtract(hip, knee), ratios.thighLength, hip.confidence
    );
  }

  // Torso landmarks follow the new hip center; the shoulders then widen around
  // their own center so height and shoulder breadth remain independently editable.
  const sourceHipCenter = midpoint(source.leftHip, source.rightHip);
  const targetHipCenter = midpoint(targetLandmarks.leftHip, targetLandmarks.rightHip);
  for (const name of ["neck", "leftShoulder", "rightShoulder"]) {
    targetLandmarks[name] = {
      x: targetHipCenter.x + (source[name].x - sourceHipCenter.x),
      y: targetHipCenter.y + (source[name].y - sourceHipCenter.y) * ratios.torsoLength,
      confidence: source[name].confidence
    };
  }

  const targetShoulderCenter = midpoint(
    targetLandmarks.leftShoulder, targetLandmarks.rightShoulder
  );
  for (const side of sides) {
    const name = side + "Shoulder";
    targetLandmarks[name] = {
      ...targetLandmarks[name],
      x: targetShoulderCenter.x +
        (targetLandmarks[name].x - targetShoulderCenter.x) * ratios.shoulderSpan
    };
  }

  // Arms are extended segment-by-segment from the transformed shoulder.
  for (const side of sides) {
    const shoulderName = side + "Shoulder";
    const elbowName = side + "Elbow";
    const wristName = side + "Wrist";
    const sourceShoulder = source[shoulderName];
    const sourceElbow = source[elbowName];
    const sourceWrist = source[wristName];
    targetLandmarks[elbowName] = addScaled(
      targetLandmarks[shoulderName], subtract(sourceElbow, sourceShoulder),
      ratios.armLength, sourceElbow.confidence
    );
    targetLandmarks[wristName] = addScaled(
      targetLandmarks[elbowName], subtract(sourceWrist, sourceElbow),
      ratios.armLength, sourceWrist.confidence
    );
  }

  // Move the face anchor with the neck without scaling its offset or including
  // it in the body mesh. A separate face mask remains the renderer's duty.
  targetLandmarks.faceCenter = addScaled(
    targetLandmarks.neck, subtract(source.faceCenter, source.neck), 1,
    source.faceCenter.confidence
  );

  const sourceGround = midpoint(source.leftAnkle, source.rightAnkle);
  const targetGround = midpoint(targetLandmarks.leftAnkle, targetLandmarks.rightAnkle);
  const sourceHeight = distance(sourceGround, source.faceCenter);
  const targetHeight = distance(targetGround, targetLandmarks.faceCenter);
  const outOfFrame = REQUIRED_ANCHORS.filter((name) => {
    const point = targetLandmarks[name];
    return point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1;
  });

  return {
    landmarks: targetLandmarks,
    meshAnchors: [...GROWTH_MESH_ANCHORS],
    appliedChannels: [...APPLIED_GEOMETRY_CHANNELS],
    deferredChannels: [...DEFERRED_GEOMETRY_CHANNELS],
    requestedStatureRatio: ratios.stature,
    projectedStatureRatio: sourceHeight > 0 ? targetHeight / sourceHeight : null,
    groundContact: "ankles-fixed",
    identity: {
      faceCenter: "translated-with-neck; head offset unchanged",
      faceMesh: "excluded-from-body-anchor-list",
      facePixels: "preserved only when caller-provided body triangles exclude the face region"
    },
    outOfFrame,
    requiresReframe: outOfFrame.length > 0
  };
}

/** Render a caller-supplied, face-excluding body mesh using the mapped anchors. */
export function renderGrowthMesh(ctx, image, frame, baselineBody, targetBody, triangles) {
  const mapping = buildGrowthTargetLandmarks(frame, baselineBody, targetBody);
  const sourcePoints = GROWTH_MESH_ANCHORS.map((name) => frame.landmarks[name]);
  const targetPoints = GROWTH_MESH_ANCHORS.map((name) => mapping.landmarks[name]);
  const rendered = renderMeshWarp(ctx, image, sourcePoints, targetPoints, triangles);
  return { ...mapping, renderedTriangles: rendered.renderedTriangles };
}
