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
    console.log('Has Chapter 362 button:', homeHtml.includes('btn-ch362'));
    console.log('Has readChapter(362):', homeHtml.includes('readChapter(362)'));

    console.log('\n--- Testing GET http://localhost:8899/chapter/361 ---');
    const ch361Res = await fetch('http://localhost:8899/chapter/361');
    const ch361Html = await ch361Res.text();
    console.log('Status:', ch361Res.status);
    console.log('Title:', (ch361Html.match(/<title>(.*?)<\/title>/) || [])[1]);
    console.log('Meta Desc:', (ch361Html.match(/<meta name="description" content="(.*?)"/) || [])[1]);

    console.log('\n--- Testing GET http://localhost:8899/chapter/362 ---');
    const ch362Res = await fetch('http://localhost:8899/chapter/362');
    const ch362Html = await ch362Res.text();
    console.log('Status:', ch362Res.status);
    console.log('Title:', (ch362Html.match(/<title>(.*?)<\/title>/) || [])[1]);
    console.log('Meta Desc:', (ch362Html.match(/<meta name="description" content="(.*?)"/) || [])[1]);
    console.log('Has H1 Blue Lock Chapter 362:', /<h1[^>]*>Blue Lock Chapter 362<\/h1>/i.test(ch362Html));
    console.log('Has Telegram Link:', ch362Html.includes('https://t.me/ManganexChannel'));
    console.log('Has Coming Soon Badge:', ch362Html.includes('CHAPTER 362 — COMING SOON') || ch362Html.includes('Chapter 362 — Coming Soon'));
  } catch (err) {
    console.error('HTTP Test Error:', err);
  } finally {
    serverProc.kill();
  }
}, 2500);
