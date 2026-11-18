const http = require('http');
const { spawn } = require('child_process');

const serverProc = spawn('node', ['server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '8899' }
});

serverProc.stdout.on('data', (d) => console.log('[Server]', d.toString().trim()));
serverProc.stderr.on('data', (d) => console.error('[Server Err]', d.toString().trim()));

setTimeout(async () => {
  try {
    console.log('\n--- Testing GET http://localhost:8899/ ---');
    const homeRes = await fetch('http://localhost:8899/');
    const homeHtml = await homeRes.text();
    console.log('Status:', homeRes.status);
    console.log('Has Chapter 369 button:', homeHtml.includes('btn-ch369'));
    console.log('Has readChapter(369):', homeHtml.includes('readChapter(369)'));

    console.log('\n--- Testing GET http://localhost:8899/chapter/369 ---');
    const ch369Res = await fetch('http://localhost:8899/chapter/369');
    const ch369Html = await ch369Res.text();
    console.log('Status:', ch369Res.status);
    console.log('Title:', (ch369Html.match(/<title>(.*?)<\/title>/) || [])[1]);
    console.log('Meta Desc:', (ch369Html.match(/<meta name="description" content="(.*?)"/) || [])[1]);

    console.log('\n--- Testing GET http://localhost:8899/chapter-images?ch=369 ---');
    const imgsRes = await fetch('http://localhost:8899/chapter-images?ch=369');
    console.log('Status:', imgsRes.status);
    const imgsData = await imgsRes.json();
    console.log('Images count for Chapter 369:', imgsData.images ? imgsData.images.length : 0);
    console.log('Sample image 1:', imgsData.images ? imgsData.images[0] : 'none');
  } catch (err) {
    console.error('HTTP Test Error:', err);
  } finally {
    serverProc.kill();
  }
}, 2500);
