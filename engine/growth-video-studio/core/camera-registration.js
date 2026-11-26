/**
 * Conservative fixed-camera verification from masked source-frame pixels.
 *
 * This estimates integer translation only. It does not estimate rotation,
 * scale, perspective, rolling shutter, or optical flow. Ambiguous evidence is
 * returned as unverified rather than being promoted to a fixed-camera claim.
 */
import { createHash } from "node:crypto";

const DEFAULTS = Object.freeze({
  maxPixels: 12_000_000,
  maxFrames: 32,
  maxMaskSamples: 96_000_000,
  maxComparisons: 25_000_000,
  maxSamples: 8_000,
  maxTranslationPx: 3,
  sampleStep: 16,
  minSamples: 32,
  minPatchStd: 4,
  minValidSampleRatio: 0.6,
  maxMedianDescriptorError: 0.45,
  minTranslationImprovement: 0.08,
  minTranslationImprovementRatio: 0.2
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isBytes(value) {
  return value instanceof Uint8Array;
}

function validateOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Camera-registration options must be an object");
  }
  const limits = { ...DEFAULTS, ...options };
  for (const key of ["maxPixels", "maxFrames", "maxMaskSamples", "maxComparisons", "maxSamples", "maxTranslationPx", "sampleStep", "minSamples"]) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1) {
      throw new TypeError(key + " must be a positive safe integer");
    }
  }
  const thresholds = [
    limits.minPatchStd, limits.minValidSampleRatio, limits.maxMedianDescriptorError,
    limits.minTranslationImprovement, limits.minTranslationImprovementRatio
  ];
  if (thresholds.some(value => !Number.isFinite(value)) ||
      limits.maxFrames < 2 || limits.maxTranslationPx > 16 ||
      limits.sampleStep < 1 || limits.maxSamples < limits.minSamples ||
      limits.minPatchStd < 0 || limits.minPatchStd > 255 ||
      limits.minValidSampleRatio <= 0 || limits.minValidSampleRatio > 1 ||
      limits.maxMedianDescriptorError <= 0 || limits.maxMedianDescriptorError > 2 ||
      limits.minTranslationImprovement < 0 || limits.minTranslationImprovement > 2 ||
      limits.minTranslationImprovementRatio < 0 || limits.minTranslationImprovementRatio > 1) {
    throw new TypeError("Camera-registration thresholds are outside supported bounds");
  }
  return limits;
}

function validateFrames(frames, limits) {
  if (!Array.isArray(frames) || frames.length < 2 || frames.length > limits.maxFrames) {
    fail("camera-registration-frame-count", "Two to " + limits.maxFrames + " timestamped frames are required");
  }
  const width = frames[0]?.source?.width;
  const height = frames[0]?.source?.height;
  const pixelCount = width * height;
  if (!Number.isSafeInteger(width) || width < 1 ||
      !Number.isSafeInteger(height) || height < 1 ||
      !Number.isSafeInteger(pixelCount) || pixelCount > limits.maxPixels) {
    fail("camera-registration-dimensions", "Source dimensions are empty or exceed the configured pixel limit");
  }
  if (pixelCount * frames.length > limits.maxMaskSamples) {
    fail("camera-registration-mask-work-limit", "Frame-mask validation exceeds the configured work limit");
  }

  let previousFrame = -Infinity;
  let previousTime = -Infinity;
  for (const frame of frames) {
    if (!Number.isSafeInteger(frame?.frame) || frame.frame < 0 || frame.frame <= previousFrame ||
        !Number.isFinite(frame.timeSeconds) || frame.timeSeconds < 0 || frame.timeSeconds <= previousTime) {
      fail("camera-registration-frame-order", "Frame numbers and source timestamps must increase strictly");
    }
    previousFrame = frame.frame;
    previousTime = frame.timeSeconds;
    const source = frame.source;
    const body = frame.bodyMask;
    const face = frame.faceMask;
    if (source?.width !== width || source?.height !== height ||
        !isBytes(source.data) || source.data.length !== pixelCount * 4 ||
        body?.width !== width || body?.height !== height ||
        !isBytes(body.pixels) || body.pixels.length !== pixelCount ||
        face?.width !== width || face?.height !== height ||
        !isBytes(face.pixels) || face.pixels.length !== pixelCount) {
      fail("camera-registration-frame-evidence", "Every source frame and both masks must have matching dimensions and byte buffers");
    }
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const bodyValue = body.pixels[pixel];
      const faceValue = face.pixels[pixel];
      if ((bodyValue !== 0 && bodyValue !== 255) || (faceValue !== 0 && faceValue !== 255)) {
        fail("camera-registration-mask-not-binary", "Body and protected-face masks must contain only 0 or 255");
      }
      if (bodyValue === 255 && faceValue === 255) {
        fail("camera-registration-mask-overlap", "Body and protected-face masks must be disjoint");
      }
    }
  }
  return { width, height, pixelCount };
}

function luminance(data, pixel) {
  const offset = pixel * 4;
  return (77 * data[offset] + 150 * data[offset + 1] + 29 * data[offset + 2]) >> 8;
}

