// GrayBit-7 format codec
// Header: 4-byte signature + 8 bytes meta = 12 bytes total
// Pixel: bits 6-0 = gray value (0-127), bit 7 = mask bit

const SIGNATURE = [0x47, 0x42, 0x37, 0x1d]; // "GB7·"
const VERSION = 0x01;
const HEADER_SIZE = 12;

export interface Gb7Info {
  width: number;
  height: number;
  hasMask: boolean;
}

export function decodeGb7(buffer: ArrayBuffer): ImageData {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < HEADER_SIZE) throw new Error("File too small to be GB7");

  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== SIGNATURE[i]) throw new Error("Invalid GB7 signature");
  }

  if (bytes[4] !== VERSION) throw new Error(`Unsupported GB7 version: ${bytes[4]}`);

  const flags = bytes[5];
  const hasMask = (flags & 0x01) === 1;
  const width = (bytes[6] << 8) | bytes[7];
  const height = (bytes[8] << 8) | bytes[9];

  const expectedSize = HEADER_SIZE + width * height;
  if (bytes.length < expectedSize) {
    throw new Error(`File truncated: expected ${expectedSize} bytes, got ${bytes.length}`);
  }

  const imageData = new ImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const byte = bytes[HEADER_SIZE + i];
    const gray = (byte & 0x7f) * 2; // scale 0-127 → 0-254
    const masked = hasMask && (byte & 0x80) === 0;

    const idx = i * 4;
    data[idx] = gray;
    data[idx + 1] = gray;
    data[idx + 2] = gray;
    data[idx + 3] = masked ? 0 : 255;
  }

  return imageData;
}

export function encodeGb7(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const hasMask = hasTransparency(data);
  const buf = new Uint8Array(HEADER_SIZE + width * height);

  // Signature
  buf[0] = 0x47; buf[1] = 0x42; buf[2] = 0x37; buf[3] = 0x1d;
  buf[4] = VERSION;
  buf[5] = hasMask ? 0x01 : 0x00;
  // Width big-endian
  buf[6] = (width >> 8) & 0xff;
  buf[7] = width & 0xff;
  // Height big-endian
  buf[8] = (height >> 8) & 0xff;
  buf[9] = height & 0xff;
  // Reserved
  buf[10] = 0x00; buf[11] = 0x00;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
    // Convert to grayscale 0-127
    const gray = Math.round((0.299 * r + 0.587 * g + 0.114 * b) / 2) & 0x7f;
    const maskBit = hasMask ? (a < 128 ? 0x00 : 0x80) : 0x00;
    buf[HEADER_SIZE + i] = gray | maskBit;
  }

  return buf;
}

export function getGb7Info(buffer: ArrayBuffer): Gb7Info {
  const bytes = new Uint8Array(buffer);
  const hasMask = (bytes[5] & 0x01) === 1;
  const width = (bytes[6] << 8) | bytes[7];
  const height = (bytes[8] << 8) | bytes[9];
  return { width, height, hasMask };
}

function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}
