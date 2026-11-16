import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decodeRgbaPng, encodeRgbaPng } from "./rgba-png.js";
import { renderGrowthDeformationPixels } from "./pixel-frame-renderer.js";
import { decodeBinaryMaskPng } from "./mask-pixels.js";
import { renderGrowthFrameFiles } from "./frame-file-renderer.js";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodeMask(width, height, pixels) {
  const rows = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    rows[y * (width + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width, width).copy(rows, y * (width + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 0;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function makeSource(width = 8, height = 8) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = x * 20;
      data[offset + 1] = y * 20;
      data[offset + 2] = 80;
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}

function makeMasks(width = 8, height = 8) {
  const body = new Uint8Array(width * height).fill(255);
  const face = new Uint8Array(width * height);
  body[7 * width + 7] = 0;
  face[7 * width + 7] = 255;
  return { body, face };
}

function makePlan(overrides = {}) {
  const sourcePoints = [
    { x: 1, y: 1 },
    { x: 6, y: 1 },
    { x: 1, y: 6 }
  ];
  return {
    schema: "geehub.growth-deformation-frame",
    schemaVersion: 1,
    status: "ready-for-render",
    renderable: true,
    frame: 12,
    timeSeconds: 1.2,
    topologyId: "a".repeat(64),
    vertexIds: ["v0", "v1", "v2"],
    triangleIds: ["t0"],
    triangles: [[0, 1, 2]],
    sourcePoints,
    targetPoints: sourcePoints.map(point => ({ x: point.x + 1, y: point.y })),
    ...overrides
  };
}

async function fixture(t, { maskWidth = 8, plan = makePlan() } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "geehub-frame-file-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = path.join(directory, "source.png");
  const bodyMaskPath = path.join(directory, "body-mask.png");
  const faceMaskPath = path.join(directory, "face-mask.png");
  const planPath = path.join(directory, "deformation-plan.json");
  const outputPath = path.join(directory, "body-layer.png");
  const source = makeSource();
  const masks = makeMasks(maskWidth, 8);
  const sourceBytes = encodeRgbaPng(source);
  const bodyBytes = encodeMask(maskWidth, 8, masks.body);
  const faceBytes = encodeMask(maskWidth, 8, masks.face);
  const planBytes = Buffer.from(JSON.stringify(plan, null, 2) + "\n");
  await Promise.all([
    writeFile(sourcePath, sourceBytes, { flag: "wx" }),
    writeFile(bodyMaskPath, bodyBytes, { flag: "wx" }),
    writeFile(faceMaskPath, faceBytes, { flag: "wx" }),
    writeFile(planPath, planBytes, { flag: "wx" })
  ]);
  return { directory, sourcePath, bodyMaskPath, faceMaskPath, planPath, outputPath,
    sourceBytes, bodyBytes, faceBytes, planBytes, source, masks, plan };
}

const render = input => renderGrowthFrameFiles({
  sourcePath: input.sourcePath,
  bodyMaskPath: input.bodyMaskPath,
  protectedFaceMaskPath: input.faceMaskPath,
  planPath: input.planPath,
  outputPath: input.outputPath
});

test("writes a lossless transparent body PNG and a digest receipt without changing inputs", async t => {
  const input = await fixture(t);
  const result = await render(input);
  const outputBytes = await readFile(input.outputPath);
  const receiptBytes = await readFile(result.receiptPath);
  const decodedOutput = decodeRgbaPng(outputBytes);
  const sourceDecoded = decodeRgbaPng(input.sourceBytes);
  const bodyDecoded = decodeBinaryMaskPng(input.bodyBytes);
  const faceDecoded = decodeBinaryMaskPng(input.faceBytes);
  const expected = renderGrowthDeformationPixels({
    sourceFrame: { frame: input.plan.frame, ...sourceDecoded },
    plan: input.plan,
    bodyMask: { frame: input.plan.frame, ...bodyDecoded },
    protectedFaceMask: { frame: input.plan.frame, ...faceDecoded }
  });

  assert.equal(result.schema, "geehub.growth-frame-file-receipt.v1");
  assert.equal(result.status, "written");
  assert.equal(result.frame, 12);
  assert.equal(result.topologyId, input.plan.topologyId);
  assert.equal(result.output.sha256, sha256(outputBytes));
  assert.equal(result.inputs.sourceFrame.sha256, sha256(input.sourceBytes));
  assert.equal(result.inputs.bodyMask.sha256, sha256(input.bodyBytes));
  assert.equal(result.inputs.protectedFaceMask.sha256, sha256(input.faceBytes));
  assert.equal(result.inputs.deformationPlan.sha256, sha256(input.planBytes));
  assert.equal(result.raster.pixelSemanticsVerified, false);
  assert.deepEqual(Buffer.from(decodedOutput.data), Buffer.from(expected.data));
  assert.deepEqual(await readFile(input.sourcePath), input.sourceBytes);
  assert.deepEqual(await readFile(input.bodyMaskPath), input.bodyBytes);
  assert.deepEqual(await readFile(input.faceMaskPath), input.faceBytes);
  assert.deepEqual(await readFile(input.planPath), input.planBytes);
  assert.equal(JSON.parse(receiptBytes.toString("utf8")).output.sha256, sha256(outputBytes));
});

test("refuses to overwrite an existing output", async t => {
  const input = await fixture(t);
  const existing = Buffer.from("keep this output");
  await writeFile(input.outputPath, existing, { flag: "wx" });
  await assert.rejects(render(input), error => error.code === "EEXIST");
  assert.deepEqual(await readFile(input.outputPath), existing);
  await assert.rejects(readFile(input.outputPath + ".receipt.json"), error => error.code === "ENOENT");
});

test("rolls back its newly created PNG if the adjacent receipt already exists", async t => {
  const input = await fixture(t);
  const existingReceipt = Buffer.from("existing receipt");
  await writeFile(input.outputPath + ".receipt.json", existingReceipt, { flag: "wx" });
  await assert.rejects(render(input), error => error.code === "EEXIST");
  await assert.rejects(readFile(input.outputPath), error => error.code === "ENOENT");
  assert.deepEqual(await readFile(input.outputPath + ".receipt.json"), existingReceipt);
});

test("refuses symlinked inputs and output paths that collide with source evidence", async t => {
  const input = await fixture(t);
  const linkPath = path.join(input.directory, "source-link.png");
  await symlink(input.sourcePath, linkPath);
  await assert.rejects(renderGrowthFrameFiles({
    sourcePath: linkPath,
    bodyMaskPath: input.bodyMaskPath,
    protectedFaceMaskPath: input.faceMaskPath,
    planPath: input.planPath,
    outputPath: input.outputPath
  }), error => error.code === "frame-file-input-not-regular");
  await assert.rejects(renderGrowthFrameFiles({
    sourcePath: input.sourcePath,
    bodyMaskPath: input.bodyMaskPath,
    protectedFaceMaskPath: input.faceMaskPath,
    planPath: input.planPath,
    outputPath: input.sourcePath
  }), error => error.code === "frame-file-output-path-collision");
  assert.deepEqual(await readFile(input.sourcePath), input.sourceBytes);
});

test("rejects mismatched mask dimensions and incomplete or blocked deformation plans", async t => {
  const wrongMask = await fixture(t, { maskWidth: 7 });
  await assert.rejects(render(wrongMask), error => error.code === "frame-file-mask-dimensions-mismatch");

  const blocked = await fixture(t, { plan: makePlan({ renderable: false }) });
  await assert.rejects(render(blocked), error => error.code === "frame-file-plan-invalid");

  const incomplete = await fixture(t, { plan: makePlan({ triangleIds: [] }) });
  await assert.rejects(render(incomplete), error => error.code === "frame-file-plan-invalid");
});
