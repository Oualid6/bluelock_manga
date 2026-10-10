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
const ch363 = CHAPTERS.find(c => c.number === 363);
const ch364 = CHAPTERS.find(c => c.number === 364);
const ch365 = CHAPTERS.find(c => c.number === 365);

console.log('1. Checking chapters.js:');
console.log('Chapter 361 exists:', !!ch361, ch361 ? ch361.title : '');
console.log('Chapter 362 exists:', !!ch362, ch362 ? ch362.title : '');
console.log('Chapter 363 exists:', !!ch363, ch363 ? ch363.title : '');
console.log('Chapter 364 exists:', !!ch364, ch364 ? ch364.title : '');
console.log('Chapter 365 exists:', !!ch365, ch365 ? ch365.status : '');

// 2. Verify sync-state.json
const syncState = JSON.parse(fs.readFileSync('sync/sync-state.json', 'utf8'));
console.log('\n2. Checking sync-state.json:');
console.log('364 in chapterIdMap:', syncState.chapterIdMap['364']);
console.log('365 in chapterIdMap:', syncState.chapterIdMap['365']);

// 3. Verify MangaFreak images for Chapter 364
mangafreakProvider.getChapterImages('364').then(images => {
  console.log('\n3. Provider Chapter 364 images count:', images.length);
  if (images.length > 0) {
    console.log('Sample image 1:', images[0]);
    console.log('Sample image 20:', images[images.length - 1]);
  }

  // 4. Verify sitemap.xml
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  console.log('\n4. Checking sitemap.xml:');
  console.log('Contains /chapter/364:', sitemap.includes('/chapter/364'));
  console.log('Contains /chapter/365:', sitemap.includes('/chapter/365'));

  // 5. Verify index.html hero section
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  console.log('\n5. Checking index.html:');
  console.log('Ongoing Chapter 364:', indexHtml.includes('Ongoing · Chapter 364'));
  console.log('Hero button Chapter 365:', indexHtml.includes('btn-ch365'));

  console.log('\n=== ALL CHECKS COMPLETED ===');
}).catch(err => {
  console.error('Error testing images:', err);
});
