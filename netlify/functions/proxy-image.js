const ALLOWED_DOMAINS = new Set([
  'images.mangafreak.me'
]);

function isPrivateIp(hostname) {
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return true;
  }
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    if (p1 === 10) return true;
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
    if (p1 === 192 && p2 === 168) return true;
    if (p1 === 169 && p2 === 254) return true;
    if (p1 === 127) return true;
    if (p1 === 0) return true;
  }
  if (hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:') || hostname === '::') {
    return true;
  }
  return false;
}

exports.handler = async (event, context) => {
  const params = event.queryStringParameters || {};
  const imageUrl = params.url;

  if (!imageUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
      body: JSON.stringify({ error: 'Missing url parameter' })
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch (_) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
      body: JSON.stringify({ error: 'Invalid URL format' })
    };
  }

  if (parsedUrl.protocol !== 'https:') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
      body: JSON.stringify({ error: 'Only HTTPS URLs are permitted' })
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (!ALLOWED_DOMAINS.has(hostname) || isPrivateIp(hostname)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
      body: JSON.stringify({ error: 'Domain not authorized' })
    };
  }

  try {
    const imageRes = await fetch(parsedUrl.href, {
      headers: {
        'Referer': 'https://ww3.mangafreak.me/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!imageRes.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
        body: JSON.stringify({ error: `Upstream error: ${imageRes.status}` })
      };
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      },
      body: base64,
      isBase64Encoded: true
    };
  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 502,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
      body: JSON.stringify({ error: isTimeout ? 'Upstream request timeout' : 'Failed to fetch image from upstream server' })
    };
  }
};

