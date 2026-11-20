/**
 * Render a complete registered frame sequence into immutable transparent body
 * layers. The batch is published only after every source frame, mask, plan,
 * and output receipt has been accounted for.
 */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import {
  lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, rmdir
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { promisify } from "node:util";
import { decodeRgbaPng } from "./rgba-png.js";
import { resolveDropboxUri } from "./bridge-exchange.js";
import { validateBridgeManifest } from "./bridge-manifest.js";
import { renderGrowthFrameFiles } from "./frame-file-renderer.js";

const MAX_JSON_BYTES = 128 * 1024 * 1024;
const MAX_SOURCE_FRAME_BYTES = 128 * 1024 * 1024;
const MAX_MASK_BYTES = 32 * 1024 * 1024;
const MAX_SIDECAR_BYTES = 128 * 1024 * 1024;
const MAX_FRAMES = 10000;
const MAX_PROBE_BYTES = 128 * 1024 * 1024;
const MAX_PROBE_FRAMES = MAX_FRAMES * 20;
const execFileAsync = promisify(execFile);
const sha256 = value => createHash("sha256").update(value).digest("hex");
const isSha256 = value => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." &&
    !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

async function readRegularFile(filePath, label, maxBytes) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    fail("batch-input-path-invalid", label + " path must be a non-empty string");
  }
  const requested = path.resolve(filePath);
  const name = path.basename(requested);
  if (!name || name === "." || name === "..") {
    fail("batch-input-path-invalid", label + " path must identify a file");
  }
  const parent = await realpath(path.dirname(requested));
  const target = path.join(parent, name);
  const beforePath = await lstat(target);
  if (beforePath.isSymbolicLink() || !beforePath.isFile()) {
    fail("batch-input-not-regular", label + " must be a regular file, not a symlink");
  }

  let handle;
  try {
    handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = await handle.stat();
    if (!before.isFile() || before.size > maxBytes ||
        before.dev !== beforePath.dev || before.ino !== beforePath.ino) {
      fail("batch-input-too-large-or-changed", label + " is not a stable regular file within its byte limit");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.length !== after.size || before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      fail("batch-input-changed", label + " changed while it was being read");
    }
    return { path: target, bytes, sha256: sha256(bytes) };
  } finally {
    if (handle) await handle.close();
  }
}

async function readDropboxFile(uri, root, label, maxBytes) {
  let target;
  try {
    target = resolveDropboxUri(uri, root);
  } catch (error) {
    fail("batch-dropbox-uri-invalid", label + " has an unsafe Dropbox URI: " + error.message);
  }
  const relative = path.relative(root, target);
  if (!within(root, target) || !relative) {
    fail("batch-dropbox-path-invalid", label + " does not resolve below the configured Dropbox root");
  }
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    const entry = await lstat(current);
    if (entry.isSymbolicLink()) {
      fail("batch-dropbox-symlink", label + " path contains a symlink: " + current);
    }
    if (current !== target && !entry.isDirectory()) {
      fail("batch-dropbox-parent-invalid", label + " path contains a non-directory parent");
    }
  }
  return readRegularFile(target, label, maxBytes);
}

async function readJsonFile(filePath, label, maxBytes = MAX_JSON_BYTES) {
  const file = await readRegularFile(filePath, label, maxBytes);
  let document;
  try {
    document = JSON.parse(file.bytes.toString("utf8"));
  } catch (error) {
    fail("batch-json-invalid", label + " is not valid JSON: " + error.message);
  }
  return { ...file, document };
}

function assertRange(document, frameSet, label) {
  for (const field of ["firstFrame", "lastFrame", "frameCount", "width", "height", "fps"]) {
    if (document[field] !== frameSet[field]) {
      fail("batch-evidence-range-mismatch", label + " disagrees with its registered frame set on " + field);
    }
  }
}

function getFrameSet(manifest, id, role) {
  const matches = manifest.frameSets.filter(item => item.id === id && item.role === role);
  if (matches.length !== 1) {
    fail("batch-frame-set-missing", "Render evidence must resolve exactly one " + role + " frame set");
  }
  return matches[0];
}

