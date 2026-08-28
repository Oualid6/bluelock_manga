async function testChaptersList() {
  const res = await fetch('https://ww3.mangafreak.me/Manga/Blue_Lock', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  
  // Chapter regex matching links like <a class="chapter-link" href="/Read1_Blue_Lock_358">Chapter 358</a>
  const regex = /<a[^>]+href="\/Read1_Blue_Lock_([0-9a-z_.]+)"[^>]*>Chapter\s+([0-9a-z_.]+)(?:\s*:\s*([^<]+))?<\/a>/gi;
  let m;
  const chapters = [];
  const seenNumbers = new Set();

  while ((m = regex.exec(html)) !== null) {
    const rawId = m[1]; // e.g. "358" or "346b"
    const chNum = parseFloat(rawId);
    const title = `Chapter ${rawId}`;

    if (!isNaN(chNum) && !seenNumbers.has(rawId)) {
      seenNumbers.add(rawId);
      chapters.push({ id: rawId, number: chNum, rawId, title });
    }
  }

  console.log('Total chapters parsed:', chapters.length);
  console.log('First 5 (newest):', chapters.slice(0, 5));
  console.log('Last 5 (oldest):', chapters.slice(-5));
}

testChaptersList();
