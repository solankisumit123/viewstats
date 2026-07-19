const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create CRC32 table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcBuf = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(crcBuf), 8 + len);
  return buf;
}

function generateIconPNGBuffer(size = 256) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));

  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.46; // Perfect circular logo like Chrome/Tor/UrbanVPN

  // Triangle coordinates for play button
  const triX0 = size * 0.41;
  const triY0 = size * 0.33;
  const triX1 = size * 0.41;
  const triY1 = size * 0.67;
  const triX2 = size * 0.69;
  const triY2 = size * 0.50;

  function isInsideTriangle(x, y) {
    const dX = x - triX2;
    const dY = y - triY2;
    const dX21 = triX1 - triX2;
    const dY21 = triY1 - triY2;
    const dX02 = triX0 - triX2;
    const dY02 = triY0 - triY2;
    const D = dY21 * dX02 - dX21 * dY02;
    if (Math.abs(D) < 0.0001) return false;
    const s = (dY21 * dX - dX21 * dY) / D;
    const t = (dX02 * dY - dY02 * dX) / D;
    return s >= 0 && t >= 0 && (s + t) <= 1;
  }

  function isInsideCircle(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    return (dx * dx + dy * dy) <= (radius * radius);
  }

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      if (isInsideCircle(x, y)) {
        if (isInsideTriangle(x, y)) {
          // Play Button: Solid Crisp White (#FFFFFF)
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else {
          // Circular Logo: Vibrant YouTube Red (#FF0000) with subtle gradient
          const distFromCenter = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / radius;
          const rVal = 255;
          const gVal = Math.floor(Math.max(0, 20 - distFromCenter * 20));
          const bVal = Math.floor(Math.max(0, 30 - distFromCenter * 30));
          rawData[offset++] = rVal;
          rawData[offset++] = gVal;
          rawData[offset++] = bVal;
          rawData[offset++] = 255;
        }
      } else {
        // Outside Circle: 100% PURE ALPHA TRANSPARENT (NO WHITE BOX, NO SQUARE BACKGROUND!)
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idatData = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idatData),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

function buildICO(pngItems) {
  const count = pngItems.length;
  const headerLen = 6;
  const dirEntryLen = 16;
  let dataOffset = headerLen + count * dirEntryLen;

  const dirBuf = Buffer.alloc(headerLen + count * dirEntryLen);
  dirBuf.writeUInt16LE(0, 0);
  dirBuf.writeUInt16LE(1, 2);
  dirBuf.writeUInt16LE(count, 4);

  const dataBuffers = [];

  pngItems.forEach((item, idx) => {
    const w = item.size >= 256 ? 0 : item.size;
    const h = item.size >= 256 ? 0 : item.size;
    const size = item.buffer.length;
    const entryOffset = headerLen + idx * dirEntryLen;

    dirBuf.writeUInt8(w, entryOffset + 0);
    dirBuf.writeUInt8(h, entryOffset + 1);
    dirBuf.writeUInt8(0, entryOffset + 2);
    dirBuf.writeUInt8(0, entryOffset + 3);
    dirBuf.writeUInt16LE(1, entryOffset + 4);
    dirBuf.writeUInt16LE(32, entryOffset + 6);
    dirBuf.writeUInt32LE(size, entryOffset + 8);
    dirBuf.writeUInt32LE(dataOffset, entryOffset + 12);

    dataBuffers.push(item.buffer);
    dataOffset += size;
  });

  return Buffer.concat([dirBuf, ...dataBuffers]);
}

function main() {
  const buildDir = path.join(__dirname, 'build');
  fs.mkdirSync(buildDir, { recursive: true });

  const sizes = [256, 128, 64, 48, 32, 16];
  const pngItems = sizes.map(size => ({
    size,
    buffer: generateIconPNGBuffer(size)
  }));

  // 1. Write build/icon.png
  const main512Buffer = generateIconPNGBuffer(512);
  fs.writeFileSync(path.join(buildDir, 'icon.png'), main512Buffer);
  console.log('✅ Generated circular build/icon.png (100% pure transparent background)');

  // 2. Write build/icon.ico
  const icoBuffer = buildICO(pngItems);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  console.log('✅ Generated circular build/icon.ico (Multi-resolution Windows ICO container)');
}

main();
