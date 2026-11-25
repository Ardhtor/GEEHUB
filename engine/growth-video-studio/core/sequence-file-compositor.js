/**
 * File-backed sequence compositor. It resolves each registered mask from the
 * segmentation sidecar, delegates pixel work to the single-frame compositor,
 * and publishes one sequence receipt only after every frame has been written.
 */
import { createHash } from "node:crypto";
import {
  lstat, mkdir, open, readFile, realpath, rm, rmdir
} from "node:fs/promises";
import path from "node:path";
import { resolveDropboxUri } from "./bridge-exchange.js";
import { composeGrowthFrameFiles } from "./complete-frame-file-compositor.js";

const MAX_JSON_BYTES = 128 * 1024 * 1024;
const MAX_MASK_BYTES = 32 * 1024 * 1024;
const MAX_FRAMES = 10_000;
const SHA256 = /^[a-f0-9]{64}$/i;

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
    fail("sequence-composite-file-name-invalid", label + " must be a plain file name");
  }
  return value;
}

async function readRegularFile(requestedPath, label, maxBytes) {
  if (typeof requestedPath !== "string" || !requestedPath.trim()) {
    fail("sequence-composite-input-path-invalid", label + " path is required");
  }
  const absolute = path.resolve(requestedPath);
  let before;
  try {
    before = await lstat(absolute);
  } catch (error) {
    fail("sequence-composite-input-unavailable", label + " is unavailable: " + error.message);
  }
  if (before.isSymbolicLink() || !before.isFile() || before.size > maxBytes) {
    fail("sequence-composite-input-invalid", label + " must be a bounded regular file, not a symlink");
  }
  const actualPath = await realpath(absolute);
  const actualBefore = await lstat(actualPath);
  if (actualBefore.isSymbolicLink() || !actualBefore.isFile() ||
      actualBefore.dev !== before.dev || actualBefore.ino !== before.ino) {
    fail("sequence-composite-input-changed", label + " changed identity while being opened");
  }
  const bytes = await readFile(actualPath);
  const after = await lstat(actualPath);
  if (after.isSymbolicLink() || !after.isFile() ||
      after.dev !== actualBefore.dev || after.ino !== actualBefore.ino ||
      after.size !== actualBefore.size || after.mtimeMs !== actualBefore.mtimeMs ||
      after.ctimeMs !== actualBefore.ctimeMs || bytes.length !== after.size) {
    fail("sequence-composite-input-changed", label + " changed while being read");
  }
  return {
    path: actualPath,
    bytes,
    sha256: sha256(bytes),
    byteLength: bytes.length
  };
}

async function readDropboxFile(uri, root, label) {
  let target;
  try {
    target = resolveDropboxUri(uri, root);
  } catch (error) {
    fail("sequence-composite-mask-uri-invalid", label + " has an unsafe Dropbox URI: " + error.message);
  }
  if (!within(root, target)) {
    fail("sequence-composite-mask-path-invalid", label + " escapes the configured Dropbox root");
  }
  let current = root;
  for (const segment of path.relative(root, target).split(path.sep)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      fail("sequence-composite-mask-unavailable", label + " is unavailable: " + error.message);
    }
    if (stat.isSymbolicLink()) {
      fail("sequence-composite-mask-symlink", label + " path contains a symlink");
    }
    if (current !== target && !stat.isDirectory()) {
      fail("sequence-composite-mask-parent-invalid", label + " path contains a non-directory parent");
    }
    if (current === target && !stat.isFile()) {
      fail("sequence-composite-mask-invalid", label + " must be a regular file");
    }
  }
  return readRegularFile(target, label, MAX_MASK_BYTES);
}

function parseJson(file, label) {
  try {
    return JSON.parse(file.bytes.toString("utf8"));
  } catch (error) {
    fail("sequence-composite-json-invalid", label + " is not valid JSON: " + error.message);
  }
}

