const fs = require('fs');

async function test() {
  const res = await fetch('https://ww3.mangafreak.me/Read1_Blue_Lock_1', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  fs.writeFileSync('scratch/chapter1.html', html);
  
  const imgMatches = [...html.matchAll(/<img[^>]+>/gi)].map(m => m[0]);
  console.log('Total img elements:', imgMatches.length);
  console.log('Img elements:', imgMatches);
}

test();