function validateJobAndEvidence(manifest, job, planBundle) {
  const validation = validateBridgeManifest(manifest);
  if (!validation.valid) {
    fail("batch-manifest-invalid", validation.errors.join("; "));
  }
  if (job?.schema !== "geehub.growth-render-job" || job.schemaVersion !== 1 ||
      job.status !== "ready-for-renderer" || !job.source ||
      !Array.isArray(job.growthStates) || job.growthStates.length < 2 ||
      job.growthStates.some(state => typeof state?.id !== "string" || !state.id.trim()) ||
      !Array.isArray(job.landmarkFrames) || !job.output) {
    fail("batch-render-job-invalid", "A ready version-one GEEHUB growth render job is required");
  }
  if (planBundle?.schema !== "geehub.render-plan-bundle" ||
      planBundle.schemaVersion !== 1 || planBundle.status !== "ready-for-render" ||
      planBundle.sourceAssetId !== manifest.source.id ||
      typeof planBundle.jobId !== "string" || !planBundle.jobId.trim()) {
    fail("batch-plan-bundle-invalid", "A ready, source-bound deformation plan bundle is required");
  }
  const jobRecord = manifest.renderJobs.find(item => item.id === planBundle.jobId);
  if (!jobRecord || jobRecord.status !== "queued" ||
      jobRecord.sourceAssetId !== manifest.source.id ||
      jobRecord.jobSchema !== job.schema || jobRecord.jobSchemaVersion !== job.schemaVersion) {
    fail("batch-job-not-queued", "The plan bundle must identify a queued job in the supplied manifest");
  }
  const source = manifest.source;
  for (const field of ["id", "name", "uri", "width", "height", "duration", "checksum"]) {
    if (job.source[field] !== source[field]) {
      fail("batch-source-mismatch", "Portable render job disagrees with immutable source on " + field);
    }
  }
  if (source.immutable !== true || !isSha256(source.checksum)) {
    fail("batch-source-checksum-required", "Batch rendering requires an immutable source with a registered SHA-256 checksum");
  }
  if (!isDeepStrictEqual(job.output, jobRecord.output)) {
    fail("batch-job-output-mismatch", "Queued manifest output format differs from the portable job");
  }

  const evidence = job.frameEvidence;
  if (evidence?.schema !== "geehub.render-frame-evidence" || evidence.schemaVersion !== 1 ||
      evidence.pixelDataVerified !== true || evidence.faceExclusionVerified !== true ||
      evidence.pixelSemanticsVerified !== false ||
      !isDeepStrictEqual(evidence, planBundle.frameEvidence)) {
    fail("batch-frame-evidence-mismatch", "Job and plan bundle must carry the same verified mask/mesh evidence");
  }
  const segmentation = getFrameSet(manifest, evidence.segmentationFrameSetId, "segmentation");
  const landmarks = getFrameSet(manifest, evidence.landmarksFrameSetId, "landmarks");
  const deformation = getFrameSet(manifest, evidence.deformationFrameSetId, "deformation");
  const expectedIds = [segmentation.id, landmarks.id, deformation.id];
  if (!isDeepStrictEqual(jobRecord.inputFrameSetIds, expectedIds)) {
    fail("batch-job-inputs-mismatch", "Queued job inputs must name segmentation, landmarks, and deformation in order");
  }
  if (segmentation.sourceAssetId !== source.id || landmarks.sourceAssetId !== source.id ||
      deformation.sourceAssetId !== source.id ||
      segmentation.metadata?.sequenceId !== planBundle.sequenceId ||
      landmarks.metadata?.sequenceId !== planBundle.sequenceId ||
      deformation.metadata?.sequenceId !== planBundle.sequenceId) {
    fail("batch-frame-set-lineage-mismatch", "Registered frame sets do not share the plan bundle source and sequence");
  }
  for (const field of ["firstFrame", "lastFrame", "frameCount", "width", "height", "fps"]) {
    if (segmentation[field] !== landmarks[field] || segmentation[field] !== deformation[field] ||
        evidence[field] !== segmentation[field]) {
      fail("batch-frame-set-range-mismatch", "Registered frame sets or job evidence disagree on " + field);
    }
  }
  if (!isSha256(segmentation.checksum) || !isSha256(landmarks.checksum) ||
      !isSha256(deformation.checksum) ||
      evidence.segmentationChecksum !== segmentation.checksum ||
      evidence.landmarksChecksum !== landmarks.checksum ||
      evidence.deformationChecksum !== deformation.checksum ||
      evidence.topologyId !== deformation.metadata?.topologyId ||
      evidence.vertexCount !== deformation.metadata?.vertexCount ||
      evidence.triangleCount !== deformation.metadata?.triangleCount ||
      deformation.metadata?.evidenceSchema !== "geehub.mask-mesh-evidence.v1") {
    fail("batch-frame-set-checksum-mismatch", "Job evidence does not bind the registered mask-mesh revision");
  }
  if (jobRecord.outputUri === source.uri || !jobRecord.jobUri || !jobRecord.outputUri) {
    fail("batch-job-uri-invalid", "Queued job and output URIs are incomplete or collide with the source");
  }
  return { jobRecord, segmentation, landmarks, deformation, evidence };
}

function validateSegmentationDocument(document, frameSet, sourceAssetId) {
  if (document?.schema !== "geehub.frame-set-evidence" || document.schemaVersion !== 1 ||
      document.role !== "segmentation" || document.sourceAssetId !== sourceAssetId ||
      document.sequenceId !== frameSet.metadata.sequenceId ||
      document.pixelSemanticsVerified !== false) {
    fail("batch-segmentation-sidecar-invalid", "Registered segmentation sidecar schema or lineage is invalid");
  }
  assertRange(document, frameSet, "Segmentation sidecar");
  if (!Array.isArray(document.frames) || document.frames.length !== frameSet.frameCount) {
    fail("batch-segmentation-frame-count", "Segmentation sidecar does not cover the registered frame range");
  }
  let previousTime = -Infinity;
  const maskUris = new Set();
  document.frames.forEach((frame, index) => {
    if (frame?.frame !== frameSet.firstFrame + index ||
        !Number.isFinite(frame.timeSeconds) || frame.timeSeconds <= previousTime) {
      fail("batch-segmentation-frame-order", "Segmentation frames must be contiguous and strictly timestamped");
    }
    previousTime = frame.timeSeconds;
    for (const [key, role] of [["bodyMask", "body"], ["faceMask", "face"]]) {
      const mask = frame[key];
      if (!mask || typeof mask.uri !== "string" ||
          !mask.uri.startsWith("dropbox://GEEHUB/") || !isSha256(mask.checksum) ||
          (role === "body" ? mask.excludesFace !== true : mask.protectsIdentity !== true)) {
        fail("batch-mask-reference-invalid", "Frame " + frame.frame + " lacks a valid " + role + " mask reference");
      }
      if (maskUris.has(mask.uri)) {
        fail("batch-mask-uri-duplicate", "Mask URIs must be unique across the registered sequence");
      }
      maskUris.add(mask.uri);
    }
  });
}

