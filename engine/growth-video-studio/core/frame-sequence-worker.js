/** Local file and pixel verifier for a GEEHUB frame-sequence envelope. */
import { createHash } from "node:crypto";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { resolveDropboxUri } from "./bridge-exchange.js";
import { validateFrameSequencePackage } from "./frame-sequence.js";
import { decodeBinaryMaskPng } from "./mask-pixels.js";

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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function countOverlap(first, second) {
  let overlap = 0;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] === 255 && second[index] === 255) overlap += 1;
  }
  return overlap;
}

/**
 * Verify actual mask bytes, binary grayscale pixels, and body/face separation.
 *
 * A disjoint pair proves only that the supplied masks do not overlap. It does
 * not independently prove that the upstream model segmented the right anatomy.
 */
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
      maskPixelAudit: { encoding: "png/grayscale8/binary", pairsChecked: 0, disjointPairs: 0, overlapPixels: 0, frames: [] },
      pixelDataVerified: false,
      faceExclusionVerified: false,
      pixelSemanticsVerified: false,
      errors
    };
  }
  if (typeof dropboxRoot !== "string" || !dropboxRoot.trim()) {
    throw new TypeError("A local Dropbox root is required");
  }
  const root = await realpath(path.resolve(dropboxRoot));
  const decodedByFrame = new Map();

  for (const frame of sequence.frames) {
    for (const role of ["body", "face"]) {
      const mask = frame.segmentation?.[role + "Mask"];
      if (!mask) continue;
      try {
        const filePath = resolveDropboxUri(mask.uri, root);
        await inspectRegularFile(root, filePath);
        const bytes = await readFile(filePath);
        const checksum = sha256(bytes);
        if (checksum !== mask.checksum.toLowerCase()) {
          const error = new Error("PNG SHA-256 does not match the segmentation descriptor");
          error.code = "mask-checksum-mismatch";
          throw error;
        }
        const decoded = decodeBinaryMaskPng(bytes);
        if (decoded.width !== sequence.format.width || decoded.height !== sequence.format.height) {
          const error = new Error("PNG dimensions do not match the source frame");
          error.code = "mask-dimensions-mismatch";
          throw error;
        }
        verifiedMasks.push({
          frame: frame.frame,
          role,
          uri: mask.uri,
          checksum,
          width: decoded.width,
          height: decoded.height,
          encoding: decoded.encoding,
          foregroundPixels: decoded.foregroundPixels,
          foregroundRatio: decoded.foregroundRatio,
          bounds: decoded.bounds
        });
        const pair = decodedByFrame.get(frame.frame) || {};
        pair[role] = decoded;
        decodedByFrame.set(frame.frame, pair);
      } catch (error) {
        errors.push({
          frame: frame.frame,
          role,
          code: error.code || "mask-file-verification-failed",
          detail: error.message
        });
      }
    }
  }

  let pairsChecked = 0;
  let disjointPairs = 0;
  let overlapPixels = 0;
  const pixelFrames = [];
  for (const frame of sequence.frames) {
    const pair = decodedByFrame.get(frame.frame);
    if (!pair?.body || !pair?.face) continue;
    pairsChecked += 1;
    const emptyRoles = [];
    if (pair.body.foregroundPixels === 0) emptyRoles.push("body");
    if (pair.face.foregroundPixels === 0) emptyRoles.push("face");
    if (emptyRoles.length) {
      errors.push({
        frame: frame.frame,
        code: "mask-empty",
        roles: emptyRoles,
        detail: "Body and face masks must each contain foreground pixels"
      });
    }
    const overlap = countOverlap(pair.body.pixels, pair.face.pixels);
    overlapPixels += overlap;
    if (overlap > 0) {
      errors.push({
        frame: frame.frame,
        code: "body-face-mask-overlap",
        pixels: overlap,
        detail: "Body and protected-face masks must be disjoint"
      });
    } else {
      disjointPairs += 1;
    }
    pixelFrames.push({
      frame: frame.frame,
      bodyForegroundPixels: pair.body.foregroundPixels,
      faceForegroundPixels: pair.face.foregroundPixels,
      overlapPixels: overlap
    });
  }

  const expected = sequence.frames.length * 2;
  const pixelDataVerified = verifiedMasks.length === expected;
  const faceExclusionVerified = pairsChecked === sequence.frames.length &&
    disjointPairs === pairsChecked &&
    !errors.some(error => error.code === "mask-empty");
  const readyForGeometry = validation.structurallyReady &&
    errors.length === 0 && pixelDataVerified && faceExclusionVerified;

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
    maskPixelAudit: {
      encoding: "png/grayscale8/binary",
      pairsChecked,
      disjointPairs,
      overlapPixels,
      frames: pixelFrames
    },
    pixelDataVerified,
    faceExclusionVerified,
    pixelSemanticsVerified: false,
    errors,
    note: "Actual grayscale mask pixels are decoded, required to be binary and non-empty, and body/face masks are checked for overlap. Disjointness does not prove that the upstream model segmented the correct anatomy; semantic correctness remains unverified. No image pixels are altered."
  };
}
