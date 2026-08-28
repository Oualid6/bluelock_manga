const fs = require('fs');

// Simple PNG decoder to inspect non-transparent bounding box
// PNG format parsing
function parsePNG(buffer) {
  let offset = 8; // skip magic
  let width, height, bitDepth, colorType;
  let idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      bitDepth = buffer[offset + 16];
      colorType = buffer[offset + 17];
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.slice(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  return { width, height, bitDepth, colorType, idatLength: idatChunks.reduce((a, b) => a + b.length, 0) };
}

const info = parsePNG(fs.readFileSync('logo/blfavicon.png'));
console.log('PNG Info:', info);
