import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGrowthCurve, evaluateGrowthCurve, sampleGrowthCurve } from "./growth-curve.js";

const keys = [
  { time: 0, height: 1, torso: 1, shoulders: 1, arms: 1, legs: 1 },
  { time: 4, height: 1.2, torso: 1.35, shoulders: 1.4, arms: 1.3, legs: 1.2 },
];

test("growth curve interpolates smoothly and preserves cumulative scale", () => {
  const middle = evaluateGrowthCurve(keys, 2);
  assert.equal(middle.time, 2);
  assert.ok(middle.torso > 1 && middle.torso < 1.35);
  assert.equal(evaluateGrowthCurve(keys, 9).torso, 1.35);
});

test("growth curve rejects regression", () => {
  assert.throws(() => normalizeGrowthCurve([
    keys[0],
    { ...keys[1], arms: 0.9 },
  ]), /cumulative/);
});

test("samples a deterministic frame-indexed sequence", () => {
  const samples = sampleGrowthCurve(keys, 4, 24);
  assert.equal(samples.length, 97);
  assert.equal(samples[0].frame, 0);
  assert.equal(samples.at(-1).frame, 96);
  assert.equal(samples.at(-1).shoulders, 1.4);
});
