/**
 * Assemble one source frame from its recovered background, transformed body,
 * and untouched protected-face pixels. Unrecoverable original-body pixels
 * remain visible in the source image and are explicitly marked unresolved.
 */
const MAX_PIXELS = 2_000_000;
const SHA256 = /^[a-f0-9]{64}$/i;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isRgba(value, length) {
  return (value instanceof Uint8Array || value instanceof Uint8ClampedArray) &&
    value.length === length;
}

function validateMask(mask, label, frame, width, height, { allowEmpty = false } = {}) {
  if (!mask || mask.frame !== frame || mask.width !== width || mask.height !== height ||
      !(mask.pixels instanceof Uint8Array) || mask.pixels.length !== width * height) {
    fail("compositor-mask-invalid", label + " mask must match the source frame and dimensions");
  }
  let foreground = 0;
  for (const value of mask.pixels) {
    if (value !== 0 && value !== 255) {
      fail("compositor-mask-not-binary", label + " mask must contain only 0 and 255");
    }
    if (value === 255) foreground += 1;
  }
  if (!allowEmpty && foreground === 0) {
    fail("compositor-mask-empty", label + " mask cannot be empty");
  }
}

function validateSourceFrame(sourceFrame) {
  if (!sourceFrame || !Number.isSafeInteger(sourceFrame.frame) || sourceFrame.frame < 0 ||
      !Number.isFinite(sourceFrame.timeSeconds) || sourceFrame.timeSeconds < 0 ||
      !Number.isSafeInteger(sourceFrame.width) || sourceFrame.width < 1 ||
      !Number.isSafeInteger(sourceFrame.height) || sourceFrame.height < 1) {
    fail("compositor-source-invalid", "A timestamped source frame with positive integer dimensions is required");
  }
  const pixelCount = sourceFrame.width * sourceFrame.height;
  if (!Number.isSafeInteger(pixelCount) || pixelCount > MAX_PIXELS ||
      !isRgba(sourceFrame.data, pixelCount * 4)) {
    fail("compositor-source-invalid", "Source RGBA data is invalid or exceeds the pixel limit");
  }
  return pixelCount;
}

