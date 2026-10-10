const fs = require('fs');
const http = require('http');
const https = require('https');

async function testOptimization() {
  console.log('--- TESTING MANGA IMAGE FORMATS & COMPRESSION ---');

  const testUrl = 'https://images.mangafreak.me/manga_images/blue_lock.jpg';

  const res = await fetch(testUrl, {
    headers: {
      'Referer': 'https://ww3.mangafreak.me/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const origBuf = Buffer.from(await res.arrayBuffer());
  const origKb = (origBuf.length / 1024).toFixed(2);
  console.log(`Original JPEG size: ${origKb} KB (${origBuf.length} bytes)`);

  console.log('\n--- CALCULATING ESTIMATED FORMAT REDUCTIONS (WEBP / AVIF) ---');
  // Standard WebP at q=80 for manga line art achieves 35%-45% size reduction over JPEG.
  // Standard AVIF at q=75 for manga line art achieves 50%-65% size reduction over JPEG.

  const webpEstKb = (origBuf.length * 0.58 / 1024).toFixed(2);
  const avifEstKb = (origBuf.length * 0.42 / 1024).toFixed(2);

  console.log(`Estimated WebP (q=80): ~${webpEstKb} KB (~42% reduction)`);
  console.log(`Estimated AVIF (q=75): ~${avifEstKb} KB (~58% reduction)`);

  console.log('\n--- CALCULATING CHAPTER BANDWIDTH ESTIMATES ---');
  const sampleAvgJpegKb = 198.33; // Measured average from Section 1 audit
  const sampleAvgWebpKb = sampleAvgJpegKb * 0.58; // ~115 KB
  const sampleAvgAvifKb = sampleAvgJpegKb * 0.42; // ~83 KB

  console.log(`Original Standard Chapter (20 pages): ${(sampleAvgJpegKb * 20 / 1024).toFixed(2)} MB`);
  console.log(`Optimized WebP Standard Chapter (20 pages): ${(sampleAvgWebpKb * 20 / 1024).toFixed(2)} MB`);
  console.log(`Optimized AVIF Standard Chapter (20 pages): ${(sampleAvgAvifKb * 20 / 1024).toFixed(2)} MB`);

  console.log(`\nOriginal Chapter 1 (75 pages): ${(sampleAvgJpegKb * 75 / 1024).toFixed(2)} MB`);
  console.log(`Optimized WebP Chapter 1 (75 pages): ${(sampleAvgWebpKb * 75 / 1024).toFixed(2)} MB`);
  console.log(`Optimized AVIF Chapter 1 (75 pages): ${(sampleAvgAvifKb * 75 / 1024).toFixed(2)} MB`);

  console.log('\n--- 1,000 VISITORS BANDWIDTH ESTIMATE ---');
  console.log(`Original (1,000 visitors reading 1 chapter): ${(sampleAvgJpegKb * 20 * 1000 / (1024 * 1024)).toFixed(2)} GB`);
  console.log(`Optimized WebP (1,000 visitors reading 1 chapter): ${(sampleAvgWebpKb * 20 * 1000 / (1024 * 1024)).toFixed(2)} GB`);
  console.log(`Optimized AVIF (1,000 visitors reading 1 chapter): ${(sampleAvgAvifKb * 20 * 1000 / (1024 * 1024)).toFixed(2)} GB`);
}

testOptimization();
