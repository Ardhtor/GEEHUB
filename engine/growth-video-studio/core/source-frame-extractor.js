/**
 * Extract source-timestamped PNG frames from the immutable bridge source.
 * The registered segmentation sidecar defines the exact frame range and
 * timeline; ffprobe verifies source timing and ffmpeg performs the decode.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import {
  link, lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, rmdir, unlink
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { resolveDropboxUri } from "./bridge-exchange.js";
import { validateBridgeManifest } from "./bridge-manifest.js";
import { decodeRgbaPng } from "./rgba-png.js";

const execFileAsync = promisify(execFile);
const MAX_SEQUENCE_FRAMES = 10000;
const MAX_JSON_BYTES = 128 * 1024 * 1024;
const MAX_FRAME_BYTES = 128 * 1024 * 1024;
const MAX_PROBE_BYTES = 128 * 1024 * 1024;
const sha256 = value => createHash("sha256").update(value).digest("hex");

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

async function inspectNoSymlinkPath(root, target) {
  if (!within(root, target)) fail("source-extract-path-escape", "Source path escapes the configured Dropbox root");
  const segments = path.relative(root, target).split(path.sep);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) fail("source-extract-symlink", "Source path contains a symlink: " + current);
    if (index < segments.length - 1 && !stat.isDirectory()) {
      fail("source-extract-parent-invalid", "Source path parent is not a directory: " + current);
    }
    if (index === segments.length - 1 && !stat.isFile()) {
      fail("source-extract-not-regular", "Source path is not a regular file: " + current);
    }
  }
  return target;
}

async function readRegularFile(filePath, label, maxBytes) {
  const requested = path.resolve(filePath);
  const beforePath = await lstat(requested);
  if (beforePath.isSymbolicLink() || !beforePath.isFile()) {
    fail("source-extract-input-invalid", label + " must be a regular file, not a symlink");
  }
  let handle;
  try {
    handle = await open(requested, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = await handle.stat();
    if (!before.isFile() || before.size > maxBytes ||
        before.dev !== beforePath.dev || before.ino !== beforePath.ino) {
      fail("source-extract-input-limit", label + " is unstable or exceeds its byte limit");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.length !== after.size || before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      fail("source-extract-input-changed", label + " changed while being read");
    }
    return bytes;
  } finally {
    if (handle) await handle.close();
  }
}

async function hashRegularFile(filePath, label) {
  const requested = path.resolve(filePath);
  const beforePath = await lstat(requested);
  if (beforePath.isSymbolicLink() || !beforePath.isFile()) {
    fail("source-extract-source-invalid", label + " must be a regular file, not a symlink");
  }
  let handle;
  try {
    handle = await open(requested, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const before = await handle.stat();
    if (!before.isFile() || before.dev !== beforePath.dev || before.ino !== beforePath.ino) {
      fail("source-extract-source-changed", label + " changed before hashing");
    }
    const hash = createHash("sha256");
    const stream = handle.createReadStream({ autoClose: false });
    for await (const chunk of stream) hash.update(chunk);
    const after = await handle.stat();
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs) {
      fail("source-extract-source-changed", label + " changed while being hashed");
    }
    return hash.digest("hex");
  } finally {
    if (handle) await handle.close();
  }
}

async function readDropboxJson(uri, root, label) {
  let target;
  try {
    target = resolveDropboxUri(uri, root);
  } catch (error) {
    fail("source-extract-uri-invalid", label + " has an unsafe Dropbox URI: " + error.message);
  }
  await inspectNoSymlinkPath(root, target);
  const bytes = await readRegularFile(target, label, MAX_JSON_BYTES);
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("source-extract-json-invalid", label + " is not valid JSON: " + error.message);
  }
  return { path: target, bytes, checksum: sha256(bytes), document };
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
    fail("source-extract-tool-failed", label + " failed: " + detail);
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

function parseRate(value) {
  if (typeof value !== "string" || !value.includes("/")) return NaN;
  const [numerator, denominator] = value.split("/").map(Number);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : NaN;
}

function parseProbe(stdout) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch (error) {
    fail("source-extract-probe-json-invalid", "ffprobe did not return valid JSON: " + error.message);
  }
  const stream = Array.isArray(report.streams) ? report.streams[0] : null;
  const frames = report.frames;
  const fps = parseRate(stream?.avg_frame_rate);
  if (!stream || !Number.isInteger(stream.index) || !Number.isInteger(stream.width) ||
      stream.width < 1 || !Number.isInteger(stream.height) || stream.height < 1 ||
      !Number.isFinite(fps) || fps <= 0 || !Array.isArray(frames) ||
      frames.length < 2 || frames.length > MAX_SEQUENCE_FRAMES * 20) {
    fail("source-extract-probe-incomplete", "ffprobe did not provide a bounded video stream and frame inventory");
  }
  let timestampBasis = null;
  const timestamps = frames.map((frame, index) => {
    const field = frame.best_effort_timestamp_time !== undefined
      ? "best_effort_timestamp_time" : "pkt_pts_time";
    if (timestampBasis && timestampBasis !== field) {
      fail("source-extract-probe-timestamp-basis", "ffprobe must use one consistent timestamp field for the selected stream");
    }
    timestampBasis = field;
    const value = Number(frame[field]);
    if (!Number.isFinite(value) || (index > 0 && value <= timestamps[index - 1].timestampSeconds)) {
      fail("source-extract-probe-timestamps", "ffprobe frame timestamps must be finite and strictly increasing");
    }
    return { timestampSeconds: value, width: frame.width ?? stream.width, height: frame.height ?? stream.height };
  });
  return {
    streamIndex: stream.index,
    width: stream.width,
    height: stream.height,
    fps,
    avgFrameRate: stream.avg_frame_rate,
    timestampBasis,
    frames: timestamps
  };
}

function validateSegmentation(document, frameSet, sourceAssetId) {
  if (document?.schema !== "geehub.frame-set-evidence" || document.schemaVersion !== 1 ||
      document.role !== "segmentation" || document.sourceAssetId !== sourceAssetId ||
      document.sequenceId !== frameSet.metadata?.sequenceId ||
      document.firstFrame !== frameSet.firstFrame || document.lastFrame !== frameSet.lastFrame ||
      document.frameCount !== frameSet.frameCount || document.width !== frameSet.width ||
      document.height !== frameSet.height || document.fps !== frameSet.fps ||
      !Array.isArray(document.frames) || document.frames.length !== frameSet.frameCount ||
      document.frames.length < 2 || document.frames.length > MAX_SEQUENCE_FRAMES) {
    fail("source-extract-segmentation-invalid", "Registered segmentation sidecar does not match its manifest frame set");
  }
  let previousTime = -Infinity;
  document.frames.forEach((frame, offset) => {
    if (frame?.frame !== frameSet.firstFrame + offset ||
        !Number.isFinite(frame.timeSeconds) || frame.timeSeconds <= previousTime) {
      fail("source-extract-segmentation-order", "Registered segmentation frames must be contiguous and strictly timestamped");
    }
    previousTime = frame.timeSeconds;
  });
}

async function writeIndexExclusive(filePath, content) {
  let handle;
  try {
    handle = await open(filePath, "wx", 0o600);
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
      await rm(filePath, { force: true }).catch(() => {});
    }
    throw error;
  }
}

async function removeIfDigest(filePath, expectedDigest) {
  try {
    if (await hashRegularFile(filePath, "Created extraction output") === expectedDigest) {
      await unlink(filePath);
    }
  } catch {}
}

/**
 * Extract the exact registered segmentation range from the immutable source.
 * ffprobe timestamps must agree with the registered sequence before ffmpeg is
 * allowed to write any frames. The destination must not already exist.
 */
