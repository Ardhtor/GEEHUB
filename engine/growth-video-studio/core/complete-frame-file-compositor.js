/**
 * File-backed, evidence-bound compositor for one registered growth frame.
 * It verifies the extraction/batch receipts and persisted scene-plate artifacts,
 * then writes a new PNG and a receipt. It never edits source or intermediate files.
 */
import { createHash } from "node:crypto";
import { lstat, open, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { decodeBinaryMaskPng } from "./mask-pixels.js";
import { decodeRgbaPng, encodeRgbaPng } from "./rgba-png.js";
import { composeGrowthFramePixels } from "./complete-frame-compositor.js";

const MAX_PIXELS = 2_000_000;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_PNG_BYTES = 128 * 1024 * 1024;
const MAX_PROVENANCE_BYTES = MAX_PIXELS * 7;
const SHA256 = /^[a-f0-9]{64}$/i;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function safeBasename(value, label) {
  if (typeof value !== "string" || !value || value === "." || value === ".." ||
      path.basename(value) !== value || value.includes("/") || value.includes("\\")) {
    fail("frame-composite-file-name-invalid", label + " must be a plain file name");
  }
  return value;
}

async function readRegularFile(requestedPath, label, maxBytes) {
  if (typeof requestedPath !== "string" || !requestedPath.trim()) {
    fail("frame-composite-input-path-invalid", label + " path is required");
  }
  const absolute = path.resolve(requestedPath);
  let before;
  try {
    before = await lstat(absolute);
  } catch (error) {
    fail("frame-composite-input-unavailable", label + " is unavailable: " + error.message);
  }
  if (before.isSymbolicLink() || !before.isFile() || before.size > maxBytes) {
    fail("frame-composite-input-invalid", label + " must be a bounded regular file, not a symlink");
  }
  const actualPath = await realpath(absolute);
  const actualBefore = await lstat(actualPath);
  if (actualBefore.isSymbolicLink() || !actualBefore.isFile() ||
      actualBefore.dev !== before.dev || actualBefore.ino !== before.ino) {
    fail("frame-composite-input-changed", label + " changed identity while being opened");
  }
  const bytes = await readFile(actualPath);
  const after = await lstat(actualPath);
  if (after.isSymbolicLink() || !after.isFile() ||
      after.dev !== actualBefore.dev || after.ino !== actualBefore.ino ||
      after.size !== actualBefore.size || after.mtimeMs !== actualBefore.mtimeMs ||
      after.ctimeMs !== actualBefore.ctimeMs || bytes.length !== after.size) {
    fail("frame-composite-input-changed", label + " changed while being read");
  }
  return { path: actualPath, bytes, sha256: sha256(bytes), byteLength: bytes.length };
}

function parseJson(file, label) {
  try {
    return JSON.parse(file.bytes.toString("utf8"));
  } catch (error) {
    fail("frame-composite-json-invalid", label + " is not valid JSON: " + error.message);
  }
}

function requireDigest(value, label) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("frame-composite-digest-invalid", label + " must be a SHA-256 digest");
  }
}

function decodeArtifactMask(bytes, label, maxPixels) {
  const decoded = decodeRgbaPng(bytes, { maxPixels, maxBytes: MAX_PNG_BYTES });
  const pixels = new Uint8Array(decoded.width * decoded.height);
  for (let pixel = 0; pixel < pixels.length; pixel += 1) {
    const offset = pixel * 4;
    const value = decoded.data[offset];
    if (decoded.data[offset + 1] !== value || decoded.data[offset + 2] !== value ||
        decoded.data[offset + 3] !== 255 || (value !== 0 && value !== 255)) {
      fail("frame-composite-artifact-mask-invalid", label + " must be an opaque grayscale binary RGBA PNG");
    }
    pixels[pixel] = value;
  }
  return { width: decoded.width, height: decoded.height, pixels };
}

