const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mangafreakProvider = require('./providers/mangafreak-provider');

const PORT = process.env.PORT || 8000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://ww3.mangafreak.me/'
};

// ── In-memory caches ──
const chapterImagesCache = {};
const KNOWN_CHAPTER_IDS = {};

// Load sync state ID map into KNOWN_CHAPTER_IDS
try {
  const statePath = path.join(__dirname, 'sync', 'sync-state.json');
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (state.chapterIdMap) {
      Object.assign(KNOWN_CHAPTER_IDS, state.chapterIdMap);
    }
  }
} catch (_) {}

// ── Story Arc Data for Blue Lock ──
const ARCS = [
  { id: 1, name: "First Selection Arc",   start: 1,   end: 38  },
  { id: 2, name: "Second Selection Arc",  start: 39,  end: 86  },
  { id: 3, name: "Third Selection Arc",   start: 87,  end: 108 },
  { id: 4, name: "VS. U-20 Japan Arc",    start: 109, end: 151 },
  { id: 5, name: "Neo Egoist League Arc", start: 152, end: 9999 },
];

// ── FAQ data (shared between schema and HTML) ──
const FAQ_ITEMS = [
  {
    q: "Where can I read Blue Lock manga online?",
    a: "You can read Blue Lock manga online for free right here on Blue Lock Reader. All chapters are available in English with high-quality scans and a clean reading interface."
  },
  {
    q: "Is Blue Lock manga still ongoing?",
    a: "Yes, Blue Lock is still ongoing. Written by Muneyuki Kaneshiro and illustrated by Yuusuke Nomura, the series is published in Weekly Shōnen Magazine by Kodansha."
  },
  {
    q: "What is the latest Blue Lock chapter?",
    a: "New Blue Lock chapters are added to Blue Lock Reader as soon as they release. You can read the latest chapter online for free."
  },
  {
    q: "Can I read Blue Lock in English for free?",
    a: "Yes! Blue Lock Reader provides all Blue Lock chapters in English for free, from Chapter 1 all the way to the latest chapter without any registration or subscription."
  }
];

// ── Get chapter images from MangaFreak ──
async function getChapterImages(chNum) {
  if (chapterImagesCache[chNum]) return chapterImagesCache[chNum];

  const chapterId = KNOWN_CHAPTER_IDS[chNum] || String(chNum);
  let images = [];
  try {
    images = await mangafreakProvider.getChapterImages(chapterId);
    console.log(`[MangaFreak] Got ${images.length} pages for Ch.${chNum}`);
  } catch (e) {
    console.error(`[MangaFreak] Failed for Ch.${chNum}:`, e.message);
  }

  if (images.length > 0) {
    chapterImagesCache[chNum] = images;
  }
  return images;
}

// ── Load chapter details for dynamic SEO metadata ──
let CHAPTERS_LIST = [];
function reloadChaptersFromDisk() {
  try {
    const chaptersPath = path.join(__dirname, 'chapters.js');
    const fileContent  = fs.readFileSync(chaptersPath, 'utf8');
    const jsonMatch    = fileContent.match(/const\s+CHAPTERS\s*=\s*([\s\S]+?);?\s*$/);
    if (jsonMatch) {
      CHAPTERS_LIST = JSON.parse(jsonMatch[1]);
      console.log(`[SEO] Loaded ${CHAPTERS_LIST.length} chapters from chapters.js`);
    }
    try {
      const statePath = path.join(__dirname, 'sync', 'sync-state.json');
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (state.chapterIdMap) {
          Object.assign(KNOWN_CHAPTER_IDS, state.chapterIdMap);
        }
      }
    } catch (_) {}
  } catch (err) {
    console.error('[SEO] Failed to reload chapters.js:', err.message);
  }
}
reloadChaptersFromDisk();

let lastChaptersJsMtime = 0;
function checkAndReloadChapters() {
  try {
    const chaptersPath = path.join(__dirname, 'chapters.js');
    const stat = fs.statSync(chaptersPath);
    if (stat.mtimeMs !== lastChaptersJsMtime) {
      lastChaptersJsMtime = stat.mtimeMs;
      reloadChaptersFromDisk();
    }
  } catch (_) {}
}

function onNewChapterSaved(chapterNumber, chapterId, images) {
  KNOWN_CHAPTER_IDS[chapterNumber] = chapterId;
  if (images && images.length > 0) {
    chapterImagesCache[chapterNumber] = images;
  }
  reloadChaptersFromDisk();
}

