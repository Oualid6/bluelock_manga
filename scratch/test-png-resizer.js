const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let i = 0; i < 8; i++) {
      k = (k & 1) ? (0xedb88320 ^ (k >>> 1)) : (k >>> 1);
    }
    table[n] = k;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function decodePNG(buffer) {
  let offset = 8;
  let width, height, bitDepth, colorType;
  const idatBuffers = [];

  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + len);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatBuffers.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idatBuffers));
  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
  const rowSize = 1 + width * bpp;
  const rgba = Buffer.alloc(width * height * 4);

  let prevRow = Buffer.alloc(width * bpp);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * rowSize];
    const rowData = raw.slice(y * rowSize + 1, (y + 1) * rowSize);
    const recon = Buffer.alloc(width * bpp);

    for (let x = 0; x < width * bpp; x++) {
      const rawByte = rowData[x];
      let left = x >= bpp ? recon[x - bpp] : 0;
      let above = prevRow[x];

      if (filter === 0) recon[x] = rawByte;
      else if (filter === 1) recon[x] = (rawByte + left) & 0xff;
      else if (filter === 2) recon[x] = (rawByte + above) & 0xff;
      else if (filter === 3) recon[x] = (rawByte + Math.floor((left + above) / 2)) & 0xff;
      else if (filter === 4) {
        const p = left + above - prevRow[x - bpp || 0];
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - above);
        const pc = Math.abs(p - (prevRow[x - bpp || 0]));
        let pr = left;
        if (pb < pa && pb <= pc) pr = above;
        else if (pc < pa) pr = prevRow[x - bpp || 0];
        recon[x] = (rawByte + pr) & 0xff;
      }
    }
    prevRow = recon;

    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (colorType === 6) {
        rgba[dstIdx]     = recon[x * 4];
        rgba[dstIdx + 1] = recon[x * 4 + 1];
        rgba[dstIdx + 2] = recon[x * 4 + 2];
        rgba[dstIdx + 3] = recon[x * 4 + 3];
      } else if (colorType === 2) {
        rgba[dstIdx]     = recon[x * 3];
        rgba[dstIdx + 1] = recon[x * 3 + 1];
        rgba[dstIdx + 2] = recon[x * 3 + 2];
        rgba[dstIdx + 3] = 255;
      }
    }
  }

  return { width, height, rgba };
}

function resizeRGBA(src, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;

      dst[dstIdx]     = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = src[srcIdx + 3];
    }
  }
  return dst;
}

function encodePNG(rgba, width, height) {
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // Filter None
    rgba.copy(raw, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idat);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createIco(png32Buf, png16Buf) {
  // ICO header: 6 bytes
  // ICONDIR: Reserved(2), Type(2, 1=Icon), Count(2)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  // Directory entries: 16 bytes per entry
  const entry32 = Buffer.alloc(16);
  entry32[0] = 32; entry32[1] = 32; // width, height
  entry32[2] = 0; entry32[3] = 0;   // color count, reserved
  entry32.writeUInt16LE(1, 4);      // planes
  entry32.writeUInt16LE(32, 6);     // bpp
  entry32.writeUInt32LE(png32Buf.length, 8);
  entry32.writeUInt32LE(6 + 32, 12); // offset

  const entry16 = Buffer.alloc(16);
  entry16[0] = 16; entry16[1] = 16;
  entry16[2] = 0; entry16[3] = 0;
  entry16.writeUInt16LE(1, 4);
  entry16.writeUInt16LE(32, 6);
  entry16.writeUInt32LE(png16Buf.length, 8);
  entry16.writeUInt32LE(6 + 32 + png32Buf.length, 12);

  return Buffer.concat([header, entry32, entry16, png32Buf, png16Buf]);
}

console.log('--- TESTING PNG DECODER & ENCODER ---');
const src = decodePNG(fs.readFileSync('apple-touch-icon.png'));
console.log('Decoded source image:', src.width, 'x', src.h = src.height);

const icon16Rgba = resizeRGBA(src.rgba, src.width, src.height, 16, 16);
const icon16Png = encodePNG(icon16Rgba, 16, 16);
console.log('Encoded 16x16 PNG size:', icon16Png.length, 'bytes');

const icon32Rgba = resizeRGBA(src.rgba, src.width, src.height, 32, 32);
const icon32Png = encodePNG(icon32Rgba, 32, 32);
console.log('Encoded 32x32 PNG size:', icon32Png.length, 'bytes');

const appleTouchRgba = resizeRGBA(src.rgba, src.width, src.height, 180, 180);
const appleTouchPng = encodePNG(appleTouchRgba, 180, 180);
console.log('Encoded 180x180 Apple Touch PNG size:', appleTouchPng.length, 'bytes');

const icoBuf = createIco(icon32Png, icon16Png);
console.log('Encoded ICO file size:', icoBuf.length, 'bytes');

const logoSrc = decodePNG(fs.readFileSync('logo/bllogo.png'));
console.log('\nDecoded logo image:', logoSrc.width, 'x', logoSrc.height);
const logoResizedRgba = resizeRGBA(logoSrc.rgba, logoSrc.width, logoSrc.height, 543, 181);
const logoPng = encodePNG(logoResizedRgba, 543, 181);
console.log('Encoded 543x181 Logo PNG size:', logoPng.length, 'bytes');