function patchDescriptor(frame, x, y, radius, minStd) {
  const { width, height, data } = frame.source;
  const { pixels: body } = frame.bodyMask;
  const { pixels: face } = frame.faceMask;
  const side = radius * 2 + 1;
  const values = new Float32Array(side * side);
  let count = 0;
  let sum = 0;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const py = y + dy;
    if (py < 0 || py >= height) return null;
    for (let dx = -radius; dx <= radius; dx += 1) {
      const px = x + dx;
      if (px < 0 || px >= width) return null;
      const pixel = py * width + px;
      const offset = pixel * 4;
      if (body[pixel] !== 0 || face[pixel] !== 0 || data[offset + 3] !== 255) return null;
      const value = luminance(data, pixel);
      values[count] = value;
      sum += value;
      count += 1;
    }
  }
  const mean = sum / count;
  let variance = 0;
  for (const value of values) {
    const delta = value - mean;
    variance += delta * delta;
  }
  const standardDeviation = Math.sqrt(variance / count);
  if (standardDeviation < minStd) return null;
  for (let index = 0; index < values.length; index += 1) {
    values[index] = (values[index] - mean) / standardDeviation;
  }
  return values;
}

function buildReferenceSamples(frame, limits) {
  const radius = 1;
  const margin = limits.maxTranslationPx + radius;
  const samples = [];
  for (let y = margin; y < frame.source.height - margin; y += limits.sampleStep) {
    for (let x = margin; x < frame.source.width - margin; x += limits.sampleStep) {
      const descriptor = patchDescriptor(frame, x, y, radius, limits.minPatchStd);
      if (descriptor) samples.push({ x, y, descriptor });
    }
  }
  if (samples.length <= limits.maxSamples) return samples;
  const stride = Math.ceil(samples.length / limits.maxSamples);
  return samples.filter((_, index) => index % stride === 0).slice(0, limits.maxSamples);
}

function histogramMedian(histogram, count) {
  const target = Math.floor((count - 1) / 2);
  let accumulated = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    accumulated += histogram[index];
    if (accumulated > target) return index / 256;
  }
  return 2;
}

function compareOffset(referenceSamples, targetFrame, dx, dy, limits) {
  const histogram = new Uint32Array(513);
  let validSamples = 0;
  for (const sample of referenceSamples) {
    const descriptor = patchDescriptor(
      targetFrame,
      sample.x + dx,
      sample.y + dy,
      1,
      limits.minPatchStd
    );
    if (!descriptor) continue;
    let error = 0;
    for (let index = 0; index < descriptor.length; index += 1) {
      error += Math.abs(sample.descriptor[index] - descriptor[index]);
    }
    error /= descriptor.length;
    const bucket = Math.min(512, Math.floor(error * 256));
    histogram[bucket] += 1;
    validSamples += 1;
  }
  return {
    dx,
    dy,
    validSamples,
    medianDescriptorError: validSamples ? histogramMedian(histogram, validSamples) : null
  };
}

function offsetOrder(a, b) {
  const errorDelta = a.medianDescriptorError - b.medianDescriptorError;
  if (Math.abs(errorDelta) > 1e-9) return errorDelta;
  const magnitudeA = a.dx * a.dx + a.dy * a.dy;
  const magnitudeB = b.dx * b.dx + b.dy * b.dy;
  return magnitudeA - magnitudeB || a.dy - b.dy || a.dx - b.dx;
}

function identityTransform() {
  return { translateX: 0, translateY: 0, scale: 1, rotationDegrees: 0 };
}