function validateScenePlate(scenePlate, sourceFrame, pixelCount) {
  const { width, height, frame, timeSeconds } = sourceFrame;
  if (scenePlate?.schema !== "geehub.temporal-scene-plate" ||
      scenePlate.schemaVersion !== 1 ||
      !["ready-for-composite", "partial", "no-body-holes"].includes(scenePlate.status) ||
      scenePlate.coordinateSpace !== "source-pixel" ||
      scenePlate.width !== width || scenePlate.height !== height ||
      scenePlate.plate?.width !== width || scenePlate.plate?.height !== height ||
      !isRgba(scenePlate.plate.data, pixelCount * 4) ||
      !(scenePlate.coverageMask instanceof Uint8Array) || scenePlate.coverageMask.length !== pixelCount ||
      !(scenePlate.unresolvedMask instanceof Uint8Array) || scenePlate.unresolvedMask.length !== pixelCount ||
      !(scenePlate.provenanceFrameIndex instanceof Int32Array) || scenePlate.provenanceFrameIndex.length !== pixelCount ||
      !(scenePlate.donorCount instanceof Uint16Array) || scenePlate.donorCount.length !== pixelCount ||
      !(scenePlate.maxChannelSpread instanceof Uint8Array) || scenePlate.maxChannelSpread.length !== pixelCount ||
      typeof scenePlate.cameraRegistrationId !== "string" || !scenePlate.cameraRegistrationId.trim() ||
      !SHA256.test(scenePlate.cameraRegistrationChecksum || "") ||
      !Array.isArray(scenePlate.frameNumbers) || scenePlate.frameNumbers.length < 2 ||
      !Array.isArray(scenePlate.frameTimesSeconds) ||
      scenePlate.frameTimesSeconds.length !== scenePlate.frameNumbers.length ||
      scenePlate.frameRange?.firstFrame !== scenePlate.frameNumbers[0] ||
      scenePlate.frameRange?.lastFrame !== scenePlate.frameNumbers.at(-1) ||
      scenePlate.frameRange?.frameCount !== scenePlate.frameNumbers.length ||
      !Number.isInteger(scenePlate.thresholds?.minDonors) || scenePlate.thresholds.minDonors < 1 ||
      scenePlate.thresholds.minDonors > scenePlate.frameNumbers.length ||
      !Number.isInteger(scenePlate.thresholds.maxChannelSpread) ||
      scenePlate.thresholds.maxChannelSpread < 0 || scenePlate.thresholds.maxChannelSpread > 255 ||
      scenePlate.thresholds.cameraMode !== "fixed-camera") {
    fail("compositor-scene-plate-invalid", "A matching version-one temporal scene plate with donor evidence is required");
  }
  let previousFrame = -1;
  let previousTime = -Infinity;
  let covered = 0;
  let unresolved = 0;
  const frameSet = new Set(scenePlate.frameNumbers);
  let currentIndex = -1;
  for (let index = 0; index < scenePlate.frameNumbers.length; index += 1) {
    const itemFrame = scenePlate.frameNumbers[index];
    const itemTime = scenePlate.frameTimesSeconds[index];
    if (!Number.isSafeInteger(itemFrame) || itemFrame < 0 || itemFrame <= previousFrame ||
        !Number.isFinite(itemTime) || itemTime < 0 || itemTime <= previousTime) {
      fail("compositor-scene-plate-order", "Scene-plate frame numbers and timestamps must be strictly increasing");
    }
    if (itemFrame === frame) {
      if (itemTime !== timeSeconds) fail("compositor-frame-time-mismatch", "Scene plate timestamp differs from the source frame");
      currentIndex = index;
    }
    previousFrame = itemFrame;
    previousTime = itemTime;
  }
  if (!frameSet.has(frame) || currentIndex < 0) {
    fail("compositor-frame-not-in-plate", "Source frame is not represented in the scene-plate evidence");
  }
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const coverage = scenePlate.coverageMask[pixel];
    const unknown = scenePlate.unresolvedMask[pixel];
    const offset = pixel * 4;
    if ((coverage !== 0 && coverage !== 255) || (unknown !== 0 && unknown !== 255) ||
        (coverage === 255 && unknown === 255)) {
      fail("compositor-scene-plate-mask-invalid", "Scene-plate coverage and unresolved masks must be disjoint binary masks");
    }
    if (coverage === 255) {
      covered += 1;
      if (scenePlate.plate.data[offset + 3] !== 255 ||
          !frameSet.has(scenePlate.provenanceFrameIndex[pixel]) ||
          scenePlate.donorCount[pixel] < scenePlate.thresholds.minDonors ||
          scenePlate.maxChannelSpread[pixel] > scenePlate.thresholds.maxChannelSpread) {
        fail("compositor-scene-plate-provenance-invalid", "Every reconstructed pixel must have valid opaque donor evidence");
      }
    } else {
      if (scenePlate.plate.data[offset] !== 0 || scenePlate.plate.data[offset + 1] !== 0 ||
          scenePlate.plate.data[offset + 2] !== 0 || scenePlate.plate.data[offset + 3] !== 0 ||
          scenePlate.provenanceFrameIndex[pixel] !== -1) {
        fail("compositor-scene-plate-uncovered-invalid", "Uncovered scene-plate pixels must remain transparent and donor-free");
      }
      if (unknown === 255) {
        unresolved += 1;
        if (scenePlate.donorCount[pixel] >= scenePlate.thresholds.minDonors &&
            scenePlate.maxChannelSpread[pixel] <= scenePlate.thresholds.maxChannelSpread) {
          fail("compositor-scene-plate-unresolved-invalid", "Unresolved pixels must fail a donor-count or colour-stability threshold");
        }
      } else if (scenePlate.donorCount[pixel] !== 0 || scenePlate.maxChannelSpread[pixel] !== 0) {
        fail("compositor-scene-plate-visible-provenance-invalid", "Visible pixels cannot carry hidden-region donor measurements");
      }
    }
  }
  const hidden = covered + unresolved;
  const expectedStatus = hidden === 0 ? "no-body-holes" : unresolved === 0 ? "ready-for-composite" : "partial";
  const expectedCoverageRatio = hidden === 0 ? 1 : covered / hidden;
  if (scenePlate.counts?.hiddenPixels !== hidden ||
      scenePlate.counts?.reconstructedPixels !== covered ||
      scenePlate.counts?.unresolvedPixels !== unresolved ||
      !Number.isFinite(scenePlate.counts?.coverageRatio) ||
      Math.abs(scenePlate.counts.coverageRatio - expectedCoverageRatio) > 1e-12 ||
      scenePlate.status !== expectedStatus) {
    fail("compositor-scene-plate-counts-invalid", "Scene-plate status and counts must agree with its pixel evidence");
  }
}

