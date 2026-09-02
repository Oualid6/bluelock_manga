const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://bluelockreader.com';
const today = new Date().toISOString().split('T')[0];

const fileContent = fs.readFileSync(path.join(__dirname, '../chapters.js'), 'utf8');
const jsonMatch = fileContent.match(/const\s+CHAPTERS\s*=\s*([\s\S]+?);?\s*$/);
const CHAPTERS = JSON.parse(jsonMatch[1]);

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'tr', 'ja', 'ar'];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

// Main domain root
xml += `  <url>\n    <loc>${SITE_URL}/</loc>\n`;
SUPPORTED_LANGS.forEach(altLp => {
  xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${SITE_URL}/${altLp}/" />\n`;
});
xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/" />\n`;
xml += `    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

// Language homepages
SUPPORTED_LANGS.forEach(lp => {
  xml += `  <url>\n    <loc>${SITE_URL}/${lp}/</loc>\n`;
  SUPPORTED_LANGS.forEach(altLp => {
    xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${SITE_URL}/${altLp}/" />\n`;
  });
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/" />\n`;
  xml += `    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
});

// All Chapters page
xml += `  <url>\n    <loc>${SITE_URL}/chapters</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

SUPPORTED_LANGS.forEach(lp => {
  xml += `  <url>\n    <loc>${SITE_URL}/${lp}/chapters</loc>\n`;
  SUPPORTED_LANGS.forEach(altLp => {
    xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${SITE_URL}/${altLp}/chapters" />\n`;
  });
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/chapters" />\n`;
  xml += `    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
});

// Chapter pages
CHAPTERS.forEach(c => {
  xml += `  <url>\n    <loc>${SITE_URL}/chapter/${c.number}</loc>\n`;
  SUPPORTED_LANGS.forEach(altLp => {
    xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${SITE_URL}/${altLp}/chapter/${c.number}" />\n`;
  });
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/chapter/${c.number}" />\n`;
  xml += `    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
});

// Legal & Public pages
const staticPages = [
  { path: '/privacy.html', priority: '0.3', freq: 'yearly' },
  { path: '/terms.html',   priority: '0.3', freq: 'yearly' },
  { path: '/dmca.html',    priority: '0.3', freq: 'yearly' },
  { path: '/disclaimer.html', priority: '0.3', freq: 'yearly' },
  { path: '/contact.html', priority: '0.4', freq: 'monthly' },
];

staticPages.forEach(p => {
  xml += `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
});

xml += '</urlset>';

const outputPath = path.join(__dirname, '../sitemap.xml');
fs.writeFileSync(outputPath, xml, 'utf8');
console.log('sitemap.xml generated successfully! Total size:', xml.length, 'bytes');