function validateLandmarksDocument(document, frameSet, sourceAssetId, segmentationDocument) {
  if (document?.schema !== "geehub.frame-set-evidence" || document.schemaVersion !== 1 ||
      document.role !== "landmarks" || document.sourceAssetId !== sourceAssetId ||
      document.sequenceId !== frameSet.metadata.sequenceId) {
    fail("batch-landmarks-sidecar-invalid", "Registered landmark sidecar schema or lineage is invalid");
  }
  assertRange(document, frameSet, "Landmark sidecar");
  if (!Array.isArray(document.frames) || document.frames.length !== frameSet.frameCount) {
    fail("batch-landmarks-frame-count", "Landmark sidecar does not cover the registered frame range");
  }
  let previousTime = -Infinity;
  document.frames.forEach((frame, index) => {
    const segmentationFrame = segmentationDocument.frames[index];
    if (frame?.frame !== frameSet.firstFrame + index ||
        frame.frame !== segmentationFrame.frame ||
        !Number.isFinite(frame.timeSeconds) ||
        Math.abs(frame.timeSeconds - segmentationFrame.timeSeconds) > 0.000001 ||
        frame.timeSeconds <= previousTime ||
        !Number.isFinite(frame.identityConfidence) || frame.identityConfidence < 0 ||
        frame.identityConfidence > 1 || !Number.isFinite(frame.poseConfidence) ||
        frame.poseConfidence < 0 || frame.poseConfidence > 1 ||
        !frame.landmarks || typeof frame.landmarks !== "object") {
      fail("batch-landmarks-frame-invalid", "Landmark observations are incomplete or misaligned");
    }
    previousTime = frame.timeSeconds;
  });
}

function validateDeformationDocument(document, frameSet, sourceAssetId, segmentationDocument) {
  if (document?.schema !== "geehub.mask-mesh-evidence" || document.schemaVersion !== 1 ||
      document.role !== "deformation" || document.sourceAssetId !== sourceAssetId ||
      document.sequenceId !== frameSet.metadata.sequenceId ||
      document.pixelSemanticsVerified !== false) {
    fail("batch-deformation-sidecar-invalid", "Registered deformation sidecar schema or lineage is invalid");
  }
  assertRange(document, frameSet, "Deformation sidecar");
  if (!/^[a-f0-9]{64}$/i.test(document.topologyId || "") ||
      !document.grid || typeof document.grid !== "object" || Array.isArray(document.grid) ||
      !Number.isInteger(document.grid.columns) || document.grid.columns < 2 ||
      !Number.isInteger(document.grid.rows) || document.grid.rows < 2 ||
      document.grid.vertexCount !== (document.grid.columns + 1) * (document.grid.rows + 1) ||
      !Array.isArray(document.vertexIds) || document.vertexIds.length !== document.grid.vertexCount ||
      new Set(document.vertexIds).size !== document.vertexIds.length ||
      !Array.isArray(document.triangleIds) || !document.triangleIds.length ||
      new Set(document.triangleIds).size !== document.triangleIds.length ||
      !Array.isArray(document.triangles) || document.triangles.length !== document.triangleIds.length ||
      !Array.isArray(document.usedVertexIds) || !document.usedVertexIds.length ||
      new Set(document.usedVertexIds).size !== document.usedVertexIds.length) {
    fail("batch-deformation-topology-invalid", "Registered deformation topology is incomplete");
  }
  const topology = {
    columns: document.grid.columns,
    rows: document.grid.rows,
    vertexIds: document.vertexIds,
    triangleIds: document.triangleIds,
    triangles: document.triangles
  };
  if (sha256(Buffer.from(JSON.stringify(topology))).toLowerCase() !== document.topologyId.toLowerCase()) {
    fail("batch-deformation-topology-digest", "Registered deformation topology digest does not match its identities");
  }
  document.triangles.forEach(triangle => {
    if (!Array.isArray(triangle) || triangle.length !== 3 ||
        new Set(triangle).size !== 3 ||
        triangle.some(index => !Number.isInteger(index) || index < 0 || index >= document.vertexIds.length)) {
      fail("batch-deformation-triangle-invalid", "Registered deformation sidecar contains an invalid triangle");
    }
  });
  const expectedUsedVertexIds = [...new Set(document.triangles.flat())]
    .sort((a, b) => a - b).map(index => document.vertexIds[index]);
  if (!isDeepStrictEqual(document.usedVertexIds, expectedUsedVertexIds)) {
    fail("batch-deformation-used-vertices-invalid", "Registered used-vertex inventory disagrees with triangle connectivity");
  }
  if (!Array.isArray(document.frames) || document.frames.length !== frameSet.frameCount) {
    fail("batch-deformation-frame-count", "Registered deformation sidecar does not cover every frame");
  }
  document.frames.forEach((frame, index) => {
    const segmentationFrame = segmentationDocument.frames[index];
    if (frame?.frame !== segmentationFrame.frame || frame.timeSeconds !== segmentationFrame.timeSeconds ||
        !Array.isArray(frame.sourcePoints) || frame.sourcePoints.length !== document.vertexIds.length ||
        frame.sourcePoints.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y) ||
          point.x < 0 || point.x >= frameSet.width || point.y < 0 || point.y >= frameSet.height)) {
      fail("batch-deformation-frame-invalid", "Registered mesh coordinates are incomplete or misaligned");
    }
  });
}

