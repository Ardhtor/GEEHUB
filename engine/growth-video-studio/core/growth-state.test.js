import test from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE,
  createGrowthState,
  createChildState,
  interpolateGrowth,
  validateGrowthSequence
} from "./growth-state.js";

test("growth states preserve identity locks and increase connected regions", () => {
  const base = createGrowthState(BASELINE, { id: "base" });
  const grown = createChildState(base, {
    stature: 1.2, torsoLength: 1.12, shoulderSpan: 1.3,
    chestDepth: 1.28, armLength: 1.2, armMass: 1.35,
    thighLength: 1.2, thighMass: 1.3, calfMass: 1.2
  }, { id: "grown" });

  assert.equal(grown.parentId, "base");
  assert.equal(grown.identityLock.face, true);
  assert.equal(grown.body.armLength, 1.2);
  assert.equal(validateGrowthSequence([base, grown]).valid, true);
});

test("interpolation is stable at endpoints and midpoint", () => {
  const a = createGrowthState(BASELINE, { id: "a" });
  const b = createChildState(a, {
    stature: 1.2, torsoLength: 1.1, shoulderSpan: 1.2,
    chestDepth: 1.2, armLength: 1.2, armMass: 1.2,
    thighLength: 1.2, thighMass: 1.2, calfMass: 1.2
  }, { id: "b" });

  assert.equal(interpolateGrowth(a, b, 0).body.stature, 1);
  assert.equal(interpolateGrowth(a, b, 1).body.stature, 1.2);
  assert.ok(interpolateGrowth(a, b, 0.5).body.stature > 1);
});

test("a child state cannot regress", () => {
  const base = createGrowthState(BASELINE, { id: "base" });
  const grown = createChildState(base, {
    stature: 1.2, torsoLength: 1.1, shoulderSpan: 1.2,
    chestDepth: 1.2, armLength: 1.2, armMass: 1.2,
    thighLength: 1.2, thighMass: 1.2, calfMass: 1.2
  });
  assert.throws(() => createChildState(grown, { armMass: 1.1 }), /cannot regress/);
});
