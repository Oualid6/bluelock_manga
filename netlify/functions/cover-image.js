const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': 'https://ww3.mangafreak.me/'
};

exports.handler = async (event, context) => {
  const COVER_URL = 'https://images.mangafreak.me/manga_images/blue_lock.jpg';
  try {
    const imageRes = await fetch(COVER_URL, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10000)
    });
    if (!imageRes.ok) {
      return {
        statusCode: imageRes.status,
        body: ''
      };
    }
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      },
      body: base64,
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('Cover image Netlify function error:', err.message);
    return {
      statusCode: 500,
      body: 'Internal Server Error'
    };
  }
};