function validateSourceFrameIndex(index, source, segmentationFrameSet, segmentationDocument) {
  if (index?.schema !== "geehub.source-frame-index" || index.schemaVersion !== 1 ||
      index.sourceAssetId !== source.id ||
      String(index.sourceChecksum || "").toLowerCase() !== String(source.checksum || "").toLowerCase() ||
      index.sequenceId !== segmentationFrameSet.metadata.sequenceId ||
      index.firstFrame !== segmentationFrameSet.firstFrame ||
      index.lastFrame !== segmentationFrameSet.lastFrame ||
      index.format?.width !== segmentationFrameSet.width ||
      index.format?.height !== segmentationFrameSet.height ||
      index.format?.fps !== segmentationFrameSet.fps ||
      index.format?.frameCount !== segmentationFrameSet.frameCount ||
      !Array.isArray(index.frames) || index.frames.length !== segmentationFrameSet.frameCount ||
      index.frames.length > MAX_FRAMES) {
    fail("batch-source-frame-index-invalid", "Source-frame index does not match the immutable source and registered sequence");
  }
  const derivation = index.derivation;
  const probedRate = parseRate(derivation?.avgFrameRate);
  if (derivation?.schema !== "geehub.source-frame-extraction" ||
      derivation.schemaVersion !== 1 ||
      derivation.method !== "ffmpeg-image2-png" ||
      derivation.sourceUri !== source.uri ||
      derivation.sourceChecksum !== source.checksum ||
      !Number.isInteger(derivation.streamIndex) || derivation.streamIndex < 0 ||
      !Number.isFinite(probedRate) || Math.abs(probedRate - segmentationFrameSet.fps) > 0.0001 ||
      !["best_effort_timestamp_time", "pkt_pts_time"].includes(derivation.timestampBasis) ||
      !Number.isFinite(derivation.timestampOriginSeconds) ||
      !Number.isFinite(derivation.timestampToleranceSeconds) ||
      derivation.timestampToleranceSeconds <= 0 ||
      derivation.timestampToleranceSeconds >= 0.5 / segmentationFrameSet.fps ||
      !Number.isInteger(derivation.probedFrameCount) ||
      derivation.probedFrameCount <= segmentationFrameSet.lastFrame ||
      derivation.probedFrameCount > MAX_PROBE_FRAMES ||
      derivation.extractedFrameCount !== segmentationFrameSet.frameCount ||
      typeof derivation.ffmpegVersion !== "string" || !derivation.ffmpegVersion.trim() ||
      typeof derivation.ffprobeVersion !== "string" || !derivation.ffprobeVersion.trim() ||
      derivation.sourceUnchangedAfterExtraction !== true) {
    fail("batch-source-frame-derivation-invalid", "Source-frame index lacks a complete source-bound FFmpeg extraction record");
  }
  const files = new Set();
  let previousSourceTimestamp = -Infinity;
  index.frames.forEach((frame, offset) => {
    const expected = segmentationDocument.frames[offset];
    if (frame?.frame !== segmentationFrameSet.firstFrame + offset ||
        frame.frame !== expected.frame ||
        !Number.isFinite(frame.timeSeconds) ||
        Math.abs(frame.timeSeconds - expected.timeSeconds) > 0.000001 ||
        !Number.isFinite(frame.sourceTimestampSeconds) ||
        frame.sourceTimestampSeconds <= previousSourceTimestamp ||
        !Number.isFinite(frame.sourceTimeFromOriginSeconds) ||
        Math.abs(frame.sourceTimestampSeconds - derivation.timestampOriginSeconds -
          frame.sourceTimeFromOriginSeconds) > 0.000001 ||
        Math.abs(frame.sourceTimeFromOriginSeconds - frame.timeSeconds) >
          derivation.timestampToleranceSeconds ||
        typeof frame.file !== "string" || frame.file !== path.basename(frame.file) ||
        frame.file === "." || frame.file === ".." ||
        frame.file.includes("/") || frame.file.includes("\\") || frame.file.includes("\0") ||
        !/\.png$/i.test(frame.file) || files.has(frame.file) || !isSha256(frame.sha256)) {
      fail("batch-source-frame-entry-invalid", "Source-frame index has a missing, unsafe, duplicate, or misaligned frame entry");
    }
    previousSourceTimestamp = frame.sourceTimestampSeconds;
    files.add(frame.file);
  });
}

function parseRate(value) {
  if (typeof value !== "string" || !value.includes("/")) return NaN;
  const [numerator, denominator] = value.split("/").map(Number);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : NaN;
}

function parseSourceProbe(stdout) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch (error) {
    fail("batch-source-probe-json-invalid", "ffprobe did not return valid JSON: " + error.message);
  }
  const stream = Array.isArray(report.streams) ? report.streams[0] : null;
  const frames = report.frames;
  const fps = parseRate(stream?.avg_frame_rate);
  if (!stream || !Number.isInteger(stream.index) || stream.index < 0 ||
      !Number.isInteger(stream.width) || stream.width < 1 ||
      !Number.isInteger(stream.height) || stream.height < 1 ||
      !Number.isFinite(fps) || fps <= 0 || !Array.isArray(frames) ||
      frames.length < 2 || frames.length > MAX_PROBE_FRAMES) {
    fail("batch-source-probe-incomplete", "ffprobe did not provide a bounded video stream and frame inventory");
  }
  let timestampBasis = null;
  let previousTimestamp = -Infinity;
  const parsedFrames = frames.map(frame => {
    const field = frame.best_effort_timestamp_time !== undefined
      ? "best_effort_timestamp_time" : "pkt_pts_time";
    if (timestampBasis && timestampBasis !== field) {
      fail("batch-source-probe-timestamp-basis", "ffprobe must use one consistent timestamp field");
    }
    timestampBasis = field;
    const timestampSeconds = Number(frame[field]);
    const width = frame.width ?? stream.width;
    const height = frame.height ?? stream.height;
    if (!Number.isFinite(timestampSeconds) || timestampSeconds <= previousTimestamp ||
        width !== stream.width || height !== stream.height) {
      fail("batch-source-probe-timestamps", "Source frame timestamps or dimensions are invalid");
    }
    previousTimestamp = timestampSeconds;
    return { timestampSeconds, width, height };
  });
  return {
    streamIndex: stream.index,
    width: stream.width,
    height: stream.height,
    fps,
    avgFrameRate: stream.avg_frame_rate,
    timestampBasis,
    frames: parsedFrames
  };
}