function addSecurityHeaders(res, extra = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  for (const [k, v] of Object.entries(extra)) {
    res.setHeader(k, v);
  }
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════
// ── Multilingual SEO Translations (Server-Side Rendering) ──
// ═══════════════════════════════════════════════════════════════
const TRANSLATIONS = {
  EN: {
    seo_h1: "Blue Lock Manga Online",
    seo_title_home: "Blue Lock Manga Online — Read Free | Blue Lock Reader",
    seo_title_chapters: "Read Blue Lock Chapters Online — Full List | Blue Lock Reader",
    seo_title_chapter: "Read Blue Lock Chapter {ch}: {title} Online Free | Blue Lock Reader",
    seo_desc_home: "Read Blue Lock manga online for free. All chapters of Muneyuki Kaneshiro's high-stakes soccer series featuring Isagi Yoichi & Ego Jinpachi. Updated regularly.",
    seo_desc_chapters: "Browse all Blue Lock chapters online. From Chapter 1 to the latest, read free manga in English. Updated with new chapters.",
    seo_desc_chapter: "Read Blue Lock Chapter {ch}: \"{title}\" online for free in English. Part of the {arc}. High-quality scans.",
    breadcrumb_home: "Home",
    breadcrumb_chapters: "All Chapters",
    breadcrumb_chapter_prefix: "Chapter",
    faq_q1: "Where can I read Blue Lock manga online?",
    faq_a1: "You can read Blue Lock manga online for free right here on Blue Lock Reader. All chapters are available in English with high-quality scans. No registration required.",
    faq_q2: "Is Blue Lock manga still ongoing?",
    faq_a2: "Yes, Blue Lock is still ongoing. Written by Muneyuki Kaneshiro and illustrated by Yuusuke Nomura, the series is published in Weekly Shōnen Magazine by Kodansha.",
    faq_q3: "What is the latest Blue Lock chapter?",
    faq_a3: "New Blue Lock chapters are added to Blue Lock Reader as soon as they release.",
    faq_q4: "Can I read Blue Lock in English for free?",
    faq_a4: "Yes! Blue Lock Reader provides all Blue Lock chapters in English for free, from Chapter 1 all the way to the latest chapter.",
    faq_q5: "What are the main Blue Lock story arcs?",
    faq_a5: "Blue Lock features 5 major arcs: First Selection (Ch.1–38), Second Selection (Ch.39–86), Third Selection (Ch.87–108), VS. U-20 Japan (Ch.109–151), and Neo Egoist League (Ch.152+).",
    series_name: "Blue Lock",
    author_name: "Muneyuki Kaneshiro & Yuusuke Nomura"
  },
  ES: {
    seo_h1: "Blue Lock Manga Online en Español",
    seo_title_home: "Blue Lock Manga Online — Leer Gratis | Blue Lock Reader",
    seo_title_chapters: "Leer Capítulos de Blue Lock Online — Lista | Blue Lock Reader",
    seo_title_chapter: "Leer Blue Lock Capítulo {ch}: {title} Gratis Online | Blue Lock Reader",
    seo_desc_home: "Lee el manga Blue Lock online gratis. Todos los capítulos de la serie de fútbol de Muneyuki Kaneshiro y Yuusuke Nomura. Actualizado regularmente.",
    seo_desc_chapters: "Explora todos los capítulos de Blue Lock online. Lee manga gratis en español desde el capítulo 1 hasta el último.",
    seo_desc_chapter: "Lee Blue Lock Capítulo {ch}: \"{title}\" online gratis en español. Parte del {arc}. Escaneos de alta calidad.",
    breadcrumb_home: "Inicio",
    breadcrumb_chapters: "Todos los Capítulos",
    breadcrumb_chapter_prefix: "Capítulo",
    faq_q1: "¿Dónde puedo leer el manga Blue Lock online gratis?",
    faq_a1: "Puedes leer el manga Blue Lock en línea de forma gratuita aquí en Blue Lock Reader. Todos los capítulos están disponibles con alta calidad.",
    faq_q2: "¿El manga de Blue Lock sigue en emisión?",
    faq_a2: "Sí, Blue Lock sigue en curso. Escrito por Muneyuki Kaneshiro e ilustrado por Yuusuke Nomura en Weekly Shōnen Magazine.",
    faq_q3: "¿Cuál es el último capítulo de Blue Lock?",
    faq_a3: "Las nuevas actualizaciones se añaden a Blue Lock Reader inmediatamente tras su publicación.",
    faq_q4: "¿Puedo leer Blue Lock gratis?",
    faq_a4: "¡Sí! En Blue Lock Reader ofrecemos todos los capítulos de Blue Lock gratis, desde el Capítulo 1 hasta el más reciente.",
    faq_q5: "¿Cuáles son los arcos argumentales de Blue Lock?",
    faq_a5: "Blue Lock consta de 5 arcos principales: Primera Selección (Cap.1-38), Segunda Selección (Cap.39-86), Tercera Selección (Cap.87-108), VS. Japón Sub-20 (Cap.109-151) y la Liga Neo Egoísta (Cap.152+).",
    series_name: "Blue Lock",
    author_name: "Muneyuki Kaneshiro & Yuusuke Nomura"
  },
  FR: {
    seo_h1: "Blue Lock Manga en Ligne",
    seo_title_home: "Blue Lock Manga en Ligne — Lire Gratuit | Blue Lock Reader",
    seo_title_chapters: "Lire Chapitres Blue Lock en Ligne — Liste | Blue Lock Reader",
    seo_title_chapter: "Lire Blue Lock Chapitre {ch}: {title} Gratuit En Ligne | Blue Lock Reader",
    seo_desc_home: "Lisez le manga Blue Lock en ligne gratuitement. Tous les chapitres de la série intense de football par Muneyuki Kaneshiro et Yuusuke Nomura.",
    seo_desc_chapters: "Parcourez tous les chapitres de Blue Lock en ligne. Lisez le manga gratuit du chapitre 1 au dernier.",
    seo_desc_chapter: "Lisez Blue Lock Chapitre {ch}: \"{title}\" en ligne gratuitement. Fait partie de l'{arc}. Scans de haute qualité.",
    breadcrumb_home: "Accueil",
    breadcrumb_chapters: "Tous les Chapitres",
    breadcrumb_chapter_prefix: "Chapitre",
    faq_q1: "Où puis-je lire le manga Blue Lock en ligne gratuitement ?",
    faq_a1: "Vous pouvez lire le manga Blue Lock en ligne gratuitement directement sur Blue Lock Reader.",
    faq_q2: "Le manga Blue Lock est-il toujours en cours ?",
    faq_a2: "Oui, Blue Lock est toujours en cours de parution dans le Weekly Shōnen Magazine de Kodansha.",
    faq_q3: "Quel est le dernier chapitre de Blue Lock ?",
    faq_a3: "Les nouveaux chapitres sont ajoutés dès leur publication.",
    faq_q4: "Puis-je lire Blue Lock gratuitement ?",
    faq_a4: "Oui, vous pouvez lire tous les chapitres de Blue Lock gratuitement sur Blue Lock Reader.",
    faq_q5: "Quels sont les arcs principaux de Blue Lock ?",
    faq_a5: "Blue Lock compte 5 arcs principaux : Première Sélection (Ch.1–38), Seconde Sélection (Ch.39–86), Troisième Sélection (Ch.87–108), VS U-20 Japon (Ch.109–151), et Neo Egoist League (Ch.152+).",
    series_name: "Blue Lock",
    author_name: "Muneyuki Kaneshiro & Yuusuke Nomura"
  },
  DE: {
    seo_h1: "Blue Lock Manga online lesen",
    seo_title_home: "Blue Lock Manga Online Lesen — Kostenlos | Blue Lock Reader",
    seo_title_chapters: "Blue Lock Kapitel Online Lesen — Liste | Blue Lock Reader",
    seo_title_chapter: "Blue Lock Kapitel {ch}: {title} Kostenlos Online Lesen | Blue Lock Reader",
    seo_desc_home: "Lies Blue Lock Manga online kostenlos. Alle Kapitel von Kaneshiro Muneyukis Fußball-Manga mit Isagi Yoichi & Ego Jinpachi.",
    seo_desc_chapters: "Durchstöbere alle Blue Lock Kapitel online. Lies kostenlose Mangas von Kapitel 1 bis zum neuesten.",
    seo_desc_chapter: "Lies Blue Lock Kapitel {ch}: \"{title}\" online kostenlos. Teil des {arc}. Hochwertige Scans.",
    breadcrumb_home: "Startseite",
    breadcrumb_chapters: "Alle Kapitel",
    breadcrumb_chapter_prefix: "Kapitel",
    faq_q1: "Wo kann ich den Blue Lock Manga online kostenlos lesen?",
    faq_a1: "Du kannst den Blue Lock Manga online kostenlos hier auf Blue Lock Reader lesen.",
    faq_q2: "Wird der Blue Lock Manga noch fortgesetzt?",
    faq_a2: "Ja, Blue Lock läuft noch im Weekly Shōnen Magazine von Kodansha.",
    faq_q3: "Was ist das neueste Kapitel von Blue Lock?",
    faq_a3: "Neue Kapitel werden sofort hochgeladen.",
    faq_q4: "Kann ich Blue Lock kostenlos lesen?",
    faq_a4: "Ja, alle Kapitel von Blue Lock stehen dir kostenlos zur Verfügung.",
    faq_q5: "Welches sind die Haupt-Arcs in Blue Lock?",
    faq_a5: "Erste Auswahl (Kap.1-38), Zweite Auswahl (Kap.39-86), Dritte Auswahl (Kap.87-108), VS. U-20 Japan (Kap.109-151) und Neo Egoist League (Kap.152+).",
    series_name: "Blue Lock",
    author_name: "Muneyuki Kaneshiro & Yuusuke Nomura"
  },
  TR: {
    seo_h1: "Blue Lock manga oku",
    seo_title_home: "Blue Lock Manga Oku — Online Ücretsiz | Blue Lock Reader",
    seo_title_chapters: "Blue Lock Bölümleri Oku — Bölüm Listesi | Blue Lock Reader",
    seo_title_chapter: "Blue Lock Bölüm {ch}: {title} Oku | Blue Lock Reader",
    seo_desc_home: "Blue Lock mangasını çevrimiçi ücretsiz oku. Isagi Yoichi ve Blue Lock projesinin tüm bölümleri burada.",
    seo_desc_chapters: "Tüm Blue Lock bölümlerine göz atın. Bölüm 1'den en son bölüme kadar Blue Lock mangasını ücretsiz okuyun.",
    seo_desc_chapter: "Blue Lock Bölüm {ch}: \"{title}\" oku. {arc} parçasıdır.",
    breadcrumb_home: "Ana Sayfa",
    breadcrumb_chapters: "Tüm Bölümler",
    breadcrumb_chapter_prefix: "Bölüm",
    faq_q1: "Blue Lock mangasını çevrimiçi nereden ücretsiz okuyabilirim?",
    faq_a1: "Blue Lock mangasını çevrimiçi olarak doğrudan Blue Lock Reader'da ücretsiz okuyabilirsiniz.",
    faq_q2: "Blue Lock mangası hala devam ediyor mu?",
    faq_a2: "Evet, Blue Lock Weekly Shōnen Magazine'de yayınlanmaya devam etmektedir.",
    faq_q3: "En son yayınlanan Blue Lock bölümü hangisidir?",
    faq_a3: "Yeni bölümler yayınlandıkça anında eklenmektedir.",
    faq_q4: "Blue Lock mangasını ücretsiz okuyabilir miyim?",
    faq_a4: "Evet! Blue Lock Reader üzerinden tüm bölümlere ücretsiz erişebilirsiniz.",
    faq_q5: "Blue Lock hikaye arkları nelerdir?",
    faq_a5: "İlk Seçim (1-38), İkinci Seçim (39-86), Üçüncü Seçim (87-108), U-20 Japonya (109-151) ve Neo Egoist Ligi (152+).",
    series_name: "Blue Lock",
    author_name: "Muneyuki Kaneshiro & Yuusuke Nomura"
  },
  JP: {
    seo_h1: "ブルーロック 漫画",
    seo_title_home: "ブルーロック 漫画 — オンラインで読む無料 | Blue Lock Reader",
    seo_title_chapters: "ブルーロック 最新話 — 全話一覧 | Blue Lock Reader",
    seo_title_chapter: "ブルーロック 第 {ch} 話: {title} 無料漫画 | Blue Lock Reader",
    seo_desc_home: "ブルーロックの漫画をオンラインで無料で読みましょう。金城宗幸・ノ村優介のサッカー漫画、潔世一や絵心甚八の全話を掲載。",
    seo_desc_chapters: "ブルーロックの全話をオンラインで閲覧可能。第1話から最新話まで無料で読めます。",
    seo_desc_chapter: "ブルーロック 第 {ch} 話: 「{title}」の漫画をオンラインで無料閲覧。{arc}。",
    breadcrumb_home: "ホーム",
    breadcrumb_chapters: "全話一覧",
    breadcrumb_chapter_prefix: "第",
    faq_q1: "ブルーロックの漫画はどこで無料で読めますか？",
    faq_a1: "ブルーロックの全話は、Blue Lock Readerでいつでもオンラインで無料で読むことができます。",
    faq_q2: "ブルーロックの漫画はまだ連載中ですか？",
    faq_a2: "はい、週刊少年マガジンにて大好評連載中です。",
    faq_q3: "ブルーロックの最新話はどれですか？",
    faq_a3: "最新エピソードも迅速にアップデートされます。",
    faq_q4: "全エピソードを最初から最後まで無料で読めますか？",
    faq_a4: "はい、第1話から最新話まで、すべてのエピソードを無料で読むことができます。",
    faq_q5: "ブルーロックの主なストーリー編は何ですか？",
    faq_a5: "1次選考編（1-38話）、2次選考編（39-86話）、3次選考編（87-108話）、U-20日本代表戦編（109-151話）、ネオ・エゴイスト・リーグ編（152話以降）。",
    series_name: "ブルーロック",
    author_name: "金城宗幸・ノ村優介"
  },
  AR: {
    seo_h1: "مانجا بلولوك (Blue Lock)",
    seo_title_home: "مانجا Blue Lock مترجمة اون لاين — اقرأ مجاناً | Blue Lock Reader",
    seo_title_chapters: "فصول مانجا Blue Lock كاملة — قائمة الفصول | Blue Lock Reader",
    seo_title_chapter: "اقرأ مانجا بلولوك الفصل {ch}: {title} مترجم | Blue Lock Reader",
    seo_desc_home: "اقرأ مانجا Blue Lock مترجمة اون لاين مجاناً. جميع فصول بلولوك من تأليف مونيوكي كانيشيرو ونومورا يوسوكي.",
    seo_desc_chapters: "تصفح جميع فصول مانجا Blue Lock مترجمة اون لاين. اقرأ مانجا بلولوك من الفصل الأول إلى الأخير مجاناً.",
    seo_desc_chapter: "اقرأ مانجا Blue Lock الفصل {ch} مترجم: \"{title}\" اون لاين مجاناً. جزء من {arc}.",
    breadcrumb_home: "الرئيسية",
    breadcrumb_chapters: "جميع الفصول",
    breadcrumb_chapter_prefix: "الفصل",
    faq_q1: "أين يمكنني قراءة مانجا Blue Lock مترجمة اون لاين مجاناً؟",
    faq_a1: "يمكنك قراءة مانجا Blue Lock مترجمة مجاناً هنا على موقع Blue Lock Reader.",
    faq_q2: "هل مانغا Blue Lock لا تزال مستمرة؟",
    faq_a2: "نعم، مانجا Blue Lock مستمرة وتُنشر في مجلة شونين الأسبوعية.",
    faq_q3: "ما هو الفصل الأخير في Blue Lock؟",
    faq_a3: "يتم إضافة الفصول الجديدة فور صدورها.",
    faq_q4: "هل يمكنني قراءة جميع الفصول مجاناً؟",
    faq_a4: "نعم! يوفر لك موقعنا إمكانية قراءة جميع فصول Blue Lock مجاناً.",
    faq_q5: "ما هي أركات Blue Lock بترتيب الفصول؟",
    faq_a5: "المرحلة الأولى (1-38)، المرحلة الثانية (39-86)، المرحلة الثالثة (87-108)، مباراة U-20 (109-151)، ودوري النيو إيغويست (152+).",
    series_name: "Blue Lock",
    author_name: "مونيوكي كانيشيرو & نومورا يوسوكي"
  }
};

const ARC_TRANSLATIONS = {
  EN: { 1:"First Selection Arc", 2:"Second Selection Arc", 3:"Third Selection Arc", 4:"VS. U-20 Japan Arc", 5:"Neo Egoist League Arc" },
  ES: { 1:"Arco de la Primera Selección", 2:"Arco de la Segunda Selección", 3:"Arco de la Tercera Selección", 4:"Arco VS. Japón Sub-20", 5:"Arco de la Liga Neo Egoísta" },
  FR: { 1:"Arc Première Sélection", 2:"Arc Seconde Sélection", 3:"Arc Troisième Sélection", 4:"Arc VS U-20 Japon", 5:"Arc Neo Egoist League" },
  DE: { 1:"First Selection Arc", 2:"Second Selection Arc", 3:"Third Selection Arc", 4:"VS. U-20 Japan Arc", 5:"Neo Egoist League Arc" },
  TR: { 1:"İlk Seçim Arkı", 2:"İkinci Seçim Arkı", 3:"Üçüncü Seçim Arkı", 4:"U-20 Japonya Maçı Arkı", 5:"Neo Egoist Ligi Arkı" },
  JP: { 1:"1次選考編", 2:"2次選考編", 3:"3次選考編", 4:"U-20日本代表戦編", 5:"ネオ・エゴイスト・リーグ編" },
  AR: { 1:"أرك المرحلة الأولى", 2:"أرك المرحلة الثانية", 3:"أرك المرحلة الثالثة", 4:"أرك مباراة منتخب اليابان U-20", 5:"أرك دوري النيو إيغويست" }
};

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'tr', 'ja', 'ar'];
const LANG_MAP = { en: 'EN', es: 'ES', fr: 'FR', de: 'DE', tr: 'TR', ja: 'JP', ar: 'AR' };
const LOCALE_MAP = { en: 'en_US', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', tr: 'tr_TR', ja: 'ja_JP', ar: 'ar_SA' };

function t(key, langCode) {
  const raw = (TRANSLATIONS[langCode] && TRANSLATIONS[langCode][key]) ||
              (TRANSLATIONS['EN'] && TRANSLATIONS['EN'][key]) || key;
  const latestNum = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 358;
  const totalCount = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST.length : 358;
  let str = raw.replace(/\{count\}/g, totalCount);
  if (key !== 'seo_title_chapter' && key !== 'seo_desc_chapter') {
    str = str.replace(/\{ch\}/g, latestNum);
  }
  return str;
}

function getArcName(arcId, langCode) {
  return (ARC_TRANSLATIONS[langCode] && ARC_TRANSLATIONS[langCode][arcId]) ||
         (ARC_TRANSLATIONS['EN'] && ARC_TRANSLATIONS['EN'][arcId]) || '';
}

function translateHtml(html, langCode) {
  if (langCode === 'EN') return html;
  html = html.replace(/<html([^>]*) lang="[^"]*"([^>]*)>/,
    `<html$1 lang="${langCode === 'JP' ? 'ja' : langCode.toLowerCase()}"$2>`);
  if (langCode === 'AR') {
    html = html.replace(/<html([^>]*)>/, '<html$1 dir="rtl">');
  }
  return html;
}

