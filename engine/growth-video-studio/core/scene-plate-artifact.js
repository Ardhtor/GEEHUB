/**
 * Persist a measured temporal scene plate without concealing unresolved pixels.
 *
 * The writer emits an RGBA plate, two opaque RGBA binary masks, a compact
 * row-major donor-provenance stream, and a SHA-256 receipt published last.
 */
import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { encodeRgbaPng } from "./rgba-png.js";
import { cameraRegistrationChecksum } from "./camera-registration.js";

const DEFAULT_MAX_PIXELS = 2_000_000;
const DEFAULT_MAX_OUTPUT_BYTES = 128 * 1024 * 1024;
const PROVENANCE_STRIDE_BYTES = 7;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isBytes(value) {
  return value instanceof Uint8Array;
}

function validateLimits(options) {
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  if (!Number.isSafeInteger(maxPixels) || maxPixels < 1 ||
      !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) {
    throw new TypeError("maxPixels and maxOutputBytes must be positive safe integers");
  }
  return { maxPixels, maxOutputBytes };
}

function validateArtifactInput(plate, cameraRegistration, maxPixels) {
  if (plate?.schema !== "geehub.temporal-scene-plate" || plate.schemaVersion !== 1 ||
      !["ready-for-composite", "partial", "no-body-holes"].includes(plate.status) ||
      plate.coordinateSpace !== "source-pixel") {
    fail("scene-plate-artifact-input-invalid", "A version-one source-pixel temporal scene plate is required");
  }
  const width = plate.width;
  const height = plate.height;
  const pixelCount = width * height;
  if (!Number.isSafeInteger(width) || width < 1 ||
      !Number.isSafeInteger(height) || height < 1 ||
      !Number.isSafeInteger(pixelCount) || pixelCount > maxPixels) {
    fail("scene-plate-artifact-dimensions-invalid", "Scene-plate dimensions are empty or exceed the artifact pixel limit");
  }
  if (!Array.isArray(plate.frameNumbers) || plate.frameNumbers.length < 2 ||
      !Array.isArray(plate.frameTimesSeconds) ||
      plate.frameTimesSeconds.length !== plate.frameNumbers.length ||
      plate.frameRange?.firstFrame !== plate.frameNumbers[0] ||
      plate.frameRange?.lastFrame !== plate.frameNumbers.at(-1) ||
      plate.frameRange?.frameCount !== plate.frameNumbers.length) {
    fail("scene-plate-artifact-frame-range-invalid", "Scene-plate frame numbers, timestamps, and range must agree");
  }
  let previousFrame = -1;
  let previousTime = -Infinity;
  for (let index = 0; index < plate.frameNumbers.length; index += 1) {
    const frame = plate.frameNumbers[index];
    const time = plate.frameTimesSeconds[index];
    if (!Number.isSafeInteger(frame) || frame < 0 || frame > 0x7fffffff ||
        frame <= previousFrame || !Number.isFinite(time) || time < 0 || time <= previousTime) {
      fail("scene-plate-artifact-frame-order", "Frame numbers and timestamps must be strictly increasing and provenance-safe");
    }
    previousFrame = frame;
    previousTime = time;
  }
  if (!cameraRegistration ||
      cameraRegistration.schema !== "geehub.camera-registration-evidence" ||
      cameraRegistration.schemaVersion !== 1 || cameraRegistration.status !== "verified" ||
      cameraRegistration.mode !== "fixed-camera" ||
      cameraRegistration.coordinateSpace !== "source-pixel" ||
      typeof cameraRegistration.id !== "string" || !cameraRegistration.id.trim() ||
      typeof cameraRegistration.verificationMethod !== "string" ||
      !cameraRegistration.verificationMethod.trim() ||
      !/^[a-f0-9]{64}$/i.test(cameraRegistration.checksum || "") ||
      cameraRegistration.checksum !== cameraRegistrationChecksum(cameraRegistration) ||
      cameraRegistration.width !== width || cameraRegistration.height !== height ||
      !Array.isArray(cameraRegistration.frames) ||
      cameraRegistration.frames.length !== plate.frameNumbers.length ||
      plate.cameraRegistrationId !== cameraRegistration.id ||
      plate.cameraRegistrationChecksum !== cameraRegistration.checksum) {
    fail("scene-plate-artifact-camera-mismatch", "Artifact camera evidence must match the plate's registered fixed-camera record");
  }
  for (let index = 0; index < plate.frameNumbers.length; index += 1) {
    const expectedFrame = plate.frameNumbers[index];
    const expectedTime = plate.frameTimesSeconds[index];
    const registered = cameraRegistration.frames[index];
    const transform = registered?.transform;
    if (registered?.frame !== expectedFrame || registered?.timeSeconds !== expectedTime ||
        transform?.translateX !== 0 || transform?.translateY !== 0 ||
        transform?.scale !== 1 || transform?.rotationDegrees !== 0) {
      fail("scene-plate-artifact-camera-frame-mismatch", "Camera registration must retain identity transforms for every plate frame");
    }
  }
  const thresholds = plate.thresholds;
  if (!Number.isInteger(thresholds?.minDonors) || thresholds.minDonors < 1 ||
      thresholds.minDonors > plate.frameNumbers.length ||
      !Number.isInteger(thresholds.maxChannelSpread) ||
      thresholds.maxChannelSpread < 0 || thresholds.maxChannelSpread > 255 ||
      thresholds.cameraMode !== "fixed-camera") {
    fail("scene-plate-artifact-thresholds-invalid", "Scene-plate donor and camera thresholds are invalid");
  }
  const data = plate.plate?.data;
  const coverage = plate.coverageMask;
  const unresolved = plate.unresolvedMask;
  const provenance = plate.provenanceFrameIndex;
  const donors = plate.donorCount;
  const spread = plate.maxChannelSpread;
  if (plate.plate?.width !== width || plate.plate?.height !== height ||
      !isBytes(data) || data.length !== pixelCount * 4 ||
      !isBytes(coverage) || coverage.length !== pixelCount ||
      !isBytes(unresolved) || unresolved.length !== pixelCount ||
      !(provenance instanceof Int32Array) || provenance.length !== pixelCount ||
      !(donors instanceof Uint16Array) || donors.length !== pixelCount ||
      !isBytes(spread) || spread.length !== pixelCount) {
    fail("scene-plate-artifact-arrays-invalid", "Plate pixels, masks, and provenance arrays must match its dimensions");
  }
  const frameSet = new Set(plate.frameNumbers);
  let coveredPixels = 0;
  let unresolvedPixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const covered = coverage[pixel];
    const unknown = unresolved[pixel];
    const offset = pixel * 4;
    if ((covered !== 0 && covered !== 255) ||
        (unknown !== 0 && unknown !== 255) ||
        (covered === 255 && unknown === 255)) {
      fail("scene-plate-artifact-mask-invalid", "Coverage and unresolved masks must be disjoint binary masks");
    }
    if (covered === 255) {
      coveredPixels += 1;
      if (data[offset + 3] !== 255 ||
          !frameSet.has(provenance[pixel]) ||
          donors[pixel] < thresholds.minDonors ||
          spread[pixel] > thresholds.maxChannelSpread) {
        fail("scene-plate-artifact-provenance-invalid", "Every covered pixel needs an opaque sample and valid donor provenance");
      }
    } else {
      if (data[offset] !== 0 || data[offset + 1] !== 0 ||
          data[offset + 2] !== 0 || data[offset + 3] !== 0 ||
          provenance[pixel] !== -1) {
        fail("scene-plate-artifact-uncovered-pixel-invalid", "Uncovered and unresolved pixels must remain transparent and have no donor frame");
      }
      if (unknown === 255) {
        unresolvedPixels += 1;
        if (donors[pixel] >= thresholds.minDonors &&
            spread[pixel] <= thresholds.maxChannelSpread) {
          fail("scene-plate-artifact-unresolved-reason-invalid", "A marked unresolved pixel must fail its donor-count or colour-stability threshold");
        }
      } else if (donors[pixel] !== 0 || spread[pixel] !== 0) {
        fail("scene-plate-artifact-visible-provenance-invalid", "Pixels outside the repair region cannot carry donor measurements");
      }
    }
  }
  const counts = plate.counts;
  const hiddenPixels = coveredPixels + unresolvedPixels;
  const expectedRatio = hiddenPixels === 0 ? 1 : coveredPixels / hiddenPixels;
  if (!counts || counts.hiddenPixels !== hiddenPixels ||
      counts.reconstructedPixels !== coveredPixels ||
      counts.unresolvedPixels !== unresolvedPixels ||
      !Number.isFinite(counts.coverageRatio) ||
      Math.abs(counts.coverageRatio - expectedRatio) > 1e-12) {
    fail("scene-plate-artifact-counts-invalid", "Scene-plate summary counts do not match its pixel evidence");
  }
  const expectedStatus = hiddenPixels === 0 ? "no-body-holes"
    : unresolvedPixels === 0 ? "ready-for-composite" : "partial";
  if (plate.status !== expectedStatus) {
    fail("scene-plate-artifact-status-invalid", "Scene-plate status does not match its coverage and unresolved masks");
  }
  return { width, height, pixelCount, coveredPixels, unresolvedPixels, hiddenPixels };
}

