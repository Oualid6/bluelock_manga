const fs = require('fs');

// Verify chapters.js contains 361
const chaptersContent = fs.readFileSync('chapters.js', 'utf8');
console.log('1. Checking chapters.js:');
console.log('Contains 361:', chaptersContent.includes('"number": 361'));
console.log('Contains coming-soon status:', chaptersContent.includes('"status": "coming-soon"'));

// Verify sitemap.xml contains chapter 361
const sitemapContent = fs.readFileSync('sitemap.xml', 'utf8');
console.log('\n2. Checking sitemap.xml:');
console.log('Contains /chapter/361:', sitemapContent.includes('/chapter/361'));

// Verify robots.txt allows /chapter/361
const robotsContent = fs.readFileSync('robots.txt', 'utf8');
console.log('\n3. Checking robots.txt:');
console.log('Sitemap link present:', robotsContent.includes('sitemap.xml'));
console.log('Not disallowing /chapter/:', !/Disallow:\s*\/chapter\/?(\s|$)/.test(robotsContent));

console.log('\nVerification complete!');