export async function extractSourceFrames({
  manifestPath,
  segmentationFrameSetId,
  outputDirectory,
  dropboxRoot,
  ffmpegPath = "ffmpeg",
  ffprobePath = "ffprobe",
  execute = defaultExecute,
  timestampToleranceSeconds
} = {}) {
  if (typeof segmentationFrameSetId !== "string" || !segmentationFrameSetId.trim()) {
    fail("source-extract-frame-set-required", "A registered segmentation frame-set id is required");
  }
  const manifestBytes = await readRegularFile(manifestPath, "Bridge manifest", MAX_JSON_BYTES);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch (error) {
    fail("source-extract-manifest-json-invalid", "Bridge manifest is not valid JSON: " + error.message);
  }
  const manifestValidation = validateBridgeManifest(manifest);
  if (!manifestValidation.valid) {
    fail("source-extract-manifest-invalid", manifestValidation.errors.join("; "));
  }
  if (manifest.source.immutable !== true || !/^[a-f0-9]{64}$/i.test(manifest.source.checksum || "")) {
    fail("source-extract-source-checksum-required", "Source extraction requires an immutable source with a registered SHA-256 checksum");
  }
  const matches = manifest.frameSets.filter(item =>
    item.id === segmentationFrameSetId && item.role === "segmentation"
  );
  if (matches.length !== 1 || !/^[a-f0-9]{64}$/i.test(matches[0].checksum || "")) {
    fail("source-extract-frame-set-missing", "Manifest must contain exactly one checksummed segmentation frame set with that id");
  }
  const frameSet = matches[0];
  if (typeof dropboxRoot !== "string" || !dropboxRoot.trim()) {
    fail("source-extract-dropbox-root-required", "A local Dropbox root is required");
  }
  const root = await realpath(path.resolve(dropboxRoot));
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    fail("source-extract-dropbox-root-invalid", "Configured Dropbox root must be a real directory");
  }

  const sidecar = await readDropboxJson(frameSet.uri, root, "Registered segmentation sidecar");
  if (sidecar.checksum !== frameSet.checksum.toLowerCase()) {
    fail("source-extract-sidecar-checksum-mismatch", "Segmentation sidecar bytes differ from the manifest checksum");
  }
  validateSegmentation(sidecar.document, frameSet, manifest.source.id);

  const sourcePath = resolveDropboxUri(manifest.source.uri, root);
  await inspectNoSymlinkPath(root, sourcePath);
  const sourceChecksum = await hashRegularFile(sourcePath, "Immutable source video");
  if (sourceChecksum !== manifest.source.checksum.toLowerCase()) {
    fail("source-extract-source-checksum-mismatch", "Source video bytes differ from the immutable manifest checksum");
  }

  const probeResult = await executeTool(execute, ffprobePath, [
    "-v", "error", "-select_streams", "v:0", "-show_streams", "-show_frames",
    "-show_entries",
    "stream=index,width,height,avg_frame_rate:frame=best_effort_timestamp_time,pkt_pts_time,width,height",
    "-of", "json", sourcePath
  ], { maxBuffer: MAX_PROBE_BYTES, timeoutMs: 120000 }, "ffprobe");
  const probe = parseProbe(probeResult.stdout);
  if (probe.width !== frameSet.width || probe.height !== frameSet.height ||
      Math.abs(probe.fps - frameSet.fps) > 0.0001) {
    fail("source-extract-video-format-mismatch", "Probed source dimensions or average frame rate differ from the registered sequence");
  }
  if (frameSet.lastFrame >= probe.frames.length) {
    fail("source-extract-frame-range-unavailable", "Registered frame range extends beyond the probed source video");
  }
  const tolerance = timestampToleranceSeconds ?? Math.max(0.0001, 0.25 / frameSet.fps);
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance >= 0.5 / frameSet.fps) {
    fail("source-extract-timestamp-tolerance-invalid", "Timestamp tolerance must be positive and less than half a frame");
  }
  const timestampOriginSeconds = probe.frames[0].timestampSeconds;
  const selected = sidecar.document.frames.map((frame, offset) => {
    const sourceFrame = probe.frames[frame.frame];
    if (!sourceFrame || sourceFrame.width !== frameSet.width || sourceFrame.height !== frameSet.height) {
      fail("source-extract-source-frame-format", "Probed source frame format differs at frame " + frame.frame);
    }
    const sourceTimestampSeconds = sourceFrame.timestampSeconds - timestampOriginSeconds;
    if (Math.abs(sourceTimestampSeconds - frame.timeSeconds) > tolerance) {
      fail("source-extract-timestamp-mismatch", "Source PTS does not match registered time at frame " + frame.frame);
    }
    return { frame: frame.frame, timeSeconds: frame.timeSeconds, sourceTimestampSeconds };
  });

  const ffmpegVersionResult = await executeTool(execute, ffmpegPath, ["-version"], {}, "ffmpeg version");
  const ffprobeVersionResult = await executeTool(execute, ffprobePath, ["-version"], {}, "ffprobe version");
  const ffmpegVersion = ffmpegVersionResult.stdout.split(/\r?\n/, 1)[0].trim();
  const ffprobeVersion = ffprobeVersionResult.stdout.split(/\r?\n/, 1)[0].trim();
  if (!ffmpegVersion || !ffprobeVersion) {
    fail("source-extract-tool-version-missing", "ffmpeg and ffprobe must report their versions");
  }

  if (typeof outputDirectory !== "string" || !outputDirectory.trim()) {
    fail("source-extract-output-invalid", "A new output directory path is required");
  }
  const requestedOutput = path.resolve(outputDirectory);
  const outputName = path.basename(requestedOutput);
  if (!outputName || outputName === "." || outputName === "..") {
    fail("source-extract-output-invalid", "Output must name a new directory");
  }
  const outputParent = await realpath(path.dirname(requestedOutput));
  const outputPath = path.join(outputParent, outputName);
  try {
    await lstat(outputPath);
    fail("source-extract-output-exists", "Source-frame output directory already exists");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(outputPath);
  let temporaryDirectory;
  const created = [];
  try {
    temporaryDirectory = await mkdtemp(path.join(outputPath, ".geehub-extract-"));
    const pattern = path.join(temporaryDirectory, "frame-%09d.png");
    const filter = "select=between(n\\," + frameSet.firstFrame + "\\," + frameSet.lastFrame + ")";
    await executeTool(execute, ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-i", sourcePath,
      "-map", "0:v:0", "-vf", filter, "-fps_mode", "passthrough",
      "-start_number", String(frameSet.firstFrame), "-pix_fmt", "rgba",
      "-f", "image2", pattern
    ], { maxBuffer: 8 * 1024 * 1024, timeoutMs: 600000 }, "ffmpeg frame extraction");

    const names = await readdir(temporaryDirectory);
    const expectedNames = selected.map(item =>
      "frame-" + String(item.frame).padStart(9, "0") + ".png"
    );
    if (names.length !== expectedNames.length ||
        expectedNames.some(name => !names.includes(name))) {
      fail("source-extract-output-frame-count", "ffmpeg did not produce exactly the registered source frame range");
    }

    const indexFrames = [];
    for (let offset = 0; offset < selected.length; offset += 1) {
      const selectedFrame = selected[offset];
      const file = expectedNames[offset];
      const bytes = await readRegularFile(
        path.join(temporaryDirectory, file), "Extracted frame " + selectedFrame.frame, MAX_FRAME_BYTES
      );
      let decoded;
      try {
        decoded = decodeRgbaPng(bytes);
      } catch (error) {
        fail("source-extract-png-invalid", "Extracted frame " + selectedFrame.frame + " is not a supported PNG: " + error.message);
      }
      if (decoded.width !== frameSet.width || decoded.height !== frameSet.height) {
        fail("source-extract-png-dimensions", "Extracted PNG dimensions differ at frame " + selectedFrame.frame);
      }
      const digest = sha256(bytes);
      const finalPath = path.join(outputPath, file);
      await link(path.join(temporaryDirectory, file), finalPath);
      created.push({ path: finalPath, sha256: digest });
      await unlink(path.join(temporaryDirectory, file));
      indexFrames.push({
        frame: selectedFrame.frame,
        timeSeconds: selectedFrame.timeSeconds,
        sourceTimestampSeconds: selectedFrame.sourceTimestampSeconds,
        file,
        sha256: digest
      });
    }

    const sourceChecksumAfter = await hashRegularFile(sourcePath, "Immutable source video");
    if (sourceChecksumAfter !== sourceChecksum) {
      fail("source-extract-source-mutated", "Source video changed during frame extraction");
    }

    const index = {
      schema: "geehub.source-frame-index",
      schemaVersion: 1,
      sourceAssetId: manifest.source.id,
      sourceChecksum,
      sequenceId: sidecar.document.sequenceId,
      firstFrame: frameSet.firstFrame,
      lastFrame: frameSet.lastFrame,
      format: {
        width: frameSet.width,
        height: frameSet.height,
        fps: frameSet.fps,
        frameCount: frameSet.frameCount
      },
      derivation: {
        schema: "geehub.source-frame-extraction",
        schemaVersion: 1,
        method: "ffmpeg-image2-png",
        sourceUri: manifest.source.uri,
        sourceChecksum,
        streamIndex: probe.streamIndex,
        avgFrameRate: probe.avgFrameRate,
        timestampBasis: probe.timestampBasis,
        timestampOriginSeconds,
        timestampToleranceSeconds: tolerance,
        probedFrameCount: probe.frames.length,
        extractedFrameCount: indexFrames.length,
        ffmpegVersion,
        ffprobeVersion,
        sourceUnchangedAfterExtraction: true
      },
      frames: indexFrames
    };
    const indexBytes = Buffer.from(JSON.stringify(index, null, 2) + "\n", "utf8");
    const indexPath = path.join(outputPath, "source-frame-index.json");
    await writeIndexExclusive(indexPath, indexBytes);
    created.push({ path: indexPath, sha256: sha256(indexBytes) });
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = null;
    return {
      schema: "geehub.source-frame-extraction-receipt.v1",
      status: "complete",
      outputDirectory: outputPath,
      indexPath,
      indexChecksum: sha256(indexBytes),
      sourceAssetId: manifest.source.id,
      sourceChecksum,
      sequenceId: sidecar.document.sequenceId,
      frameCount: indexFrames.length,
      firstFrame: frameSet.firstFrame,
      lastFrame: frameSet.lastFrame,
      frames: indexFrames,
      sourceUnmodified: true,
      sourceFrameDerivationVerified: true,
      index
    };
  } catch (error) {
    for (const item of created.reverse()) {
      await removeIfDigest(item.path, item.sha256);
    }
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => {});
    }
    await rmdir(outputPath).catch(() => {});
    throw error;
  }
}