function validateBodyLayer(bodyLayer, sourceFrame, protectedFaceMask, pixelCount) {
  if (bodyLayer?.schema !== "geehub.growth-deformation-pixel-layer" ||
      bodyLayer.schemaVersion !== 1 || bodyLayer.status !== "ready-body-layer" ||
      bodyLayer.frame !== sourceFrame.frame ||
      bodyLayer.width !== sourceFrame.width || bodyLayer.height !== sourceFrame.height ||
      bodyLayer.sourceFrameUnmodified !== true || bodyLayer.protectedMaskPixelsUntouched !== true ||
      !isRgba(bodyLayer.data, pixelCount * 4) ||
      !(bodyLayer.coverageMask instanceof Uint8Array) || bodyLayer.coverageMask.length !== pixelCount) {
    fail("compositor-body-layer-invalid", "A matching ready transparent growth body layer is required");
  }
  let covered = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const coverage = bodyLayer.coverageMask[pixel];
    const offset = pixel * 4;
    if (coverage !== 0 && coverage !== 255) {
      fail("compositor-body-layer-mask-invalid", "Body-layer coverage must be binary");
    }
    if (coverage === 0) {
      if (bodyLayer.data[offset] !== 0 || bodyLayer.data[offset + 1] !== 0 ||
          bodyLayer.data[offset + 2] !== 0 || bodyLayer.data[offset + 3] !== 0) {
        fail("compositor-body-layer-outside-invalid", "Body-layer pixels outside coverage must remain transparent black");
      }
    } else {
      covered += 1;
      if (protectedFaceMask.pixels[pixel] === 255) {
        fail("compositor-body-layer-face-overlap", "Body-layer coverage must avoid protected-face pixels");
      }
    }
  }
  if (covered === 0 || bodyLayer.coveredPixels !== covered) {
    fail("compositor-body-layer-count-invalid", "A non-empty body-layer coverage count must match its mask");
  }
}

function sourceOver(destination, source, offset) {
  const sourceAlpha = source[offset + 3] / 255;
  if (sourceAlpha <= 0) return;
  const destinationAlpha = destination[offset + 3] / 255;
  const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  if (outputAlpha <= 0) {
    destination.fill(0, offset, offset + 4);
    return;
  }
  for (let channel = 0; channel < 3; channel += 1) {
    destination[offset + channel] = Math.round((
      source[offset + channel] * sourceAlpha +
      destination[offset + channel] * destinationAlpha * (1 - sourceAlpha)
    ) / outputAlpha);
  }
  destination[offset + 3] = Math.round(outputAlpha * 255);
}

/**
 * Compose one frame from source pixels, a temporal repair plate, and a warped
 * body layer. Inputs are decoded row-major RGBA buffers and binary masks.
 * The result is in memory; it does not encode a PNG or claim export readiness.
 */