function stableStringify(value) {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ":" + stableStringify(value[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function cameraRegistrationChecksum(registration) {
  if (!registration || typeof registration !== "object" || Array.isArray(registration)) {
    throw new TypeError("Camera-registration evidence must be an object");
  }
  const payload = { ...registration };
  delete payload.checksum;
  return createHash("sha256").update(stableStringify(payload), "utf8").digest("hex");
}

/**
 * Estimate whether a timestamped, masked frame sequence is fixed-camera.
 * Frames use the same decoded RGBA and binary-mask shape as the scene-plate
 * builder. Only integer translation is searched; any detected motion or
 * insufficient background texture yields status="unverified".
 */
export function estimateFixedCameraRegistration(frames, options = {}) {
  const limits = validateOptions(options);
  const { width, height } = validateFrames(frames, limits);
  const referenceSamples = buildReferenceSamples(frames[0], limits);
  const offsetsPerFrame = (limits.maxTranslationPx * 2 + 1) ** 2;
  const comparisonCount = referenceSamples.length * offsetsPerFrame * (frames.length - 1);
  if (comparisonCount > limits.maxComparisons) {
    fail("camera-registration-comparison-limit", "Patch-search work exceeds the configured comparison limit");
  }

  const outputFrames = [{
    frame: frames[0].frame,
    timeSeconds: frames[0].timeSeconds,
    transform: identityTransform(),
    measurement: {
      role: "reference",
      validSamples: referenceSamples.length,
      medianDescriptorError: 0,
      estimatedTranslation: { x: 0, y: 0 },
      reason: referenceSamples.length >= limits.minSamples ? "reference-frame" : "insufficient-background-features"
    }
  }];
  const reasons = [];
  let verifiedFrames = 0;

  for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
    const target = frames[frameIndex];
    if (referenceSamples.length < limits.minSamples) {
      reasons.push("insufficient-background-features");
      outputFrames.push({
        frame: target.frame,
        timeSeconds: target.timeSeconds,
        transform: identityTransform(),
        measurement: {
          role: "comparison",
          validSamples: 0,
          referenceSamples: referenceSamples.length,
          identityMedianDescriptorError: null,
          bestMedianDescriptorError: null,
          estimatedTranslation: { x: 0, y: 0 },
          reason: "insufficient-background-features"
        }
      });
      continue;
    }

    const candidates = [];
    for (let dy = -limits.maxTranslationPx; dy <= limits.maxTranslationPx; dy += 1) {
      for (let dx = -limits.maxTranslationPx; dx <= limits.maxTranslationPx; dx += 1) {
        const candidate = compareOffset(referenceSamples, target, dx, dy, limits);
        if (candidate.validSamples >= limits.minSamples &&
            candidate.validSamples >= referenceSamples.length * limits.minValidSampleRatio) {
          candidates.push(candidate);
        }
      }
    }
    candidates.sort(offsetOrder);
    const identity = candidates.find(item => item.dx === 0 && item.dy === 0);
    const best = candidates[0];
    let reason = "fixed-camera";
    let verified = true;
    let improvement = null;
    let improvementRatio = null;

    if (!identity || !best) {
      verified = false;
      reason = "insufficient-overlap";
    } else {
      improvement = identity.medianDescriptorError - best.medianDescriptorError;
      improvementRatio = identity.medianDescriptorError > 0
        ? improvement / identity.medianDescriptorError
        : 0;
      const moved = best.dx !== 0 || best.dy !== 0;
      const significantImprovement = improvement >= limits.minTranslationImprovement &&
        improvementRatio >= limits.minTranslationImprovementRatio;
      const atBoundary = Math.abs(best.dx) === limits.maxTranslationPx ||
        Math.abs(best.dy) === limits.maxTranslationPx;

      if (moved && significantImprovement) {
        verified = false;
        reason = atBoundary ? "camera-translation-search-boundary" : "camera-translation-detected";
      } else if (identity.medianDescriptorError > limits.maxMedianDescriptorError) {
        verified = false;
        reason = "background-not-photometrically-stable";
      }
    }

    if (verified) verifiedFrames += 1;
    else reasons.push(reason);
    // Positive offsets mean the matching target-frame patch was found at
    // (referenceX + x, referenceY + y); this is observed image displacement,
    // not a corrective warp to apply to the source frame.
    const estimated = best ? { x: best.dx, y: best.dy } : { x: 0, y: 0 };
    outputFrames.push({
      frame: target.frame,
      timeSeconds: target.timeSeconds,
      transform: verified ? identityTransform() : {
        translateX: estimated.x,
        translateY: estimated.y,
        scale: 1,
        rotationDegrees: 0
      },
      measurement: {
        role: "comparison",
        validSamples: identity?.validSamples ?? 0,
        referenceSamples: referenceSamples.length,
        identityMedianDescriptorError: identity?.medianDescriptorError ?? null,
        bestMedianDescriptorError: best?.medianDescriptorError ?? null,
        improvement,
        improvementRatio,
        estimatedTranslation: estimated,
        reason
      }
    });
  }

  const verified = reasons.length === 0 && verifiedFrames === frames.length - 1;
  const record = {
    schema: "geehub.camera-registration-evidence",
    schemaVersion: 1,
    status: verified ? "verified" : "unverified",
    mode: verified ? "fixed-camera" : "unverified",
    coordinateSpace: "source-pixel",
    verificationMethod: "masked-background-normalized-patch-search-v1",
    width,
    height,
    referenceFrame: { frame: frames[0].frame, timeSeconds: frames[0].timeSeconds },
    frames: outputFrames,
    thresholds: {
      maxTranslationPx: limits.maxTranslationPx,
      sampleStep: limits.sampleStep,
      minSamples: limits.minSamples,
      minPatchStd: limits.minPatchStd,
      minValidSampleRatio: limits.minValidSampleRatio,
      maxMedianDescriptorError: limits.maxMedianDescriptorError,
      minTranslationImprovement: limits.minTranslationImprovement,
      minTranslationImprovementRatio: limits.minTranslationImprovementRatio
    },
    summary: {
      comparedFrames: frames.length - 1,
      verifiedFrames,
      unverifiedFrames: frames.length - 1 - verifiedFrames,
      referenceSamples: referenceSamples.length,
      reasonCodes: [...new Set(reasons)]
    }
  };
  record.id = "camera-registration-" + frames[0].frame + "-" + frames.at(-1).frame + "-" + width + "x" + height;
  record.checksum = cameraRegistrationChecksum(record);
  return record;
}
