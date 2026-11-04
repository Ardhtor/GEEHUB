/** Local file verifier for a GEEHUB frame-sequence envelope. */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { resolveDropboxUri } from "./bridge-exchange.js";
import { validateFrameSequencePackage } from "./frame-sequence.js";

const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
};

async function inspectRegularFile(root, target) {
  if (!within(root, target)) throw new Error("Mask path escapes Dropbox root");
  const segments = path.relative(root, target).split(path.sep);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error("Mask path contains a symlink: " + current);
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error("Mask path parent is not a directory: " + current);
    }
    if (index === segments.length - 1 && !stat.isFile()) {
      throw new Error("Mask path is not a regular file: " + current);
    }
  }
}

async function readPngDimensions(filePath) {
  const handle = await open(filePath, "r");
  try {
    const header = Buffer.alloc(24);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (bytesRead !== 24 || !header.subarray(0, 8).equals(signature) ||
        header.toString("ascii", 12, 16) !== "IHDR") {
      throw new Error("Mask is not a PNG with a readable IHDR header");
    }
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } finally {
    await handle.close();
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

/** Verify actual mask files, declared checksums, and PNG dimensions. */
export async function inspectFrameSequenceFiles(sequence, { dropboxRoot } = {}) {
  const validation = validateFrameSequencePackage(sequence);
  const errors = [...validation.errors];
  const verifiedMasks = [];
  if (!validation.valid) {
    return {
      schema: "geehub.frame-sequence-audit.v1",
      status: "blocked",
      readyForGeometry: false,
      validation,
      fileVerification: { checked: 0, verified: 0, masks: [] },
      errors,
      pixelSemanticsVerified: false
    };
  }
  if (typeof dropboxRoot !== "string" || !dropboxRoot.trim()) {
    throw new TypeError("A local Dropbox root is required");
  }
  const root = await realpath(path.resolve(dropboxRoot));
  for (const frame of sequence.frames) {
    for (const role of ["body", "face"]) {
      const mask = frame.segmentation?.[role + "Mask"];
      if (!mask) continue;
      try {
        const filePath = resolveDropboxUri(mask.uri, root);
        await inspectRegularFile(root, filePath);
        const dimensions = await readPngDimensions(filePath);
        if (dimensions.width !== sequence.format.width || dimensions.height !== sequence.format.height) {
          throw new Error("PNG dimensions do not match the source frame");
        }
        const checksum = await sha256File(filePath);
        if (checksum !== mask.checksum.toLowerCase()) {
          throw new Error("PNG SHA-256 does not match the segmentation descriptor");
        }
        verifiedMasks.push({
          frame: frame.frame,
          role,
          uri: mask.uri,
          checksum,
          width: dimensions.width,
          height: dimensions.height
        });
      } catch (error) {
        errors.push({ frame: frame.frame, role, code: "mask-file-verification-failed", detail: error.message });
      }
    }
  }
  const expected = sequence.frames.length * 2;
  const readyForGeometry = validation.structurallyReady && errors.length === 0 && verifiedMasks.length === expected;
  return {
    schema: "geehub.frame-sequence-audit.v1",
    status: readyForGeometry ? "ready-for-geometry" : "blocked",
    readyForGeometry,
    sequenceId: sequence.id,
    sourceAssetId: sequence.source.id,
    frameCount: sequence.frames.length,
    format: sequence.format,
    validation,
    fileVerification: { checked: expected, verified: verifiedMasks.length, masks: verifiedMasks },
    errors,
    pixelSemanticsVerified: false,
    note: "PNG headers, dimensions, and file checksums are verified. Mask pixel meaning and face exclusion remain producer assertions; no pixels are decoded or altered."
  };
}
