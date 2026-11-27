/**
 * File-backed camera registration from manifest-bound source frames and masks.
 *
 * The worker verifies the source-frame index, registered segmentation sidecar,
 * every source PNG, and every binary mask before measuring camera translation.
 * It writes a checksummed evidence record and a read-back receipt. It does not
 * re-decode the source video, so source-frame derivation remains unverified.
 */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat, open, readFile, realpath, unlink
} from "node:fs/promises";
import path from "node:path";
import { resolveDropboxUri } from "./bridge-exchange.js";
import { validateBridgeManifest } from "./bridge-manifest.js";
import {
  cameraRegistrationChecksum,
  estimateFixedCameraRegistration
} from "./camera-registration.js";
import { decodeBinaryMaskPng } from "./mask-pixels.js";
import { decodeRgbaPng } from "./rgba-png.js";

const SHA256 = /^[a-f0-9]{64}$/i;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_INPUT_FILE_BYTES = 128 * 1024 * 1024;
const DEFAULT_MAX_PIXELS = 2_000_000;
const DEFAULT_MAX_FRAMES = 32;
const DEFAULT_MAX_TOTAL_INPUT_BYTES = 512 * 1024 * 1024;
const DEFAULT_MAX_DECODED_BYTES = 384 * 1024 * 1024;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

function safeBasename(value, label) {
  if (typeof value !== "string" || !value || value === "." || value === ".." ||
      path.basename(value) !== value || value.includes("/") || value.includes("\\")) {
    fail("camera-registration-file-name-invalid", label + " must be a plain file name");
  }
  return value;
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("camera-registration-json-invalid", label + " is not valid JSON: " + error.message);
  }
}

async function readRegularFile(requestedPath, label, maxBytes = MAX_INPUT_FILE_BYTES) {
  if (typeof requestedPath !== "string" || !requestedPath.trim()) {
    fail("camera-registration-input-path-invalid", label + " path is required");
  }
  const absolute = path.resolve(requestedPath);
  let beforePath;
  try {
    beforePath = await lstat(absolute);
  } catch (error) {
    fail("camera-registration-input-unavailable", label + " is unavailable: " + error.message);
  }
  if (beforePath.isSymbolicLink() || !beforePath.isFile() || beforePath.size > maxBytes) {
    fail("camera-registration-input-invalid", label + " must be a bounded regular file, not a symlink");
  }
  let handle;
  try {
    handle = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = await handle.stat();
    if (!before.isFile() || before.size > maxBytes ||
        before.dev !== beforePath.dev || before.ino !== beforePath.ino) {
      fail("camera-registration-input-changed", label + " changed identity before reading");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.length !== after.size || before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      fail("camera-registration-input-changed", label + " changed while being read");
    }
    return {
      path: absolute,
      bytes,
      sha256: sha256(bytes),
      byteLength: bytes.length
    };
  } finally {
    if (handle) await handle.close();
  }
}

async function inspectDropboxPath(root, target, label) {
  if (!within(root, target)) {
    fail("camera-registration-dropbox-path-escape", label + " escapes the configured Dropbox root");
  }
  const segments = path.relative(root, target).split(path.sep);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let entry;
    try {
      entry = await lstat(current);
    } catch (error) {
      fail("camera-registration-dropbox-input-unavailable", label + " is unavailable: " + error.message);
    }
    if (entry.isSymbolicLink()) {
      fail("camera-registration-dropbox-symlink", label + " contains a symlink: " + current);
    }
    if (index < segments.length - 1 && !entry.isDirectory()) {
      fail("camera-registration-dropbox-parent-invalid", label + " has a non-directory parent");
    }
    if (index === segments.length - 1 && !entry.isFile()) {
      fail("camera-registration-dropbox-file-invalid", label + " must be a regular file");
    }
  }
  return target;
}

async function readDropboxFile(uri, root, label, maxBytes = MAX_INPUT_FILE_BYTES) {
  let target;
  try {
    target = resolveDropboxUri(uri, root);
  } catch (error) {
    fail("camera-registration-dropbox-uri-invalid", label + " has an unsafe URI: " + error.message);
  }
  await inspectDropboxPath(root, target, label);
  return readRegularFile(target, label, maxBytes);
}

function validateFileOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Camera-registration file options must be an object");
  }
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
  const maxFrames = options.maxFrames ?? DEFAULT_MAX_FRAMES;
  const maxTotalInputBytes = options.maxTotalInputBytes ?? DEFAULT_MAX_TOTAL_INPUT_BYTES;
  const maxDecodedBytes = options.maxDecodedBytes ?? DEFAULT_MAX_DECODED_BYTES;
  const estimatorOptions = options.estimatorOptions ?? {};
  if (!Number.isSafeInteger(maxPixels) || maxPixels < 1 ||
      !Number.isSafeInteger(maxFrames) || maxFrames < 2 || maxFrames > DEFAULT_MAX_FRAMES ||
      !Number.isSafeInteger(maxTotalInputBytes) || maxTotalInputBytes < 1 ||
      !Number.isSafeInteger(maxDecodedBytes) || maxDecodedBytes < 1 ||
      !estimatorOptions || typeof estimatorOptions !== "object" || Array.isArray(estimatorOptions)) {
    throw new TypeError("Camera-registration file limits or estimator options are invalid");
  }
  return { maxPixels, maxFrames, maxTotalInputBytes, maxDecodedBytes, estimatorOptions };
}

function validateSourceIndex(index, manifest, frameSet, sidecar, maxFrames) {
  const format = index?.format;
  const derivation = index?.derivation;
  if (index?.schema !== "geehub.source-frame-index" || index.schemaVersion !== 1 ||
      index.sourceAssetId !== manifest.source.id ||
      index.sourceChecksum !== manifest.source.checksum?.toLowerCase() ||
      index.sequenceId !== frameSet.metadata?.sequenceId ||
      index.firstFrame !== frameSet.firstFrame || index.lastFrame !== frameSet.lastFrame ||
      !Array.isArray(index.frames) || index.frames.length !== frameSet.frameCount ||
      index.frames.length < 2 || index.frames.length > maxFrames ||
      format?.width !== frameSet.width || format?.height !== frameSet.height ||
      format?.fps !== frameSet.fps || format?.frameCount !== frameSet.frameCount ||
      derivation?.schema !== "geehub.source-frame-extraction" ||
      derivation.schemaVersion !== 1 || derivation.method !== "ffmpeg-image2-png" ||
      derivation.sourceUri !== manifest.source.uri ||
      derivation.sourceChecksum !== manifest.source.checksum?.toLowerCase() ||
      derivation.sourceUnchangedAfterExtraction !== true ||
      derivation.extractedFrameCount !== frameSet.frameCount ||
      !Number.isSafeInteger(derivation.probedFrameCount) ||
      derivation.probedFrameCount <= index.lastFrame ||
      !Number.isSafeInteger(derivation.streamIndex) || derivation.streamIndex < 0 ||
      typeof derivation.avgFrameRate !== "string" ||
      typeof derivation.timestampBasis !== "string" ||
      !Number.isFinite(derivation.timestampOriginSeconds) ||
      !Number.isFinite(derivation.timestampToleranceSeconds) ||
      derivation.timestampToleranceSeconds <= 0 ||
      derivation.timestampToleranceSeconds >= 0.5 / frameSet.fps ||
      typeof derivation.ffmpegVersion !== "string" || !derivation.ffmpegVersion.trim() ||
      typeof derivation.ffprobeVersion !== "string" || !derivation.ffprobeVersion.trim()) {
    fail("camera-registration-source-index-invalid", "Source-frame index does not match the immutable manifest and segmentation frame set");
  }
  if (sidecar?.schema !== "geehub.frame-set-evidence" || sidecar.schemaVersion !== 1 ||
      sidecar.role !== "segmentation" || sidecar.pixelSemanticsVerified !== false ||
      sidecar.sourceAssetId !== manifest.source.id ||
      sidecar.sequenceId !== index.sequenceId ||
      sidecar.firstFrame !== index.firstFrame || sidecar.lastFrame !== index.lastFrame ||
      sidecar.frameCount !== index.frames.length ||
      sidecar.width !== format.width || sidecar.height !== format.height ||
      sidecar.fps !== format.fps ||
      !Array.isArray(sidecar.frames) || sidecar.frames.length !== index.frames.length) {
    fail("camera-registration-segmentation-invalid", "Registered segmentation sidecar does not match the source-frame index");
  }
  const tolerance = derivation.timestampToleranceSeconds;
  let previousSourceTime = -Infinity;
  for (let offset = 0; offset < index.frames.length; offset += 1) {
    const indexed = index.frames[offset];
    const segmented = sidecar.frames[offset];
    if (indexed?.frame !== index.firstFrame + offset ||
        segmented?.frame !== indexed.frame ||
        !Number.isFinite(indexed.timeSeconds) || indexed.timeSeconds < 0 ||
        segmented.timeSeconds !== indexed.timeSeconds ||
        !Number.isFinite(indexed.sourceTimestampSeconds) ||
        !Number.isFinite(indexed.sourceTimeFromOriginSeconds) ||
        indexed.sourceTimestampSeconds <= previousSourceTime ||
        Math.abs(indexed.sourceTimestampSeconds - derivation.timestampOriginSeconds -
          indexed.sourceTimeFromOriginSeconds) > 1e-6 ||
        Math.abs(indexed.sourceTimeFromOriginSeconds - indexed.timeSeconds) > tolerance ||
        typeof indexed.file !== "string" || !SHA256.test(indexed.sha256 || "")) {
      fail("camera-registration-frame-lineage", "Source index and segmentation timestamps differ at offset " + offset);
    }
    safeBasename(indexed.file, "Source-frame file");
    previousSourceTime = indexed.sourceTimestampSeconds;
    for (const [mask, label, flag] of [
      [segmented.bodyMask, "Body mask", "excludesFace"],
      [segmented.faceMask, "Protected-face mask", "protectsIdentity"]
    ]) {
      if (!mask || typeof mask.uri !== "string" ||
          !SHA256.test(mask.checksum || "") ||
          mask.width !== format.width || mask.height !== format.height ||
          mask[flag] !== true) {
        fail("camera-registration-mask-record-invalid", label + " registration is incomplete at frame " + indexed.frame);
      }
    }
  }
  return { format, derivation };
}