async function readScenePlateArtifact(directoryPath) {
  if (typeof directoryPath !== "string" || !directoryPath.trim()) {
    fail("frame-composite-scene-directory-invalid", "Scene-plate artifact directory is required");
  }
  const requested = path.resolve(directoryPath);
  let requestedStat;
  try {
    requestedStat = await lstat(requested);
  } catch (error) {
    fail("frame-composite-scene-directory-unavailable", "Scene-plate directory is unavailable: " + error.message);
  }
  if (requestedStat.isSymbolicLink() || !requestedStat.isDirectory()) {
    fail("frame-composite-scene-directory-invalid", "Scene-plate artifact path must be a real directory");
  }
  const directory = await realpath(requested);
  const receiptFile = await readRegularFile(
    path.join(directory, "scene-plate.receipt.json"),
    "Scene-plate receipt",
    MAX_JSON_BYTES
  );
  const receipt = parseJson(receiptFile, "Scene-plate receipt");
  if (receipt.schema !== "geehub.temporal-scene-plate-artifact-receipt" ||
      receipt.schemaVersion !== 1 || receipt.status !== "complete" ||
      !["ready-for-composite", "partial", "no-body-holes"].includes(receipt.repairStatus) ||
      receipt.coordinateSpace !== "source-pixel" ||
      receipt.readyForComposite !== (receipt.repairStatus !== "partial") ||
      receipt.unresolvedPixelsRemainTransparent !== true ||
      receipt.donorSamplesSynthesized !== false) {
    fail("frame-composite-scene-receipt-invalid", "Scene-plate receipt is not a supported, provenance-preserving artifact");
  }
  const width = receipt.dimensions?.width;
  const height = receipt.dimensions?.height;
  const pixelCount = width * height;
  if (!Number.isSafeInteger(width) || width < 1 ||
      !Number.isSafeInteger(height) || height < 1 ||
      !Number.isSafeInteger(pixelCount) || pixelCount > MAX_PIXELS ||
      receipt.dimensions.pixelCount !== pixelCount) {
    fail("frame-composite-scene-dimensions-invalid", "Scene-plate receipt dimensions are invalid or exceed the pixel limit");
  }
  const frameRange = receipt.frameRange;
  if (!Array.isArray(receipt.frames) || receipt.frames.length < 2 ||
      frameRange?.firstFrame !== receipt.frames[0]?.frame ||
      frameRange?.lastFrame !== receipt.frames.at(-1)?.frame ||
      frameRange?.frameCount !== receipt.frames.length) {
    fail("frame-composite-scene-range-invalid", "Scene-plate receipt frame range is inconsistent");
  }
  let previousFrame = -1;
  let previousTime = -Infinity;
  for (const item of receipt.frames) {
    if (!Number.isSafeInteger(item.frame) || item.frame < 0 || item.frame <= previousFrame ||
        !Number.isFinite(item.timeSeconds) || item.timeSeconds < 0 || item.timeSeconds <= previousTime) {
      fail("frame-composite-scene-order-invalid", "Scene-plate frames and timestamps must increase strictly");
    }
    previousFrame = item.frame;
    previousTime = item.timeSeconds;
  }
  const camera = receipt.cameraRegistration;
  if (!camera || typeof camera.id !== "string" || !camera.id.trim() ||
      !SHA256.test(camera.checksum || "") || camera.mode !== "fixed-camera" ||
      typeof camera.verificationMethod !== "string" || !camera.verificationMethod.trim() ||
      camera.independentlyVerified !== false ||
      receipt.cameraRegistrationIndependentlyVerified !== false) {
    fail("frame-composite-camera-evidence-invalid", "Scene-plate camera evidence must retain its external-verification limitation");
  }
  const thresholds = receipt.thresholds;
  if (!Number.isInteger(thresholds?.minDonors) || thresholds.minDonors < 1 ||
      thresholds.minDonors > receipt.frames.length ||
      !Number.isInteger(thresholds.maxChannelSpread) ||
      thresholds.maxChannelSpread < 0 || thresholds.maxChannelSpread > 255 ||
      thresholds.cameraMode !== "fixed-camera") {
    fail("frame-composite-scene-thresholds-invalid", "Scene-plate donor thresholds are invalid");
  }
  const expectedFiles = {
    plate: "scene-plate.png",
    coverageMask: "coverage-mask.png",
    unresolvedMask: "unresolved-mask.png",
    donorProvenance: "donor-provenance.bin"
  };
  const artifactBytes = {};
  for (const [key, expectedName] of Object.entries(expectedFiles)) {
    const record = receipt.files?.[key];
    if (!record || record.file !== expectedName) {
      fail("frame-composite-scene-file-record-invalid", "Scene-plate receipt is missing " + key);
    }
    safeBasename(record.file, "Scene-plate artifact");
    requireDigest(record.sha256, "Scene-plate " + key);
    if (!Number.isSafeInteger(record.byteLength) || record.byteLength < 1) {
      fail("frame-composite-scene-file-record-invalid", "Scene-plate " + key + " byte length is invalid");
    }
    const limit = key === "donorProvenance" ? MAX_PROVENANCE_BYTES : MAX_PNG_BYTES;
    const file = await readRegularFile(path.join(directory, record.file), "Scene-plate " + key, limit);
    if (file.sha256 !== record.sha256.toLowerCase() || file.byteLength !== record.byteLength) {
      fail("frame-composite-scene-file-digest-mismatch", "Scene-plate " + key + " differs from its receipt");
    }
    artifactBytes[key] = file.bytes;
  }

  const plate = decodeRgbaPng(artifactBytes.plate, { maxPixels: MAX_PIXELS, maxBytes: MAX_PNG_BYTES });
  const coverage = decodeArtifactMask(artifactBytes.coverageMask, "Coverage", MAX_PIXELS);
  const unresolved = decodeArtifactMask(artifactBytes.unresolvedMask, "Unresolved", MAX_PIXELS);
  if (plate.width !== width || plate.height !== height ||
      coverage.width !== width || coverage.height !== height ||
      unresolved.width !== width || unresolved.height !== height) {
    fail("frame-composite-scene-artifact-dimensions", "Scene-plate PNG and masks must match receipt dimensions");
  }
  const layout = receipt.provenanceLayout;
  if (layout?.recordOrder !== "row-major-pixel" ||
      layout.recordStrideBytes !== 7 || layout.byteOrder !== "little-endian" ||
      layout.file !== "donor-provenance.bin" ||
      artifactBytes.donorProvenance.length !== pixelCount * 7) {
    fail("frame-composite-scene-provenance-layout", "Scene-plate donor ledger does not use the registered seven-byte layout");
  }
  const provenance = artifactBytes.donorProvenance;
  const provenanceFrameIndex = new Int32Array(pixelCount);
  const donorCount = new Uint16Array(pixelCount);
  const maxChannelSpread = new Uint8Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 7;
    provenanceFrameIndex[pixel] = provenance.readInt32LE(offset);
    donorCount[pixel] = provenance.readUInt16LE(offset + 4);
    maxChannelSpread[pixel] = provenance[offset + 6];
  }
  const counts = receipt.counts;
  if (!counts || !Number.isSafeInteger(counts.hiddenPixels) ||
      !Number.isSafeInteger(counts.reconstructedPixels) ||
      !Number.isSafeInteger(counts.unresolvedPixels) ||
      !Number.isFinite(counts.coverageRatio)) {
    fail("frame-composite-scene-counts-invalid", "Scene-plate receipt counts are invalid");
  }
  return {
    receipt,
    receiptFile,
    scenePlate: {
      schema: "geehub.temporal-scene-plate",
      schemaVersion: 1,
      status: receipt.repairStatus,
      coordinateSpace: "source-pixel",
      width,
      height,
      plate: { width, height, data: plate.data },
      coverageMask: coverage.pixels,
      unresolvedMask: unresolved.pixels,
      provenanceFrameIndex,
      donorCount,
      maxChannelSpread,
      cameraRegistrationId: camera.id,
      cameraRegistrationChecksum: camera.checksum,
      frameNumbers: receipt.frames.map(item => item.frame),
      frameTimesSeconds: receipt.frames.map(item => item.timeSeconds),
      frameRange: structuredClone(frameRange),
      thresholds: structuredClone(thresholds),
      counts: structuredClone(counts)
    }
  };
}

