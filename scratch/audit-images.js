const proxyHandler = require('../netlify/functions/proxy-image.js').handler;
const provider = require('../providers/mangafreak-provider.js');

async function audit() {
  console.log('--- AUDITING REPRESENTATIVE MANGA IMAGES ---');

  // Fetch image URLs for Chapter 1 and Chapter 361
  const ch1Images = await provider.getChapterImages('1');
  const ch361Images = await provider.getChapterImages('361');

  console.log(`Chapter 1 total images: ${ch1Images.length}`);
  console.log(`Chapter 361 total images: ${ch361Images.length}`);

  // Inspect 3 pages from Ch 1 and 3 pages from Ch 361
  const sampleUrls = [
    { label: 'Ch 1 Page 1', url: ch1Images[0] },
    { label: 'Ch 1 Page 2 (Text/Detailed)', url: ch1Images[1] },
    { label: 'Ch 1 Page 10 (Dark/Shaded)', url: ch1Images[9] },
    { label: 'Ch 361 Page 1', url: ch361Images[0] },
    { label: 'Ch 361 Page 5', url: ch361Images[4] },
  ];

  let totalSampleSize = 0;

  for (const sample of sampleUrls) {
    if (!sample.url) continue;
    const res = await fetch(sample.url, {
      headers: {
        'Referer': 'https://ww3.mangafreak.me/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const contentType = res.headers.get('content-type');
    const buf = Buffer.from(await res.arrayBuffer());
    const sizeKb = (buf.length / 1024).toFixed(2);
    totalSampleSize += buf.length;

    // Detect width and height if JPEG or PNG
    let width = 'unknown', height = 'unknown';
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      // JPEG marker parsing
      let offset = 2;
      while (offset < buf.length) {
        const marker = buf.readUInt16BE(offset);
        if (marker === 0xffc0 || marker === 0xffc2) {
          height = buf.readUInt16BE(offset + 5);
          width = buf.readUInt16BE(offset + 7);
          break;
        }
        offset += 2 + buf.readUInt16BE(offset + 2);
      }
    } else if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
      width = buf.readUInt32BE(16);
      height = buf.readUInt32BE(20);
    }

    console.log(`[${sample.label}] Format: ${contentType} | Size: ${sizeKb} KB (${buf.length} bytes) | Dimensions: ${width}x${height}`);
  }

  const avgSize = totalSampleSize / sampleUrls.length;
  console.log(`\nAverage sampled page size: ${(avgSize / 1024).toFixed(2)} KB`);
  console.log(`Estimated Standard Chapter (20 pages): ${((avgSize * 20) / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Estimated Chapter 1 (75 pages): ${((avgSize * 75) / (1024 * 1024)).toFixed(2)} MB`);
}

audit();
