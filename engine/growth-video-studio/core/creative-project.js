/**
 * GEEHUB editable creative project graph.
 * A project is a versioned composition of source media, shots, subjects,
 * generated assets, effects, audio, and render outputs. Mutations are
 * append-only operations; source assets are never overwritten.
 */
export const PROJECT_SCHEMA = "geehub.creative-project.v1";
export const NODE_TYPES = Object.freeze([
  "source", "shot", "subject", "mask", "landmark-track", "geometry",
  "material", "asset", "effect", "camera", "lighting", "audio",
  "transition", "composite", "render"
]);

const clone = value => structuredClone(value);
const id = prefix => prefix + "-" + globalThis.crypto?.randomUUID?.() ||
  prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

export function createCreativeProject({ name = "Untitled GEEHUB Project", source = null } = {}) {
  const now = new Date().toISOString();
  const sourceNode = source ? {
    id: id("source"), type: "source", name: source.name || "Source footage",
    immutable: true, data: clone(source), createdAt: now
  } : null;
  return {
    schema: PROJECT_SCHEMA, id: id("project"), name, createdAt: now, updatedAt: now,
    head: "v000", versions: [{ id: "v000", parent: null, label: "Original", createdAt: now, operationIds: [] }],
    nodes: sourceNode ? [sourceNode] : [], edges: [], operations: [],
    assets: [], renderJobs: [], preferences: { preserveSource: true, preserveIdentity: true, preserveMotion: true }
  };
}

export function validateCreativeProject(project) {
  const errors = [];
  if (project?.schema !== PROJECT_SCHEMA) errors.push("Unsupported project schema");
  const nodes = project?.nodes ?? [];
  const ids = new Set();
  for (const node of nodes) {
    if (!node.id || ids.has(node.id)) errors.push("Missing or duplicate node id: " + node.id);
    ids.add(node.id);
    if (!NODE_TYPES.includes(node.type)) errors.push("Unknown node type: " + node.type);
  }
  for (const edge of project?.edges ?? []) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) errors.push("Dangling edge: " + edge.from + " -> " + edge.to);
  }
  if (!project?.versions?.some(version => version.id === project.head)) errors.push("Project head does not resolve");
  if ((project?.nodes ?? []).some(node => node.immutable && node.type !== "source")) errors.push("Only source nodes may be immutable");
  return { valid: errors.length === 0, errors };
}

export function applyCreativeOperation(project, operation) {
  const check = validateCreativeProject(project);
  if (!check.valid) throw new Error(check.errors.join("; "));
  if (!operation?.type || !operation.id) throw new TypeError("Operation requires id and type");
  const next = clone(project);
  const prior = next.versions.find(version => version.id === next.head);
  const versionId = "v" + String(next.versions.length).padStart(3, "0");
  const now = new Date().toISOString();
  const payload = clone(operation.payload ?? {});
  const findNode = nodeId => next.nodes.find(node => node.id === nodeId);
  switch (operation.type) {
    case "add-node": {
      if (!NODE_TYPES.includes(payload.node?.type)) throw new TypeError("Unsupported node type");
      if (findNode(payload.node.id)) throw new Error("Node already exists");
      next.nodes.push({ ...payload.node, createdAt: now, enabled: payload.node.enabled !== false });
      break;
    }
    case "update-node": {
      const node = findNode(payload.nodeId);
      if (!node) throw new Error("Target node not found");
      if (node.immutable) throw new Error("Source nodes are immutable");
      Object.assign(node, clone(payload.patch ?? {}), { id: node.id, type: node.type });
      break;
    }
    case "connect": {
      if (!findNode(payload.from) || !findNode(payload.to)) throw new Error("Both edge endpoints must exist");
      if (next.edges.some(edge => edge.from === payload.from && edge.to === payload.to && edge.role === payload.role)) break;
      next.edges.push({ from: payload.from, to: payload.to, role: payload.role || "dependency" });
      break;
    }
    case "disable-node": {
      const node = findNode(payload.nodeId);
      if (!node || node.immutable) throw new Error("Node cannot be disabled");
      node.enabled = false;
      break;
    }
    case "add-asset": {
      next.assets.push({ id: payload.asset.id || id("asset"), ...clone(payload.asset), createdAt: now });
      break;
    }
    case "add-render-job": {
      next.renderJobs.push({ id: payload.job.id || id("render"), status: "queued", ...clone(payload.job), createdAt: now });
      break;
    }
    default: throw new Error("Unsupported operation: " + operation.type);
  }
  const record = { id: operation.id, type: operation.type, intent: operation.intent || "", payload, createdAt: now, parentVersion: prior.id };
  next.operations.push(record);
  next.versions.push({ id: versionId, parent: prior.id, label: operation.label || operation.intent || operation.type, createdAt: now, operationIds: [operation.id] });
  next.head = versionId;
  next.updatedAt = now;
  const result = validateCreativeProject(next);
  if (!result.valid) throw new Error(result.errors.join("; "));
  return next;
}

export function branchCreativeProject(project, versionId, label = "Alternative") {
  if (!project.versions.some(version => version.id === versionId)) throw new Error("Unknown version");
  const branch = clone(project);
  branch.head = versionId;
  branch.updatedAt = new Date().toISOString();
  branch.branchLabel = label;
  return branch;
}

export function getProjectSnapshot(project, versionId = project.head) {
  const version = project.versions.find(item => item.id === versionId);
  if (!version) throw new Error("Unknown version");
  const lineage = new Set();
  let cursor = version;
  while (cursor) {
    lineage.add(cursor.id);
    cursor = cursor.parent ? project.versions.find(item => item.id === cursor.parent) : null;
  }
  const operations = project.operations.filter(operation => lineage.has(operationVersion(project, operation.id)));
  return { version: clone(version), nodes: clone(project.nodes), edges: clone(project.edges), assets: clone(project.assets), operations: clone(operations) };
}
function operationVersion(project, operationId) {
  return project.versions.find(version => version.operationIds.includes(operationId))?.id;
}
