/**
 * Conservative in-memory repair of body-hidden scene pixels.
 * It copies stable donor samples; it does not synthesize or inpaint colour.
 */
import { cameraRegistrationChecksum } from "./camera-registration.js";
const DEFAULT_MAX_PIXELS = 2_000_000;
const DEFAULT_MAX_FRAMES = 32;
const DEFAULT_MAX_SAMPLES = 32_000_000;
const DEFAULT_MAX_CHANNEL_SPREAD = 12;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
const isBytes = value => value instanceof Uint8Array;

function validateLimits(options, frameCount) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Scene-plate options must be an object");
  }
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
  const maxFrames = options.maxFrames ?? DEFAULT_MAX_FRAMES;
  const maxSamples = options.maxSamples ?? DEFAULT_MAX_SAMPLES;
  const minDonors = options.minDonors ?? 2;
  const maxChannelSpread = options.maxChannelSpread ?? DEFAULT_MAX_CHANNEL_SPREAD;
  if (!Number.isSafeInteger(maxPixels) || maxPixels < 1 ||
      !Number.isSafeInteger(maxFrames) || maxFrames < 2 ||
      !Number.isSafeInteger(maxSamples) || maxSamples < 1 ||
      !Number.isSafeInteger(minDonors) || minDonors < 2 ||
      !Number.isSafeInteger(maxChannelSpread) || maxChannelSpread < 0 ||
      maxChannelSpread > 255) {
    throw new TypeError("Scene-plate limits must be safe integers; minDonors must be at least two");
  }
  if (frameCount > maxFrames) {
    fail("scene-plate-frame-limit", "Frame count exceeds the configured scene-plate limit");
  }
  return { maxPixels, maxSamples, minDonors, maxChannelSpread };
}

function validateFrames(frames, limits) {
  if (!Array.isArray(frames) || frames.length < 2) {
    fail("scene-plate-frames-invalid", "At least two timestamped source frames are required");
  }
  const width = frames[0]?.source?.width;
  const height = frames[0]?.source?.height;
  const pixelCount = width * height;
  if (!Number.isSafeInteger(width) || width < 1 ||
      !Number.isSafeInteger(height) || height < 1 ||
      !Number.isSafeInteger(pixelCount) || pixelCount > limits.maxPixels) {
    fail("scene-plate-dimensions-invalid", "Source dimensions are empty or exceed the scene-plate pixel limit");
  }
  if (pixelCount * frames.length > limits.maxSamples) {
    fail("scene-plate-sample-limit", "Frame-pixel work exceeds the configured scene-plate sample limit");
  }

  let previousFrame = -Infinity;
  let previousTime = -Infinity;
  for (const frame of frames) {
    if (!Number.isSafeInteger(frame?.frame) || frame.frame < 0 ||
        frame.frame <= previousFrame ||
        !Number.isFinite(frame.timeSeconds) || frame.timeSeconds < 0 ||
        frame.timeSeconds <= previousTime) {
      fail("scene-plate-frame-order", "Frames must have non-negative, strictly increasing frame numbers and timestamps");
    }
    previousFrame = frame.frame;
    previousTime = frame.timeSeconds;

    const source = frame.source;
    const body = frame.bodyMask;
    const face = frame.faceMask;
    if (source?.width !== width || source?.height !== height ||
        !isBytes(source.data) || source.data.length !== pixelCount * 4) {
      fail("scene-plate-source-invalid", "Every source frame must be a same-sized RGBA byte buffer");
    }
    if (body?.width !== width || body?.height !== height ||
        !isBytes(body.pixels) || body.pixels.length !== pixelCount ||
        face?.width !== width || face?.height !== height ||
        !isBytes(face.pixels) || face.pixels.length !== pixelCount) {
      fail("scene-plate-mask-invalid", "Body and face masks must be same-sized grayscale byte buffers");
    }
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const bodyValue = body.pixels[pixel];
      const faceValue = face.pixels[pixel];
      if ((bodyValue !== 0 && bodyValue !== 255) ||
          (faceValue !== 0 && faceValue !== 255)) {
        fail("scene-plate-mask-not-binary", "Body and face masks must contain only 0 or 255");
      }
      if (bodyValue === 255 && faceValue === 255) {
        fail("scene-plate-mask-overlap", "Body and protected-face masks must be disjoint");
      }
    }
  }
  return { width, height, pixelCount };
}

