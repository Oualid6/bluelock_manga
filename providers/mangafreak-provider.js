/**
 * MangaFreak Blue Lock Provider Module
 * Encapsulates network interactions and HTML parsing for MangaFreak Blue Lock.
 */

const BASE_URL = 'https://ww3.mangafreak.me';
const SERIES_URL = `${BASE_URL}/Manga/Blue_Lock`;

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': `${BASE_URL}/`
};

/**
 * Perform fetch with retry support.
 */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(options.timeout || 15000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Get the latest chapter details from MangaFreak.
 * Returns { id, number, title } or null on failure.
 */
async function getLatestChapter() {
  const chapters = await getLatestChaptersList();
  return chapters.length > 0 ? chapters[0] : null;
}

/**
 * Fetch the complete chapter list from MangaFreak.
 * Returns [{ id, number, title }, ...] sorted DESC (newest first).
 */
async function getLatestChaptersList() {
  const res = await fetchWithRetry(SERIES_URL, { headers: FETCH_HEADERS });
  const html = await res.text();

  const regex = /<a[^>]+href="\/Read1_Blue_Lock_([^"]+)"[^>]*>Chapter\s+([^<]+)<\/a>/gi;
  let m;
  const chaptersMap = new Map();

  while ((m = regex.exec(html)) !== null) {
    const rawId = m[1].trim(); // e.g. "358" or "346b"
    const rawNumStr = m[2].trim();
    const chNum = parseFloat(rawId);

    if (!isNaN(chNum) && !chaptersMap.has(rawId)) {
      const title = `Chapter ${rawNumStr}`;
      chaptersMap.set(rawId, {
        id: rawId,
        number: chNum,
        title: title
      });
    }
  }

  const chapters = Array.from(chaptersMap.values());
  chapters.sort((a, b) => b.number - a.number);
  return chapters;
}

/**
 * Fetch image URLs for a given MangaFreak chapter ID.
 * Returns an array of absolute image URL strings.
 */
async function getChapterImages(chapterId) {
  const url = `${BASE_URL}/Read1_Blue_Lock_${chapterId}`;
  const res = await fetchWithRetry(url, { headers: FETCH_HEADERS });
  const html = await res.text();

  const imgRegex = /<img[^>]+src="(https:\/\/images\.mangafreak\.me\/mangas\/blue_lock\/[^"]+)"/gi;
  const images = [];
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    images.push(m[1]);
  }
  return images;
}

module.exports = {
  getLatestChapter,
  getLatestChaptersList,
  getChapterImages
};