function getSiteUrl(req) {
  let proto = req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http');
  if (proto.includes(',')) proto = proto.split(',')[0].trim();
  const host = req.headers.host || 'localhost:8000';
  if (!host.includes('localhost') && !host.includes('127.0.0.1') && proto === 'http') {
    proto = 'https';
  }
  return `${proto}://${host}`;
}

function serve404(req, res, langCode = 'EN', langPrefix = 'en') {
  const html = `<!DOCTYPE html>
<html lang="${langPrefix}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 Page Not Found | Blue Lock Reader</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="stylesheet" href="/style.css" />
</head>
<body style="background:#090d16;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:1rem;">
  <div>
    <h1 style="font-size:5rem;font-weight:900;margin:0;color:#0088ff;">404</h1>
    <h2 style="font-size:1.5rem;margin:1rem 0;color:#ffffff;">Page Not Found</h2>
    <p style="color:#a1a1aa;margin-bottom:2rem;">The requested chapter or page does not exist.</p>
    <a href="/${langPrefix}/" style="display:inline-block;padding:0.75rem 1.5rem;background:#0066ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Return to Homepage</a>
  </div>
</body>
</html>`;
  addSecurityHeaders(res, { 'Cache-Control': 'no-store' });
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveStaticHtmlWithSeo(req, res, filePath, pathname) {
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    const siteUrl = getSiteUrl(req);
    const fullUrl = `${siteUrl}${pathname}`;
    let parsedHtml = html
      .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${fullUrl}" />`)
      .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${fullUrl}" />`);
    
    addSecurityHeaders(res, { 'Cache-Control': 'no-cache, must-revalidate' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(parsedHtml);
  });
}

function serveIndexWithSeo(req, res, pageType, param = null, langCode = 'EN', langPrefix = 'en') {
  checkAndReloadChapters();
  const indexPath = path.join(__dirname, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: index.html not found');
      return;
    }

    const siteUrl = getSiteUrl(req);
    const coverUrl = `${siteUrl}/cover-image`;

    let pagePath = `/${langPrefix}/`;
    let title = t('seo_title_home', langCode);
    let desc  = t('seo_desc_home', langCode);
    let schema = {};

    if (pageType === 'chapters') {
      pagePath = `/${langPrefix}/chapters`;
      title = t('seo_title_chapters', langCode);
      desc  = t('seo_desc_chapters', langCode);
    } else if (pageType === 'chapter') {
      const chNum  = parseInt(param);
      const chData = CHAPTERS_LIST.find(c => c.number === chNum);
      const chTitle = chData ? chData.title : `Chapter ${chNum}`;
      const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
      const arcName = arc ? getArcName(arc.id, langCode) : '';
      pagePath = `/${langPrefix}/chapter/${chNum}`;
      title = t('seo_title_chapter', langCode).replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);
      desc  = t('seo_desc_chapter', langCode).replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);
    }

    const pageUrl = `${siteUrl}${pagePath}`;

    const seriesName = t('series_name', langCode);
    const authorName = t('author_name', langCode);

    if (pageType === 'home') {
      schema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${siteUrl}/#website`,
            "url": pageUrl,
            "name": `Blue Lock Reader — ${t('seo_h1', langCode)}`,
            "description": desc,
            "inLanguage": langPrefix,
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": `${siteUrl}/${langPrefix}/chapters?search={search_term_string}` },
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@type": "BookSeries",
            "name": seriesName,
            "author": { "@type": "Person", "name": authorName },
            "url": pageUrl,
            "genre": ["Sports", "Action", "Drama", "Shounen"],
            "inLanguage": langPrefix
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [{ "@type": "ListItem", "position": 1, "name": t('breadcrumb_home', langCode), "item": pageUrl }]
          },
          {
            "@type": "FAQPage",
            "mainEntity": [1,2,3,4,5].map(i => ({
              "@type": "Question",
              "name": t(`faq_q${i}`, langCode),
              "acceptedAnswer": { "@type": "Answer", "text": t(`faq_a${i}`, langCode) }
            }))
          }
        ]
      };
    } else if (pageType === 'chapters') {
      schema = {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "CollectionPage", "name": title, "description": desc, "url": pageUrl, "inLanguage": langPrefix },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": t('breadcrumb_home', langCode), "item": `${siteUrl}/${langPrefix}/` },
              { "@type": "ListItem", "position": 2, "name": t('breadcrumb_chapters', langCode), "item": pageUrl }
            ]
          }
        ]
      };
    } else if (pageType === 'chapter') {
      const chNum = parseInt(param);
      const chData = CHAPTERS_LIST.find(c => c.number === chNum);
      const chTitle = chData ? chData.title : `Chapter ${chNum}`;
      const prevNum = chNum > 1 ? chNum - 1 : null;
      const maxCh   = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 358;
      const nextNum = chNum < maxCh ? chNum + 1 : null;
      const articleSchema = {
        "@type": "Article",
        "headline": title,
        "description": desc,
        "url": pageUrl,
        "image": coverUrl,
        "datePublished": "2018-08-01",
        "dateModified": todayISO(),
        "author": { "@type": "Person", "name": authorName },
        "publisher": { "@type": "Organization", "name": "Blue Lock Reader", "url": siteUrl },
        "isPartOf": { "@type": "BookSeries", "name": seriesName, "url": siteUrl },
        "inLanguage": langPrefix
      };
      if (prevNum) articleSchema.previousWork = { "@type": "Article", "url": `${siteUrl}/${langPrefix}/chapter/${prevNum}` };
      if (nextNum) articleSchema.nextWork     = { "@type": "Article", "url": `${siteUrl}/${langPrefix}/chapter/${nextNum}` };

      schema = {
        "@context": "https://schema.org",
        "@graph": [
          articleSchema,
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": t('breadcrumb_home', langCode), "item": `${siteUrl}/${langPrefix}/` },
              { "@type": "ListItem", "position": 2, "name": t('breadcrumb_chapters', langCode), "item": `${siteUrl}/${langPrefix}/chapters` },
              { "@type": "ListItem", "position": 3, "name": `${t('breadcrumb_chapter_prefix', langCode)} ${chNum}: ${chTitle}`, "item": pageUrl }
            ]
          }
        ]
      };
    }

    let subPath = '/';
    if (pageType === 'chapters') subPath = '/chapters';
    else if (pageType === 'chapter') subPath = `/chapter/${param}`;

    let alternatesHtml = '';
    SUPPORTED_LANGS.forEach(lc => {
      alternatesHtml += `  <link rel="alternate" hreflang="${lc}" href="${siteUrl}/${lc}${subPath === '/' ? '/' : subPath}" />\n`;
    });
    alternatesHtml += `  <link rel="alternate" hreflang="x-default" href="${siteUrl}/en${subPath === '/' ? '/' : subPath}" />\n`;

    const langInitScript = `  <script>window.__initialLang='${langCode}';localStorage.setItem('bluelock_lang','${langCode}');</script>\n`;

    const schemaString = JSON.stringify(schema, null, 2);
    const htmlLang = langCode === 'JP' ? 'ja' : langCode.toLowerCase();
    const htmlDir  = langCode === 'AR' ? ' dir="rtl"' : '';

    const latestNum = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 358;
    const totalCount = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST.length : 358;

    let parsedHtml = html
      .replace(/<html([^>]*) lang="[^"]*"([^>]*)>/, `<html$1 lang="${htmlLang}"${htmlDir}$2>`)
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${desc.replace(/"/g, '&quot;')}" />`)
      .replace(/Ongoing · Chapter \d+/gi, `Ongoing · Chapter ${latestNum}`)
      .replace(/id="stat-chapters-count">\d+</gi, `id="stat-chapters-count">${totalCount}<`)
      .replace(/href="\/placeholder-canonical"/, `href="${siteUrl}${pagePath}"`)
      .replace(/content="\/placeholder-url"/, `content="${pageUrl}"`)
      .replace(/content="\/cover-image"/g, `content="${coverUrl}"`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${pageUrl}" />`)
      .replace(/<meta property="og:locale" content=".*?" \/>/, `<meta property="og:locale" content="${LOCALE_MAP[langPrefix] || 'en_US'}" />`)
      .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`)
      .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />`)
      .replace(/<script type="application\/ld\+json" id="structured-data">[\s\S]*?<\/script>/,
        `<script type="application/ld+json" id="structured-data">\n${schemaString}\n</script>`)
      .replace('</head>', `${alternatesHtml}${langInitScript}</head>`);

    if (pageType === 'chapter') {
      const chNum = parseInt(param);
      const chData = CHAPTERS_LIST.find(c => c.number === chNum);
      const chTitle = chData ? chData.title : `Chapter ${chNum}`;
      const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
      const arcName = arc ? getArcName(arc.id, langCode) : '';
      const prevNum = chNum > 1 ? chNum - 1 : null;
      const maxCh = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 358;
      const nextNum = chNum < maxCh ? chNum + 1 : null;

      const ssrChapterHtml = `
      <article class="ssr-chapter-container" style="max-width:900px;margin:2rem auto;padding:1.5rem;background:rgba(10,17,40,0.9);border-radius:12px;color:#f4f4f5;border:1px solid #1e293b;">
        <header style="margin-bottom:1.5rem;">
          <h1 style="font-size:2rem;font-weight:800;color:#ffffff;margin-bottom:0.5rem;">Blue Lock Chapter ${chNum}: ${chTitle}</h1>
          ${arcName ? `<span style="display:inline-block;padding:0.25rem 0.75rem;background:#1e293b;border-radius:9999px;font-size:0.85rem;color:#38bdf8;font-weight:500;">${arcName}</span>` : ''}
        </header>
        <p style="font-size:1.05rem;line-height:1.6;color:#cbd5e1;margin-bottom:1.5rem;">
          Read Blue Lock Chapter ${chNum} online free. Official manga release translated into ${langCode}. Follow Isagi Yoichi and Ego Jinpachi on their path to creating the world's best striker.
        </p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:center;margin-top:1rem;">
          ${prevNum ? `<a href="/${langPrefix}/chapter/${prevNum}" style="padding:0.6rem 1.2rem;background:#1e293b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">‹ ${t('breadcrumb_chapter_prefix', langCode)} ${prevNum}</a>` : ''}
          <a href="/${langPrefix}/chapters" style="padding:0.6rem 1.2rem;background:#0066ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${t('breadcrumb_chapters', langCode)}</a>
          ${nextNum ? `<a href="/${langPrefix}/chapter/${nextNum}" style="padding:0.6rem 1.2rem;background:#1e293b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${t('breadcrumb_chapter_prefix', langCode)} ${nextNum} ›</a>` : ''}
        </div>
      </article>`;

      parsedHtml = parsedHtml
        .replace('<main id="home-view">', '<main id="home-view" class="hidden">')
        .replace('<div id="reader-view" class="hidden">', `<div id="reader-view">\n${ssrChapterHtml}`);
    } else if (pageType === 'chapters') {
      const chaptersGridHtml = `
      <section class="ssr-chapters-container" style="max-width:1100px;margin:2rem auto;padding:1rem;">
        <h1 style="font-size:2rem;font-weight:800;color:#ffffff;margin-bottom:1rem;">Blue Lock — All Manga Chapters</h1>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;">
          ${CHAPTERS_LIST.map(c => `
            <a href="/${langPrefix}/chapter/${c.number}" style="display:block;padding:1rem;background:#0f172a;border-radius:8px;text-decoration:none;color:#fff;border:1px solid #1e293b;transition:border-color 0.2s;">
              <div style="font-weight:700;font-size:1.05rem;">Chapter ${c.number}: ${c.title}</div>
              <div style="font-size:0.85rem;color:#94a3b8;margin-top:0.3rem;">Read Chapter ${c.number} Online</div>
            </a>
          `).join('')}
        </div>
      </section>`;

      parsedHtml = parsedHtml
        .replace('<main id="home-view">', '<main id="home-view" class="hidden">')
        .replace('<div id="chapter-list-view" class="hidden">', `<div id="chapter-list-view">\n${chaptersGridHtml}`);
    }

    addSecurityHeaders(res, { 'Cache-Control': 'no-store' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(parsedHtml);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const rawPathname = parsedUrl.pathname;

  if (rawPathname.length > 1 && rawPathname.endsWith('/')) {
    const cleanPath = rawPathname.slice(0, -1);
    res.writeHead(301, { 'Location': cleanPath });
    res.end();
    return;
  }

  let pathname = rawPathname;

  let langCode   = 'EN';
  let langPrefix = 'en';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && SUPPORTED_LANGS.includes(parts[0].toLowerCase())) {
    langPrefix = parts[0].toLowerCase();
    langCode   = LANG_MAP[langPrefix];
    parts.shift();
    pathname = '/' + parts.join('/');
    if (pathname === '') pathname = '/';
  }

  // ── Favicon Routes ──
  if (pathname === '/favicon.ico' || pathname === '/favicon.png') {
    const faviconPath = path.join(__dirname, 'logo', 'blfavicon.png');
    fs.readFile(faviconPath, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      addSecurityHeaders(res, {
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'image/png'
      });
      res.writeHead(200);
      res.end(data);
    });
    return;
  }

  // ── 0. Cover Image Route ──
  if (pathname === '/cover-image') {
    const COVER_URL = 'https://images.mangafreak.me/manga_images/blue_lock.jpg';
    try {
      const imageRes = await fetch(COVER_URL, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(10000)
      });
      if (!imageRes.ok) { res.writeHead(imageRes.status); res.end(); return; }
      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=86400' });
      res.writeHead(200, { 'Content-Type': contentType });
      const buf = await imageRes.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (err) {
      console.error('Cover image error:', err.message);
      res.writeHead(500); res.end();
    }
    return;
  }

  // ── 1. Proxy Route ──
  if (pathname === '/proxy-image') {
    const imageUrl = parsedUrl.query.url;
    if (!imageUrl) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Missing url parameter'); return; }
    try {
      const imageRes = await fetch(imageUrl, {
        headers: { 'Referer': 'https://ww3.mangafreak.me/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(15000)
      });
      if (!imageRes.ok) { res.writeHead(imageRes.status, { 'Content-Type': 'text/plain' }); res.end(`Failed: ${imageRes.statusText}`); return; }
      const contentType = imageRes.headers.get('content-type') || 'image/png';
      addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=86400' });
      res.writeHead(200, { 'Content-Type': contentType });
      const arrayBuffer = await imageRes.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('Proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
    return;
  }

  // ── 2. Chapter Images API ──
  if (pathname === '/chapter-images') {
    const chNum = parseInt(parsedUrl.query.ch);
    if (isNaN(chNum) || chNum < 1 || chNum > 1000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing or invalid ch parameter' }));
      return;
    }
    try {
      const images = await getChapterImages(chNum);
      if (images.length === 0) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Could not load chapter images' })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' });
      res.end(JSON.stringify({ chapter: chNum, images }));
    } catch (err) {
      console.error('Chapter images error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
    return;
  }

  // ── 3. Sitemap ──
  if (pathname === '/sitemap.xml') {
    const siteUrl = getSiteUrl(req);
    const today   = todayISO();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    SUPPORTED_LANGS.forEach(lp => {
      xml += `  <url>\n    <loc>${siteUrl}/${lp}/</loc>\n`;
      SUPPORTED_LANGS.forEach(altLp => {
        xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${siteUrl}/${altLp}/" />\n`;
      });
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/en/" />\n`;
      xml += `    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    });

    SUPPORTED_LANGS.forEach(lp => {
      xml += `  <url>\n    <loc>${siteUrl}/${lp}/chapters</loc>\n`;
      SUPPORTED_LANGS.forEach(altLp => {
        xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${siteUrl}/${altLp}/chapters" />\n`;
      });
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/en/chapters" />\n`;
      xml += `    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    });

    CHAPTERS_LIST.forEach(c => {
      SUPPORTED_LANGS.forEach(lp => {
        xml += `  <url>\n    <loc>${siteUrl}/${lp}/chapter/${c.number}</loc>\n`;
        SUPPORTED_LANGS.forEach(altLp => {
          xml += `    <xhtml:link rel="alternate" hreflang="${altLp}" href="${siteUrl}/${altLp}/chapter/${c.number}" />\n`;
        });
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/en/chapter/${c.number}" />\n`;
        xml += `    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      });
    });

    const staticPages = [
      { path: '/privacy.html', priority: '0.3', freq: 'yearly' },
      { path: '/terms.html',   priority: '0.3', freq: 'yearly' },
      { path: '/dmca.html',    priority: '0.3', freq: 'yearly' },
      { path: '/disclaimer.html', priority: '0.3', freq: 'yearly' },
      { path: '/contact.html', priority: '0.4', freq: 'monthly' },
    ];
    staticPages.forEach(p => {
      xml += `  <url>\n    <loc>${siteUrl}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
    });

    xml += '</urlset>';
    addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=43200' });
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);
    return;
  }

  // ── 4. Robots.txt ──
  if (pathname === '/robots.txt') {
    const siteUrl = getSiteUrl(req);
    const robots = [
      'User-agent: *', 'Allow: /',
      'Disallow: /proxy-image', 'Disallow: /chapter-images',
      '', `Sitemap: ${siteUrl}/sitemap.xml`
    ].join('\n');
    addSecurityHeaders(res, { 'Cache-Control': 'public, max-age=86400' });
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(robots);
    return;
  }

  // ── 5. Clean URLs, Trailing Slashes & Redirects ──
  if (pathname === '/index.html' || pathname === '/index' || pathname === '/home') {
    res.writeHead(301, { 'Location': `/${langPrefix}/` });
    res.end();
    return;
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    const cleanPath = pathname.slice(0, -1);
    const redirectUrl = `/${langPrefix}${cleanPath === '/' ? '/' : cleanPath}`;
    res.writeHead(301, { 'Location': redirectUrl });
    res.end();
    return;
  }

  if (pathname === '/' || pathname === '') {
    serveIndexWithSeo(req, res, 'home', null, langCode, langPrefix);
    return;
  }

  if (pathname === '/chapters') {
    serveIndexWithSeo(req, res, 'chapters', null, langCode, langPrefix);
    return;
  }

  if (pathname === '/about') {
    serveIndexWithSeo(req, res, 'home', null, langCode, langPrefix);
    return;
  }

  const chapterMatch = pathname.match(/^\/chapter\/(\d+)$/);
  if (chapterMatch) {
    const chNum = parseInt(chapterMatch[1]);
    const maxCh = CHAPTERS_LIST.length > 0 ? CHAPTERS_LIST[CHAPTERS_LIST.length - 1].number : 1000;
    if (!isNaN(chNum) && chNum >= 1 && chNum <= maxCh) {
      serveIndexWithSeo(req, res, 'chapter', chNum, langCode, langPrefix);
      return;
    } else {
      serve404(req, res, langCode, langPrefix);
      return;
    }
  }

  // ── 6. Legal page redirects ──
  const redirects = { '/privacy': '/privacy.html', '/terms': '/terms.html', '/dmca': '/dmca.html', '/disclaimer': '/disclaimer.html', '/contact': '/contact.html' };
  if (redirects[pathname]) {
    res.writeHead(301, { 'Location': redirects[pathname] });
    res.end();
    return;
  }

  // ── 7. Static File Server ──
  const relativePath = pathname.slice(1);
  const filePath     = path.join(__dirname, relativePath);
  const relative     = path.relative(__dirname, filePath);
  const isSafe       = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (!isSafe) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const ext = path.extname(pathname);
      if (!ext) {
        serve404(req, res, langCode, langPrefix);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      serveStaticHtmlWithSeo(req, res, filePath, pathname);
      return;
    }

    fs.readFile(filePath, (errRead, data) => {
      if (errRead) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const isChaptersJs = pathname === '/chapters.js';
      const isImmutable  = !isChaptersJs && ['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff2'].includes(ext);
      addSecurityHeaders(res, { 'Cache-Control': isImmutable ? 'public, max-age=86400' : 'no-cache, must-revalidate' });
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Blue Lock Server running at http://localhost:${PORT}`);
  console.log(`[MangaFreak] Source configured: MangaFreak Blue Lock`);

  const { startSyncScheduler } = require('./sync/chapter-sync');
  startSyncScheduler(onNewChapterSaved);
});
