/**
 * Decode a deliberately narrow, portable segmentation-mask PNG format.
 *
 * Accepted input: non-interlaced, 8-bit grayscale PNG with binary samples:
 * 0 = background, 255 = foreground. The narrow contract avoids guessing the
 * meaning of palette, RGB, alpha, or soft-probability images.
 */
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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

function readChunks(bytes, maxPixels) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail("png-signature-invalid", "Mask is not a PNG file");
  }
  let offset = 8;
  let header = null;
  let endedData = false;
  let sawData = false;
  let sawEnd = false;
  const dataChunks = [];

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) fail("png-chunk-truncated", "PNG chunk header is truncated");
    const length = bytes.readUInt32BE(offset);
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > bytes.length) fail("png-chunk-truncated", "PNG chunk exceeds file length");
    const data = bytes.subarray(dataStart, dataEnd);
    const expectedCrc = bytes.readUInt32BE(dataEnd);
    const actualCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    if (expectedCrc !== actualCrc) fail("png-crc-mismatch", `PNG ${type} chunk checksum is invalid`);

    if (!header && type !== "IHDR") fail("png-ihdr-missing", "IHDR must be the first PNG chunk");
    if (type === "IHDR") {
      if (header || length !== 13) fail("png-ihdr-invalid", "PNG must contain one 13-byte IHDR chunk");
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
      };
      if (!header.width || !header.height ||
          !Number.isSafeInteger(header.width * header.height) ||
          header.width * header.height > maxPixels) {
        fail("png-dimensions-unsafe", "PNG dimensions are empty or exceed the mask pixel limit");
      }
    } else if (type === "IDAT") {
      if (endedData) fail("png-idat-order-invalid", "PNG IDAT chunks must be consecutive");
      sawData = true;
      dataChunks.push(data);
    } else if (type === "IEND") {
      if (length !== 0 || !sawData) fail("png-iend-invalid", "PNG IEND or image data is invalid");
      sawEnd = true;
      offset = chunkEnd;
      if (offset !== bytes.length) fail("png-trailing-data", "PNG contains bytes after IEND");
      break;
    } else {
      if (sawData) endedData = true;
      const critical = typeBytes[0] >= 65 && typeBytes[0] <= 90;
      if (critical && type !== "PLTE") {
        fail("png-critical-chunk-unsupported", `Unsupported critical PNG chunk: ${type}`);
      }
    }
    offset = chunkEnd;
  }

  if (!header || !sawData || !sawEnd) fail("png-structure-incomplete", "PNG is missing IHDR, IDAT, or IEND");
  if (header.bitDepth !== 8 || header.colorType !== 0 ||
      header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) {
    fail(
      "png-mask-format-unsupported",
      "Masks must be non-interlaced 8-bit grayscale PNGs (color type 0)"
    );
  }
  return { header, compressed: Buffer.concat(dataChunks) };
}

function unfilterRows(raw, width, height) {
  const stride = width + 1;
  const pixels = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    const rawStart = y * stride;
    const filter = raw[rawStart];
    if (filter > 4) fail("png-filter-unsupported", `PNG row ${y} uses unknown filter ${filter}`);
    const rowStart = y * width;
    const previousStart = rowStart - width;
    for (let x = 0; x < width; x += 1) {
      const encoded = raw[rawStart + 1 + x];
      const left = x > 0 ? pixels[rowStart + x - 1] : 0;
      const above = y > 0 ? pixels[previousStart + x] : 0;
      const upperLeft = y > 0 && x > 0 ? pixels[previousStart + x - 1] : 0;
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

/**
 * Return decoded pixels and a compact silhouette summary.
 * The returned pixel buffer is row-major, one byte per grayscale sample.
 */
export function decodeBinaryMaskPng(bytes, { maxPixels = 64_000_000 } = {}) {
  if (!Number.isSafeInteger(maxPixels) || maxPixels < 1) {
    throw new TypeError("maxPixels must be a positive safe integer");
  }
  const { header, compressed } = readChunks(bytes, maxPixels);
  const expectedLength = (header.width + 1) * header.height;
  let raw;
  try {
    raw = inflateSync(compressed, { maxOutputLength: expectedLength });
  } catch (error) {
    fail("png-deflate-invalid", `PNG image data could not be decompressed: ${error.message}`);
  }
  if (raw.length !== expectedLength) {
    fail("png-image-data-length-invalid", "PNG decompressed data length does not match its dimensions");
  }

  const pixels = unfilterRows(raw, header.width, header.height);
  let foregroundPixels = 0;
  let minX = header.width;
  let minY = header.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < pixels.length; index += 1) {
    const value = pixels[index];
    if (value !== 0 && value !== 255) {
      fail("mask-pixel-values-not-binary", "Mask samples must be exactly 0 or 255");
    }
    if (value === 255) {
      foregroundPixels += 1;
      const x = index % header.width;
      const y = Math.floor(index / header.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return {
    width: header.width,
    height: header.height,
    encoding: "png/grayscale8/binary",
    foregroundPixels,
    foregroundRatio: foregroundPixels / pixels.length,
    bounds: foregroundPixels ? { left: minX, top: minY, right: maxX, bottom: maxY } : null,
    pixels
  };
}
