const fs = require('fs');

// Read PNG header and IHDR/IDAT info
const buf = fs.readFileSync('logo/blfavicon.png');
console.log('PNG magic check:', buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a');
console.log('Width:', buf.readUInt32BE(16));
console.log('Height:', buf.readUInt32BE(20));
console.log('Bit depth:', buf[24]);
console.log('Color type:', buf[25]); // 6 = RGBA
