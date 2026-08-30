exports.handler = async (event, context) => {
  const params = event.queryStringParameters || {};
  const imageUrl = params.url;
  if (!imageUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing url parameter'
    };
  }

  try {
    const imageRes = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://ww3.mangafreak.me/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!imageRes.ok) {
      return {
        statusCode: imageRes.status,
        headers: { 'Content-Type': 'text/plain' },
        body: `Failed: ${imageRes.statusText}`
      };
    }
    const contentType = imageRes.headers.get('content-type') || 'image/png';
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
    console.error('Proxy image Netlify function error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Internal Server Error'
    };
  }
};