function validateSourceIndex(index, batch, indexFile) {
  if (index?.schema !== "geehub.source-frame-index" || index.schemaVersion !== 1 ||
      typeof index.sourceAssetId !== "string" || !index.sourceAssetId ||
      typeof index.sequenceId !== "string" || !index.sequenceId ||
      !SHA256.test(index.sourceChecksum || "") ||
      !Number.isSafeInteger(index.firstFrame) || !Number.isSafeInteger(index.lastFrame) ||
      index.firstFrame < 0 || index.lastFrame < index.firstFrame ||
      !Array.isArray(index.frames) || !index.format ||
      index.format.frameCount !== index.frames.length ||
      index.lastFrame - index.firstFrame + 1 !== index.frames.length ||
      !Number.isSafeInteger(index.format.width) || index.format.width < 1 ||
      !Number.isSafeInteger(index.format.height) || index.format.height < 1 ||
      !Number.isFinite(index.format.fps) || index.format.fps <= 0) {
    fail("frame-composite-source-index-invalid", "Source-frame index is not a complete version-one sequence");
  }
  const derivation = index.derivation;
  if (derivation?.schema !== "geehub.source-frame-extraction" ||
      derivation.schemaVersion !== 1 || derivation.method !== "ffmpeg-image2-png" ||
      derivation.sourceChecksum !== index.sourceChecksum ||
      derivation.sourceUnchangedAfterExtraction !== true ||
      derivation.extractedFrameCount !== index.frames.length ||
      !Number.isSafeInteger(derivation.probedFrameCount) ||
      derivation.probedFrameCount < index.frames.length) {
    fail("frame-composite-source-derivation-invalid", "Source-frame extraction record is incomplete");
  }
  if (batch?.schema !== "geehub.growth-frame-batch-receipt.v1" ||
      batch.status !== "complete" || batch.allFramesAccountedFor !== true ||
      batch.sourceFramesUnmodified !== true ||
      batch.sourceFrameDerivationVerified !== true ||
      batch.sourceFramePixelsRevalidated !== true ||
      batch.sourceAssetId !== index.sourceAssetId ||
      batch.sourceChecksum !== index.sourceChecksum ||
      batch.sequenceId !== index.sequenceId ||
      batch.firstFrame !== index.firstFrame || batch.lastFrame !== index.lastFrame ||
      batch.frameCount !== index.frames.length ||
      !Array.isArray(batch.frames) || batch.frames.length !== index.frames.length ||
      batch.sourceFrameIndex?.file !== path.basename(indexFile.path) ||
      batch.sourceFrameIndex?.sha256 !== indexFile.sha256) {
    fail("frame-composite-batch-receipt-invalid", "A complete batch receipt bound to this exact source-frame index is required");
  }
  const verification = batch.sourceFrameDerivationVerification;
  if (verification?.schema !== "geehub.source-frame-derivation-verification.v1" ||
      verification.status !== "verified" ||
      verification.sourceChecksum !== index.sourceChecksum ||
      verification.extractedFrameCount !== index.frames.length ||
      verification.pixelMatchedFrameCount !== index.frames.length) {
    fail("frame-composite-source-derivation-unverified", "Batch receipt does not carry complete independent source-frame pixel verification");
  }
  let previousTime = -Infinity;
  for (let offset = 0; offset < index.frames.length; offset += 1) {
    const indexed = index.frames[offset];
    const batched = batch.frames[offset];
    if (indexed.frame !== index.firstFrame + offset ||
        !Number.isFinite(indexed.timeSeconds) || indexed.timeSeconds < 0 ||
        indexed.timeSeconds <= previousTime ||
        typeof indexed.file !== "string" ||
        safeBasename(indexed.file, "Indexed source frame") !== indexed.file ||
        !SHA256.test(indexed.sha256 || "") ||
        batched?.frame !== indexed.frame ||
        batched.timeSeconds !== indexed.timeSeconds ||
        batched.sourceFrame?.file !== indexed.file ||
        batched.sourceFrame?.sha256 !== indexed.sha256) {
      fail("frame-composite-source-index-batch-mismatch", "Batch receipt and source-frame index differ at frame " + indexed.frame);
    }
    previousTime = indexed.timeSeconds;
  }
  return { index, batch };
}