function validateSequenceDocuments(index, batch, segmentation, indexFile, batchFile, segmentationFile) {
  if (index?.schema !== "geehub.source-frame-index" || index.schemaVersion !== 1 ||
      typeof index.sourceAssetId !== "string" || !index.sourceAssetId ||
      typeof index.sequenceId !== "string" || !index.sequenceId ||
      !SHA256.test(index.sourceChecksum || "") ||
      !Number.isSafeInteger(index.firstFrame) || !Number.isSafeInteger(index.lastFrame) ||
      index.firstFrame < 0 || index.lastFrame < index.firstFrame ||
      !Array.isArray(index.frames) || index.frames.length < 1 ||
      index.frames.length > MAX_FRAMES || !index.format ||
      index.format.frameCount !== index.frames.length ||
      index.lastFrame - index.firstFrame + 1 !== index.frames.length ||
      !Number.isSafeInteger(index.format.width) || index.format.width < 1 ||
      !Number.isSafeInteger(index.format.height) || index.format.height < 1 ||
      !Number.isFinite(index.format.fps) || index.format.fps <= 0) {
    fail("sequence-composite-source-index-invalid", "A complete version-one source-frame index is required");
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
    fail("sequence-composite-batch-invalid", "A complete, source-bound body-layer batch is required");
  }
  const derivation = batch.sourceFrameDerivationVerification;
  if (derivation?.schema !== "geehub.source-frame-derivation-verification.v1" ||
      derivation.status !== "verified" ||
      derivation.sourceChecksum !== index.sourceChecksum ||
      derivation.extractedFrameCount !== index.frames.length ||
      derivation.pixelMatchedFrameCount !== index.frames.length) {
    fail("sequence-composite-source-derivation-invalid", "Batch receipt lacks complete independent source-frame pixel verification");
  }

  const registered = batch.registeredSidecars?.segmentation;
  if (!registered || registered.frameSetId !== "frame-sequence-" + index.sequenceId + "-segmentation" ||
      registered.checksum !== segmentationFile.sha256) {
    fail("sequence-composite-segmentation-lineage", "Segmentation sidecar does not match the batch's registered frame-set digest");
  }
  if (segmentation?.schema !== "geehub.frame-set-evidence" ||
      segmentation.schemaVersion !== 1 || segmentation.role !== "segmentation" ||
      segmentation.sourceAssetId !== index.sourceAssetId ||
      segmentation.sequenceId !== index.sequenceId ||
      segmentation.firstFrame !== index.firstFrame ||
      segmentation.lastFrame !== index.lastFrame ||
      segmentation.frameCount !== index.frames.length ||
      segmentation.width !== index.format.width ||
      segmentation.height !== index.format.height ||
      segmentation.fps !== index.format.fps ||
      segmentation.pixelSemanticsVerified !== false ||
      !Array.isArray(segmentation.frames) ||
      segmentation.frames.length !== index.frames.length) {
    fail("sequence-composite-segmentation-invalid", "Segmentation sidecar does not match the indexed source sequence");
  }

  const maskUris = new Set();
  const frames = [];
  let previousTime = -Infinity;
  for (let offset = 0; offset < index.frames.length; offset += 1) {
    const indexed = index.frames[offset];
    const batched = batch.frames[offset];
    const segmented = segmentation.frames[offset];
    if (indexed?.frame !== index.firstFrame + offset ||
        !Number.isFinite(indexed.timeSeconds) || indexed.timeSeconds < 0 ||
        indexed.timeSeconds <= previousTime ||
        typeof indexed.file !== "string" ||
        safeBasename(indexed.file, "Source frame") !== indexed.file ||
        !SHA256.test(indexed.sha256 || "") ||
        batched?.frame !== indexed.frame ||
        batched.timeSeconds !== indexed.timeSeconds ||
        batched.sourceFrame?.file !== indexed.file ||
        batched.sourceFrame?.sha256 !== indexed.sha256 ||
        segmented?.frame !== indexed.frame ||
        segmented.timeSeconds !== indexed.timeSeconds) {
      fail("sequence-composite-frame-lineage", "Source, batch, and segmentation evidence differ at frame " + indexed.frame);
    }
    const bodyMask = segmented.bodyMask;
    const faceMask = segmented.faceMask;
    if (!bodyMask || typeof bodyMask.uri !== "string" ||
        !SHA256.test(bodyMask.checksum || "") || bodyMask.excludesFace !== true ||
        !faceMask || typeof faceMask.uri !== "string" ||
        !SHA256.test(faceMask.checksum || "") || faceMask.protectsIdentity !== true ||
        batched.bodyMaskSha256 !== bodyMask.checksum ||
        batched.protectedFaceMaskSha256 !== faceMask.checksum) {
      fail("sequence-composite-mask-lineage", "Registered body and protected-face masks differ at frame " + indexed.frame);
    }
    for (const uri of [bodyMask.uri, faceMask.uri]) {
      if (maskUris.has(uri)) {
        fail("sequence-composite-mask-duplicate", "Mask URIs must be unique across the sequence");
      }
      maskUris.add(uri);
    }
    const bodyOutput = safeBasename(batched.output?.file, "Body-layer output");
    const bodyReceipt = safeBasename(batched.receipt?.file, "Body-layer receipt");
    if (!SHA256.test(batched.output?.sha256 || "") ||
        !Number.isSafeInteger(batched.output?.byteLength) || batched.output.byteLength < 1 ||
        !SHA256.test(batched.receipt?.sha256 || "")) {
      fail("sequence-composite-batch-output-invalid", "Batch output records are incomplete at frame " + indexed.frame);
    }
    frames.push({
      indexed,
      batched,
      segmented,
      bodyOutput,
      bodyReceipt
    });
    previousTime = indexed.timeSeconds;
  }
  return { frames };
}