function validateCameraRegistration(registration, frames, width, height) {
  let checksumMatches = false;
  try {
    checksumMatches = registration?.checksum === cameraRegistrationChecksum(registration);
  } catch {}
  if (!checksumMatches ||
      registration?.schema !== "geehub.camera-registration-evidence" ||
      registration.schemaVersion !== 1 || registration.status !== "verified" ||
      registration.mode !== "fixed-camera" ||
      registration.coordinateSpace !== "source-pixel" ||
      typeof registration.id !== "string" || !registration.id.trim() ||
      !/^[a-f0-9]{64}$/i.test(registration.checksum || "") ||
      typeof registration.verificationMethod !== "string" ||
      !registration.verificationMethod.trim() ||
      registration.width !== width || registration.height !== height ||
      !Array.isArray(registration.frames) || registration.frames.length !== frames.length) {
    fail("scene-plate-camera-registration-invalid", "A verified, source-sized fixed-camera registration record is required");
  }
  for (let index = 0; index < frames.length; index += 1) {
    const expected = frames[index];
    const actual = registration.frames[index];
    if (actual?.frame !== expected.frame || actual?.timeSeconds !== expected.timeSeconds) {
      fail("scene-plate-camera-frame-mismatch", "Camera registration must match every source frame number and timestamp");
    }
    const transform = actual.transform;
    if (transform?.translateX !== 0 || transform?.translateY !== 0 ||
        transform?.scale !== 1 || transform?.rotationDegrees !== 0) {
      fail("scene-plate-camera-transform-unsupported", "Scene-plate v1 accepts only verified identity transforms");
    }
  }
}

/**
 * Each frame: { frame, timeSeconds,
 *   source:{width,height,data:Uint8Array RGBA},
 *   bodyMask:{width,height,pixels:Uint8Array},
 *   faceMask:{width,height,pixels:Uint8Array} }.
 *
 * cameraRegistration is a checksummed geehub.camera-registration-evidence v1
 * record with verified fixed-camera identity transforms for these frames.
 */
