const fs = require('fs');
const path = require('path');

function inspectPng(filePath) {
  const buf = fs.readFileSync(filePath);
  const sizeKb = (buf.length / 1024).toFixed(2);
  let width = 0, height = 0;
  if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  }
  return { path: filePath, sizeBytes: buf.length, sizeKb, width, height };
}

const files = [
  'apple-touch-icon.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon.ico',
  'logo/blfavicon.png',
  'logo/bllogo.png'
];

console.log('--- AUDITING STATIC BRANDING ASSETS ---');
files.forEach(f => {
  if (fs.existsSync(f)) {
    const info = inspectPng(f);
    console.log(`${f}: ${info.sizeKb} KB (${info.sizeBytes} bytes) | Dimensions: ${info.width}x${info.height}`);
  }
});
