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
    console.log('Has Chapter 365 button:', homeHtml.includes('btn-ch365'));
    console.log('Has readChapter(365):', homeHtml.includes('readChapter(365)'));

    console.log('\n--- Testing GET http://localhost:8899/chapter/364 ---');
    const ch364Res = await fetch('http://localhost:8899/chapter/364');
    const ch364Html = await ch364Res.text();
    console.log('Status:', ch364Res.status);
    console.log('Title:', (ch364Html.match(/<title>(.*?)<\/title>/) || [])[1]);
    console.log('Meta Desc:', (ch364Html.match(/<meta name="description" content="(.*?)"/) || [])[1]);

    console.log('\n--- Testing GET http://localhost:8899/chapter/365 ---');
    const ch365Res = await fetch('http://localhost:8899/chapter/365');
    const ch365Html = await ch365Res.text();
    console.log('Status:', ch365Res.status);
    console.log('Title:', (ch365Html.match(/<title>(.*?)<\/title>/) || [])[1]);
    console.log('Meta Desc:', (ch365Html.match(/<meta name="description" content="(.*?)"/) || [])[1]);
    console.log('Has H1 Blue Lock Chapter 365:', /<h1[^>]*>Blue Lock Chapter 365<\/h1>/i.test(ch365Html));
    console.log('Has Telegram Link:', ch365Html.includes('https://t.me/ManganexChannel'));
    console.log('Has Coming Soon Badge:', ch365Html.includes('Chapter 365 — Coming Soon'));

    console.log('\n--- Testing GET http://localhost:8899/chapter-images?ch=364 ---');
    const imgsRes = await fetch('http://localhost:8899/chapter-images?ch=364');
    console.log('Status:', imgsRes.status);
    const imgsData = await imgsRes.json();
    console.log('Images count for Chapter 364:', imgsData.images ? imgsData.images.length : 0);
  } catch (err) {
    console.error('HTTP Test Error:', err);
  } finally {
    serverProc.kill();
  }
}, 2500);
