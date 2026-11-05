/**
 * Versioned exchange manifest between the GEEHUB director, frame workers,
 * local storage, and Resolve. References are portable URIs; media bytes stay
 * outside Git. Every mutation returns a new revision and preserves the source.
 */
export const BRIDGE_SCHEMA = "geehub.media-bridge";
export const BRIDGE_SCHEMA_VERSION = 1;

export const FRAME_SET_ROLES = Object.freeze([
  "segmentation", "landmarks", "depth", "deformation", "composite", "preview"
]);

const JOB_STATUSES = Object.freeze(["queued", "running", "completed", "failed"]);
const clone = value => structuredClone(value);
const makeId = prefix => prefix + "-" +
  (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
const now = () => new Date().toISOString();
const nonEmpty = value => typeof value === "string" && value.trim().length > 0;
const positiveInt = value => Number.isInteger(value) && value > 0;
const sha256 = value => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

function assertSource(source) {
  if (!source || !nonEmpty(source.id)) throw new TypeError("Source asset id is required");
  if (!nonEmpty(source.name) || !nonEmpty(source.uri)) throw new TypeError("Source name and URI are required");
  if (!Number.isFinite(source.duration) || source.duration <= 0) throw new TypeError("Source duration must be positive");
  if (!positiveInt(source.width) || !positiveInt(source.height)) throw new TypeError("Source dimensions must be positive integers");
  if (source.immutable === false) throw new TypeError("Bridge source must be immutable");
  if (source.checksum !== undefined && !sha256(source.checksum)) throw new TypeError("Source checksum must be a SHA-256 hex digest");
}

function uriTaken(manifest, uri) {
  if (manifest.source.uri === uri) return true;
  if (manifest.frameSets.some(item => item.uri === uri)) return true;
  return manifest.renderJobs.some(job => job.jobUri === uri || job.outputUri === uri) ||
    manifest.artifacts.some(item => item.uri === uri);
}


function requiredFrameSetErrors(inputFrameSetIds, frameSets) {
  const errors = [];
  const selected = (Array.isArray(frameSets) ? frameSets : [])
    .filter(frameSet => Array.isArray(inputFrameSetIds) && inputFrameSetIds.includes(frameSet.id));
  const segmentation = selected.filter(frameSet => frameSet.role === "segmentation");
  const landmarks = selected.filter(frameSet => frameSet.role === "landmarks");
  if (segmentation.length !== 1) errors.push("requires exactly one segmentation frame set");
  if (landmarks.length !== 1) errors.push("requires exactly one landmarks frame set");
  if (segmentation.length === 1 && landmarks.length === 1) {
    const a = segmentation[0];
    const b = landmarks[0];
    if (!sha256(a.checksum) || !sha256(b.checksum)) {
      errors.push("segmentation and landmarks frame sets require SHA-256 checksums");
    }
    for (const key of ["firstFrame", "lastFrame", "frameCount", "width", "height", "fps"]) {
      if (a[key] !== b[key]) {
        errors.push("segmentation and landmarks frame sets disagree on " + key);
      }
    }
    if (!nonEmpty(a.metadata?.sequenceId) || a.metadata.sequenceId !== b.metadata?.sequenceId) {
      errors.push("segmentation and landmarks frame sets must share a sequenceId");
    }
  }
  return errors;
}

function appendRevision(manifest, type, details, apply) {
  const current = validateBridgeManifest(manifest);
  if (!current.valid) throw new TypeError("Cannot mutate invalid bridge manifest: " + current.errors.join("; "));
  const next = clone(manifest);
  const revision = manifest.revision + 1;
  apply(next);
  next.parentRevision = manifest.revision;
  next.revision = revision;
  next.updatedAt = now();
  next.events.push({ revision, type, at: next.updatedAt, ...clone(details) });
  const result = validateBridgeManifest(next);
  if (!result.valid) throw new TypeError("Bridge mutation would create an invalid manifest: " + result.errors.join("; "));
  return next;
}

/** Create the first immutable exchange record for one source clip. */
export function createBridgeManifest({ projectId, projectVersion = "v000", source, manifestId } = {}) {
  if (!nonEmpty(projectId)) throw new TypeError("Project id is required");
  if (!nonEmpty(projectVersion)) throw new TypeError("Project version is required");
  assertSource(source);
  const timestamp = now();
  const manifest = {
    schema: BRIDGE_SCHEMA,
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    id: nonEmpty(manifestId) ? manifestId : makeId("bridge"),
    project: { id: projectId, version: projectVersion },
    revision: 0,
    parentRevision: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: { ...clone(source), immutable: true },
    frameSets: [],
    renderJobs: [],
    artifacts: [],
    events: [{
      revision: 0,
      type: "manifest-created",
      at: timestamp,
      sourceAssetId: source.id
    }]
  };
  const validation = validateBridgeManifest(manifest);
  if (!validation.valid) throw new TypeError(validation.errors.join("; "));
  return manifest;
}

/** Register a measured frame sequence without copying the image data into Git. */
export function addBridgeFrameSet(manifest, input) {
  if (!input || !FRAME_SET_ROLES.includes(input.role)) throw new TypeError("Unsupported frame-set role");
  const id = input.id || makeId("frames");
  const firstFrame = input.firstFrame ?? 0;
  const lastFrame = input.lastFrame ?? firstFrame + input.frameCount - 1;
  if (!nonEmpty(id) || !nonEmpty(input.uri)) throw new TypeError("Frame-set id and URI are required");
  if (!Number.isInteger(firstFrame) || firstFrame < 0) throw new TypeError("First frame must be a non-negative integer");
  if (!positiveInt(input.frameCount) || !Number.isInteger(lastFrame) ||
      lastFrame < firstFrame || lastFrame - firstFrame + 1 !== input.frameCount) {
    throw new TypeError("Frame range must match frameCount");
  }
  if (!positiveInt(input.width) || !positiveInt(input.height)) throw new TypeError("Frame-set dimensions must be positive integers");
  if (!Number.isFinite(input.fps) || input.fps <= 0) throw new TypeError("Frame-set FPS must be positive");
  if (input.checksum !== undefined && !sha256(input.checksum)) throw new TypeError("Frame-set checksum must be a SHA-256 hex digest");
  if (uriTaken(manifest, input.uri)) throw new Error("Frame-set URI is already reserved");
  const frameSet = {
    id, role: input.role, uri: input.uri, sourceAssetId: manifest.source.id,
    firstFrame, lastFrame, frameCount: input.frameCount,
    width: input.width, height: input.height, fps: input.fps,
    checksum: input.checksum || null,
    immutable: true,
    metadata: clone(input.metadata || {}),
    createdAt: now()
  };
  return appendRevision(manifest, "frame-set-registered", { frameSetId: id, role: input.role }, next => {
    if (next.frameSets.some(item => item.id === id)) throw new Error("Frame-set id already exists");
    next.frameSets.push(frameSet);
  });
}

/**
 * Queue an existing portable render-job payload for exchange. The job JSON is
 * written by the caller to jobUri; this manifest records its contract and
 * reserves a distinct output URI so source footage cannot be overwritten.
 */
export function queueBridgeRenderJob(manifest, {
  id = makeId("render"),
  jobUri,
  portableJob,
  inputFrameSetIds = [],
  outputUri,
  renderer = "geehub-frame-worker"
} = {}) {
  if (!nonEmpty(id) || !nonEmpty(jobUri) || !nonEmpty(outputUri)) {
    throw new TypeError("Render job id, job URI, and output URI are required");
  }
  if (jobUri === outputUri || uriTaken(manifest, jobUri) || uriTaken(manifest, outputUri)) {
    throw new Error("Render job and output URIs must be new, distinct exchange paths");
  }
  if (!portableJob || portableJob.schema !== "geehub.growth-render-job" ||
      portableJob.schemaVersion !== 1 || portableJob.status !== "ready-for-renderer") {
    throw new TypeError("A validated GEEHUB growth render job is required");
  }
  const jobSource = portableJob.source;
  if (!jobSource || jobSource.name !== manifest.source.name ||
      jobSource.width !== manifest.source.width ||
      jobSource.height !== manifest.source.height ||
      !Number.isFinite(jobSource.duration) ||
      Math.abs(jobSource.duration - manifest.source.duration) > 1e-6) {
    throw new Error("Render job source does not match the immutable bridge source");
  }
  if (!Array.isArray(portableJob.growthStates) || portableJob.growthStates.length < 2 ||
      !Array.isArray(portableJob.landmarkFrames) || portableJob.landmarkFrames.length < 2) {
    throw new Error("Render job must contain growth states and landmark evidence");
  }
  if (!portableJob.output || !positiveInt(portableJob.output.width) ||
      !positiveInt(portableJob.output.height) || !Number.isFinite(portableJob.output.fps) ||
      portableJob.output.fps <= 0) {
    throw new TypeError("Render job output format is incomplete");
  }
  if (!Array.isArray(inputFrameSetIds) || new Set(inputFrameSetIds).size !== inputFrameSetIds.length) {
    throw new TypeError("Frame-set references must be a unique array");
  }
  const available = new Set(manifest.frameSets.map(item => item.id));
  for (const frameSetId of inputFrameSetIds) {
    if (!available.has(frameSetId)) throw new Error("Unknown input frame set: " + frameSetId);
  }
  const requiredInputErrors = requiredFrameSetErrors(inputFrameSetIds, manifest.frameSets);
  if (requiredInputErrors.length) throw new Error("Render job " + requiredInputErrors.join("; "));
  if (!nonEmpty(renderer)) throw new TypeError("Renderer name is required");

  const job = {
    id,
    jobUri,
    jobSchema: portableJob.schema,
    jobSchemaVersion: portableJob.schemaVersion,
    sourceAssetId: manifest.source.id,
    inputFrameSetIds: [...inputFrameSetIds],
    outputUri,
    output: clone(portableJob.output),
    renderer,
    status: "queued",
    artifactId: null,
    error: null,
    createdAt: now(),
    startedAt: null,
    completedAt: null
  };
  return appendRevision(manifest, "render-job-queued", {
    jobId: id, sourceAssetId: manifest.source.id, outputUri
  }, next => {
    if (next.renderJobs.some(item => item.id === id)) throw new Error("Render job id already exists");
    next.renderJobs.push(job);
  });
}

/** Mark a queued job as started by a local or remote renderer. */
export function startBridgeRenderJob(manifest, jobId) {
  return appendRevision(manifest, "render-job-started", { jobId }, next => {
    const job = next.renderJobs.find(item => item.id === jobId);
    if (!job) throw new Error("Unknown render job: " + jobId);
    if (job.status !== "queued") throw new Error("Only queued render jobs can start");
    job.status = "running";
    job.startedAt = now();
  });
}

/** Record failure without fabricating an output artifact. */
export function failBridgeRenderJob(manifest, jobId, error) {
  if (!nonEmpty(error)) throw new TypeError("A failure reason is required");
  return appendRevision(manifest, "render-job-failed", { jobId, error }, next => {
    const job = next.renderJobs.find(item => item.id === jobId);
    if (!job) throw new Error("Unknown render job: " + jobId);
    if (job.status !== "running") throw new Error("Only running render jobs can fail");
    job.status = "failed";
    job.error = error;
  });
}

/** Complete a running job when its reserved output has a caller-supplied SHA-256 digest. The manifest checks digest format; it never reads media bytes. */
export function completeBridgeRenderJob(manifest, jobId, artifactInput) {
  const job = manifest.renderJobs.find(item => item.id === jobId);
  if (!job) throw new Error("Unknown render job: " + jobId);
  if (job.status !== "running") throw new Error("Only running render jobs can complete");
  if (!artifactInput || !nonEmpty(artifactInput.id) ||
      artifactInput.uri !== job.outputUri || !nonEmpty(artifactInput.mediaType) ||
      !sha256(artifactInput.checksum)) {
    throw new TypeError("Artifact must match the reserved output URI and include mediaType and SHA-256 checksum");
  }
  const artifact = {
    id: artifactInput.id,
    jobId,
    sourceAssetId: job.sourceAssetId,
    uri: artifactInput.uri,
    mediaType: artifactInput.mediaType,
    checksumAlgorithm: "sha256",
    checksum: artifactInput.checksum.toLowerCase(),
    metadata: clone(artifactInput.metadata || {}),
    immutable: true,
    createdAt: now()
  };
  return appendRevision(manifest, "render-artifact-recorded", {
    jobId, artifactId: artifact.id, uri: artifact.uri
  }, next => {
    const target = next.renderJobs.find(item => item.id === jobId);
    if (next.artifacts.some(item => item.id === artifact.id)) throw new Error("Artifact id already exists");
    target.status = "completed";
    target.artifactId = artifact.id;
    target.completedAt = now();
    target.error = null;
    next.artifacts.push(artifact);
  });
}

/** Validate the full exchange graph before a worker or Resolve consumes it. */
export function validateBridgeManifest(manifest) {
  const errors = [];
  if (manifest?.schema !== BRIDGE_SCHEMA) errors.push("Unsupported bridge schema");
  if (manifest?.schemaVersion !== BRIDGE_SCHEMA_VERSION) errors.push("Unsupported bridge schema version");
  if (!nonEmpty(manifest?.id)) errors.push("Manifest id is missing");
  if (!nonEmpty(manifest?.project?.id) || !nonEmpty(manifest?.project?.version)) errors.push("Project reference is incomplete");
  if (!Number.isInteger(manifest?.revision) || manifest.revision < 0) errors.push("Manifest revision is invalid");
  if (manifest?.revision === 0 && manifest.parentRevision !== null) errors.push("Initial revision cannot have a parent");
  if (manifest?.revision > 0 && manifest.parentRevision !== manifest.revision - 1) errors.push("Parent revision is inconsistent");
  if (!nonEmpty(manifest?.createdAt) || !nonEmpty(manifest?.updatedAt)) errors.push("Manifest timestamps are incomplete");
  try { assertSource(manifest?.source); } catch (error) { errors.push(error.message); }
  if (manifest?.source?.immutable !== true) errors.push("Source reference must remain immutable");

  for (const field of ["frameSets", "renderJobs", "artifacts", "events"]) {
    if (!Array.isArray(manifest?.[field])) errors.push(field + " must be an array");
  }
  const frameSets = Array.isArray(manifest?.frameSets) ? manifest.frameSets : [];
  const jobs = Array.isArray(manifest?.renderJobs) ? manifest.renderJobs : [];
  const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  const events = Array.isArray(manifest?.events) ? manifest.events : [];
  const frameIds = new Set();
  const jobIds = new Set();
  const artifactIds = new Set();
  const assetIds = new Set(manifest?.source?.id ? [manifest.source.id] : []);
  const uris = new Map();

  const reserve = (uri, owner) => {
    if (!nonEmpty(uri)) { errors.push(owner + " URI is missing"); return; }
    if (uris.has(uri)) errors.push("URI collision between " + uris.get(uri) + " and " + owner + ": " + uri);
    else uris.set(uri, owner);
  };
  if (manifest?.source?.uri) reserve(manifest.source.uri, "source");

  for (const frameSet of frameSets) {
    if (!nonEmpty(frameSet.id) || frameIds.has(frameSet.id) || assetIds.has(frameSet.id)) errors.push("Missing or duplicate frame-set id: " + frameSet.id);
    frameIds.add(frameSet.id);
    assetIds.add(frameSet.id);
    if (!FRAME_SET_ROLES.includes(frameSet.role)) errors.push("Unknown frame-set role: " + frameSet.role);
    if (frameSet.sourceAssetId !== manifest?.source?.id) errors.push("Frame set has a foreign source reference: " + frameSet.id);
    if (!positiveInt(frameSet.frameCount) || !Number.isInteger(frameSet.firstFrame) ||
        !Number.isInteger(frameSet.lastFrame) || frameSet.firstFrame < 0 ||
        frameSet.lastFrame - frameSet.firstFrame + 1 !== frameSet.frameCount) errors.push("Invalid frame range: " + frameSet.id);
    if (!positiveInt(frameSet.width) || !positiveInt(frameSet.height) ||
        !Number.isFinite(frameSet.fps) || frameSet.fps <= 0) errors.push("Invalid frame-set format: " + frameSet.id);
    if (frameSet.checksum !== null && frameSet.checksum !== undefined && !sha256(frameSet.checksum)) errors.push("Invalid frame-set checksum: " + frameSet.id);
    if (frameSet.immutable !== true) errors.push("Frame set must be immutable: " + frameSet.id);
    reserve(frameSet.uri, "frame-set " + frameSet.id);
  }

  const jobsById = new Map();
  for (const job of jobs) {
    if (!nonEmpty(job.id) || jobIds.has(job.id)) errors.push("Missing or duplicate render-job id: " + job.id);
    jobIds.add(job.id);
    jobsById.set(job.id, job);
    if (job.jobSchema !== "geehub.growth-render-job" || job.jobSchemaVersion !== 1) errors.push("Unsupported render-job schema: " + job.id);
    if (job.sourceAssetId !== manifest?.source?.id) errors.push("Render job has a foreign source reference: " + job.id);
    if (!JOB_STATUSES.includes(job.status)) errors.push("Unknown render-job status: " + job.id);
    if (!Array.isArray(job.inputFrameSetIds) ||
        new Set(job.inputFrameSetIds).size !== job.inputFrameSetIds.length ||
        job.inputFrameSetIds.some(id => !frameIds.has(id))) errors.push("Render job references a missing or duplicate frame set: " + job.id);
    requiredFrameSetErrors(job.inputFrameSetIds, frameSets).forEach(message => errors.push(message + ": " + job.id));
    if (job.status === "completed" && !nonEmpty(job.artifactId)) errors.push("Completed job has no artifact reference: " + job.id);
    if (job.status !== "completed" && job.artifactId !== null) errors.push("Non-completed job references an artifact: " + job.id);
    if (job.status === "queued" && (job.startedAt !== null || job.completedAt !== null)) errors.push("Queued job has execution timestamps: " + job.id);
    if (job.status === "running" && (!nonEmpty(job.startedAt) || job.completedAt !== null || job.error !== null)) errors.push("Running job state is inconsistent: " + job.id);
    if (job.status === "failed" && (!nonEmpty(job.startedAt) || !nonEmpty(job.error) || job.completedAt !== null)) errors.push("Failed job lacks start time or error: " + job.id);
    if (job.status === "completed" && (!nonEmpty(job.startedAt) || !nonEmpty(job.completedAt) || job.error !== null)) errors.push("Completed job state is inconsistent: " + job.id);
    if (!job.output || !positiveInt(job.output.width) || !positiveInt(job.output.height) ||
        !Number.isFinite(job.output.fps) || job.output.fps <= 0) errors.push("Render job output format is incomplete: " + job.id);
    reserve(job.jobUri, "job " + job.id);
    reserve(job.outputUri, "output " + job.id);
  }

  for (const artifact of artifacts) {
    if (!nonEmpty(artifact.id) || artifactIds.has(artifact.id) || assetIds.has(artifact.id)) errors.push("Missing or duplicate artifact id: " + artifact.id);
    artifactIds.add(artifact.id);
    assetIds.add(artifact.id);
    const job = jobsById.get(artifact.jobId);
    if (!job || job.status !== "completed" || job.artifactId !== artifact.id) errors.push("Artifact has no matching completed job: " + artifact.id);
    if (artifact.sourceAssetId !== manifest?.source?.id) errors.push("Artifact has a foreign source reference: " + artifact.id);
    if (job && artifact.uri !== job.outputUri) errors.push("Artifact URI differs from reserved job output: " + artifact.id);
    if (!nonEmpty(artifact.mediaType) || !sha256(artifact.checksum) || artifact.checksumAlgorithm !== "sha256") errors.push("Artifact integrity metadata is incomplete: " + artifact.id);
    if (artifact.immutable !== true) errors.push("Artifact must be immutable: " + artifact.id);
  }
  for (const job of jobs) {
    if (job.status === "completed" && !artifacts.some(item => item.id === job.artifactId)) errors.push("Completed job artifact is missing: " + job.id);
  }

  if (events.length !== (Number.isInteger(manifest?.revision) ? manifest.revision + 1 : -1)) errors.push("Event history does not match manifest revision");
  events.forEach((event, index) => {
    if (event.revision !== index || !nonEmpty(event.type) || !nonEmpty(event.at)) errors.push("Invalid event history entry at index " + index);
  });
  return { valid: errors.length === 0, errors };
}
