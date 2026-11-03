/**
 * Safe local Dropbox exchange staging for GEEHUB media-bridge v1.
 *
 * This module writes only new manifest/job files. It hashes the actual source
 * bytes, verifies an optional manifest checksum, and never creates or replaces
 * the reserved render output. It does not render or mutate source media.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, lstat, mkdir, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { validateBridgeManifest } from "./bridge-manifest.js";

export const DEFAULT_MANIFEST_URI = "dropbox://GEEHUB/Bridge/incoming/manifest.json";
const URI_PREFIX = "dropbox://GEEHUB/";

function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

/** Map a bridge URI to a path below the supplied Dropbox root. */
export function resolveDropboxUri(uri, dropboxRoot) {
  if (typeof uri !== "string" || !uri.startsWith(URI_PREFIX)) {
    throw new TypeError("URI must use dropbox://GEEHUB/");
  }
  const relative = uri.slice(URI_PREFIX.length);
  const segments = relative.split("/");
  if (!relative || segments.some(segment =>
    !segment || segment === "." || segment === ".." ||
    segment.includes("\\") || segment.includes("%") ||
    segment.includes(":") || segment.includes("\0")
  )) {
    throw new TypeError("Unsafe Dropbox URI path");
  }
  const root = path.resolve(dropboxRoot);
  const target = path.resolve(root, "GEEHUB", ...segments);
  if (!within(root, target)) throw new TypeError("Dropbox URI escapes the configured root");
  return target;
}

async function ensureSafeDirectory(root, directory) {
  if (directory !== root && !within(root, directory)) {
    throw new Error("Exchange directory escapes the Dropbox root");
  }
  const relative = path.relative(root, directory);
  let current = root;
  for (const segment of relative ? relative.split(path.sep) : []) {
    current = path.join(current, segment);
    try {
      await mkdir(current);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error("Exchange directory contains a symlink or non-directory: " + current);
    }
  }
}