function validateRegistrationRecord(registration) {
  const evidence = registration?.fileEvidence;
  if (registration?.schema !== "geehub.camera-registration-evidence" ||
      registration.schemaVersion !== 1 ||
      !["verified", "unverified"].includes(registration.status) ||
      registration.mode !== (registration.status === "verified" ? "fixed-camera" : "unverified") ||
      registration.coordinateSpace !== "source-pixel" ||
      !Number.isSafeInteger(registration.width) || registration.width < 1 ||
      !Number.isSafeInteger(registration.height) || registration.height < 1 ||
      !Array.isArray(registration.frames) || registration.frames.length < 2 ||
      !SHA256.test(registration.checksum || "") ||
      registration.checksum !== cameraRegistrationChecksum(registration) ||
      evidence?.schema !== "geehub.camera-registration-file-evidence.v1" ||
      evidence.status !== "verified" ||
      !SHA256.test(evidence.manifest?.sha256 || "") ||
      !SHA256.test(evidence.sourceFrameIndex?.sha256 || "") ||
      !SHA256.test(evidence.segmentationFrameSet?.sha256 || "") ||
      !Array.isArray(evidence.frames) || evidence.frames.length !== registration.frames.length ||
      registration.cameraRegistrationIndependentlyVerified !== (registration.status === "verified") ||
      registration.sourceFrameDerivationVerified !== false ||
      registration.pixelSemanticsVerified !== false) {
    fail("camera-registration-artifact-invalid", "Camera-registration artifact or its evidence checksum is invalid");
  }
  for (let index = 0; index < evidence.frames.length; index += 1) {
    const item = evidence.frames[index];
    const measured = registration.frames[index];
    if (item?.frame !== measured?.frame || item?.timeSeconds !== measured?.timeSeconds ||
        !SHA256.test(item.sourceFrame?.sha256 || "") ||
        !SHA256.test(item.bodyMask?.sha256 || "") ||
        !SHA256.test(item.protectedFaceMask?.sha256 || "")) {
      fail("camera-registration-artifact-frame-invalid", "Camera-registration artifact has incomplete frame file evidence");
    }
  }
  return registration;
}

