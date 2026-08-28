const fs = require('fs');
const path = require('path');
const provider = require('../providers/mangafreak-provider');

async function buildInitialData() {
  console.log('Fetching Blue Lock chapters list from MangaFreak...');
  const chapters = await provider.getLatestChaptersList();
  console.log(`Fetched ${chapters.length} raw entries.`);

  if (chapters.length === 0) {
    throw new Error('No chapters fetched!');
  }

  // Sort ASC by chapter number
  chapters.sort((a, b) => a.number - b.number);

  const chaptersMap = new Map();
  const cleanChapters = [];
  const idMap = {};

  for (const ch of chapters) {
    const num = Math.round(ch.number);
    if (!isNaN(num) && num > 0 && !chaptersMap.has(num)) {
      chaptersMap.set(num, true);
      cleanChapters.push({
        number: num,
        title: `Chapter ${num}`
      });
      idMap[String(num)] = ch.id;
    }
  }

  console.log(`Cleaned ${cleanChapters.length} chapters (Ch.1 to Ch.${cleanChapters[cleanChapters.length - 1].number}).`);

  // Write chapters.js
  const jsonContent = JSON.stringify(cleanChapters, null, 2)
    .replace(/^\[/, '[\n ')
    .replace(/\]$/, '\n]');
  const chaptersFileContent = `const CHAPTERS = ${jsonContent};\n`;

  fs.writeFileSync(path.join(__dirname, '../chapters.js'), chaptersFileContent, 'utf8');
  console.log('Successfully written chapters.js with Blue Lock chapters');

  // Write sync/sync-state.json
  const latestNum = cleanChapters[cleanChapters.length - 1].number;
  const syncState = {
    lastSyncAt: new Date().toISOString(),
    lastCheckedChapterNumber: latestNum,
    chapterIdMap: idMap
  };

  fs.writeFileSync(path.join(__dirname, '../sync/sync-state.json'), JSON.stringify(syncState, null, 2), 'utf8');
  console.log('Successfully written sync/sync-state.json with Blue Lock state');
}

buildInitialData().catch(err => {
  console.error('Failed to sync initial Blue Lock data:', err);
  process.exit(1);
});