async function resolveNewOutputDirectory(requestedPath, protectedRoots) {
  if (typeof requestedPath !== "string" || !requestedPath.trim()) {
    fail("sequence-composite-output-path-invalid", "A new output directory is required");
  }
  const absolute = path.resolve(requestedPath);
  const name = path.basename(absolute);
  if (!name || name === "." || name === "..") {
    fail("sequence-composite-output-path-invalid", "Output path must name a directory");
  }
  const parentPath = path.dirname(absolute);
  let parentStat;
  try {
    parentStat = await lstat(parentPath);
  } catch (error) {
    fail("sequence-composite-output-parent-invalid", "Output parent must already exist: " + error.message);
  }
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
    fail("sequence-composite-output-parent-invalid", "Output parent must be an existing real directory");
  }
  const parent = await realpath(parentPath);
  if (parent !== parentPath) {
    fail("sequence-composite-output-parent-invalid", "Output parent path must not traverse symlinks");
  }
  const target = path.join(parent, name);
  if (protectedRoots.some(root => target === root || within(root, target))) {
    fail("sequence-composite-output-collision", "Output directory must not be inside a source or evidence directory");
  }
  try {
    await lstat(target);
    fail("sequence-composite-output-exists", "Output directory must be new");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return target;
}

async function assertOutputDirectory(directory, identity) {
  const current = await lstat(directory);
  if (current.isSymbolicLink() || !current.isDirectory() ||
      current.dev !== identity.dev || current.ino !== identity.ino ||
      await realpath(directory) !== directory) {
    fail("sequence-composite-output-directory-changed", "Output directory changed identity during composition");
  }
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
      fail("sequence-composite-receipt-identity", "Sequence receipt changed identity before read-back");
    }
    const actual = await readFile(filePath);
    const after = await lstat(filePath);
    if (after.isSymbolicLink() || !after.isFile() ||
        after.dev !== identity.dev || after.ino !== identity.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs || !actual.equals(Buffer.from(bytes))) {
      fail("sequence-composite-receipt-readback", "Sequence receipt failed byte-for-byte read-back");
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
 * Compose every indexed frame using the registered segmentation sidecar.
 * The new directory contains frame PNGs and receipts plus one sequence receipt.
 * Processing is all-or-nothing at the directory level; partial frames are
 * retained only when every frame was successfully processed and accounted for.
 */
export async function composeGrowthFrameSequenceFiles({
  batchReceiptPath,
  sourceFrameIndexPath,
  segmentationSidecarPath,
  scenePlateDirectory,
  outputDirectory,
  dropboxRoot
} = {}) {
  const [batchFile, indexFile, segmentationFile] = await Promise.all([
    readRegularFile(batchReceiptPath, "Batch sequence receipt", MAX_JSON_BYTES),
    readRegularFile(sourceFrameIndexPath, "Source-frame index", MAX_JSON_BYTES),
    readRegularFile(segmentationSidecarPath, "Registered segmentation sidecar", MAX_JSON_BYTES)
  ]);
  const batch = parseJson(batchFile, "Batch sequence receipt");
  const index = parseJson(indexFile, "Source-frame index");
  const segmentation = parseJson(segmentationFile, "Registered segmentation sidecar");
  const { frames } = validateSequenceDocuments(
    index, batch, segmentation, indexFile, batchFile, segmentationFile
  );

  const requestedRoot = path.resolve(dropboxRoot);
  let rootStat;
  try {
    rootStat = await lstat(requestedRoot);
  } catch (error) {
    fail("sequence-composite-dropbox-root-unavailable", "Configured Dropbox root is unavailable: " + error.message);
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    fail("sequence-composite-dropbox-root-invalid", "Configured Dropbox root must be a real directory");
  }
  const root = await realpath(requestedRoot);
  if (root !== requestedRoot) {
    fail("sequence-composite-dropbox-root-invalid", "Configured Dropbox root path must not traverse symlinks");
  }
  const sourceDirectory = await realpath(path.dirname(indexFile.path));
  const batchDirectory = await realpath(path.dirname(batchFile.path));
  const requestedSceneDirectory = path.resolve(scenePlateDirectory);
  const sceneStat = await lstat(requestedSceneDirectory);
  if (sceneStat.isSymbolicLink() || !sceneStat.isDirectory()) {
    fail("sequence-composite-scene-directory-invalid", "Scene-plate path must be a real directory");
  }
  const sceneDirectory = await realpath(requestedSceneDirectory);
  if (sceneDirectory !== requestedSceneDirectory) {
    fail("sequence-composite-scene-directory-invalid", "Scene-plate path must not traverse symlinks");
  }
  const segmentationDirectory = path.dirname(segmentationFile.path);
  const protectedRoots = [
    root, sourceDirectory, batchDirectory, sceneDirectory, segmentationDirectory
  ];

  // Verify every registered mask before creating any output.
  for (const item of frames) {
    const body = await readDropboxFile(item.segmented.bodyMask.uri, root, "Body mask " + item.indexed.frame);
    const face = await readDropboxFile(item.segmented.faceMask.uri, root, "Protected-face mask " + item.indexed.frame);
    if (body.sha256 !== item.segmented.bodyMask.checksum.toLowerCase() ||
        face.sha256 !== item.segmented.faceMask.checksum.toLowerCase()) {
      fail("sequence-composite-mask-digest-mismatch", "Registered mask bytes changed at frame " + item.indexed.frame);
    }
  }

  const targetDirectory = await resolveNewOutputDirectory(outputDirectory, protectedRoots);
  await mkdir(targetDirectory);
  const directoryStat = await lstat(targetDirectory);
  const directoryIdentity = { dev: directoryStat.dev, ino: directoryStat.ino };
  const created = [];
  const results = [];
  try {
    for (const item of frames) {
      await assertOutputDirectory(targetDirectory, directoryIdentity);
      const frameName = "frame-" + String(item.indexed.frame).padStart(9, "0") + ".png";
      const frameOutputPath = path.join(targetDirectory, frameName);
      const result = await composeGrowthFrameFiles({
        sourcePath: path.join(sourceDirectory, item.indexed.file),
        bodyMaskPath: resolveDropboxUri(item.segmented.bodyMask.uri, root),
        protectedFaceMaskPath: resolveDropboxUri(item.segmented.faceMask.uri, root),
        bodyLayerPath: path.join(batchDirectory, item.bodyOutput),
        batchReceiptPath: batchFile.path,
        sourceFrameIndexPath: indexFile.path,
        scenePlateDirectory: sceneDirectory,
        outputPath: frameOutputPath
      });
      created.push(
        { path: result.outputPath, sha256: result.output.sha256 },
        { path: result.receiptPath, sha256: result.receiptSha256 }
      );
      results.push(result);
    }

    await assertOutputDirectory(targetDirectory, directoryIdentity);
    const countKeys = [
      "sourcePixels",
      "reconstructedBackgroundPixels",
      "transformedBodyPixels",
      "protectedFacePixels",
      "unresolvedPixels"
    ];
    const totals = Object.fromEntries(countKeys.map(key => [
      key,
      results.reduce((sum, item) => sum + item.counts[key], 0)
    ]));
    const readyForAssembly = results.every(item => item.readyForAssembly);
    const receipt = {
      schema: "geehub.composited-growth-frame-sequence-receipt.v1",
      schemaVersion: 1,
      status: "complete",
      compositionStatus: readyForAssembly ? "complete-sequence" : "partial-sequence",
      sourceAssetId: index.sourceAssetId,
      sourceChecksum: index.sourceChecksum,
      sequenceId: index.sequenceId,
      sourceFrameIndex: { file: path.basename(indexFile.path), sha256: indexFile.sha256 },
      batchReceipt: { file: path.basename(batchFile.path), sha256: batchFile.sha256 },
      segmentationSidecar: {
        file: path.basename(segmentationFile.path),
        sha256: segmentationFile.sha256,
        frameSetId: batch.registeredSidecars.segmentation.frameSetId
      },
      scenePlateReceiptSha256: results[0].scenePlate.receiptSha256,
      firstFrame: index.firstFrame,
      lastFrame: index.lastFrame,
      frameCount: results.length,
      allFramesAccountedFor: results.length === index.frames.length,
      frames: results.map(item => ({
        frame: item.frame,
        timeSeconds: item.timeSeconds,
        file: path.basename(item.outputPath),
        sha256: item.output.sha256,
        byteLength: item.output.byteLength,
        receiptFile: path.basename(item.receiptPath),
        receiptSha256: item.receiptSha256,
        compositionStatus: item.compositionStatus,
        readyForAssembly: item.readyForAssembly,
        counts: item.counts
      })),
      counts: totals,
      readyForAssembly,
      readyForExport: false,
      sourceFrameDerivationVerified: true,
      sourceFramePixelsRevalidated: true,
      sourceDerivationVerificationInheritedFromBatchReceipt: true,
      cameraRegistrationIndependentlyVerified: false,
      pixelSemanticsVerified: false,
      protectedFacePixelsPreserved: true,
      unresolvedPixelsExplicit: true,
      inputFilesModified: false,
      outputCreatedExclusively: true,
      note: "All indexed frames were composed and accounted for. Partial frames remain explicitly marked and prevent sequence assembly. Source derivation is inherited from the exact independently verified batch receipt; camera registration and anatomical mask semantics remain unverified. This PNG sequence is not ready for video export."
    };
    const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
    const receiptPath = path.join(targetDirectory, "sequence.receipt.json");
    const receiptOutput = await writeExclusive(receiptPath, receiptBytes);
    return {
      ...receipt,
      outputDirectory: targetDirectory,
      receiptPath,
      receiptSha256: receiptOutput.sha256
    };
  } catch (error) {
    for (const item of created.reverse()) {
      await removeIfDigest(item.path, item.sha256).catch(() => {});
    }
    try {
      const current = await lstat(targetDirectory);
      if (!current.isSymbolicLink() && current.isDirectory() &&
          current.dev === directoryIdentity.dev && current.ino === directoryIdentity.ino) {
        await rmdir(targetDirectory);
      }
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT" && cleanupError.code !== "ENOTEMPTY") throw cleanupError;
    }
    throw error;
  }
}
