/**
 * File-backed single-frame growth renderer.
 *
 * Inputs are immutable PNG/JSON evidence files. The worker writes a new
 * transparent body-layer PNG and an adjacent digest receipt using exclusive
 * creation; it never replaces source footage, masks, plans, or prior outputs.
 */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { decodeBinaryMaskPng } from "./mask-pixels.js";
import { decodeRgbaPng, encodeRgbaPng } from "./rgba-png.js";
import { renderGrowthDeformationPixels } from "./pixel-frame-renderer.js";

const MAX_PIXELS = 12_000_000;
const MAX_SOURCE_BYTES = 128 * 1024 * 1024;
const MAX_MASK_BYTES = 32 * 1024 * 1024;
const MAX_PLAN_BYTES = 16 * 1024 * 1024;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function validatePlan(plan) {
  if (plan?.schema !== "geehub.growth-deformation-frame" || plan.schemaVersion !== 1 ||
      plan.renderable !== true || !Number.isInteger(plan.frame) || plan.frame < 0 ||
      !Number.isFinite(plan.timeSeconds) ||
      typeof plan.topologyId !== "string" || !/^[a-f0-9]{64}$/i.test(plan.topologyId) ||
      !Array.isArray(plan.vertexIds) || !Array.isArray(plan.triangleIds) ||
      !Array.isArray(plan.sourcePoints) || !Array.isArray(plan.targetPoints) ||
      !Array.isArray(plan.triangles) || plan.vertexIds.length < 3 ||
      plan.vertexIds.length !== plan.sourcePoints.length ||
      plan.vertexIds.length !== plan.targetPoints.length ||
      plan.triangleIds.length !== plan.triangles.length ||
      new Set(plan.vertexIds).size !== plan.vertexIds.length ||
      new Set(plan.triangleIds).size !== plan.triangleIds.length) {
    fail("frame-file-plan-invalid", "A complete, ready version-one deformation plan with stable mesh identities is required");
  }
}

async function readRegularFile(filePath, label, maxBytes) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    fail("frame-file-path-invalid", label + " path must be a non-empty string");
  }
  const requested = path.resolve(filePath);
  const name = path.basename(requested);
  if (!name || name === "." || name === "..") {
    fail("frame-file-path-invalid", label + " path must identify a file");
  }
  const parent = await realpath(path.dirname(requested));
  const target = path.join(parent, name);
  const beforePath = await lstat(target);
  if (beforePath.isSymbolicLink() || !beforePath.isFile()) {
    fail("frame-file-input-not-regular", label + " must be a regular file, not a symlink");
  }

  let handle;
  try {
    const noFollow = constants.O_NOFOLLOW ?? 0;
    handle = await open(target, constants.O_RDONLY | noFollow);
    const before = await handle.stat();
    if (!before.isFile() || before.size > maxBytes) {
      fail("frame-file-input-too-large", label + " is not a regular file or exceeds its byte limit");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.length !== after.size || before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      fail("frame-file-input-changed", label + " changed while it was being read");
    }
    return { path: target, bytes, sha256: sha256(bytes) };
  } finally {
    if (handle) await handle.close();
  }
}

async function resolveOutputPath(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    fail("frame-file-output-path-invalid", "Output path must be a non-empty string");
  }
  const requested = path.resolve(filePath);
  const name = path.basename(requested);
  if (!name || name === "." || name === "..") {
    fail("frame-file-output-path-invalid", "Output path must identify a file");
  }
  const parent = await realpath(path.dirname(requested));
  const parentStat = await stat(parent);
  if (!parentStat.isDirectory()) fail("frame-file-output-parent-invalid", "Output parent must be an existing directory");
  return path.join(parent, name);
}