async function resolveOutputPath(requestedPath) {
  if (typeof requestedPath !== "string" || !requestedPath.trim() ||
      path.extname(requestedPath).toLowerCase() !== ".png") {
    fail("frame-composite-output-path-invalid", "Output path must name a new PNG file");
  }
  const absolute = path.resolve(requestedPath);
  const name = path.basename(absolute);
  if (!name || name === "." || name === "..") {
    fail("frame-composite-output-path-invalid", "Output path must name a file");
  }
  const parentPath = path.dirname(absolute);
  const parentStat = await lstat(parentPath);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
    fail("frame-composite-output-parent-invalid", "Output parent must be an existing real directory");
  }
  const parent = await realpath(parentPath);
  return path.join(parent, name);
}

async function writeExclusive(filePath, bytes) {
  let handle;
  let identity;
  try {
    handle = await open(filePath, "wx", 0o600);
    const created = await handle.stat();
    identity = { dev: created.dev, ino: created.ino };
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    const before = await lstat(filePath);
    if (before.isSymbolicLink() || !before.isFile() ||
        before.dev !== identity.dev || before.ino !== identity.ino) {
      fail("frame-composite-output-identity", "Created output changed identity before read-back");
    }
    const actual = await readFile(filePath);
    const after = await lstat(filePath);
    if (after.isSymbolicLink() || !after.isFile() ||
        after.dev !== identity.dev || after.ino !== identity.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs || !actual.equals(Buffer.from(bytes))) {
      fail("frame-composite-output-readback", "Output bytes changed or failed read-back verification");
    }
    return { sha256: sha256(actual), byteLength: actual.length };
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    if (identity) {
      try {
        const current = await lstat(filePath);
        if (!current.isSymbolicLink() && current.isFile() &&
            current.dev === identity.dev && current.ino === identity.ino) {
          await rm(filePath);
        }
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") throw cleanupError;
      }
    }
    throw error;
  }
}

