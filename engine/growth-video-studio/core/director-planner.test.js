import test from "node:test";
import assert from "node:assert/strict";
import { interpretCreativeDirection, compileDirectorPlan } from "./director-planner.js";
import { CapabilityRegistry } from "./capability-registry.js";

test("growth direction expands into subject, clothing, environment and camera work", () => {
  const direction = interpretCreativeDirection("Make him taller and heavier, keep his face, make the clothes react, and let the room respond.");
  const actions = direction.actions.map(action => action.action);
  assert.ok(actions.includes("transform-subject-proportions"));
  assert.ok(actions.includes("progressive-physique-growth"));
  assert.ok(actions.includes("construct-clothing-response"));
  assert.ok(actions.includes("construct-environment-response"));
  assert.ok(direction.constraints.includes("face-lock"));
});

test("planner blocks honestly when no generative providers are connected", () => {
  const direction = interpretCreativeDirection("Generate a new environment and render the finished video.");
  const plan = compileDirectorPlan(direction, new CapabilityRegistry());
  assert.equal(plan.canExecute, false);
  assert.equal(plan.status, "blocked-by-capabilities");
  assert.ok(plan.capabilityReport.missing.includes("video-generation"));
  assert.equal(plan.safety.sourceImmutable, true);
});

test("registered adapter satisfies only the capabilities it declares", () => {
  const registry = new CapabilityRegistry().register({ id: "test-renderer", capabilities: ["video-render"], adapter: { execute: async () => ({ ok: true }) } });
  assert.equal(registry.has("video-render"), true);
  assert.equal(registry.has("mp4-export"), false);
});
