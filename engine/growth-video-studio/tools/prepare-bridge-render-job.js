#!/usr/bin/env node
import { createHash } from "node:crypto";
import { open, lstat, mkdir, realpath, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { resolveDropboxUri } from "../core/bridge-exchange.js";
import { prepareBridgeRenderJob } from "../core/bridge-render-job.js";

const usage = [
  "Usage:",
  "  npm run prepare:render -- <registered-manifest.json> <growth-states.json> <job-id> <bundle-directory> [sequence-id]",
  "",
  "The growth-states file must contain an array of approved, cumulative growth states.",
  "The command reads the registered segmentation and landmark sidecars from the local Dropbox mirror.",
  "It writes a portable job and a new queued manifest into a new, non-overwriting bundle.",
  "",
  "Environment:",
  "  GEEHUB_DROPBOX_ROOT       Local Dropbox root (defaults to the standard macOS location)",
  "  GEEHUB_RENDER_JOB_URI     Optional job URI override",
  "  GEEHUB_RENDER_OUTPUT_URI  Optional output URI override",
  "  GEEHUB_RENDERER           Renderer label (defaults to resolve-free handoff)"
].join("\n");

const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex");

function slug(value) {
  const result = String(value).normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  if (!result) throw new TypeError("Job id must contain letters or numbers");
  return result;
}

async function readSafeDropboxText(uri, root) {
  const target = resolveDropboxUri(uri, root);
  const relative = path.relative(root, target);
  let current = root;
  const parts = relative.split(path.sep);
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error("Sidecar path contains a symlink: " + current);
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new Error("Sidecar parent is not a directory: " + current);
    }
    if (index === parts.length - 1 && !stat.isFile()) {
      throw new Error("Sidecar is not a regular file: " + current);
    }
  }
  return readFile(target, "utf8");
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

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write(usage + "\n");
    return;
  }
  if (args.length < 4 || args.length > 5) {
    process.stderr.write(usage + "\n");
    process.exitCode = 2;
    return;
  }
  const [manifestFile, growthFile, jobId, requestedBundle, sequenceId] = args;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const dropboxRoot = await realpath(path.resolve(process.env.GEEHUB_DROPBOX_ROOT ||
    path.join(home, "Library", "CloudStorage", "Dropbox")));
  const manifest = JSON.parse(await readFile(path.resolve(manifestFile), "utf8"));
  const growthInput = JSON.parse(await readFile(path.resolve(growthFile), "utf8"));
  const growthStates = Array.isArray(growthInput) ? growthInput : growthInput.states;
  if (!Array.isArray(growthStates)) {
    throw new TypeError("Growth-states JSON must be an array or an object with a states array");
  }

  const sequenceFrameSets = manifest.frameSets.filter(item =>
    (!sequenceId || item.metadata?.sequenceId === sequenceId) &&
    (item.role === "segmentation" || item.role === "landmarks"));
  const segmentation = sequenceFrameSets.filter(item => item.role === "segmentation");
  const landmarks = sequenceFrameSets.filter(item => item.role === "landmarks");
  if (segmentation.length !== 1 || landmarks.length !== 1) {
    throw new Error("Manifest must identify exactly one segmentation/landmarks pair; supply sequence-id when multiple sequences exist");
  }
  const segmentationSidecar = await readSafeDropboxText(segmentation[0].uri, dropboxRoot);
  const landmarksSidecar = await readSafeDropboxText(landmarks[0].uri, dropboxRoot);
  const jobSlug = slug(jobId);
  const jobUri = process.env.GEEHUB_RENDER_JOB_URI ||
    "dropbox://GEEHUB/Bridge/incoming/jobs/" + jobSlug + ".json";
  const outputUri = process.env.GEEHUB_RENDER_OUTPUT_URI ||
    "dropbox://GEEHUB/Exports/" + jobSlug + ".mp4";

  const prepared = prepareBridgeRenderJob({
    manifest,
    segmentationSidecar,
    landmarksSidecar,
    growthStates,
    sequenceId,
    jobId,
    jobUri,
    outputUri,
    renderer: process.env.GEEHUB_RENDERER || "resolve-free"
  });

  const requestedPath = path.resolve(requestedBundle);
  if (!path.basename(requestedPath) || path.basename(requestedPath) === "." || path.basename(requestedPath) === "..") {
    throw new TypeError("Bundle directory must be a named child of its parent directory");
  }
  await mkdir(path.dirname(requestedPath), { recursive: true });
  const parent = await realpath(path.dirname(requestedPath));
  const bundleDirectory = path.join(parent, path.basename(requestedPath));
  try {
    await mkdir(bundleDirectory);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const directoryStat = await lstat(bundleDirectory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error("Bundle destination must be a real directory, not a symlink");
  }

  const jobPath = path.join(bundleDirectory, jobSlug + ".render-job.json");
  const manifestPath = path.join(bundleDirectory, jobSlug + ".manifest.json");
  const jobText = JSON.stringify(prepared.portableJob, null, 2) + "\n";
  const manifestText = JSON.stringify(prepared.manifest, null, 2) + "\n";
  let jobCreated = false;
  try {
    await writeExclusive(jobPath, jobText);
    jobCreated = true;
    await writeExclusive(manifestPath, manifestText);
  } catch (error) {
    if (jobCreated) {
      const current = await readFile(jobPath, "utf8").catch(() => null);
      if (current !== null && sha256(current) === sha256(jobText)) {
        await rm(jobPath, { force: true }).catch(() => {});
      }
    }
    throw error;
  }

  const shellQuote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
  process.stdout.write(JSON.stringify({
    schema: "geehub.render-job-preparation-receipt.v1",
    status: "prepared",
    jobId: prepared.jobId,
    sequenceId: prepared.sequenceId,
    frameCount: prepared.frameCount,
    manifestRevision: prepared.manifest.revision,
    jobFile: jobPath,
    manifestFile: manifestPath,
    jobUri,
    outputUri,
    pixelSemanticsVerified: false,
    nextCommand: "npm run stage:bridge -- " + shellQuote(manifestPath) + " " +
      shellQuote(jobPath) + " " + shellQuote(prepared.jobId)
  }, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write("[GEEHUB RENDER PREPARATION] " + error.message + "\n");
  process.exitCode = 1;
});