async function hashDropboxFile(uri, root, label) {
  let target;
  try {
    target = resolveDropboxUri(uri, root);
  } catch (error) {
    fail("batch-source-video-uri-invalid", label + " has an unsafe Dropbox URI: " + error.message);
  }
  const relative = path.relative(root, target);
  if (!within(root, target) || !relative) {
    fail("batch-source-video-path-invalid", label + " does not resolve below the configured Dropbox root");
  }
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    const entry = await lstat(current);
    if (entry.isSymbolicLink()) {
      fail("batch-source-video-symlink", label + " path contains a symlink");
    }
    if (current !== target && !entry.isDirectory()) {
      fail("batch-source-video-parent-invalid", label + " path contains a non-directory parent");
    }
    if (current === target && !entry.isFile()) {
      fail("batch-source-video-not-regular", label + " must be a regular file");
    }
  }
  const beforePath = await lstat(target);
  let handle;
  try {
    handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = await handle.stat();
    if (!before.isFile() || before.dev !== beforePath.dev || before.ino !== beforePath.ino) {
      fail("batch-source-video-changed", label + " changed before hashing");
    }
    const hash = createHash("sha256");
    const stream = handle.createReadStream({ autoClose: false });
    for await (const chunk of stream) hash.update(chunk);
    const after = await handle.stat();
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs) {
      fail("batch-source-video-changed", label + " changed while being hashed");
    }
    return { path: target, sha256: hash.digest("hex") };
  } finally {
    if (handle) await handle.close();
  }
}

async function executeTool(execute, binary, args, options, label) {
  try {
    const result = await execute(binary, args, options);
    return {
      stdout: Buffer.isBuffer(result?.stdout) ? result.stdout.toString("utf8") : String(result?.stdout ?? ""),
      stderr: Buffer.isBuffer(result?.stderr) ? result.stderr.toString("utf8") : String(result?.stderr ?? "")
    };
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error).trim().slice(0, 1200);
    fail("batch-source-derivation-tool-failed", label + " failed: " + detail);
  }
}

async function defaultExecute(binary, args, options = {}) {
  return execFileAsync(binary, args, {
    encoding: "utf8",
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
    timeout: options.timeoutMs ?? 120000,
    windowsHide: true
  });
}

