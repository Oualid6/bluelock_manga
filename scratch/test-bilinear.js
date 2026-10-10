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

function resizeBilinear(srcRgba, srcW, srcH, dstW, dstH) {
  const dstRgba = Buffer.alloc(dstW * dstH * 4);
  const xRatio = (srcW - 1) / dstW;
  const yRatio = (srcH - 1) / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcY = y * yRatio;
    const yLow = Math.floor(srcY);
    const yHigh = Math.min(srcH - 1, Math.ceil(srcY));
    const yWeight = srcY - yLow;

    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const xLow = Math.floor(srcX);
      const xHigh = Math.min(srcW - 1, Math.ceil(srcX));
      const xWeight = srcX - xLow;

      for (let c = 0; c < 4; c++) {
        const p1 = srcRgba[(yLow * srcW + xLow) * 4 + c];
        const p2 = srcRgba[(yLow * srcW + xHigh) * 4 + c];
        const p3 = srcRgba[(yHigh * srcW + xLow) * 4 + c];
        const p4 = srcRgba[(yHigh * srcW + xHigh) * 4 + c];

        const top = p1 + (p2 - p1) * xWeight;
        const bottom = p3 + (p4 - p3) * xWeight;
        const val = top + (bottom - top) * yWeight;

        dstRgba[(y * dstW + x) * 4 + c] = Math.round(val);
      }
    }
  }
  return dstRgba;
}

function encodePNG(rgba, width, height) {
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0;
    rgba.copy(raw, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function createIco(png32Buf, png16Buf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  const entry32 = Buffer.alloc(16);
  entry32[0] = 32; entry32[1] = 32;
  entry32.writeUInt16LE(1, 4);
  entry32.writeUInt16LE(32, 6);
  entry32.writeUInt32LE(png32Buf.length, 8);
  entry32.writeUInt32LE(6 + 32, 12);

  const entry16 = Buffer.alloc(16);
  entry16[0] = 16; entry16[1] = 16;
  entry16.writeUInt16LE(1, 4);
  entry16.writeUInt16LE(32, 6);
  entry16.writeUInt32LE(png16Buf.length, 8);
  entry16.writeUInt32LE(6 + 32 + png32Buf.length, 12);

  return Buffer.concat([header, entry32, entry16, png32Buf, png16Buf]);
}

console.log('--- TESTING BILINEAR INTERPOLATION ---');
const iconSrc = decodePNG(fs.readFileSync('apple-touch-icon.png'));
const logoSrc = decodePNG(fs.readFileSync('logo/bllogo.png'));

const f16 = encodePNG(resizeBilinear(iconSrc.rgba, iconSrc.width, iconSrc.height, 16, 16), 16, 16);
const f32 = encodePNG(resizeBilinear(iconSrc.rgba, iconSrc.width, iconSrc.height, 32, 32), 32, 32);
const f180 = encodePNG(resizeBilinear(iconSrc.rgba, iconSrc.width, iconSrc.height, 180, 180), 180, 180);
const ico = createIco(f32, f16);
const logo = encodePNG(resizeBilinear(logoSrc.rgba, logoSrc.width, logoSrc.height, 543, 181), 543, 181);
const blfav = encodePNG(resizeBilinear(iconSrc.rgba, iconSrc.width, iconSrc.height, 64, 64), 64, 64);

console.log('f16 size:', f16.length, 'bytes');
console.log('f32 size:', f32.length, 'bytes');
console.log('f180 size:', f180.length, 'bytes');
console.log('ico size:', ico.length, 'bytes');
console.log('logo size:', logo.length, 'bytes');
console.log('blfav size:', blfav.length, 'bytes');