async function removeIfSameFile(filePath, identity) {
  if (!identity) return;
  try {
    const current = await lstat(filePath);
    if (!current.isSymbolicLink() && current.isFile() &&
        current.dev === identity.dev && current.ino === identity.ino) {
      await unlink(filePath);
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
    const created = await handle.stat();
    identity = { dev: created.dev, ino: created.ino };
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    return identity;
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await removeIfSameFile(filePath, identity).catch(() => {});
    throw error;
  }
}

/**
 * Render one source PNG using its exact frame masks and a serialized plan.
 *
 * The output PNG and <output>.receipt.json must not already exist. Their
 * parent directory must already exist. The plan must be a serialized
 * geehub.growth-deformation-frame produced by the sequence deformation pass.
 */
export async function renderGrowthFrameFiles({
  sourcePath,
  bodyMaskPath,
  protectedFaceMaskPath,
  planPath,
  outputPath
} = {}) {
  const [sourceFile, bodyMaskFile, faceMaskFile, planFile] = await Promise.all([
    readRegularFile(sourcePath, "Source PNG", MAX_SOURCE_BYTES),
    readRegularFile(bodyMaskPath, "Body mask PNG", MAX_MASK_BYTES),
    readRegularFile(protectedFaceMaskPath, "Protected-face mask PNG", MAX_MASK_BYTES),
    readRegularFile(planPath, "Deformation plan", MAX_PLAN_BYTES)
  ]);
  const inputPaths = [sourceFile.path, bodyMaskFile.path, faceMaskFile.path, planFile.path];
  if (new Set(inputPaths).size !== inputPaths.length) {
    fail("frame-file-input-path-collision", "Source, masks, and deformation plan must be separate files");
  }

  let plan;
  try {
    plan = JSON.parse(planFile.bytes.toString("utf8"));
  } catch (error) {
    fail("frame-file-plan-json-invalid", "Deformation plan JSON is invalid: " + error.message);
  }
  validatePlan(plan);

  const source = decodeRgbaPng(sourceFile.bytes, { maxPixels: MAX_PIXELS, maxBytes: MAX_SOURCE_BYTES });
  const body = decodeBinaryMaskPng(bodyMaskFile.bytes, { maxPixels: MAX_PIXELS });
  const face = decodeBinaryMaskPng(faceMaskFile.bytes, { maxPixels: MAX_PIXELS });
  if (body.width !== source.width || body.height !== source.height ||
      face.width !== source.width || face.height !== source.height) {
    fail("frame-file-mask-dimensions-mismatch", "Source, body mask, and protected-face mask dimensions must match");
  }

  const layer = renderGrowthDeformationPixels({
    sourceFrame: {
      frame: plan.frame,
      width: source.width,
      height: source.height,
      data: source.data
    },
    plan,
    bodyMask: { frame: plan.frame, width: body.width, height: body.height, pixels: body.pixels },
    protectedFaceMask: { frame: plan.frame, width: face.width, height: face.height, pixels: face.pixels }
  });
  const outputBytes = encodeRgbaPng({ width: layer.width, height: layer.height, data: layer.data }, {
    maxPixels: MAX_PIXELS,
    maxBytes: MAX_SOURCE_BYTES
  });
  const outputSha256 = sha256(outputBytes);
  const outputTarget = await resolveOutputPath(outputPath);
  const receiptTarget = outputTarget + ".receipt.json";
  if (inputPaths.includes(outputTarget) || inputPaths.includes(receiptTarget)) {
    fail("frame-file-output-path-collision", "Output and receipt paths must not replace any input file");
  }

  const receipt = {
    schema: "geehub.growth-frame-file-receipt.v1",
    status: "written",
    frame: plan.frame,
    timeSeconds: plan.timeSeconds,
    topologyId: plan.topologyId,
    vertexCount: plan.vertexIds.length,
    triangleCount: plan.triangles.length,
    inputs: {
      sourceFrame: { file: path.basename(sourceFile.path), sha256: sourceFile.sha256 },
      bodyMask: { file: path.basename(bodyMaskFile.path), sha256: bodyMaskFile.sha256 },
      protectedFaceMask: { file: path.basename(faceMaskFile.path), sha256: faceMaskFile.sha256 },
      deformationPlan: { file: path.basename(planFile.path), sha256: planFile.sha256 }
    },
    output: {
      file: path.basename(outputTarget),
      path: outputTarget,
      sha256: outputSha256,
      byteLength: outputBytes.length,
      encoding: "png/rgba8"
    },
    raster: {
      coveredPixels: layer.coveredPixels,
      renderedTriangles: layer.renderedTriangles,
      interpolation: layer.interpolation,
      pixelSemanticsVerified: false
    },
    sourceFrameUnmodified: true,
    outputCreatedExclusively: true,
    note: "This artifact is a transparent warped body layer, not a complete frame. Background reconstruction and protected-face compositing remain separate stages."
  };
  const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");

  let outputIdentity;
  try {
    outputIdentity = await writeExclusive(outputTarget, outputBytes);
    await writeExclusive(receiptTarget, receiptBytes);
  } catch (error) {
    await removeIfSameFile(outputTarget, outputIdentity).catch(() => {});
    throw error;
  }

  return { ...receipt, receiptPath: receiptTarget, receiptSha256: sha256(receiptBytes) };
}
