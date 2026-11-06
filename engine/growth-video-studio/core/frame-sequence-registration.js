/**
 * Persist verified frame-sequence sidecars and their new bridge revision.
 *
 * Sidecars are written and read back first. The immutable manifest revision is
 * written last, so consumers never discover a manifest whose evidence is only
 * partially present. Existing evidence is never replaced.
 */
import { createHash } from "node:crypto";
import { open, lstat, mkdir, realpath, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveDropboxUri } from "./bridge-exchange.js";
import { validateBridgeManifest } from "./bridge-manifest.js";

const ROLES = ["segmentation", "landmarks"];
const sha256 = value => createHash("sha256").update(value).digest("hex");
const textHash = value => createHash("sha256").update(value, "utf8").digest("hex");
const isText = value => typeof value === "string" && value.trim().length > 0;

function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

function safeSlug(value) {
  const label = String(value).normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "sequence";
  const suffix = textHash(String(value)).slice(0, 10);
  return label + "-" + suffix;
}

/** Deterministic, revisioned Dropbox destinations for one source sequence. */
export function createFrameSequenceExchangeUris(sequence, revision) {
  if (!isText(sequence?.id) || !isText(sequence?.source?.id)) {
    throw new TypeError("Sequence and source ids are required to create exchange paths");
  }
  if (!Number.isInteger(revision) || revision < 1) {
    throw new TypeError("Manifest revision must be a positive integer");
  }
  const slug = safeSlug(sequence.source.id + "-" + sequence.id);
  const base = "dropbox://GEEHUB/Bridge/evidence/" + slug + "/r" + revision;
  return {
    segmentationUri: base + "/segmentation.json",
    landmarksUri: base + "/landmarks.json",
    manifestUri: "dropbox://GEEHUB/Bridge/incoming/frame-sequences/" +
      slug + "/manifest-r" + revision + ".json"
  };
}

function inspectPreparedRegistration(prepared, manifestUri) {
  if (!prepared || prepared.pixelSemanticsVerified !== false) {
    throw new TypeError("Prepared evidence must retain pixelSemanticsVerified=false");
  }
  const manifest = prepared.manifest;
  const validation = validateBridgeManifest(manifest);
  if (!validation.valid) {
    throw new TypeError("Invalid prepared bridge manifest: " + validation.errors.join("; "));
  }
  if (!Array.isArray(prepared.frameSetIds) || prepared.frameSetIds.length !== 2 ||
      new Set(prepared.frameSetIds).size !== 2) {
    throw new TypeError("Exactly two unique prepared frame-set ids are required");
  }
  if (!Array.isArray(prepared.documents) || prepared.documents.length !== 2) {
    throw new TypeError("Exactly two frame-set sidecar documents are required");
  }
  if (!isText(manifestUri)) throw new TypeError("A versioned manifest URI is required");

  const documents = new Map();
  for (const document of prepared.documents) {
    if (!ROLES.includes(document?.role) || documents.has(document.role)) {
      throw new TypeError("Sidecars must contain one segmentation and one landmarks document");
    }
    documents.set(document.role, document);
  }
  if (ROLES.some(role => !documents.has(role))) {
    throw new TypeError("Segmentation and landmarks sidecars are both required");
  }

  const frameSets = [];
  let sequenceId = null;
  for (const role of ROLES) {
    const document = documents.get(role);
    if (!isText(document.uri) || typeof document.content !== "string" ||
        !/^[a-f0-9]{64}$/i.test(document.checksum || "")) {
      throw new TypeError("Sidecar URI, content, and SHA-256 checksum are required: " + role);
    }
    const checksum = textHash(document.content);
    if (checksum !== document.checksum.toLowerCase()) {
      throw new Error("Sidecar content checksum is incorrect: " + role);
    }
    const parsed = JSON.parse(document.content);
    if (parsed.schema !== "geehub.frame-set-evidence" || parsed.schemaVersion !== 1 ||
        parsed.role !== role || !isText(parsed.sequenceId) ||
        parsed.sourceAssetId !== manifest.source.id ||
        parsed.pixelSemanticsVerified === true ||
        !Array.isArray(parsed.frames)) {
      throw new TypeError("Sidecar evidence metadata is invalid: " + role);
    }
    if (sequenceId === null) sequenceId = parsed.sequenceId;
    else if (parsed.sequenceId !== sequenceId) {
      throw new Error("Segmentation and landmark sidecars describe different sequences");
    }

    const frameSet = manifest.frameSets.find(item =>
      item.id === prepared.frameSetIds.find(id => manifest.frameSets.some(candidate =>
        candidate.id === id && candidate.role === role
      )) && item.role === role
    );
    if (!frameSet || frameSet.uri !== document.uri ||
        frameSet.checksum?.toLowerCase() !== checksum ||
        frameSet.sourceAssetId !== manifest.source.id ||
        frameSet.metadata?.sequenceId !== parsed.sequenceId ||
        frameSet.metadata?.pixelSemanticsVerified !== false) {
      throw new Error("Sidecar does not match its immutable manifest frame set: " + role);
    }
    for (const key of ["firstFrame", "lastFrame", "frameCount", "width", "height", "fps"]) {
      if (parsed[key] !== frameSet[key]) {
        throw new Error("Sidecar and manifest disagree on " + key + ": " + role);
      }
    }
    if (parsed.frames.length !== frameSet.frameCount ||
        parsed.frames[0]?.frame !== frameSet.firstFrame ||
        parsed.frames.at(-1)?.frame !== frameSet.lastFrame) {
      throw new Error("Sidecar frame range is incomplete: " + role);
    }
    if (role === "segmentation" && parsed.pixelSemanticsVerified !== false) {
      throw new Error("Segmentation pixel semantics must remain explicitly unverified");
    }
    frameSets.push({ role, uri: document.uri, checksum, content: document.content });
  }

  if (prepared.frameSetIds.some(id =>
    !frameSets.some(item => manifest.frameSets.some(frameSet =>
      frameSet.id === id && frameSet.role === item.role
    ))
  )) {
    throw new Error("Prepared frame-set ids do not match the two sidecar roles");
  }

  const occupiedUris = [
    manifest.source.uri,
    ...manifest.frameSets.map(item => item.uri),
    ...manifest.renderJobs.flatMap(job => [job.jobUri, job.outputUri]),
    ...manifest.artifacts.map(item => item.uri)
  ].filter(isText);
  if (occupiedUris.includes(manifestUri)) {
    throw new Error("Manifest URI collides with a source, frame set, job, output, or artifact");
  }
  if (frameSets.some(item => item.uri === manifestUri)) {
    throw new Error("Manifest URI must be distinct from sidecar URIs");
  }
  return { manifest, frameSets, manifestUri, sequenceId };
}

