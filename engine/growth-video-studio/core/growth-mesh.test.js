import test from "node:test";
import assert from "node:assert/strict";
import { REGIONS } from "./growth-state.js";
import { REQUIRED_ANCHORS } from "./landmark-track.js";
import {
  APPLIED_GEOMETRY_CHANNELS,
  DEFERRED_GEOMETRY_CHANNELS,
  GROWTH_MESH_ANCHORS,
  buildGrowthTargetLandmarks,
  renderGrowthMesh
} from "./growth-mesh.js";

const points = {
  faceCenter: { x: 0.50, y: 0.08, confidence: 0.99 },
  neck: { x: 0.50, y: 0.20, confidence: 0.99 },
  leftShoulder: { x: 0.40, y: 0.25, confidence: 0.99 },
  rightShoulder: { x: 0.60, y: 0.25, confidence: 0.99 },
  leftElbow: { x: 0.30, y: 0.40, confidence: 0.98 },
  rightElbow: { x: 0.70, y: 0.40, confidence: 0.98 },
  leftWrist: { x: 0.25, y: 0.55, confidence: 0.98 },
  rightWrist: { x: 0.75, y: 0.55, confidence: 0.98 },
  leftHip: { x: 0.45, y: 0.50, confidence: 0.99 },
  rightHip: { x: 0.55, y: 0.50, confidence: 0.99 },
  leftKnee: { x: 0.44, y: 0.72, confidence: 0.99 },
  rightKnee: { x: 0.56, y: 0.72, confidence: 0.99 },
  leftAnkle: { x: 0.43, y: 0.95, confidence: 0.99 },
  rightAnkle: { x: 0.57, y: 0.95, confidence: 0.99 }
};
const frame = () => ({ timeSeconds: 0, landmarks: structuredClone(points) });
const body = overrides => Object.fromEntries(REGIONS.map(key => [key, overrides?.[key] ?? 1]));
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test("baseline mapping leaves every tracked anchor unchanged", () => {
  const result = buildGrowthTargetLandmarks(frame(), body(), body());
  for (const name of REQUIRED_ANCHORS) {
    assert.equal(result.landmarks[name].x, points[name].x);
    assert.equal(result.landmarks[name].y, points[name].y);
  }
  assert.deepEqual(result.outOfFrame, []);
  assert.equal(result.requiresReframe, false);
});

test("growth scales articulated segments, widens shoulders, and preserves face offset and ground contact", () => {
  const source = frame();
  const target = body({
    stature: 1.1, torsoLength: 1.15, shoulderSpan: 1.2,
    armLength: 1.25, thighLength: 1.2
  });
  const result = buildGrowthTargetLandmarks(source, body(), target);
  const mapped = result.landmarks;

  assert.deepEqual(mapped.leftAnkle, points.leftAnkle);
  assert.deepEqual(mapped.rightAnkle, points.rightAnkle);
  assert.deepEqual(source.landmarks, points);
  assert.ok(Math.abs(length(mapped.leftAnkle, mapped.leftKnee) /
    length(points.leftAnkle, points.leftKnee) - 1.1) < 1e-9);
  assert.ok(Math.abs(length(mapped.leftKnee, mapped.leftHip) /
    length(points.leftKnee, points.leftHip) - 1.2) < 1e-9);
  assert.ok(Math.abs(length(mapped.leftShoulder, mapped.leftElbow) /
    length(points.leftShoulder, points.leftElbow) - 1.25) < 1e-9);
  const sourceHipCenter = { x: 0.5, y: 0.5 };
  const targetHipCenter = { x: (mapped.leftHip.x + mapped.rightHip.x) / 2,
    y: (mapped.leftHip.y + mapped.rightHip.y) / 2 };
  assert.ok(Math.abs(length(targetHipCenter, mapped.neck) /
    length(sourceHipCenter, points.neck) - 1.15) < 1e-9);
  const sourceSpan = points.rightShoulder.x - points.leftShoulder.x;
  const targetSpan = mapped.rightShoulder.x - mapped.leftShoulder.x;
  assert.ok(Math.abs(targetSpan / sourceSpan - 1.2) < 1e-9);
  assert.ok(Math.abs((mapped.faceCenter.x - mapped.neck.x) -
    (points.faceCenter.x - points.neck.x)) < 1e-9);
  assert.ok(Math.abs((mapped.faceCenter.y - mapped.neck.y) -
    (points.faceCenter.y - points.neck.y)) < 1e-9);
  assert.equal(result.groundContact, "ankles-fixed");
  assert.deepEqual(result.appliedChannels, APPLIED_GEOMETRY_CHANNELS);
  assert.deepEqual(result.deferredChannels, DEFERRED_GEOMETRY_CHANNELS);
  assert.equal(result.requiresReframe, true);
  assert.ok(result.outOfFrame.includes("faceCenter"));
  assert.ok(result.projectedStatureRatio > result.requestedStatureRatio);
});

test("rejects regressing and anatomically inconsistent growth targets", () => {
  assert.throws(() => buildGrowthTargetLandmarks(frame(), body(), body({ armMass: 0.9 })), /cannot regress/);
  assert.throws(() => buildGrowthTargetLandmarks(frame(), body(), body({ stature: 1.2 })), /Arm length must keep pace/);
});

test("body mesh excludes the face anchor and renders supplied triangles", () => {
  assert.equal(GROWTH_MESH_ANCHORS.includes("faceCenter"), false);
  const calls = { draw: 0 };
  const ctx = {
    save() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    clip() {}, transform() {}, restore() {}, drawImage() { calls.draw += 1; }
  };
  const result = renderGrowthMesh(ctx, {}, frame(), body(), body({
    stature: 1.1, torsoLength: 1.1, shoulderSpan: 1.1,
    armLength: 1.1, thighLength: 1.1
  }), [[0, 1, 2]]);
  assert.equal(result.renderedTriangles, 1);
  assert.equal(calls.draw, 1);
});
