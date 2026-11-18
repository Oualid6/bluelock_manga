const fs = require('fs');
const path = require('path');
const mangafreakProvider = require('../providers/mangafreak-provider');

console.log('=== VERIFICATION CHECKS ===\n');

// 1. Verify chapters.js
const chaptersFile = fs.readFileSync('chapters.js', 'utf8');
const jsonMatch = chaptersFile.match(/const\s+CHAPTERS\s*=\s*([\s\S]+?);?\s*$/);
const CHAPTERS = JSON.parse(jsonMatch[1]);

console.log('1. Checking chapters.js:');
console.log('Total chapters in chapters.js:', CHAPTERS.length);
for (const chNum of [366, 367, 368, 369]) {
  const ch = CHAPTERS.find(c => c.number === chNum);
  console.log(`Chapter ${chNum} exists:`, !!ch, ch ? ch.title : '');
}

// 2. Verify sync-state.json
const syncState = JSON.parse(fs.readFileSync('sync/sync-state.json', 'utf8'));
console.log('\n2. Checking sync-state.json:');
console.log('lastCheckedChapterNumber:', syncState.lastCheckedChapterNumber);
for (const chNum of [366, 367, 368, 369]) {
  console.log(`${chNum} in chapterIdMap:`, syncState.chapterIdMap[String(chNum)]);
}

// 3. Verify MangaFreak images for Chapter 369
mangafreakProvider.getChapterImages('369').then(images => {
  console.log('\n3. Provider Chapter 369 images count:', images.length);
  if (images.length > 0) {
    console.log('Sample image 1:', images[0]);
    console.log('Sample image last:', images[images.length - 1]);
  }

  // 4. Verify sitemap.xml
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  console.log('\n4. Checking sitemap.xml:');
  for (const chNum of [366, 367, 368, 369]) {
    console.log(`Contains /chapter/${chNum}:`, sitemap.includes(`/chapter/${chNum}`));
  }

  // 5. Verify index.html hero section
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  console.log('\n5. Checking index.html:');
  console.log('Ongoing Chapter 369:', indexHtml.includes('Ongoing · Chapter 369'));
  console.log('Hero button Chapter 369:', indexHtml.includes('btn-ch369'));
  console.log('Stat count 370:', indexHtml.includes('id="stat-chapters-count">370'));

  console.log('\n=== ALL CHECKS COMPLETED ===');
}).catch(err => {
  console.error('Error testing images:', err);
});
