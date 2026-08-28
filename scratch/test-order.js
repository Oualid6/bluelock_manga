const fs = require('fs');

async function dumpTable() {
  const res = await fetch('https://ww3.mangafreak.me/Manga/Blue_Lock', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  
  const regex = /<a[^>]+href="\/Read1_Blue_Lock_([^"]+)"[^>]*>Chapter\s+([^<]+)<\/a>/gi;
  let m;
  const list = [];
  while ((m = regex.exec(html)) !== null) {
    list.push({ href: m[1], text: m[2] });
  }
  console.log('Total found:', list.length);
  console.log('Index 0 to 10:', list.slice(0, 10));
  console.log('Index 210 to end:', list.slice(-15));
}

dumpTable();
