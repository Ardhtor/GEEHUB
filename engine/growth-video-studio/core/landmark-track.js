/**
 * Temporal landmark track primitives for the segmentation/tracking adapter.
 * Coordinates are normalized [0,1] so tracks survive resolution changes.
 * Detection is intentionally delegated to a model adapter.
 */

export const REQUIRED_ANCHORS = Object.freeze([
  "faceCenter", "neck", "leftShoulder", "rightShoulder",
  "leftElbow", "rightElbow", "leftWrist", "rightWrist",
  "leftHip", "rightHip", "leftKnee", "rightKnee",
  "leftAnkle", "rightAnkle"
]);

const finitePoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.y) &&
  p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

export function validateLandmarkFrame(frame) {
  const errors = [];
  if (!Number.isFinite(frame?.timeSeconds) || frame.timeSeconds < 0) errors.push("Invalid frame timestamp");
  if (!frame?.landmarks || typeof frame.landmarks !== "object") return { valid:false, errors:[...errors,"Landmarks are missing"] };
  for (const key of REQUIRED_ANCHORS) {
    const point=frame.landmarks[key];
    if (!finitePoint(point)) errors.push(`Missing or invalid landmark: ${key}`);
    else if (point.confidence !== undefined && (!Number.isFinite(point.confidence) || point.confidence < 0 || point.confidence > 1)) errors.push(`Invalid confidence: ${key}`);
  }
  return { valid:errors.length===0, errors };
}

export function validateLandmarkTrack(frames, { maxGapSeconds=0.25, minConfidence=0.55 }={}) {
  const errors=[];
  if (!Array.isArray(frames) || frames.length<2) return {valid:false,errors:["At least two tracked frames are required"]};
  let previous=-Infinity;
  frames.forEach((frame,index)=>{
    const result=validateLandmarkFrame(frame);
    result.errors.forEach(error=>errors.push(`Frame ${index}: ${error}`));
    if (frame.timeSeconds<=previous) errors.push(`Frame ${index}: timestamps must increase`);
    if (Number.isFinite(frame.timeSeconds-previous) && frame.timeSeconds-previous>maxGapSeconds) errors.push(`Frame ${index}: tracking gap exceeds limit`);
    previous=frame.timeSeconds;
    for (const key of REQUIRED_ANCHORS) {
      const confidence=frame.landmarks?.[key]?.confidence;
      if (confidence!==undefined && confidence<minConfidence) errors.push(`Frame ${index}: low confidence at ${key}`);
    }
  });
  return {valid:errors.length===0,errors};
}

export function interpolateLandmarkFrame(before, after, timeSeconds) {
  if (!validateLandmarkFrame(before).valid || !validateLandmarkFrame(after).valid) {
    throw new TypeError("Valid landmark frames are required");
  }
  if (!(after.timeSeconds>before.timeSeconds) || timeSeconds<before.timeSeconds || timeSeconds>after.timeSeconds) {
    throw new RangeError("Interpolation time must fall between ordered frames");
  }
  const t=(timeSeconds-before.timeSeconds)/(after.timeSeconds-before.timeSeconds);
  const landmarks={};
  for (const key of REQUIRED_ANCHORS) {
    const a=before.landmarks[key], b=after.landmarks[key];
    landmarks[key]={
      x:a.x+(b.x-a.x)*t,
      y:a.y+(b.y-a.y)*t,
      confidence:Math.min(a.confidence??1,b.confidence??1)
    };
  }
  return {timeSeconds,landmarks,interpolated:true};
}
