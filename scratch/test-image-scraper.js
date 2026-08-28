async function getChapterImages(chapterId) {
  const url = `https://ww3.mangafreak.me/Read1_Blue_Lock_${chapterId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  
  // Extract images matching https://images.mangafreak.me/mangas/blue_lock/... or <img id="gohere" ... src="...">
  const imgRegex = /<img[^>]+src="(https:\/\/images\.mangafreak\.me\/mangas\/blue_lock\/[^"]+)"/gi;
  let m;
  const images = [];
  while ((m = imgRegex.exec(html)) !== null) {
    images.push(m[1]);
  }
  return images;
}

async function test() {
  const testIds = ['1', '50', '200', '358'];
  for (const id of testIds) {
    const imgs = await getChapterImages(id);
    console.log(`Chapter ${id}: found ${imgs.length} images. First: ${imgs[0]}`);
  }
}

test();