async function resolveOutputPaths(outputPath, inputPaths) {
  if (typeof outputPath !== "string" || !outputPath.trim()) {
    fail("camera-registration-output-path-invalid", "A new camera-registration JSON path is required");
  }
  const requested = path.resolve(outputPath);
  const parent = path.dirname(requested);
  const name = path.basename(requested);
  if (!name || name === "." || name === "..") {
    fail("camera-registration-output-path-invalid", "Output path must identify a file");
  }
  let parentStat;
  try {
    parentStat = await lstat(parent);
  } catch (error) {
    fail("camera-registration-output-parent-invalid", "Output parent is unavailable: " + error.message);
  }
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory() || await realpath(parent) !== parent) {
    fail("camera-registration-output-parent-invalid", "Output parent must be an existing real directory");
  }
  const target = path.join(parent, name);
  const receipt = target + ".receipt.json";
  if (inputPaths.has(target) || inputPaths.has(receipt)) {
    fail("camera-registration-output-collision", "Camera-registration outputs must not replace any input");
  }
  for (const filePath of [target, receipt]) {
    try {
      await lstat(filePath);
      fail("camera-registration-output-exists", "Camera-registration artifact or receipt already exists");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { target, receipt };
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
      fail("camera-registration-output-identity", "Created output changed identity before read-back");
    }
    const actual = await readFile(filePath);
    const after = await lstat(filePath);
    if (after.isSymbolicLink() || !after.isFile() ||
        after.dev !== identity.dev || after.ino !== identity.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs || !actual.equals(Buffer.from(bytes))) {
      fail("camera-registration-output-readback", "Camera-registration output failed byte-for-byte read-back");
    }
    return { sha256: sha256(actual), byteLength: actual.length };
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    if (identity) {
      try {
        const current = await lstat(filePath);
        if (!current.isSymbolicLink() && current.isFile() &&
            current.dev === identity.dev && current.ino === identity.ino) {
          await unlink(filePath);
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
    if (sha256(bytes) === expectedDigest) await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

/**
 * Read a persisted camera-registration artifact and recompute its evidence
 * checksum before returning it to a scene-plate builder.
 */
export async function readCameraRegistrationArtifact(filePath) {
  const file = await readRegularFile(filePath, "Camera-registration artifact", MAX_JSON_BYTES);
  const registration = validateRegistrationRecord(parseJson(file.bytes, "Camera-registration artifact"));
  return { registration, path: file.path, sha256: file.sha256, byteLength: file.byteLength };
}

/**
 * Measure fixed-camera identity from the exact source PNG and registered mask
 * files named by a manifest-bound segmentation frame set.
 */
export async function estimateFixedCameraRegistrationFromFiles({
  manifestPath,
  segmentationFrameSetId,
  sourceFrameIndexPath,
  dropboxRoot,
  outputPath,
  options = {}
} = {}) {
  if (typeof segmentationFrameSetId !== "string" || !segmentationFrameSetId.trim()) {
    fail("camera-registration-frame-set-required", "A registered segmentation frame-set id is required");
  }
  if (typeof dropboxRoot !== "string" || !dropboxRoot.trim()) {
    fail("camera-registration-dropbox-root-required", "A local Dropbox root is required");
  }
  const limits = validateFileOptions(options);
  const [manifestFile, indexFile] = await Promise.all([
    readRegularFile(manifestPath, "Bridge manifest", MAX_JSON_BYTES),
    readRegularFile(sourceFrameIndexPath, "Source-frame index", MAX_JSON_BYTES)
  ]);
  const manifest = parseJson(manifestFile.bytes, "Bridge manifest");
  const manifestValidation = validateBridgeManifest(manifest);
  if (!manifestValidation.valid || manifest.source.immutable !== true ||
      !SHA256.test(manifest.source.checksum || "")) {
    fail("camera-registration-manifest-invalid", "A valid bridge manifest with an immutable checksummed source is required");
  }
  const frameSets = manifest.frameSets.filter(item =>
    item.id === segmentationFrameSetId && item.role === "segmentation"
  );
  if (frameSets.length !== 1 || !SHA256.test(frameSets[0].checksum || "")) {
    fail("camera-registration-frame-set-missing", "Manifest must contain exactly one checksummed segmentation frame set with that id");
  }
  const frameSet = frameSets[0];
  const requestedRoot = path.resolve(dropboxRoot);
  let rootStat;
  try {
    rootStat = await lstat(requestedRoot);
  } catch (error) {
    fail("camera-registration-dropbox-root-unavailable", "Configured Dropbox root is unavailable: " + error.message);
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory() ||
      await realpath(requestedRoot) !== requestedRoot) {
    fail("camera-registration-dropbox-root-invalid", "Configured Dropbox root must be a real, non-symlink directory");
  }
  const root = requestedRoot;
  const sidecarFile = await readDropboxFile(frameSet.uri, root, "Registered segmentation sidecar", MAX_JSON_BYTES);
  if (sidecarFile.sha256 !== frameSet.checksum.toLowerCase()) {
    fail("camera-registration-sidecar-checksum-mismatch", "Segmentation sidecar bytes differ from the manifest checksum");
  }
  const sidecar = parseJson(sidecarFile.bytes, "Registered segmentation sidecar");
  const index = parseJson(indexFile.bytes, "Source-frame index");
  const { format, derivation } = validateSourceIndex(index, manifest, frameSet, sidecar, limits.maxFrames);
  const indexDirectory = path.dirname(indexFile.path);
  const directoryStat = await lstat(indexDirectory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory() ||
      await realpath(indexDirectory) !== indexDirectory) {
    fail("camera-registration-source-directory-invalid", "Source-frame index directory must be a real directory");
  }
  const pixelCount = format.width * format.height;
  const decodedBytes = index.frames.length * pixelCount * 6;
  if (pixelCount > limits.maxPixels || decodedBytes > limits.maxDecodedBytes) {
    fail("camera-registration-decoded-work-limit", "Source and mask pixel buffers exceed the configured decoded-byte limit");
  }

  let totalInputBytes = manifestFile.byteLength + indexFile.byteLength + sidecarFile.byteLength;
  if (totalInputBytes > limits.maxTotalInputBytes) {
    fail("camera-registration-input-work-limit", "Camera-registration inputs exceed the configured byte limit");
  }
  const inputPaths = new Set([manifestFile.path, indexFile.path, sidecarFile.path]);
  const maskUris = new Set();
  const frames = [];
  const frameEvidence = [];
  for (let offset = 0; offset < index.frames.length; offset += 1) {
    const indexed = index.frames[offset];
    const segmented = sidecar.frames[offset];
    const sourcePath = path.join(indexDirectory, safeBasename(indexed.file, "Source-frame file"));
    const sourceFile = await readRegularFile(sourcePath, "Source frame " + indexed.frame);
    if (sourceFile.sha256 !== indexed.sha256.toLowerCase()) {
      fail("camera-registration-source-frame-checksum-mismatch", "Source PNG bytes differ from the frame index at frame " + indexed.frame);
    }
    const source = decodeRgbaPng(sourceFile.bytes, { maxPixels: limits.maxPixels, maxBytes: MAX_INPUT_FILE_BYTES });
    if (source.width !== format.width || source.height !== format.height) {
      fail("camera-registration-source-frame-dimensions", "Source PNG dimensions differ at frame " + indexed.frame);
    }
    totalInputBytes += sourceFile.byteLength;
    inputPaths.add(sourceFile.path);

    const decodedMasks = [];
    const maskEvidence = [];
    for (const [mask, label] of [
      [segmented.bodyMask, "Body mask"],
      [segmented.faceMask, "Protected-face mask"]
    ]) {
      if (maskUris.has(mask.uri)) {
        fail("camera-registration-mask-uri-reused", "Segmentation mask URIs must be unique across the frame set");
      }
      maskUris.add(mask.uri);
      const maskFile = await readDropboxFile(mask.uri, root, label + " " + indexed.frame);
      if (maskFile.sha256 !== mask.checksum.toLowerCase()) {
        fail("camera-registration-mask-checksum-mismatch", label + " bytes differ from the registered checksum at frame " + indexed.frame);
      }
      const decoded = decodeBinaryMaskPng(maskFile.bytes, { maxPixels: limits.maxPixels });
      if (decoded.width !== format.width || decoded.height !== format.height) {
        fail("camera-registration-mask-dimensions", label + " dimensions differ at frame " + indexed.frame);
      }
      totalInputBytes += maskFile.byteLength;
      if (totalInputBytes > limits.maxTotalInputBytes) {
        fail("camera-registration-input-work-limit", "Camera-registration inputs exceed the configured byte limit");
      }
      inputPaths.add(maskFile.path);
      decodedMasks.push(decoded);
      maskEvidence.push({ uri: mask.uri, sha256: maskFile.sha256, byteLength: maskFile.byteLength });
    }
    frames.push({
      frame: indexed.frame,
      timeSeconds: indexed.timeSeconds,
      source,
      bodyMask: decodedMasks[0],
      faceMask: decodedMasks[1]
    });
    frameEvidence.push({
      frame: indexed.frame,
      timeSeconds: indexed.timeSeconds,
      sourceFrame: {
        file: indexed.file,
        sha256: sourceFile.sha256,
        byteLength: sourceFile.byteLength
      },
      bodyMask: maskEvidence[0],
      protectedFaceMask: maskEvidence[1]
    });
  }

  const inputPathsForOutput = new Set(inputPaths);
  const output = await resolveOutputPaths(outputPath, inputPathsForOutput);
  const estimatorOptions = {
    ...limits.estimatorOptions,
    maxPixels: limits.maxPixels,
    maxFrames: limits.maxFrames,
    maxMaskSamples: Math.min(
      limits.estimatorOptions.maxMaskSamples ?? 96_000_000,
      limits.maxPixels * limits.maxFrames
    )
  };
  const registration = estimateFixedCameraRegistration(frames, estimatorOptions);
  registration.id = "camera-registration-" +
    sha256(Buffer.from(index.sequenceId, "utf8")).slice(0, 12) + "-" +
    index.firstFrame + "-" + index.lastFrame + "-" + format.width + "x" + format.height;
  registration.fileEvidence = {
    schema: "geehub.camera-registration-file-evidence.v1",
    status: "verified",
    method: "manifest-bound-source-and-mask-png-intake-v1",
    manifest: {
      id: manifest.id,
      revision: manifest.revision,
      file: path.basename(manifestFile.path),
      sha256: manifestFile.sha256
    },
    segmentationFrameSet: {
      id: frameSet.id,
      uri: frameSet.uri,
      sha256: sidecarFile.sha256
    },
    sourceFrameIndex: {
      file: path.basename(indexFile.path),
      sha256: indexFile.sha256,
      sourceAssetId: index.sourceAssetId,
      sourceChecksum: index.sourceChecksum,
      sequenceId: index.sequenceId
    },
    sourceFramesVerifiedAgainstIndex: true,
    maskFilesVerifiedAgainstSidecar: true,
    binaryMaskPixelsDecoded: true,
    sourceFrameDerivationVerified: false,
    anatomicalMaskSemanticsVerified: false,
    frames: frameEvidence
  };
  registration.cameraRegistrationIndependentlyVerified = registration.status === "verified";
  registration.sourceFrameDerivationVerified = false;
  registration.pixelSemanticsVerified = false;
  registration.checksum = cameraRegistrationChecksum(registration);

  const artifactBytes = Buffer.from(JSON.stringify(registration, null, 2) + "\n", "utf8");
  const artifactDigest = sha256(artifactBytes);
  const receipt = {
    schema: "geehub.camera-registration-file-receipt.v1",
    schemaVersion: 1,
    status: "written",
    cameraRegistration: {
      file: path.basename(output.target),
      sha256: artifactDigest,
      checksum: registration.checksum,
      id: registration.id,
      status: registration.status
    },
    inputs: {
      manifest: {
        file: path.basename(manifestFile.path),
        sha256: manifestFile.sha256,
        id: manifest.id,
        revision: manifest.revision
      },
      sourceFrameIndex: {
        file: path.basename(indexFile.path),
        sha256: indexFile.sha256
      },
      segmentationFrameSet: {
        id: frameSet.id,
        uri: frameSet.uri,
        sha256: sidecarFile.sha256
      }
    },
    frameCount: frames.length,
    firstFrame: index.firstFrame,
    lastFrame: index.lastFrame,
    dimensions: { width: format.width, height: format.height },
    totalInputBytes,
    decodedPixelBytes: decodedBytes,
    cameraRegistrationIndependentlyVerified: registration.cameraRegistrationIndependentlyVerified,
    sourceFrameDerivationVerified: false,
    pixelSemanticsVerified: false,
    inputFilesModified: false,
    outputCreatedExclusively: true,
    note: "The camera measurement was made from decoded, digest-checked source and mask PNGs. Source-video derivation was not rerun, and binary mask decoding does not establish anatomical correctness."
  };
  const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
  let artifactOutput;
  let receiptOutput;
  try {
    artifactOutput = await writeExclusive(output.target, artifactBytes);
    receiptOutput = await writeExclusive(output.receipt, receiptBytes);
    const readBack = await readCameraRegistrationArtifact(output.target);
    if (readBack.sha256 !== artifactOutput.sha256 ||
        readBack.registration.checksum !== registration.checksum) {
      fail("camera-registration-artifact-readback", "Persisted camera-registration evidence differs from the measured record");
    }
  } catch (error) {
    if (receiptOutput) await removeIfDigest(output.receipt, receiptOutput.sha256).catch(() => {});
    if (artifactOutput) await removeIfDigest(output.target, artifactOutput.sha256).catch(() => {});
    throw error;
  }
  return {
    ...receipt,
    registration: (await readCameraRegistrationArtifact(output.target)).registration,
    outputPath: output.target,
    receiptPath: output.receipt,
    artifactSha256: artifactOutput.sha256,
    receiptSha256: receiptOutput.sha256
  };
}