export function buildTemporalScenePlate(frames, cameraRegistration, options = {}) {
  const limits = validateLimits(options, Array.isArray(frames) ? frames.length : 0);
  const { width, height, pixelCount } = validateFrames(frames, limits);
  validateCameraRegistration(cameraRegistration, frames, width, height);
  if (limits.minDonors > frames.length) {
    throw new TypeError("minDonors cannot exceed the number of source frames");
  }

  const plate = new Uint8Array(pixelCount * 4);
  const coverageMask = new Uint8Array(pixelCount);
  const unresolvedMask = new Uint8Array(pixelCount);
  const provenanceFrameIndex = new Int32Array(pixelCount);
  const donorCount = new Uint16Array(pixelCount);
  const maxChannelSpread = new Uint8Array(pixelCount);
  provenanceFrameIndex.fill(-1);

  const candidateIndices = new Int32Array(frames.length);
  const candidateRed = new Uint8Array(frames.length);
  const candidateGreen = new Uint8Array(frames.length);
  const candidateBlue = new Uint8Array(frames.length);
  const midpointTime = (frames[0].timeSeconds + frames.at(-1).timeSeconds) / 2;
  let hiddenPixels = 0;
  let reconstructedPixels = 0;
  let unresolvedPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    let hidden = false, count = 0;
    let sumRed = 0, sumGreen = 0, sumBlue = 0;
    let minRed = 255, minGreen = 255, minBlue = 255;
    let maxRed = 0, maxGreen = 0, maxBlue = 0;

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
      const frame = frames[frameIndex];
      const bodyValue = frame.bodyMask.pixels[pixel];
      const faceValue = frame.faceMask.pixels[pixel];
      if (bodyValue === 255) hidden = true;
      if (bodyValue !== 0 || faceValue !== 0) continue;
      const offset = pixel * 4;
      const rgba = frame.source.data;
      if (rgba[offset + 3] !== 255) continue;

      const red = rgba[offset], green = rgba[offset + 1], blue = rgba[offset + 2];
      candidateIndices[count] = frameIndex;
      candidateRed[count] = red;
      candidateGreen[count] = green;
      candidateBlue[count] = blue;
      count += 1;
      sumRed += red; sumGreen += green; sumBlue += blue;
      minRed = Math.min(minRed, red); minGreen = Math.min(minGreen, green); minBlue = Math.min(minBlue, blue);
      maxRed = Math.max(maxRed, red); maxGreen = Math.max(maxGreen, green); maxBlue = Math.max(maxBlue, blue);
    }

    if (!hidden) continue;
    hiddenPixels += 1;
    donorCount[pixel] = count;
    const spread = Math.max(maxRed - minRed, maxGreen - minGreen, maxBlue - minBlue);
    maxChannelSpread[pixel] = spread;
    if (count < limits.minDonors || spread > limits.maxChannelSpread) {
      unresolvedMask[pixel] = 255;
      unresolvedPixels += 1;
      continue;
    }

    const meanRed = sumRed / count, meanGreen = sumGreen / count, meanBlue = sumBlue / count;
    let bestCandidate = -1, bestScore = Infinity, bestTimeDistance = Infinity;
    for (let candidate = 0; candidate < count; candidate += 1) {
      const dr = candidateRed[candidate] - meanRed;
      const dg = candidateGreen[candidate] - meanGreen;
      const db = candidateBlue[candidate] - meanBlue;
      const score = dr * dr + dg * dg + db * db;
      const frameIndex = candidateIndices[candidate];
      const timeDistance = Math.abs(frames[frameIndex].timeSeconds - midpointTime);
      if (score < bestScore || (score === bestScore && timeDistance < bestTimeDistance)) {
        bestCandidate = candidate;
        bestScore = score;
        bestTimeDistance = timeDistance;
      }
    }

    const donorIndex = candidateIndices[bestCandidate];
    const outputOffset = pixel * 4;
    plate[outputOffset] = candidateRed[bestCandidate];
    plate[outputOffset + 1] = candidateGreen[bestCandidate];
    plate[outputOffset + 2] = candidateBlue[bestCandidate];
    plate[outputOffset + 3] = 255;
    coverageMask[pixel] = 255;
    provenanceFrameIndex[pixel] = frames[donorIndex].frame;
    reconstructedPixels += 1;
  }

  const status = hiddenPixels === 0 ? "no-body-holes"
    : unresolvedPixels === 0 ? "ready-for-composite" : "partial";
  return {
    schema: "geehub.temporal-scene-plate",
    schemaVersion: 1,
    status,
    method: "same-coordinate-stable-background-consensus",
    cameraRegistrationId: cameraRegistration.id,
    cameraRegistrationChecksum: cameraRegistration.checksum,
    coordinateSpace: "source-pixel",
    width,
    height,
    frameNumbers: frames.map(frame => frame.frame),
    frameTimesSeconds: frames.map(frame => frame.timeSeconds),
    frameRange: { firstFrame: frames[0].frame, lastFrame: frames.at(-1).frame, frameCount: frames.length },
    plate: { width, height, data: plate },
    coverageMask,
    unresolvedMask,
    provenanceFrameIndex,
    donorCount,
    maxChannelSpread,
    counts: {
      hiddenPixels,
      reconstructedPixels,
      unresolvedPixels,
      coverageRatio: hiddenPixels === 0 ? 1 : reconstructedPixels / hiddenPixels
    },
    thresholds: {
      minDonors: limits.minDonors,
      maxChannelSpread: limits.maxChannelSpread,
      cameraMode: "fixed-camera"
    }
  };
}
