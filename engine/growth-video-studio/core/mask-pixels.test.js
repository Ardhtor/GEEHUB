import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { decodeBinaryMaskPng } from "./mask-pixels.js";

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

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function makePng(width, height, pixels, { filter = 0, colorType = 0, bitDepth = 8 } = {}) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  const rows = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width + 1);
    rows[rowOffset] = filter;
    for (let x = 0; x < width; x += 1) {
      const value = pixels[y * width + x];
      const left = x ? pixels[y * width + x - 1] : 0;
      const above = y ? pixels[(y - 1) * width + x] : 0;
      const upperLeft = x && y ? pixels[(y - 1) * width + x - 1] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paeth(left, above, upperLeft);
      rows[rowOffset + 1 + x] = (value - predictor + 256) & 0xff;
    }
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

test("decodes binary grayscale masks and reconstructs all five PNG row filters", () => {
  const width = 5, height = 4;
  const pixels = Buffer.from([
    0, 0, 255, 255, 0,
    0, 255, 255, 255, 0,
    0, 255, 0, 0, 0,
    0, 0, 0, 0, 0
  ]);
  for (let filter = 0; filter <= 4; filter += 1) {
    const decoded = decodeBinaryMaskPng(makePng(width, height, pixels, { filter }));
    assert.deepEqual(decoded.pixels, pixels);
    assert.equal(decoded.width, width);
    assert.equal(decoded.height, height);
    assert.equal(decoded.foregroundPixels, 6);
    assert.equal(decoded.foregroundRatio, 6 / (width * height));
    assert.deepEqual(decoded.bounds, { left: 1, top: 0, right: 3, bottom: 2 });
  }
});

test("rejects soft grayscale values instead of guessing a threshold", () => {
  const pixels = Buffer.from([0, 255, 127, 0]);
  assert.throws(
    () => decodeBinaryMaskPng(makePng(2, 2, pixels)),
    error => error.code === "mask-pixel-values-not-binary"
  );
});

test("rejects RGB and other ambiguous mask encodings", () => {
  assert.throws(
    () => decodeBinaryMaskPng(makePng(2, 2, Buffer.alloc(4), { colorType: 2 })),
    error => error.code === "png-mask-format-unsupported"
  );
});

test("rejects corrupt chunk checksums", () => {
  const bytes = makePng(2, 2, Buffer.from([0, 255, 255, 0]));
  bytes[bytes.length - 5] ^= 0xff;
  assert.throws(
    () => decodeBinaryMaskPng(bytes),
    error => error.code === "png-crc-mismatch"
  );
});

test("enforces a configurable pixel-count ceiling before decompression", () => {
  assert.throws(
    () => decodeBinaryMaskPng(makePng(4, 4, Buffer.alloc(16)), { maxPixels: 8 }),
    error => error.code === "png-dimensions-unsafe"
  );
});
