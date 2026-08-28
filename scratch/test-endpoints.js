const http = require('http');

// Start server in child process or fetch
async function testServer() {
  const PORT = 8000;
  
  // Test /
  console.log('Testing GET http://localhost:8000/');
  let res = await fetch(`http://localhost:${PORT}/`);
  let text = await res.text();
  console.log('Home Status:', res.status);
  console.log('Home title match:', text.match(/<title>(.*?)<\/title>/)?.[1]);
  console.log('Home contains Blue Lock:', text.includes('Blue Lock'));

  // Test /chapters
  console.log('\nTesting GET http://localhost:8000/chapters');
  res = await fetch(`http://localhost:${PORT}/chapters`);
  text = await res.text();
  console.log('Chapters Status:', res.status);
  console.log('Chapters title match:', text.match(/<title>(.*?)<\/title>/)?.[1]);

  // Test /chapter/1
  console.log('\nTesting GET http://localhost:8000/chapter/1');
  res = await fetch(`http://localhost:${PORT}/chapter/1`);
  text = await res.text();
  console.log('Chapter 1 Status:', res.status);
  console.log('Chapter 1 title match:', text.match(/<title>(.*?)<\/title>/)?.[1]);

  // Test /chapter-images?ch=1
  console.log('\nTesting GET http://localhost:8000/chapter-images?ch=1');
  res = await fetch(`http://localhost:${PORT}/chapter-images?ch=1`);
  let json = await res.json();
  console.log('Ch 1 images status:', res.status);
  console.log('Ch 1 pages count:', json.images?.length);
  console.log('Ch 1 first page URL:', json.images?.[0]);

  // Test /chapter-images?ch=358
  console.log('\nTesting GET http://localhost:8000/chapter-images?ch=358');
  res = await fetch(`http://localhost:${PORT}/chapter-images?ch=358`);
  json = await res.json();
  console.log('Ch 358 images status:', res.status);
  console.log('Ch 358 pages count:', json.images?.length);
  console.log('Ch 358 first page URL:', json.images?.[0]);

  process.exit(0);
}

// Start server child process
const { fork } = require('child_process');
const serverProc = fork('./server.js', [], { stdio: 'inherit' });

setTimeout(() => {
  testServer().catch(err => {
    console.error('Test failed:', err);
    serverProc.kill();
    process.exit(1);
  }).finally(() => {
    serverProc.kill();
  });
}, 3000);
