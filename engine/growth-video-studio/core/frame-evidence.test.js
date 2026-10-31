import test from "node:test";
import assert from "node:assert/strict";
import {
  createFrameEvidence,
  interpolateLandmarks,
  validateFrameSequence,
  createRenderEvidenceManifest,
} from "./frame-evidence.js";

const anchors = {
  leftEye: { x: 0.42, y: 0.18 },
  rightEye: { x: 0.58, y: 0.18 },
  nose: { x: 0.5, y: 0.23 },
  chin: { x: 0.5, y: 0.29 },
  leftShoulder: { x: 0.3, y: 0.38 },
  rightShoulder: { x: 0.7, y: 0.38 },
};

test("interpolates tracked landmarks without changing identity anchors", () => {
  const a = createFrameEvidence({ frame: 0, time: 0, landmarks: anchors, identityConfidence: 1 });
  const b = createFrameEvidence({
    frame: 10, time: 0.4,
    landmarks: Object.fromEntries(Object.entries(anchors).map(([k, p]) => [k, { x: p.x + 0.02, y: p.y }])),
    identityConfidence: 1,
  });
  assert.equal(interpolateLandmarks(a, b, 0.5).nose.x, 0.51);
});

test("flags identity loss and abrupt landmark jumps", () => {
  const a = createFrameEvidence({ frame: 0, time: 0, landmarks: anchors, identityConfidence: 1 });
  const moved = { ...anchors, nose: { x: 0.9, y: 0.9 } };
  const b = createFrameEvidence({ frame: 1, time: 1 / 24, landmarks: moved, identityConfidence: 0.2 });
  const result = validateFrameSequence([a, b]);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "identity-confidence-low"));
  assert.ok(result.issues.some((issue) => issue.code === "landmark-discontinuity"));
});

test("render manifest stays blocked until continuity evidence and growth keys exist", () => {
  const frame = createFrameEvidence({ frame: 0, time: 0, landmarks: anchors, identityConfidence: 1 });
  const manifest = createRenderEvidenceManifest({
    source: "source.mp4", width: 1080, height: 1920, fps: 24,
    frames: [frame], growthCurve: [],
  });
  assert.equal(manifest.renderReady, false);
});
