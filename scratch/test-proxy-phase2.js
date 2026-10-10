const proxyHandler = require('../netlify/functions/proxy-image.js').handler;

async function runTests() {
  console.log('--- RUNNING PHASE 2 PROXY SECURITY TESTS ---');

  // Test A: Unauthorized domain
  let resA = await proxyHandler({ queryStringParameters: { url: 'https://example.com/test.jpg' } });
  console.log('Test A (Unauthorized domain): Status =', resA.statusCode, '| Body =', resA.body);

  // Test B: HTTP URL
  let resB = await proxyHandler({ queryStringParameters: { url: 'http://images.mangafreak.me/test.jpg' } });
  console.log('Test B (HTTP protocol): Status =', resB.statusCode, '| Body =', resB.body);

  // Test C: Localhost
  let resC = await proxyHandler({ queryStringParameters: { url: 'https://localhost/test.jpg' } });
  console.log('Test C (Localhost): Status =', resC.statusCode, '| Body =', resC.body);

  // Test D: Private IP
  let resD = await proxyHandler({ queryStringParameters: { url: 'https://192.168.1.1/test.jpg' } });
  console.log('Test D (Private IP): Status =', resD.statusCode, '| Body =', resD.body);

  // Test E: Invalid URL
  let resE = await proxyHandler({ queryStringParameters: { url: 'invalid-url-string' } });
  console.log('Test E (Invalid URL): Status =', resE.statusCode, '| Body =', resE.body);

  // Test F: Missing parameter
  let resF = await proxyHandler({ queryStringParameters: {} });
  console.log('Test F (Missing URL): Status =', resF.statusCode, '| Body =', resF.body);

  // Test G: Legitimate MangaFreak image URL
  console.log('\n--- Testing Legitimate Request ---');
  let resG = await proxyHandler({ queryStringParameters: { url: 'https://images.mangafreak.me/manga_images/blue_lock.jpg' } });
  console.log('Test G (Legitimate Image): Status =', resG.statusCode);
  console.log('Headers =', JSON.stringify(resG.headers, null, 2));
  console.log('isBase64Encoded =', resG.isBase64Encoded);
  console.log('Body length =', resG.body ? resG.body.length : 0);
}

runTests();
