import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { decodeRgbaPng, encodeRgbaPng } from "./rgba-png.js";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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

function makePng(width, height, pixels, { colorType = 6, filter = 0, bitDepth = 8, interlace = 0 } = {}) {
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * channels;
  const rows = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    rows[rowOffset] = filter;
    for (let x = 0; x < stride; x += 1) {
      const value = pixels[y * stride + x];
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const above = y ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paeth(left, above, upperLeft);
      rows[rowOffset + 1 + x] = (value - predictor + 256) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[12] = interlace;
  return Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

function makeRgba(width, height) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = (i * 17) & 255;
    data[i * 4 + 1] = (i * 31) & 255;
    data[i * 4 + 2] = (i * 47) & 255;
    data[i * 4 + 3] = (i * 13) & 255;
  }
  return data;
}

test("decodes RGBA PNG rows using all five standard PNG filters", () => {
  const width = 4, height = 3;
  const rgba = makeRgba(width, height);
  for (let filter = 0; filter <= 4; filter += 1) {
    const decoded = decodeRgbaPng(makePng(width, height, Buffer.from(rgba), { colorType: 6, filter }));
    assert.equal(decoded.width, width);
    assert.equal(decoded.height, height);
    assert.equal(decoded.sourceColorType, 6);
    assert.equal(decoded.encoding, "png/rgba8");
    assert.deepEqual(decoded.data, rgba);
  }
});

test("expands RGB PNG input to opaque RGBA without changing color samples", () => {
  const rgb = Buffer.from([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  const decoded = decodeRgbaPng(makePng(3, 1, rgb, { colorType: 2, filter: 1 }));
  assert.equal(decoded.sourceColorType, 2);
  assert.deepEqual([...decoded.data], [
    10, 20, 30, 255,
    40, 50, 60, 255,
    70, 80, 90, 255
  ]);
});

test("encodes and decodes transparent RGBA pixels losslessly", () => {
  const width = 7, height = 5;
  const data = makeRgba(width, height);
  const png = encodeRgbaPng({ width, height, data });
  assert.ok(png.subarray(0, 8).equals(SIGNATURE));
  assert.equal(png.toString("ascii", 12, 16), "IHDR");
  assert.equal(png[25], 6);
  const decoded = decodeRgbaPng(png);
  assert.deepEqual(decoded.data, data);
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
});

test("refuses unsupported bit depths, palette, grayscale, interlace and transparency metadata", () => {
  const pixels = Buffer.alloc(4 * 4);
  assert.throws(() => decodeRgbaPng(makePng(2, 2, pixels, { colorType: 3 })),
    error => error.code === "rgba-png-format-unsupported");
  assert.throws(() => decodeRgbaPng(makePng(2, 2, pixels, { colorType: 0 })),
    error => error.code === "rgba-png-format-unsupported");
  assert.throws(() => decodeRgbaPng(makePng(2, 2, pixels, { colorType: 6, bitDepth: 16 })),
    error => error.code === "rgba-png-format-unsupported");
  assert.throws(() => decodeRgbaPng(makePng(2, 2, pixels, { colorType: 6, interlace: 1 })),
    error => error.code === "rgba-png-format-unsupported");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  const trns = chunk("tRNS", Buffer.from([0, 0, 0, 0, 0, 0]));
  const png = Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), trns,
    chunk("IDAT", deflateSync(Buffer.from([0, 0, 0, 0, 255]))), chunk("IEND", Buffer.alloc(0))]);
  assert.throws(() => decodeRgbaPng(png), error => error.code === "rgba-png-transparency-unsupported");
});

test("rejects corrupt chunks, truncated files and trailing bytes", () => {
  const png = encodeRgbaPng({ width: 2, height: 2, data: makeRgba(2, 2) });
  const corrupt = Buffer.from(png); corrupt[corrupt.length - 1] ^= 0xff;
  assert.throws(() => decodeRgbaPng(corrupt), error => error.code === "rgba-png-crc-mismatch");
  assert.throws(() => decodeRgbaPng(png.subarray(0, png.length - 3)),
    error => error.code === "rgba-png-chunk-truncated");
  assert.throws(() => decodeRgbaPng(Buffer.concat([png, Buffer.from([0])])),
    error => error.code === "rgba-png-trailing-data");
});

test("enforces pixel and encoded-byte ceilings before accepting frame data", () => {
  const png = encodeRgbaPng({ width: 2, height: 2, data: makeRgba(2, 2) });
  assert.throws(() => decodeRgbaPng(png, { maxPixels: 3 }),
    error => error.code === "rgba-png-dimensions-unsafe");
  assert.throws(() => decodeRgbaPng(png, { maxBytes: 32 }),
    error => error.code === "rgba-png-file-too-large");
  assert.throws(() => encodeRgbaPng({ width: 2, height: 2, data: makeRgba(2, 2) }, { maxPixels: 3 }),
    error => error.code === "rgba-png-frame-invalid");
});

test("rejects invalid RGBA buffers and invalid output dimensions", () => {
  assert.throws(() => encodeRgbaPng({ width: 2, height: 2, data: new Uint8Array(8) }),
    error => error.code === "rgba-png-frame-invalid");
  assert.throws(() => encodeRgbaPng({ width: 0, height: 2, data: new Uint8Array(0) }),
    error => error.code === "rgba-png-frame-invalid");
  assert.throws(() => encodeRgbaPng({ width: 2, height: 2, data: new Uint8Array(16) }, { maxBytes: 33 }),
    error => error.code === "rgba-png-output-too-large");
});