async function verifySourceFrameDerivation({
  index,
  source,
  segmentationFrameSet,
  root,
  sourceDirectory,
  execute = defaultExecute,
  ffmpegPath = "ffmpeg",
  ffprobePath = "ffprobe"
}) {
  const derivation = index.derivation;
  const sourceFile = await hashDropboxFile(source.uri, root, "Immutable source video");
  if (sourceFile.sha256 !== source.checksum.toLowerCase() ||
      derivation.sourceChecksum.toLowerCase() !== sourceFile.sha256) {
    fail("batch-source-video-checksum-mismatch", "Source video bytes no longer match the immutable bridge checksum");
  }

  const probeResult = await executeTool(execute, ffprobePath, [
    "-v", "error", "-select_streams", "v:0", "-show_streams", "-show_frames",
    "-show_entries",
    "stream=index,width,height,avg_frame_rate:frame=best_effort_timestamp_time,pkt_pts_time,width,height",
    "-of", "json", sourceFile.path
  ], { maxBuffer: MAX_PROBE_BYTES, timeoutMs: 120000 }, "ffprobe source revalidation");
  const probe = parseSourceProbe(probeResult.stdout);
  const origin = probe.frames[0].timestampSeconds;
  if (probe.streamIndex !== derivation.streamIndex ||
      probe.width !== segmentationFrameSet.width ||
      probe.height !== segmentationFrameSet.height ||
      Math.abs(probe.fps - segmentationFrameSet.fps) > 0.0001 ||
      probe.avgFrameRate !== derivation.avgFrameRate ||
      probe.timestampBasis !== derivation.timestampBasis ||
      probe.frames.length !== derivation.probedFrameCount ||
      Math.abs(origin - derivation.timestampOriginSeconds) > 0.000001) {
    fail("batch-source-frame-probe-mismatch", "Fresh ffprobe inventory differs from the extraction record");
  }

  for (const frame of index.frames) {
    const probed = probe.frames[frame.frame];
    if (!probed || probed.width !== segmentationFrameSet.width ||
        probed.height !== segmentationFrameSet.height ||
        Math.abs(probed.timestampSeconds - frame.sourceTimestampSeconds) > 0.000001 ||
        Math.abs((probed.timestampSeconds - origin) - frame.sourceTimeFromOriginSeconds) > 0.000001 ||
        Math.abs(frame.sourceTimeFromOriginSeconds - frame.timeSeconds) >
          derivation.timestampToleranceSeconds) {
      fail("batch-source-frame-probe-mismatch", "Fresh source PTS differs at frame " + frame.frame);
    }
  }

  const ffmpegVersionResult = await executeTool(execute, ffmpegPath, ["-version"], {}, "ffmpeg version");
  const ffprobeVersionResult = await executeTool(execute, ffprobePath, ["-version"], {}, "ffprobe version");
  const ffmpegVersion = ffmpegVersionResult.stdout.split(/\r?\n/, 1)[0].trim();
  const ffprobeVersion = ffprobeVersionResult.stdout.split(/\r?\n/, 1)[0].trim();
  if (!ffmpegVersion || !ffprobeVersion) {
    fail("batch-source-derivation-tool-version-missing", "ffmpeg and ffprobe must report their versions");
  }

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "geehub-source-verify-"));
  try {
    const pattern = path.join(temporaryDirectory, "frame-%09d.png");
    const filter = "select=between(n\\," + segmentationFrameSet.firstFrame +
      "\\," + segmentationFrameSet.lastFrame + ")";
    await executeTool(execute, ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-i", sourceFile.path,
      "-map", "0:v:0", "-vf", filter, "-fps_mode", "passthrough",
      "-start_number", String(segmentationFrameSet.firstFrame), "-pix_fmt", "rgba",
      "-f", "image2", pattern
    ], { maxBuffer: 8 * 1024 * 1024, timeoutMs: 600000 }, "ffmpeg source-frame re-extraction");

    const names = await readdir(temporaryDirectory);
    const expectedNames = index.frames.map(frame =>
      "frame-" + String(frame.frame).padStart(9, "0") + ".png"
    );
    if (names.length !== expectedNames.length ||
        expectedNames.some(name => !names.includes(name))) {
      fail("batch-source-frame-reextract-count", "Fresh FFmpeg decode did not produce exactly the registered frame range");
    }

    for (let offset = 0; offset < index.frames.length; offset += 1) {
      const frame = index.frames[offset];
      const freshFile = await readRegularFile(
        path.join(temporaryDirectory, expectedNames[offset]),
        "Re-extracted source frame " + frame.frame,
        MAX_SOURCE_FRAME_BYTES
      );
      const indexedFile = await readRegularFile(
        path.join(sourceDirectory, frame.file),
        "Indexed source frame " + frame.frame,
        MAX_SOURCE_FRAME_BYTES
      );
      if (indexedFile.sha256 !== frame.sha256.toLowerCase()) {
        fail("batch-source-frame-checksum-mismatch", "Extracted source frame digest differs at frame " + frame.frame);
      }
      let freshPixels;
      let indexedPixels;
      try {
        freshPixels = decodeRgbaPng(freshFile.bytes);
        indexedPixels = decodeRgbaPng(indexedFile.bytes);
      } catch (error) {
        fail("batch-source-frame-png-invalid", "Source frame " + frame.frame + " is not a supported PNG: " + error.message);
      }
      if (freshPixels.width !== segmentationFrameSet.width ||
          freshPixels.height !== segmentationFrameSet.height ||
          indexedPixels.width !== freshPixels.width ||
          indexedPixels.height !== freshPixels.height ||
          !Buffer.from(freshPixels.data).equals(Buffer.from(indexedPixels.data))) {
        fail("batch-source-frame-pixel-mismatch", "Indexed PNG pixels do not match a fresh decode of source frame " + frame.frame);
      }
    }

    const sourceAfter = await hashDropboxFile(source.uri, root, "Immutable source video");
    if (sourceAfter.sha256 !== sourceFile.sha256) {
      fail("batch-source-video-mutated", "Source video changed during independent frame derivation verification");
    }
    return {
      schema: "geehub.source-frame-derivation-verification.v1",
      status: "verified",
      sourceChecksum: sourceFile.sha256,
      streamIndex: probe.streamIndex,
      timestampBasis: probe.timestampBasis,
      timestampOriginSeconds: origin,
      probedFrameCount: probe.frames.length,
      extractedFrameCount: index.frames.length,
      pixelMatchedFrameCount: index.frames.length,
      extractionTools: {
        ffmpeg: derivation.ffmpegVersion,
        ffprobe: derivation.ffprobeVersion
      },
      verificationTools: { ffmpeg: ffmpegVersion, ffprobe: ffprobeVersion }
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function validatePlanSequence(planBundle, job, evidence, deformationDocument, sourceDuration) {
  const sequence = planBundle.planSequence;
  if (sequence?.schema !== "geehub.render-plan-sequence" || sequence.schemaVersion !== 1 ||
      sequence.status !== "ready-for-render" || sequence.renderable !== true ||
      sequence.topologyId !== evidence.topologyId ||
      sequence.frameCount !== evidence.frameCount ||
      sequence.firstFrame !== evidence.firstFrame || sequence.lastFrame !== evidence.lastFrame ||
      !Number.isFinite(sequence.sourceDurationSeconds) ||
      Math.abs(sequence.sourceDurationSeconds - sourceDuration) > 0.000001 ||
      !Array.isArray(sequence.frames) || sequence.frames.length !== evidence.frameCount) {
    fail("batch-plan-sequence-invalid", "Deformation plans are not a ready sequence for this registered source");
  }
  sequence.frames.forEach((plan, index) => {
    const meshFrame = deformationDocument.frames[index];
    if (plan?.schema !== "geehub.growth-deformation-frame" || plan.schemaVersion !== 1 ||
        plan.renderable !== true || plan.frame !== meshFrame.frame ||
        !Number.isFinite(plan.timeSeconds) ||
        Math.abs(plan.timeSeconds - meshFrame.timeSeconds) > 0.000001 ||
        plan.topologyId !== deformationDocument.topologyId ||
        !isDeepStrictEqual(plan.vertexIds, deformationDocument.vertexIds) ||
        !isDeepStrictEqual(plan.triangleIds, deformationDocument.triangleIds) ||
        !isDeepStrictEqual(plan.triangles, deformationDocument.triangles) ||
        !isDeepStrictEqual(plan.sourcePoints, meshFrame.sourcePoints)) {
      fail("batch-plan-frame-mismatch", "Deformation plan does not match registered mesh frame " + meshFrame.frame);
    }
  });
  const growthStateIds = job.growthStates.map(state => state.id);
  if (!Array.isArray(sequence.growthStateIds) ||
      !isDeepStrictEqual(sequence.growthStateIds, growthStateIds)) {
    fail("batch-plan-growth-state-lineage", "Deformation plans do not identify the portable job's approved growth states");
  }
  if (job.landmarkFrames.length !== sequence.frames.length) {
    fail("batch-plan-landmark-count", "Portable job landmarks do not cover the plan sequence");
  }
  return sequence;
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
    return sha256(bytes);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await removeIfIdentity(filePath, identity).catch(() => {});
    throw error;
  }
}

async function createOutputDirectory(requestedPath, sourceDirectory) {
  if (typeof requestedPath !== "string" || !requestedPath.trim()) {
    fail("batch-output-path-invalid", "Output directory path is required");
  }
  const requested = path.resolve(requestedPath);
  const name = path.basename(requested);
  if (!name || name === "." || name === "..") {
    fail("batch-output-path-invalid", "Output directory must be a named child of an existing parent");
  }
  const parent = await realpath(path.dirname(requested));
  const target = path.join(parent, name);
  if (within(sourceDirectory, target)) {
    fail("batch-output-inside-source", "Output directory must not be inside the extracted source-frame directory");
  }
  await mkdir(target);
  const entry = await lstat(target);
  if (entry.isSymbolicLink() || !entry.isDirectory()) {
    fail("batch-output-not-directory", "New output path is not a regular directory");
  }
  return target;
}

