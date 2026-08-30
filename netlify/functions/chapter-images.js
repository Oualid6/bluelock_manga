const mangafreakProvider = require('../../providers/mangafreak-provider');

let KNOWN_CHAPTER_IDS = {};
try {
  const syncState = require('../../sync/sync-state.json');
  if (syncState && syncState.chapterIdMap) {
    KNOWN_CHAPTER_IDS = syncState.chapterIdMap;
  }
} catch (_) {}

exports.handler = async (event, context) => {
  const params = event.queryStringParameters || {};
  const chNum = parseInt(params.ch);
  if (isNaN(chNum) || chNum < 1 || chNum > 1000) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing or invalid ch parameter' })
    };
  }

  const chapterId = KNOWN_CHAPTER_IDS[chNum] || String(chNum);
  try {
    const images = await mangafreakProvider.getChapterImages(chapterId);
    if (!images || images.length === 0) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Could not load chapter images' })
      };
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify({ chapter: chNum, images })
    };
  } catch (err) {
    console.error('Chapter images Netlify function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
