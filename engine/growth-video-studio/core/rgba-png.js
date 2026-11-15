/**
 * Bounded, lossless PNG I/O for source frames and generated RGBA layers.
 *
 * Accepted source encodings are non-interlaced 8-bit RGB and RGBA PNGs.
 * RGB is expanded to opaque RGBA. Palette, grayscale, 16-bit, interlaced,
 * and tRNS transparency encodings are refused rather than guessed.
 */
import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const DEFAULT_MAX_PIXELS = 12_000_000;
const DEFAULT_MAX_BYTES = 128 * 1024 * 1024;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function validateLimits({ maxPixels = DEFAULT_MAX_PIXELS, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (!Number.isSafeInteger(maxPixels) || maxPixels < 1 ||
      !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError("maxPixels and maxBytes must be positive safe limits");
  }
  return { maxPixels, maxBytes };
}

function readPng(bytes, limits) {
  if (!(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array)) {
    fail("rgba-png-input-invalid", "PNG input must be a Buffer or Uint8Array");
  }
  const input = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (input.length > limits.maxBytes) fail("rgba-png-file-too-large", "PNG input exceeds the byte limit");
  if (input.length < 33 || !input.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail("rgba-png-signature-invalid", "Input is not a PNG file");
  }

  let offset = 8;
  let header = null;
  let sawData = false;
  let endedData = false;
  let sawEnd = false;
  let sawPalette = false;
  const dataChunks = [];

  while (offset < input.length) {
    if (offset + 12 > input.length) fail("rgba-png-chunk-truncated", "PNG chunk header is truncated");
    const length = input.readUInt32BE(offset);
    const typeBytes = input.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    if (!/^[A-Za-z]{4}$/.test(type)) fail("rgba-png-chunk-type-invalid", "PNG chunk type is invalid");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > input.length) fail("rgba-png-chunk-truncated", "PNG chunk exceeds file length");
    const data = input.subarray(dataStart, dataEnd);
    const expectedCrc = input.readUInt32BE(dataEnd);
    const actualCrc = crc32(input.subarray(offset + 4, dataEnd));
    if (expectedCrc !== actualCrc) fail("rgba-png-crc-mismatch", "PNG " + type + " chunk checksum is invalid");

    if (!header && type !== "IHDR") fail("rgba-png-ihdr-missing", "IHDR must be the first PNG chunk");
    if (type === "IHDR") {
      if (header || length !== 13) fail("rgba-png-ihdr-invalid", "PNG must contain one 13-byte IHDR chunk");
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
      };
      if (!header.width || !header.height || !Number.isSafeInteger(header.width * header.height) ||
          header.width * header.height > limits.maxPixels) {
        fail("rgba-png-dimensions-unsafe", "PNG dimensions are empty or exceed the pixel limit");
      }
      if (header.bitDepth !== 8 || ![2, 6].includes(header.colorType) ||
          header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) {
        fail("rgba-png-format-unsupported", "Source PNGs must be non-interlaced 8-bit RGB or RGBA");
      }
    } else if (type === "IDAT") {
      if (endedData) fail("rgba-png-idat-order-invalid", "PNG IDAT chunks must be consecutive");
      sawData = true;
      dataChunks.push(data);
    } else if (type === "IEND") {
      if (length !== 0 || !sawData) fail("rgba-png-iend-invalid", "PNG IEND or image data is invalid");
      sawEnd = true;
      offset = chunkEnd;
      if (offset !== input.length) fail("rgba-png-trailing-data", "PNG contains bytes after IEND");
      break;
    } else {
      if (sawData) endedData = true;
      const critical = typeBytes[0] >= 65 && typeBytes[0] <= 90;
      if (type === "PLTE") {
        if (sawPalette || sawData || length < 3 || length > 768 || length % 3 !== 0) {
          fail("rgba-png-palette-invalid", "Optional RGB palette chunk is malformed or out of order");
        }
        sawPalette = true;
      } else if (type === "tRNS") {
        fail("rgba-png-transparency-unsupported", "tRNS transparency metadata is not supported; use explicit RGBA pixels");
      } else if (critical) {
        fail("rgba-png-critical-chunk-unsupported", "Unsupported critical PNG chunk: " + type);
      }
    }
    offset = chunkEnd;
  }

  if (!header || !sawData || !sawEnd || dataChunks.length === 0) {
    fail("rgba-png-structure-incomplete", "PNG is missing IHDR, IDAT, or IEND");
  }
  return { header, compressed: Buffer.concat(dataChunks) };
}

function unfilterRows(raw, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const expectedLength = (stride + 1) * height;
  if (raw.length !== expectedLength) {
    fail("rgba-png-image-data-length-invalid", "PNG decompressed data length does not match its dimensions");
  }
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const rawStart = y * (stride + 1);
    const filter = raw[rawStart];
    if (filter > 4) fail("rgba-png-filter-unsupported", "PNG row " + y + " uses unknown filter " + filter);
    const rowStart = y * stride;
    const previousStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[rawStart + 1 + x];
      const left = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[previousStart + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[previousStart + x - bytesPerPixel] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paeth(left, above, upperLeft);
      pixels[rowStart + x] = (encoded + predictor) & 0xff;
    }
  }
  return pixels;
}

/** Decode an 8-bit RGB/RGBA PNG into a row-major RGBA buffer. */
export function decodeRgbaPng(bytes, options = {}) {
  const limits = validateLimits(options);
  const { header, compressed } = readPng(bytes, limits);
  const channels = header.colorType === 6 ? 4 : 3;
  const expectedLength = (header.width * channels + 1) * header.height;
  let raw;
  try {
    raw = inflateSync(compressed, { maxOutputLength: expectedLength });
  } catch (error) {
    fail("rgba-png-deflate-invalid", "PNG image data could not be decompressed: " + error.message);
  }
  const pixels = unfilterRows(raw, header.width, header.height, channels);
  let rgba = pixels;
  if (channels === 3) {
    rgba = Buffer.alloc(header.width * header.height * 4);
    for (let source = 0, target = 0; source < pixels.length; source += 3, target += 4) {
      rgba[target] = pixels[source];
      rgba[target + 1] = pixels[source + 1];
      rgba[target + 2] = pixels[source + 2];
      rgba[target + 3] = 255;
    }
  }
  return {
    width: header.width,
    height: header.height,
    data: new Uint8Array(rgba),
    encoding: "png/rgba8",
    sourceColorType: header.colorType
  };
}

function makeChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

/** Encode row-major RGBA pixels as a non-interlaced 8-bit RGBA PNG. */
export function encodeRgbaPng({ width, height, data } = {}, options = {}) {
  const limits = validateLimits(options);
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 ||
      !Number.isSafeInteger(width * height) || width * height > limits.maxPixels ||
      !(data instanceof Uint8Array || data instanceof Uint8ClampedArray || Buffer.isBuffer(data)) ||
      data.length !== width * height * 4) {
    fail("rgba-png-frame-invalid", "A bounded frame with matching row-major RGBA pixels is required");
  }
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * (rowBytes + 1);
    raw[rawOffset] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * rowBytes, rowBytes).copy(raw, rawOffset + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const compressed = deflateSync(raw);
  const png = Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0))
  ]);
  if (png.length > limits.maxBytes) fail("rgba-png-output-too-large", "Encoded PNG exceeds the byte limit");
  return png;
}