async function removeIfDigest(filePath, expectedDigest) {
  try {
    const current = await lstat(filePath);
    if (current.isSymbolicLink() || !current.isFile()) return;
    const bytes = await readFile(filePath);
    if (sha256(bytes) === expectedDigest) await rm(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

/**
 * Compose one frame from a verified batch, extracted source index, body-layer
 * receipt, masks, and persisted scene-plate artifact. The output PNG and its
 * receipt are new files; neither source nor intermediate evidence is changed.
 */
export async function composeGrowthFrameFiles({
  sourcePath,
  bodyMaskPath,
  protectedFaceMaskPath,
  bodyLayerPath,
  batchReceiptPath,
  sourceFrameIndexPath,
  scenePlateDirectory,
  outputPath
} = {}) {
  const [sourceFile, bodyMaskFile, faceMaskFile, bodyLayerFile, batchFile, indexFile] = await Promise.all([
    readRegularFile(sourcePath, "Source frame PNG", MAX_PNG_BYTES),
    readRegularFile(bodyMaskPath, "Body mask PNG", MAX_PNG_BYTES),
    readRegularFile(protectedFaceMaskPath, "Protected-face mask PNG", MAX_PNG_BYTES),
    readRegularFile(bodyLayerPath, "Transformed body-layer PNG", MAX_PNG_BYTES),
    readRegularFile(batchReceiptPath, "Batch sequence receipt", MAX_JSON_BYTES),
    readRegularFile(sourceFrameIndexPath, "Source-frame index", MAX_JSON_BYTES)
  ]);
  const batch = parseJson(batchFile, "Batch sequence receipt");
  const index = parseJson(indexFile, "Source-frame index");
  validateSourceIndex(index, batch, indexFile);

  const sourceFrameIndex = path.resolve(sourceFile.path);
  if (path.dirname(sourceFrameIndex) !== path.dirname(indexFile.path)) {
    fail("frame-composite-source-location-mismatch", "Source PNG must be beside the source-frame index");
  }
  const indexedFrame = index.frames.find(item => item.file === path.basename(sourceFile.path));
  if (!indexedFrame || indexedFrame.sha256.toLowerCase() !== sourceFile.sha256) {
    fail("frame-composite-source-frame-mismatch", "Source PNG is not the exact indexed frame");
  }
  const batchFrame = batch.frames.find(item => item.frame === indexedFrame.frame);
  if (!batchFrame) fail("frame-composite-batch-frame-missing", "Batch receipt does not contain this source frame");

  const batchDirectory = path.dirname(batchFile.path);
  if (path.dirname(bodyLayerFile.path) !== batchDirectory ||
      path.basename(bodyLayerFile.path) !== batchFrame.output?.file ||
      batchFrame.output?.sha256 !== bodyLayerFile.sha256) {
    fail("frame-composite-body-layer-batch-mismatch", "Body layer does not match the batch receipt output");
  }
  const bodyReceiptName = safeBasename(batchFrame.receipt?.file, "Body-layer receipt");
  requireDigest(batchFrame.receipt?.sha256, "Batch body-layer receipt");
  const bodyReceiptFile = await readRegularFile(
    path.join(batchDirectory, bodyReceiptName), "Body-layer receipt", MAX_JSON_BYTES
  );
  if (bodyReceiptFile.sha256 !== batchFrame.receipt.sha256.toLowerCase()) {
    fail("frame-composite-body-receipt-digest-mismatch", "Body-layer receipt differs from the batch sequence receipt");
  }
  const bodyReceipt = parseJson(bodyReceiptFile, "Body-layer receipt");
  if (bodyReceipt.schema !== "geehub.growth-frame-file-receipt.v1" ||
      bodyReceipt.status !== "written" ||
      bodyReceipt.frame !== indexedFrame.frame ||
      bodyReceipt.timeSeconds !== indexedFrame.timeSeconds ||
      bodyReceipt.sourceFrameUnmodified !== true ||
      bodyReceipt.outputCreatedExclusively !== true ||
      bodyReceipt.output?.file !== path.basename(bodyLayerFile.path) ||
      bodyReceipt.output?.sha256 !== bodyLayerFile.sha256 ||
      bodyReceipt.output?.byteLength !== bodyLayerFile.byteLength ||
      bodyReceipt.output?.encoding !== "png/rgba8" ||
      bodyReceipt.inputs?.sourceFrame?.file !== path.basename(sourceFile.path) ||
      bodyReceipt.inputs?.sourceFrame?.sha256 !== sourceFile.sha256 ||
      bodyReceipt.inputs?.bodyMask?.sha256 !== bodyMaskFile.sha256 ||
      bodyReceipt.inputs?.protectedFaceMask?.sha256 !== faceMaskFile.sha256 ||
      batchFrame.bodyMaskSha256 !== bodyMaskFile.sha256 ||
      batchFrame.protectedFaceMaskSha256 !== faceMaskFile.sha256 ||
      batchFrame.deformationPlanSha256 !== bodyReceipt.inputs?.deformationPlan?.sha256 ||
      batchFrame.output?.byteLength !== bodyLayerFile.byteLength ||
      !Number.isSafeInteger(bodyReceipt.raster?.coveredPixels) ||
      bodyReceipt.raster.coveredPixels < 1 ||
      !Number.isSafeInteger(bodyReceipt.raster?.renderedTriangles) ||
      bodyReceipt.raster.renderedTriangles < 1) {
    fail("frame-composite-body-receipt-invalid", "Body-layer receipt does not bind the exact source, masks, plan, and output");
  }

  const source = decodeRgbaPng(sourceFile.bytes, { maxPixels: MAX_PIXELS, maxBytes: MAX_PNG_BYTES });
  const bodyMaskDecoded = decodeBinaryMaskPng(bodyMaskFile.bytes, { maxPixels: MAX_PIXELS });
  const faceMaskDecoded = decodeBinaryMaskPng(faceMaskFile.bytes, { maxPixels: MAX_PIXELS });
  const bodyLayerDecoded = decodeRgbaPng(bodyLayerFile.bytes, { maxPixels: MAX_PIXELS, maxBytes: MAX_PNG_BYTES });
  const expectedWidth = index.format.width;
  const expectedHeight = index.format.height;
  if (source.width !== expectedWidth || source.height !== expectedHeight ||
      bodyMaskDecoded.width !== expectedWidth || bodyMaskDecoded.height !== expectedHeight ||
      faceMaskDecoded.width !== expectedWidth || faceMaskDecoded.height !== expectedHeight ||
      bodyLayerDecoded.width !== expectedWidth || bodyLayerDecoded.height !== expectedHeight) {
    fail("frame-composite-frame-dimensions-mismatch", "Source, masks, body layer, and indexed dimensions must match");
  }
  const pixelCount = expectedWidth * expectedHeight;
  const coverageMask = new Uint8Array(pixelCount);
  let visibleBodyPixels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const alpha = bodyLayerDecoded.data[offset + 3];
    if (alpha > 0) {
      coverageMask[pixel] = 255;
      visibleBodyPixels += 1;
    } else if (bodyLayerDecoded.data[offset] !== 0 ||
               bodyLayerDecoded.data[offset + 1] !== 0 ||
               bodyLayerDecoded.data[offset + 2] !== 0) {
      fail("frame-composite-body-transparent-colour", "Transparent body-layer pixels must be black outside visible alpha");
    }
  }
  if (visibleBodyPixels < 1 || visibleBodyPixels > bodyReceipt.raster.coveredPixels) {
    fail("frame-composite-body-coverage-invalid", "Visible body-layer alpha must be non-empty and cannot exceed raster coverage");
  }

  const sceneArtifact = await readScenePlateArtifact(scenePlateDirectory);
  if (sceneArtifact.scenePlate.width !== expectedWidth ||
      sceneArtifact.scenePlate.height !== expectedHeight) {
    fail("frame-composite-scene-dimensions-mismatch", "Scene plate dimensions differ from the indexed source frame");
  }
  const composed = composeGrowthFramePixels({
    sourceFrame: {
      frame: indexedFrame.frame,
      timeSeconds: indexedFrame.timeSeconds,
      width: source.width,
      height: source.height,
      data: source.data
    },
    bodyMask: {
      frame: indexedFrame.frame,
      width: bodyMaskDecoded.width,
      height: bodyMaskDecoded.height,
      pixels: bodyMaskDecoded.pixels
    },
    protectedFaceMask: {
      frame: indexedFrame.frame,
      width: faceMaskDecoded.width,
      height: faceMaskDecoded.height,
      pixels: faceMaskDecoded.pixels
    },
    bodyLayer: {
      schema: "geehub.growth-deformation-pixel-layer",
      schemaVersion: 1,
      status: "ready-body-layer",
      frame: indexedFrame.frame,
      width: bodyLayerDecoded.width,
      height: bodyLayerDecoded.height,
      data: bodyLayerDecoded.data,
      coverageMask,
      coveredPixels: visibleBodyPixels,
      sourceFrameUnmodified: true,
      protectedMaskPixelsUntouched: true
    },
    scenePlate: sceneArtifact.scenePlate
  });

  const outputBytes = encodeRgbaPng({
    width: composed.width,
    height: composed.height,
    data: composed.data
  }, { maxPixels: MAX_PIXELS, maxBytes: MAX_PNG_BYTES });
  const outputTarget = await resolveOutputPath(outputPath);
  const receiptTarget = outputTarget + ".receipt.json";
  const inputPaths = [
    sourceFile.path, bodyMaskFile.path, faceMaskFile.path, bodyLayerFile.path,
    batchFile.path, indexFile.path, bodyReceiptFile.path, sceneArtifact.receiptFile.path
  ];
  if (inputPaths.includes(outputTarget) || inputPaths.includes(receiptTarget)) {
    fail("frame-composite-output-collision", "Output PNG and receipt must not replace any input evidence");
  }
  for (const target of [outputTarget, receiptTarget]) {
    try {
      await lstat(target);
      fail("frame-composite-output-exists", "Output PNG and receipt paths must both be new");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const outputDigest = sha256(outputBytes);
  const receipt = {
    schema: "geehub.composited-growth-frame-file-receipt.v1",
    status: "written",
    compositionStatus: composed.status,
    frame: indexedFrame.frame,
    timeSeconds: indexedFrame.timeSeconds,
    dimensions: { width: composed.width, height: composed.height, pixelCount },
    sourceAssetId: index.sourceAssetId,
    sourceChecksum: index.sourceChecksum,
    sequenceId: index.sequenceId,
    sourceFrame: { file: path.basename(sourceFile.path), sha256: sourceFile.sha256 },
    sourceFrameIndex: { file: path.basename(indexFile.path), sha256: indexFile.sha256 },
    batchReceipt: { file: path.basename(batchFile.path), sha256: batchFile.sha256 },
    bodyLayer: {
      file: path.basename(bodyLayerFile.path),
      sha256: bodyLayerFile.sha256,
      receiptSha256: bodyReceiptFile.sha256,
      visibleAlphaPixels: visibleBodyPixels,
      rasterCoveragePixels: bodyReceipt.raster.coveredPixels
    },
    masks: {
      bodySha256: bodyMaskFile.sha256,
      protectedFaceSha256: faceMaskFile.sha256
    },
    scenePlate: {
      receiptSha256: sceneArtifact.receiptFile.sha256,
      repairStatus: sceneArtifact.receipt.repairStatus,
      cameraRegistrationId: sceneArtifact.receipt.cameraRegistration.id,
      cameraRegistrationChecksum: sceneArtifact.receipt.cameraRegistration.checksum,
      files: structuredClone(sceneArtifact.receipt.files)
    },
    counts: structuredClone(composed.counts),
    output: {
      file: path.basename(outputTarget),
      path: outputTarget,
      sha256: outputDigest,
      byteLength: outputBytes.length,
      encoding: "png/rgba8"
    },
    readyForAssembly: composed.readyForAssembly,
    readyForExport: false,
    sourceFrameDerivationVerified: true,
    sourceFramePixelsRevalidated: true,
    sourceDerivationVerificationInheritedFromBatchReceipt: true,
    cameraRegistrationIndependentlyVerified: false,
    pixelSemanticsVerified: false,
    protectedFacePixelsPreserved: composed.protectedFacePixelsPreserved,
    unresolvedPixelsExplicit: composed.unresolvedPixelsExplicit,
    inputFilesModified: false,
    outputCreatedExclusively: true,
    note: "This is a persisted single-frame composite. Source derivation and pixel revalidation are inherited from the exact complete batch receipt; the compositor does not rerun FFmpeg. Camera registration remains externally asserted, anatomical mask semantics remain unverified, and this PNG is not export-ready video."
  };
  const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");

  let outputRecord;
  try {
    outputRecord = await writeExclusive(outputTarget, outputBytes);
    await writeExclusive(receiptTarget, receiptBytes);
  } catch (error) {
    if (outputRecord) await removeIfDigest(outputTarget, outputRecord.sha256).catch(() => {});
    throw error;
  }
  return {
    ...receipt,
    outputPath: outputTarget,
    receiptPath: receiptTarget,
    receiptSha256: sha256(receiptBytes)
  };
}
