import test from "node:test";
import assert from "node:assert/strict";
import { createCreativeProject, applyCreativeOperation, validateCreativeProject, branchCreativeProject } from "./creative-project.js";

test("project graph appends editable nodes without changing source", () => {
  let project = createCreativeProject({ source: { name: "take.mp4", uri: "local://take.mp4" } });
  const sourceId = project.nodes[0].id;
  project = applyCreativeOperation(project, { id: "op-1", type: "add-node", intent: "Create subject layer", payload: { node: { id: "subject-1", type: "subject", name: "Tracked subject" } } });
  project = applyCreativeOperation(project, { id: "op-2", type: "connect", payload: { from: sourceId, to: "subject-1", role: "tracks-subject-in" } });
  assert.equal(project.nodes.find(node => node.id === sourceId).immutable, true);
  assert.equal(project.edges.length, 1);
  assert.equal(project.head, "v002");
  assert.equal(validateCreativeProject(project).valid, true);
});

test("source nodes cannot be edited", () => {
  const project = createCreativeProject({ source: { name: "take.mp4" } });
  assert.throws(() => applyCreativeOperation(project, { id: "bad", type: "update-node", payload: { nodeId: project.nodes[0].id, patch: { name: "changed" } } }), /immutable/);
});

test("branching selects an earlier version without deleting later work", () => {
  let project = createCreativeProject();
  project = applyCreativeOperation(project, { id: "op-1", type: "add-node", payload: { node: { id: "shot-1", type: "shot" } } });
  const branch = branchCreativeProject(project, "v000", "Alternate cut");
  assert.equal(branch.head, "v000");
  assert.equal(project.head, "v001");
  assert.equal(project.versions.length, 2);
});