/**
 * Consume a queued job, its prepared deformation bundle, a source-frame index,
 * and the registered Dropbox sidecars. The output directory must not exist.
 *
 * The source-frame index lives beside its PNG files and has this shape:
 * geehub.source-frame-index v1, sourceAssetId, sourceChecksum, sequenceId,
 * firstFrame, lastFrame, format { width, height, fps, frameCount }, and frames
 * [{ frame, timeSeconds, file, sha256 }]. File names are basenames only.
 */
export async function renderGrowthFrameBatchFiles({
  manifestPath,
  renderJobPath,
  deformationPlansPath,
  sourceFrameIndexPath,
  outputDirectory,
  dropboxRoot,
  ffmpegPath = "ffmpeg",
  ffprobePath = "ffprobe",
  execute = defaultExecute
} = {}) {
  const [manifestFile, jobFile, plansFile, indexFile] = await Promise.all([
    readJsonFile(manifestPath, "Queued bridge manifest"),
    readJsonFile(renderJobPath, "Portable render job"),
    readJsonFile(deformationPlansPath, "Deformation plan bundle"),
    readJsonFile(sourceFrameIndexPath, "Source-frame index")
  ]);
  const manifest = manifestFile.document;
  const job = jobFile.document;
  const planBundle = plansFile.document;
  const index = indexFile.document;
  const selected = validateJobAndEvidence(manifest, job, planBundle);

  let root;
  try {
    root = await realpath(path.resolve(dropboxRoot));
  } catch (error) {
    fail("batch-dropbox-root-unavailable", "Configured Dropbox root is unavailable: " + error.message);
  }
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    fail("batch-dropbox-root-invalid", "Configured Dropbox root must be a real directory");
  }

  const segmentationFile = await readDropboxFile(
    selected.segmentation.uri, root, "Registered segmentation sidecar", MAX_SIDECAR_BYTES
  );
  const landmarksFile = await readDropboxFile(
    selected.landmarks.uri, root, "Registered landmark sidecar", MAX_SIDECAR_BYTES
  );
  const deformationFile = await readDropboxFile(
    selected.deformation.uri, root, "Registered deformation sidecar", MAX_SIDECAR_BYTES
  );
  if (segmentationFile.sha256 !== selected.segmentation.checksum.toLowerCase() ||
      landmarksFile.sha256 !== selected.landmarks.checksum.toLowerCase() ||
      deformationFile.sha256 !== selected.deformation.checksum.toLowerCase()) {
    fail("batch-sidecar-checksum-mismatch", "Registered segmentation, landmark, or deformation sidecar bytes changed");
  }
  let segmentationDocument;
  let landmarksDocument;
  let deformationDocument;
  try {
    segmentationDocument = JSON.parse(segmentationFile.bytes.toString("utf8"));
    landmarksDocument = JSON.parse(landmarksFile.bytes.toString("utf8"));
    deformationDocument = JSON.parse(deformationFile.bytes.toString("utf8"));
  } catch (error) {
    fail("batch-sidecar-json-invalid", "Registered frame-set sidecar is not valid JSON: " + error.message);
  }
  validateSegmentationDocument(segmentationDocument, selected.segmentation, manifest.source.id);
  validateLandmarksDocument(
    landmarksDocument, selected.landmarks, manifest.source.id, segmentationDocument
  );
  const expectedLandmarks = landmarksDocument.frames.map(frame => ({
    frame: frame.frame,
    timeSeconds: frame.timeSeconds,
    identityConfidence: frame.identityConfidence,
    poseConfidence: frame.poseConfidence,
    landmarks: frame.landmarks
  }));
  if (!isDeepStrictEqual(job.landmarkFrames, expectedLandmarks)) {
    fail("batch-job-landmarks-mismatch", "Portable job landmarks differ from the registered landmark sidecar");
  }
  validateDeformationDocument(
    deformationDocument, selected.deformation, manifest.source.id, segmentationDocument
  );
  validateSourceFrameIndex(index, manifest.source, selected.segmentation, segmentationDocument);
  const planSequence = validatePlanSequence(
    planBundle, job, selected.evidence, deformationDocument, manifest.source.duration
  );

  const sourceDirectory = await realpath(path.dirname(indexFile.path));
  const sourceDirectoryStat = await lstat(sourceDirectory);
  if (sourceDirectoryStat.isSymbolicLink() || !sourceDirectoryStat.isDirectory()) {
    fail("batch-source-directory-invalid", "Extracted source-frame directory must be a real directory");
  }
  const sourceFrameDerivation = await verifySourceFrameDerivation({
    index,
    source: manifest.source,
    segmentationFrameSet: selected.segmentation,
    root,
    sourceDirectory,
    execute,
    ffmpegPath,
    ffprobePath
  });
  const preparedFrames = [];
  for (let offset = 0; offset < planSequence.frames.length; offset += 1) {
    const indexFrame = index.frames[offset];
    const segmentationFrame = segmentationDocument.frames[offset];
    const sourcePath = path.join(sourceDirectory, indexFrame.file);
    const sourceFrameFile = await readRegularFile(
      sourcePath, "Source frame " + indexFrame.frame, MAX_SOURCE_FRAME_BYTES
    );
    if (sourceFrameFile.sha256 !== indexFrame.sha256.toLowerCase()) {
      fail("batch-source-frame-checksum-mismatch", "Extracted source frame digest differs at frame " + indexFrame.frame);
    }
    const bodyMaskFile = await readDropboxFile(
      segmentationFrame.bodyMask.uri, root, "Body mask " + indexFrame.frame, MAX_MASK_BYTES
    );
    const faceMaskFile = await readDropboxFile(
      segmentationFrame.faceMask.uri, root, "Protected-face mask " + indexFrame.frame, MAX_MASK_BYTES
    );
    if (bodyMaskFile.sha256 !== segmentationFrame.bodyMask.checksum.toLowerCase() ||
        faceMaskFile.sha256 !== segmentationFrame.faceMask.checksum.toLowerCase()) {
      fail("batch-mask-checksum-mismatch", "Registered mask bytes changed at frame " + indexFrame.frame);
    }
    const plan = planSequence.frames[offset];
    const planBytes = Buffer.from(JSON.stringify(plan, null, 2) + "\n", "utf8");
    preparedFrames.push({
      frame: indexFrame.frame,
      timeSeconds: indexFrame.timeSeconds,
      sourcePath,
      sourceSha256: sourceFrameFile.sha256,
      bodyMaskPath: bodyMaskFile.path,
      bodyMaskSha256: bodyMaskFile.sha256,
      faceMaskPath: faceMaskFile.path,
      faceMaskSha256: faceMaskFile.sha256,
      plan,
      planBytes,
      planSha256: sha256(planBytes)
    });
  }

  const temporaryPlansDirectory = await mkdtemp(path.join(os.tmpdir(), "geehub-batch-plans-"));
  let outputPath;
  let outputCreated = false;
  const created = [];
  try {
    outputPath = await createOutputDirectory(outputDirectory, sourceDirectory);
    outputCreated = true;
    const frameResults = [];
    for (const item of preparedFrames) {
      const planPath = path.join(temporaryPlansDirectory, "frame-" + item.frame + ".plan.json");
      await writeExclusive(planPath, item.planBytes);
      const frameOutputPath = path.join(outputPath, "frame-" + item.frame + ".body.png");
      const result = await renderGrowthFrameFiles({
        sourcePath: item.sourcePath,
        bodyMaskPath: item.bodyMaskPath,
        protectedFaceMaskPath: item.faceMaskPath,
        planPath,
        outputPath: frameOutputPath
      });
      created.push(
        { path: frameOutputPath, sha256: result.output.sha256 },
        { path: result.receiptPath, sha256: result.receiptSha256 }
      );
      if (result.inputs.sourceFrame.sha256 !== item.sourceSha256 ||
          result.inputs.bodyMask.sha256 !== item.bodyMaskSha256 ||
          result.inputs.protectedFaceMask.sha256 !== item.faceMaskSha256 ||
          result.inputs.deformationPlan.sha256 !== item.planSha256) {
        fail("batch-input-changed-during-render", "An input changed between preflight and rasterization at frame " + item.frame);
      }
      frameResults.push({
        frame: item.frame,
        timeSeconds: item.timeSeconds,
        sourceFrame: { file: path.basename(item.sourcePath), sha256: result.inputs.sourceFrame.sha256 },
        bodyMaskSha256: result.inputs.bodyMask.sha256,
        protectedFaceMaskSha256: result.inputs.protectedFaceMask.sha256,
        deformationPlanSha256: result.inputs.deformationPlan.sha256,
        output: {
          file: path.basename(frameOutputPath),
          sha256: result.output.sha256,
          byteLength: result.output.byteLength
        },
        receipt: {
          file: path.basename(result.receiptPath),
          sha256: result.receiptSha256
        },
        coveredPixels: result.raster.coveredPixels,
        renderedTriangles: result.raster.renderedTriangles
      });
    }

    const receipt = {
      schema: "geehub.growth-frame-batch-receipt.v1",
      status: "complete",
      jobId: planBundle.jobId,
      manifestId: manifest.id,
      manifestRevision: manifest.revision,
      sourceAssetId: manifest.source.id,
      sourceChecksum: manifest.source.checksum,
      sequenceId: planBundle.sequenceId,
      frameEvidence: structuredClone(selected.evidence),
      registeredSidecars: {
        segmentation: { frameSetId: selected.segmentation.id, checksum: segmentationFile.sha256 },
        landmarks: { frameSetId: selected.landmarks.id, checksum: landmarksFile.sha256 },
        deformation: { frameSetId: selected.deformation.id, checksum: deformationFile.sha256 }
      },
      renderJob: { file: path.basename(jobFile.path), sha256: jobFile.sha256 },
      deformationPlans: { file: path.basename(plansFile.path), sha256: plansFile.sha256 },
      sourceFrameIndex: { file: path.basename(indexFile.path), sha256: indexFile.sha256 },
      firstFrame: selected.segmentation.firstFrame,
      lastFrame: selected.segmentation.lastFrame,
      frameCount: frameResults.length,
      allFramesAccountedFor: frameResults.length === selected.segmentation.frameCount,
      sourceFramesUnmodified: true,
      sourceFrameDerivationVerified: true,
      sourceFramePixelsRevalidated: true,
      sourceFrameDerivationVerification: sourceFrameDerivation,
      pixelSemanticsVerified: false,
      frames: frameResults,
      note: "This complete batch contains transparent warped body layers, not composited frames or a finished video. The source checksum and FFprobe timeline were revalidated, and every indexed PNG was pixel-compared with a fresh FFmpeg decode. Background reconstruction, protected-face compositing, and Resolve export remain separate stages."
    };
    const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
    const receiptPath = path.join(outputPath, "sequence.receipt.json");
    const receiptSha256 = await writeExclusive(receiptPath, receiptBytes);
    created.push({ path: receiptPath, sha256: receiptSha256 });
    return { ...receipt, outputDirectory: outputPath, receiptPath, receiptSha256 };
  } catch (error) {
    for (const item of created.reverse()) {
      await removeIfDigest(item.path, item.sha256).catch(() => {});
    }
    if (outputCreated) await rmdir(outputPath).catch(() => {});
    throw error;
  } finally {
    await rm(temporaryPlansDirectory, { recursive: true, force: true });
  }
}
