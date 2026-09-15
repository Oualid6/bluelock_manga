const fs = require('fs');
const path = require('path');
const mangafreakProvider = require('../providers/mangafreak-provider');

console.log('=== VERIFICATION CHECKS ===\n');

// 1. Verify chapters.js
const chaptersFile = fs.readFileSync('chapters.js', 'utf8');
const jsonMatch = chaptersFile.match(/const\s+CHAPTERS\s*=\s*([\s\S]+?);?\s*$/);
const CHAPTERS = JSON.parse(jsonMatch[1]);

const ch361 = CHAPTERS.find(c => c.number === 361);
const ch362 = CHAPTERS.find(c => c.number === 362);

console.log('1. Checking chapters.js:');
console.log('Chapter 361 exists:', !!ch361);
console.log('Chapter 361 status (should be undefined for normal):', ch361 ? ch361.status : 'N/A');
console.log('Chapter 362 exists:', !!ch362);
console.log('Chapter 362 status (should be coming-soon):', ch362 ? ch362.status : 'N/A');

// 2. Verify sync-state.json
const syncState = JSON.parse(fs.readFileSync('sync/sync-state.json', 'utf8'));
console.log('\n2. Checking sync-state.json:');
console.log('361 in chapterIdMap:', syncState.chapterIdMap['361']);
console.log('362 in chapterIdMap:', syncState.chapterIdMap['362']);

// 3. Verify MangaFreak images for Chapter 361
mangafreakProvider.getChapterImages('361').then(images => {
  console.log('\n3. Provider Chapter 361 images count:', images.length);
  if (images.length > 0) {
    console.log('Sample image 1:', images[0]);
  }

  // 4. Verify sitemap.xml
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  console.log('\n4. Checking sitemap.xml:');
  console.log('Contains /chapter/361:', sitemap.includes('/chapter/361'));
  console.log('Contains /chapter/362:', sitemap.includes('/chapter/362'));

  // 5. Verify index.html hero section
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  console.log('\n5. Checking index.html:');
  console.log('Ongoing Chapter 361:', indexHtml.includes('Ongoing · Chapter 361'));
  console.log('Hero button Chapter 362:', indexHtml.includes('btn-ch362'));

  console.log('\n=== ALL CHECKS COMPLETED ===');
}).catch(err => {
  console.error('Error testing images:', err);
});