async function inspectNoSymlinkPath(root, target, allowMissingLeaf = false) {
  if (!within(root, target)) throw new Error("Exchange path escapes the Dropbox root");
  const segments = path.relative(root, target).split(path.sep);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (error.code === "ENOENT" && allowMissingLeaf && index === segments.length - 1) {
        return null;
      }
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error("Exchange path contains a symlink: " + current);
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error("Exchange path parent is not a directory: " + current);
    }
    if (index === segments.length - 1) return stat;
  }
  return null;
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function hashText(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function writeExclusive(filePath, content) {
  let handle;
  try {
    handle = await open(filePath, "wx", 0o600);
    await handle.writeFile(content, "utf8");
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

function validatePortableJob(payload, manifest, job) {
  const errors = [];
  const add = message => errors.push(message);
  if (!payload || payload.schema !== "geehub.growth-render-job" ||
      payload.schemaVersion !== 1 || payload.status !== "ready-for-renderer") {
    add("Portable render-job schema or status is invalid");
    return errors;
  }
  const source = payload.source;
  if (!source || source.name !== manifest.source.name ||
      source.width !== manifest.source.width ||
      source.height !== manifest.source.height ||
      !Number.isFinite(source.duration) ||
      Math.abs(source.duration - manifest.source.duration) > 0.000001) {
    add("Portable render-job source does not match the immutable bridge source");
  }
  const output = payload.output;
  if (!output || output.width !== job.output.width ||
      output.height !== job.output.height || output.fps !== job.output.fps) {
    add("Portable render-job output does not match its manifest reservation");
  }
  if (!Array.isArray(payload.growthStates) || payload.growthStates.length < 2) {
    add("Portable render job needs at least two growth states");
  }
  if (!Array.isArray(payload.landmarkFrames) || payload.landmarkFrames.length < 2) {
    add("Portable render job needs at least two landmark frames");
  }
  const required = [
    "protectFace", "preserveSourceMotion", "preserveGroundContact",
    "deformBodyAsConnectedMesh", "temporalStability"
  ];
  if (!payload.constraints || typeof payload.constraints !== "object") {
    add("Identity-preserving render constraints are missing");
  } else {
    for (const key of required) {
      if (payload.constraints[key] !== true) {
        add("Required render constraint is not enabled: " + key);
      }
    }
  }
  return errors;
}

/**
 * Stage one queued job and its manifest into a local Dropbox mirror.
 *
 * Existing manifest, job, source, and output paths are never overwritten.
 * The manifest is written last, so the Resolve inspector cannot discover a
 * partially written job through the default manifest path.
 */
export async function stageBridgeExchange({
  manifest,
  jobId,
  portableJob,
  dropboxRoot,
  manifestUri = DEFAULT_MANIFEST_URI
} = {}) {
  const validation = validateBridgeManifest(manifest);
  if (!validation.valid) {
    throw new TypeError("Invalid bridge manifest: " + validation.errors.join("; "));
  }
  if (typeof dropboxRoot !== "string" || !dropboxRoot.trim()) {
    throw new TypeError("A local Dropbox root is required");
  }
  const job = manifest.renderJobs.find(item => item.id === jobId);
  if (!job) throw new Error("Unknown render job: " + jobId);
  if (job.status !== "queued") throw new Error("Only queued render jobs can be staged");

  const payloadErrors = validatePortableJob(portableJob, manifest, job);
  if (payloadErrors.length) {
    throw new TypeError("Invalid portable render job: " + payloadErrors.join("; "));
  }

  const root = await realpath(path.resolve(dropboxRoot));
  const sourcePath = resolveDropboxUri(manifest.source.uri, root);
  const jobPath = resolveDropboxUri(job.jobUri, root);
  const outputPath = resolveDropboxUri(job.outputUri, root);
  const manifestPath = resolveDropboxUri(manifestUri, root);
  const exchangePaths = [sourcePath, jobPath, outputPath, manifestPath];
  if (new Set(exchangePaths).size !== exchangePaths.length) {
    throw new Error("Source, job, manifest, and output paths must all be distinct");
  }

  const sourceStat = await inspectNoSymlinkPath(root, sourcePath);
  if (!sourceStat.isFile()) throw new Error("Immutable source URI does not reference a regular file");
  const sourceChecksum = await hashFile(sourcePath);
  if (manifest.source.checksum &&
      sourceChecksum !== manifest.source.checksum.toLowerCase()) {
    throw new Error("Source SHA-256 does not match the immutable manifest checksum");
  }

  await ensureSafeDirectory(root, path.dirname(jobPath));
  await ensureSafeDirectory(root, path.dirname(manifestPath));
  await ensureSafeDirectory(root, path.dirname(outputPath));

  const existingJob = await inspectNoSymlinkPath(root, jobPath, true);
  const existingManifest = await inspectNoSymlinkPath(root, manifestPath, true);
  const existingOutput = await inspectNoSymlinkPath(root, outputPath, true);
  if (existingJob) throw new Error("Render-job destination already exists; refusing to overwrite");
  if (existingManifest) throw new Error("Manifest destination already exists; archive it before staging");
  if (existingOutput) throw new Error("Reserved render output already exists; refusing to overwrite");

  const jobText = JSON.stringify(portableJob, null, 2) + "\n";
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  let jobCreated = false;
  try {
    await writeExclusive(jobPath, jobText);
    jobCreated = true;
    await writeExclusive(manifestPath, manifestText);
  } catch (error) {
    if (jobCreated) await rm(jobPath, { force: true }).catch(() => {});
    throw error;
  }

  return {
    schema: "geehub.bridge-stage-receipt.v1",
    status: "staged",
    createdAt: new Date().toISOString(),
    manifestId: manifest.id,
    manifestRevision: manifest.revision,
    manifestUri,
    manifestPath,
    manifestChecksum: hashText(manifestText),
    jobId: job.id,
    jobUri: job.jobUri,
    jobPath,
    jobChecksum: hashText(jobText),
    sourceAssetId: manifest.source.id,
    sourceUri: manifest.source.uri,
    sourcePath,
    sourceChecksum,
    declaredSourceChecksum: manifest.source.checksum || null,
    outputUri: job.outputUri,
    outputPath,
    outputCreated: false
  };
}