export function composeGrowthFramePixels({
  sourceFrame,
  bodyMask,
  protectedFaceMask,
  bodyLayer,
  scenePlate
} = {}) {
  const pixelCount = validateSourceFrame(sourceFrame);
  validateMask(bodyMask, "body", sourceFrame.frame, sourceFrame.width, sourceFrame.height);
  validateMask(protectedFaceMask, "protected-face", sourceFrame.frame, sourceFrame.width, sourceFrame.height, { allowEmpty: true });
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (bodyMask.pixels[pixel] === 255 && protectedFaceMask.pixels[pixel] === 255) {
      fail("compositor-mask-overlap", "Body and protected-face masks must be disjoint");
    }
  }
  validateScenePlate(scenePlate, sourceFrame, pixelCount);
  validateBodyLayer(bodyLayer, sourceFrame, protectedFaceMask, pixelCount);

  const data = new Uint8ClampedArray(sourceFrame.data);
  const unresolvedMask = new Uint8Array(pixelCount);
  const backgroundSource = new Uint8Array(pixelCount);
  const pixelSource = new Uint8Array(pixelCount);
  const counts = {
    sourcePixels: 0,
    reconstructedBackgroundPixels: 0,
    transformedBodyPixels: 0,
    protectedFacePixels: 0,
    unresolvedPixels: 0
  };

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const isFace = protectedFaceMask.pixels[pixel] === 255;
    const isOriginalBody = bodyMask.pixels[pixel] === 255;
    const plateCovered = scenePlate.coverageMask[pixel] === 255;
    const bodyAlpha = bodyLayer.data[offset + 3];

    if (isFace) {
      pixelSource[pixel] = 3;
      counts.protectedFacePixels += 1;
      continue;
    }

    if (isOriginalBody && !plateCovered && scenePlate.unresolvedMask[pixel] !== 255) {
      fail("compositor-scene-plate-omits-hidden-pixel", "Every original-body pixel must be reconstructed or explicitly unresolved");
    }

    if (isOriginalBody && plateCovered) {
      data.set(scenePlate.plate.data.subarray(offset, offset + 4), offset);
      backgroundSource[pixel] = 1;
      pixelSource[pixel] = 1;
      counts.reconstructedBackgroundPixels += 1;
    } else {
      counts.sourcePixels += 1;
    }

    if (bodyAlpha > 0) {
      sourceOver(data, bodyLayer.data, offset);
      pixelSource[pixel] = 2;
      counts.transformedBodyPixels += 1;
    }
    if (isOriginalBody && !plateCovered && bodyAlpha < 255) {
      unresolvedMask[pixel] = 255;
      pixelSource[pixel] = 4;
      counts.unresolvedPixels += 1;
    }
  }

  const unresolvedPixels = counts.unresolvedPixels;
  return {
    schema: "geehub.composited-growth-frame",
    schemaVersion: 1,
    status: unresolvedPixels === 0 ? "complete-frame" : "partial-frame",
    coordinateSpace: "source-pixel",
    frame: sourceFrame.frame,
    timeSeconds: sourceFrame.timeSeconds,
    width: sourceFrame.width,
    height: sourceFrame.height,
    data,
    unresolvedMask,
    backgroundSource,
    pixelSource,
    counts,
    backgroundSourceLegend: { 0: "original-source", 1: "temporal-scene-plate" },
    pixelSourceLegend: {
      0: "original-source",
      1: "reconstructed-background",
      2: "transformed-body",
      3: "protected-face",
      4: "unresolved-original-body"
    },
    compositeMethod: "straight-alpha-source-over",
    readyForAssembly: unresolvedPixels === 0,
    readyForExport: false,
    sourceFrameUnmodified: true,
    protectedFacePixelsPreserved: true,
    unresolvedPixelsExplicit: true,
    sourceFrameDerivationVerified: false,
    cameraRegistrationIndependentlyVerified: false,
    pixelSemanticsVerified: false,
    note: "This is an in-memory composite for one source frame. It replaces only current-frame body pixels with measured plate samples, overlays the transformed body, and preserves protected-face pixels. Unresolved original-body pixels remain visible and are marked; file-backed sequence composition and export are separate stages."
  };
}