async function ensureSafeDirectory(root, directory) {
  if (directory !== root && !within(root, directory)) {
    throw new Error("Registration directory escapes the Dropbox root");
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
      throw new Error("Registration directory contains a symlink or non-directory: " + current);
    }
  }
}

async function inspectNoSymlinkPath(root, target) {
  if (!within(root, target)) throw new Error("Registration path escapes the Dropbox root");
  const segments = path.relative(root, target).split(path.sep);
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (error.code === "ENOENT" && index === segments.length - 1) return null;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error("Registration path contains a symlink: " + current);
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error("Registration path parent is not a directory: " + current);
    }
    if (index === segments.length - 1) return stat;
  }
  return null;
}

async function writeExclusive(filePath, content) {
  const handle = await open(filePath, "wx", 0o600);
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => {});
    await rm(filePath, { force: true }).catch(() => {});
    throw error;
  }
  await handle.close();
}

async function verifyWrittenFile(root, filePath, expectedChecksum) {
  const stat = await inspectNoSymlinkPath(root, filePath);
  if (!stat?.isFile()) throw new Error("Registered evidence is not a regular file: " + filePath);
  const bytes = await readFile(filePath);
  const checksum = sha256(bytes);
  if (checksum !== expectedChecksum) {
    throw new Error("Registered evidence failed read-back checksum verification: " + filePath);
  }
  return { bytes: bytes.length, checksum };
}

async function removeCreatedFile(root, filePath, expectedChecksum) {
  try {
    const stat = await inspectNoSymlinkPath(root, filePath);
    if (!stat?.isFile()) return;
    const bytes = await readFile(filePath);
    if (sha256(bytes) === expectedChecksum) await rm(filePath);
  } catch {
    // Preserve anything that cannot be positively identified as this run's file.
  }
}

/**
 * Write both evidence sidecars, verify their actual bytes, then write the
 * versioned manifest last. All destinations must be new and unique.
 */
export async function registerFrameSequenceBridgeInputs({
  prepared,
  dropboxRoot,
  manifestUri
} = {}) {
  const checked = inspectPreparedRegistration(prepared, manifestUri);
  if (!isText(dropboxRoot)) throw new TypeError("A local Dropbox root is required");

  const root = await realpath(path.resolve(dropboxRoot));
  const manifestPath = resolveDropboxUri(checked.manifestUri, root);
  const destinations = checked.frameSets.map(item => ({
    ...item,
    path: resolveDropboxUri(item.uri, root)
  }));
  destinations.push({
    role: "manifest",
    uri: checked.manifestUri,
    path: manifestPath,
    content: JSON.stringify(checked.manifest, null, 2) + "\n"
  });

  const paths = destinations.map(item => item.path);
  if (new Set(paths).size !== paths.length) {
    throw new Error("Sidecar and manifest destinations must be distinct");
  }
  const manifestContent = destinations.at(-1).content;
  const manifestChecksum = textHash(manifestContent);
  const expected = destinations.map(item => ({
    ...item,
    checksum: item.role === "manifest" ? manifestChecksum : item.checksum
  }));

  for (const item of expected) {
    await ensureSafeDirectory(root, path.dirname(item.path));
  }
  for (const item of expected) {
    const existing = await inspectNoSymlinkPath(root, item.path);
    if (existing) {
      throw new Error("Registration destination already exists; refusing to overwrite: " + item.uri);
    }
  }

  const created = [];
  const verified = [];
  try {
    for (const item of expected.filter(entry => entry.role !== "manifest")) {
      await writeExclusive(item.path, item.content);
      created.push(item);
      const check = await verifyWrittenFile(root, item.path, item.checksum);
      verified.push({ role: item.role, uri: item.uri, path: item.path, ...check });
    }

    // The manifest becomes visible only after both sidecars have been read back.
    const manifestItem = expected.find(item => item.role === "manifest");
    await writeExclusive(manifestItem.path, manifestItem.content);
    created.push(manifestItem);
    const manifestCheck = await verifyWrittenFile(root, manifestItem.path, manifestItem.checksum);

    return {
      schema: "geehub.frame-sequence-registration-receipt.v1",
      status: "registered",
      createdAt: new Date().toISOString(),
      sequenceId: checked.sequenceId,
      sourceAssetId: checked.manifest.source.id,
      manifestId: checked.manifest.id,
      manifestRevision: checked.manifest.revision,
      manifestUri: checked.manifestUri,
      manifestPath,
      manifestChecksum: manifestCheck.checksum,
      sidecars: verified,
      pixelSemanticsVerified: false
    };
  } catch (error) {
    for (const item of [...created].reverse()) {
      await removeCreatedFile(root, item.path, item.checksum);
    }
    throw error;
  }
}