function encodeBinaryMask(mask, width, height, limits) {
  const rgba = new Uint8Array(mask.length * 4);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    const value = mask[pixel];
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  return encodeRgbaPng({ width, height, data: rgba }, limits);
}

function encodeDonorProvenance(plate, pixelCount) {
  const bytes = Buffer.alloc(pixelCount * PROVENANCE_STRIDE_BYTES);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * PROVENANCE_STRIDE_BYTES;
    bytes.writeInt32LE(plate.provenanceFrameIndex[pixel], offset);
    bytes.writeUInt16LE(plate.donorCount[pixel], offset + 4);
    bytes[offset + 6] = plate.maxChannelSpread[pixel];
  }
  return bytes;
}

async function removeIfIdentity(filePath, identity) {
  if (!identity) return;
  try {
    const entry = await lstat(filePath);
    if (!entry.isSymbolicLink() && entry.isFile() &&
        entry.dev === identity.dev && entry.ino === identity.ino) {
      await rm(filePath);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function writeExclusive(filePath, bytes) {
  let handle;
  let identity;
  try {
    handle = await open(filePath, "wx", 0o600);
    const entry = await handle.stat();
    identity = { dev: entry.dev, ino: entry.ino };
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    const before = await lstat(filePath);
    if (before.isSymbolicLink() || !before.isFile() ||
        before.dev !== identity.dev || before.ino !== identity.ino) {
      fail("scene-plate-artifact-write-identity", "Created artifact file changed identity before read-back");
    }
    const actual = await readFile(filePath);
    const after = await lstat(filePath);
    if (after.isSymbolicLink() || !after.isFile() ||
        after.dev !== identity.dev || after.ino !== identity.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs ||
        !actual.equals(Buffer.from(bytes))) {
      fail("scene-plate-artifact-readback-mismatch", "Written artifact bytes changed or failed read-back verification");
    }
    return { sha256: sha256(actual), byteLength: actual.length };
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await removeIfIdentity(filePath, identity).catch(() => {});
    throw error;
  }
}

async function removeIfDigest(filePath, expectedDigest) {
  try {
    const entry = await lstat(filePath);
    if (entry.isSymbolicLink() || !entry.isFile()) return;
    const bytes = await readFile(filePath);
    if (sha256(bytes) === expectedDigest) await rm(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function createOutputDirectory(requestedPath) {
  if (typeof requestedPath !== "string" || !requestedPath.trim()) {
    fail("scene-plate-artifact-output-invalid", "A new scene-plate artifact directory is required");
  }
  const requested = path.resolve(requestedPath);
  const name = path.basename(requested);
  if (!name || name === "." || name === "..") {
    fail("scene-plate-artifact-output-invalid", "Output path must name a new directory");
  }
  let parent;
  try {
    parent = await realpath(path.dirname(requested));
  } catch (error) {
    fail("scene-plate-artifact-parent-unavailable", "Output parent directory is unavailable: " + error.message);
  }
  const target = path.join(parent, name);
  try {
    await mkdir(target);
  } catch (error) {
    if (error.code === "EEXIST") {
      fail("scene-plate-artifact-output-exists", "Scene-plate artifact directory already exists");
    }
    throw error;
  }
  const entry = await lstat(target);
  if (entry.isSymbolicLink() || !entry.isDirectory()) {
    fail("scene-plate-artifact-output-invalid", "New artifact destination must be a regular directory");
  }
  return target;
}

/**
 * Write a buildTemporalScenePlate() result to a new directory.
 *
 * The writer serializes already-decoded in-memory evidence. It does not read
 * source video, source PNGs, or mask files and does not independently prove
 * the external camera-registration assertion.
 */
export async function writeTemporalScenePlateArtifact({
  plate,
  cameraRegistration,
  outputDirectory,
  maxPixels = DEFAULT_MAX_PIXELS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES
} = {}) {
  const limits = validateLimits({ maxPixels, maxOutputBytes });
  const summary = validateArtifactInput(plate, cameraRegistration, limits.maxPixels);
  const pngLimits = { maxPixels: limits.maxPixels, maxBytes: DEFAULT_MAX_OUTPUT_BYTES };
  const plateBytes = encodeRgbaPng({
    width: summary.width,
    height: summary.height,
    data: plate.plate.data
  }, pngLimits);
  const coverageBytes = encodeBinaryMask(
    plate.coverageMask, summary.width, summary.height, pngLimits
  );
  const unresolvedBytes = encodeBinaryMask(
    plate.unresolvedMask, summary.width, summary.height, pngLimits
  );
  const provenanceBytes = encodeDonorProvenance(plate, summary.pixelCount);
  const payloads = [
    { key: "plate", file: "scene-plate.png", mediaType: "image/png", encoding: "png/rgba8", bytes: plateBytes },
    {
      key: "coverageMask", file: "coverage-mask.png", mediaType: "image/png",
      encoding: "png/rgba8-binary-mask-white-covered-black-clear-opaque", bytes: coverageBytes
    },
    {
      key: "unresolvedMask", file: "unresolved-mask.png", mediaType: "image/png",
      encoding: "png/rgba8-binary-mask-white-unresolved-black-clear-opaque", bytes: unresolvedBytes
    },
    {
      key: "donorProvenance", file: "donor-provenance.bin", mediaType: "application/octet-stream",
      encoding: "geehub.scene-plate-donor-provenance.v1", bytes: provenanceBytes
    }
  ];
  const fileRecords = {};
  for (const item of payloads) {
    fileRecords[item.key] = {
      file: item.file,
      mediaType: item.mediaType,
      encoding: item.encoding,
      sha256: sha256(item.bytes),
      byteLength: item.bytes.length
    };
  }
  const receipt = {
    schema: "geehub.temporal-scene-plate-artifact-receipt",
    schemaVersion: 1,
    status: "complete",
    repairStatus: plate.status,
    readyForComposite: plate.status !== "partial",
    coordinateSpace: "source-pixel",
    dimensions: { width: summary.width, height: summary.height, pixelCount: summary.pixelCount },
    frameRange: structuredClone(plate.frameRange),
    frames: plate.frameNumbers.map((frame, index) => ({
      frame,
      timeSeconds: plate.frameTimesSeconds[index]
    })),
    cameraRegistration: {
      id: cameraRegistration.id,
      checksum: cameraRegistration.checksum,
      mode: cameraRegistration.mode,
      verificationMethod: cameraRegistration.verificationMethod,
      independentlyVerified: false
    },
    thresholds: structuredClone(plate.thresholds),
    counts: {
      hiddenPixels: summary.hiddenPixels,
      reconstructedPixels: summary.coveredPixels,
      unresolvedPixels: summary.unresolvedPixels,
      coverageRatio: plate.counts.coverageRatio
    },
    files: fileRecords,
    provenanceLayout: {
      file: "donor-provenance.bin",
      recordOrder: "row-major-pixel",
      recordStrideBytes: PROVENANCE_STRIDE_BYTES,
      byteOrder: "little-endian",
      fields: [
        { name: "donorFrame", type: "int32", offsetBytes: 0, noDonorValue: -1 },
        { name: "donorCount", type: "uint16", offsetBytes: 4 },
        { name: "maxChannelSpread", type: "uint8", offsetBytes: 6 }
      ]
    },
    sourceFrameDerivationVerified: false,
    cameraRegistrationIndependentlyVerified: false,
    pixelSemanticsVerified: false,
    unresolvedPixelsRemainTransparent: true,
    donorSamplesSynthesized: false,
    inputBuffersModified: false,
    note: "This is a durable repair-plate artifact from an already-built in-memory scene plate. It preserves per-pixel donor provenance and unresolved regions. It does not read or revalidate source files, estimate camera motion, prove mask anatomy, composite the transformed body, or export a finished frame."
  };
  const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
  const totalBytes = payloads.reduce((sum, item) => sum + item.bytes.length, receiptBytes.length);
  if (totalBytes > limits.maxOutputBytes) {
    fail("scene-plate-artifact-output-too-large", "Scene-plate artifact exceeds the configured total output byte limit");
  }

  const outputPath = await createOutputDirectory(outputDirectory);
  const created = [];
  try {
    for (const item of payloads) {
      const filePath = path.join(outputPath, item.file);
      const result = await writeExclusive(filePath, item.bytes);
      created.push({ path: filePath, sha256: result.sha256 });
    }
    const receiptPath = path.join(outputPath, "scene-plate.receipt.json");
    const receiptResult = await writeExclusive(receiptPath, receiptBytes);
    created.push({ path: receiptPath, sha256: receiptResult.sha256 });
    return {
      ...receipt,
      outputDirectory: outputPath,
      receiptPath,
      receiptSha256: receiptResult.sha256,
      totalByteLength: totalBytes
    };
  } catch (error) {
    for (const item of created.reverse()) {
      await removeIfDigest(item.path, item.sha256).catch(() => {});
    }
    await rmdir(outputPath).catch(() => {});
    throw error;
  }
}
