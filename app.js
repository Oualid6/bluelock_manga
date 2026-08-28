/* ═══════════════════════════════════════════
   BLUE LOCK — MANGA WEBSITE CORE LOGIC
   ═══════════════════════════════════════════ */

// ── Story Arcs Configuration ──
const ARCS = [
  {
    id: 1,
    name: "First Selection Arc",
    range: "Chapters 1 – 38",
    start: 1,
    end: 38,
    desc: "300 high school strikers are split into five teams per building. Team Z must battle through a round-robin tournament where only the top two teams survive.",
    color: "#38bdf8"
  },
  {
    id: 2,
    name: "Second Selection Arc",
    range: "Chapters 39 – 86",
    start: 39,
    end: 86,
    desc: "A series of high-stakes 3v3 and 2v2 small-sided matches where winning teams steal players from losing teams in a battle to reach the top 5.",
    color: "#00f0ff"
  },
  {
    id: 3,
    name: "Third Selection Arc",
    range: "Chapters 87 – 108",
    start: 87,
    end: 108,
    desc: "Blue Lock's top 35 players compete in 5v5 matches evaluated by Ego Jinpachi to select the starting eleven for the upcoming clash against Japan's national team.",
    color: "#3b82f6"
  },
  {
    id: 4,
    name: "VS. U-20 Japan Arc",
    range: "Chapters 109 – 151",
    start: 109,
    end: 151,
    desc: "The ultimate showdown: Blue Lock Eleven takes on the official Japan U-20 National Team at a packed stadium to decide the future of Japanese football.",
    color: "#0066ff"
  },
  {
    id: 5,
    name: "Neo Egoist League Arc",
    range: "Chapters 152 – 358+",
    start: 152,
    end: 9999,
    desc: "Blue Lock players train alongside Europe's top five football leagues under world-class superstars to compete for massive pro contract bids.",
    color: "#38bdf8"
  }
];

// ── Application State ──
let currentState = {
  currentView: 'home', // 'home', 'chapters', 'reader'
  currentChapter: 1,
  sortNewestFirst: true,
  searchQuery: '',
  currentLang: 'EN'
};

// ── DOM Elements ──
const homeView = document.getElementById('home-view');
const chapterListView = document.getElementById('chapter-list-view');
const readerView = document.getElementById('reader-view');

const navHome = document.getElementById('nav-home');
const navChapters = document.getElementById('nav-chapters');
const mobileMenu = document.getElementById('mobile-menu');

const arcsGrid = document.getElementById('arcs-grid');
const recentGrid = document.getElementById('recent-grid');
const clTbody = document.getElementById('cl-tbody');

const readerTitle = document.getElementById('reader-title');
const readerChIndicator = document.getElementById('reader-ch-indicator');
const readerChapterInfo = document.getElementById('reader-chapter-info');
const readerPages = document.getElementById('reader-pages');

const prevChBtn = document.getElementById('prev-ch-btn');
const nextChBtn = document.getElementById('next-ch-btn');
const prevChBtn2 = document.getElementById('prev-ch-btn2');
const nextChBtn2 = document.getElementById('next-ch-btn2');

const scrollTopBtn = document.getElementById('scroll-top-btn');

// ── Initial Setup ──
document.addEventListener('DOMContentLoaded', () => {
  renderArcs();
  renderRecentChapters();
  renderPopularChapters();
  renderChapterTable();
  setupParticles();
  setupScrollHandlers();
  initLang(); // Restore persisted language
  updateDynamicUi();
  
  const mobMenu = document.getElementById('mobile-menu');
  if (mobMenu) {
    mobMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        toggleMobileMenu();
      }
    });
  }

  document.addEventListener('click', (e) => {
    const sw = document.getElementById('lang-switcher');
    if (sw && !sw.contains(e.target)) closeLangMenu();
  });
  
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    const legacyPath = window.location.hash.slice(1);
    history.replaceState(null, '', legacyPath);
  }

  handleRoute();
  window.addEventListener('popstate', handleRoute);
});

function navigateTo(path, pushState = true) {
  if (pushState && window.location.pathname !== path) {
    history.pushState(null, '', path);
  }
  handleRoute();
}

document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href]');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href) return;
  const isSpaPath = href.startsWith('/') && !href.match(/\.[a-z]+$/i) && !href.startsWith('//');
  if (!isSpaPath) return;
  e.preventDefault();
  navigateTo(href);
});

function handleRoute() {
  let pathname = window.location.pathname;

  const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'tr', 'ja', 'ar'];
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && SUPPORTED_LANGS.includes(parts[0].toLowerCase())) {
    parts.shift();
    pathname = '/' + parts.join('/') || '/';
  }

  if (pathname.startsWith('/chapter/')) {
    const chNum = parseInt(pathname.split('/').pop());
    const maxCh = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1].number : 1000;
    if (!isNaN(chNum) && chNum >= 1 && chNum <= maxCh) {
      readChapter(chNum, false);
      return;
    }
  } else if (pathname === '/chapters') {
    showChapterList(false);
    return;
  } else if (pathname === '/about' || window.location.hash === '#about-section') {
    showHome(false);
    setTimeout(() => {
      const el = document.getElementById('about-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return;
  }

  showHome(false);
}

function updateRoute() {
  let path;
  if (currentState.currentView === 'reader') {
    path = `/chapter/${currentState.currentChapter}`;
  } else if (currentState.currentView === 'chapters') {
    path = '/chapters';
  } else {
    path = '/';
  }
  if (window.location.pathname !== path) {
    history.pushState(null, '', path);
  }
}

function showHome(updateHash = true) {
  currentState.currentView = 'home';
  homeView.classList.remove('hidden');
  chapterListView.classList.add('hidden');
  readerView.classList.add('hidden');

  navHome.classList.add('active');
  navChapters.classList.remove('active');

  if (window.location.hash !== '#about-section') {
    window.scrollTo({ top: 0 });
  }
  if (updateHash) updateRoute();
  updateClientSeo();
  trackPageView('/', document.title);
}

function showChapterList(updateHash = true) {
  currentState.currentView = 'chapters';
  homeView.classList.add('hidden');
  chapterListView.classList.remove('hidden');
  readerView.classList.add('hidden');

  navHome.classList.remove('active');
  navChapters.classList.add('active');

  window.scrollTo({ top: 0 });
  if (updateHash) updateRoute();
  renderChapterTable();
  updateClientSeo();
  trackPageView('/chapters', document.title);
}

function goBackFromReader() {
  showChapterList();
}

function setupParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 6 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    
    const colors = ['rgba(56,189,248,0.5)', 'rgba(0,240,255,0.5)', 'rgba(59,130,246,0.5)'];
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.boxShadow = `0 0 10px ${particle.style.backgroundColor}`;
    
    particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    
    container.appendChild(particle);
  }
}

function setupScrollHandlers() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    if (window.scrollY > 500) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }, { passive: true });
}

function toggleMobileMenu() {
  mobileMenu.classList.toggle('open');
}

function renderArcs() {
  arcsGrid.innerHTML = '';
  const lang = currentState.currentLang || 'EN';
  ARCS.forEach(arc => {
    const card = document.createElement('div');
    card.className = 'arc-card animate-in';
    card.setAttribute('role', 'listitem');
    card.style.setProperty('--border-glow', arc.color);
    card.style.borderTop = `3px solid ${arc.color}`;
    
    card.onclick = () => {
      navigateTo('/chapters');
      setTimeout(() => {
        const searchInput = document.getElementById('cl-search');
        if (searchInput) {
          searchInput.value = `${t('arc_word')} ${arc.id}`;
          filterChapters(searchInput.value);
        }
      }, 50);
    };

    const arcTrans = (ARC_TRANSLATIONS[lang] && ARC_TRANSLATIONS[lang][arc.id]) || { name: arc.name, desc: arc.desc };
    const rangeText = arc.range.replace('Chapters', t('stats_chapters'));

    card.innerHTML = `
      <div class="arc-num" style="color: ${arc.color}">${t('arc_word')} ${arc.id}</div>
      <h3 class="arc-name">${arcTrans.name}</h3>
      <div class="arc-range">${rangeText}</div>
      <p class="arc-desc">${arcTrans.desc}</p>
      <div class="arc-read-btn" style="background: ${arc.color}15; color: ${arc.color}">
        ${t('read_arc')}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    `;
    arcsGrid.appendChild(card);
  });
}

function renderPopularChapters() {
  const grid = document.getElementById('popular-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const latestCh = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1] : { number: 358, title: 'Chapter 358' };
  const popular = [
    { number: 1,   label: 'Chapter 1',   desc: 'First Selection begins — Isagi Yoichi enters Blue Lock' },
    { number: 39,  label: 'Chapter 39',  desc: 'Second Selection Arc — 3v3 rivalries begin' },
    { number: 87,  label: 'Chapter 87',  desc: 'Third Selection Arc — selecting Blue Lock Eleven' },
    { number: 109, label: 'Chapter 109', desc: 'VS. U-20 Japan Arc — showdown for survival' },
    { number: 152, label: 'Chapter 152', desc: 'Neo Egoist League Arc — European leagues battle' },
    { number: 200, label: 'Chapter 200', desc: 'Isagi vs. Kaiser rivalries heat up' },
    { number: 300, label: 'Chapter 300', desc: 'High-stakes Neo Egoist League milestone' },
    { number: latestCh.number, label: `Chapter ${latestCh.number}`, desc: 'Latest chapter — read now' },
  ];

  popular.forEach(item => {
    const ch = CHAPTERS.find(c => c.number === item.number);
    const card = document.createElement('div');
    card.className = 'popular-card animate-in';
    card.setAttribute('role', 'listitem');
    card.onclick = () => { navigateTo(`/chapter/${item.number}`); };
    card.innerHTML = `
      <div class="popular-ch-num">Ch. ${item.number}</div>
      <div class="popular-ch-title">${ch ? ch.title : item.label}</div>
      <div class="popular-ch-desc">${item.desc}</div>
    `;
    grid.appendChild(card);
  });
}

function renderRecentChapters() {
  recentGrid.innerHTML = '';
  const recent = CHAPTERS.slice(-6).reverse();
  recent.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'recent-card animate-in';
    card.onclick = () => {
      navigateTo(`/chapter/${ch.number}`);
    };

    card.innerHTML = `
      <div class="recent-ch-num">${formatChapterNumber(ch.number)}</div>
      <div class="recent-ch-title">${ch.title}</div>
      <div class="recent-ch-date">${t('latest_release')}</div>
      <div class="recent-read-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
    `;
    recentGrid.appendChild(card);
  });
}

function renderChapterTable() {
  clTbody.innerHTML = '';
  
  let filtered = CHAPTERS;
  const q = currentState.searchQuery.trim().toLowerCase();
  
  if (q) {
    const arcMatch = q.match(/^(arc|arco|bogen|ark|編|أرك)\s+(\d+)$/i) || q.match(/^(\d+)\s*(編|arc)$/i);
    if (arcMatch) {
      const arcId = parseInt(arcMatch[1]) || parseInt(arcMatch[2]);
      const arc = ARCS.find(a => a.id === arcId);
      if (arc) {
        filtered = CHAPTERS.filter(ch => ch.number >= arc.start && ch.number <= arc.end);
      }
    } else {
      filtered = CHAPTERS.filter(ch => 
        ch.number.toString() === q || 
        ch.title.toLowerCase().includes(q)
      );
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    return currentState.sortNewestFirst ? b.number - a.number : a.number - b.number;
  });

  if (sorted.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-3);">
        ${t('no_results').replace('{query}', q)}
      </td>
    `;
    clTbody.appendChild(tr);
    return;
  }

  sorted.forEach(ch => {
    const tr = document.createElement('tr');
    tr.className = 'cl-row';
    tr.onclick = () => navigateTo(`/chapter/${ch.number}`);
    
    tr.innerHTML = `
      <td class="td-num">${formatChapterNumber(ch.number)}</td>
      <td class="td-title">
        <span class="ch-title-text">${ch.title}</span>
      </td>
      <td class="td-date hide-mobile">${t('released_label')}</td>
      <td class="td-action">
        <button class="ch-read-btn" aria-label="Read Chapter ${ch.number}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </td>
    `;
    clTbody.appendChild(tr);
  });
}

function filterChapters(query) {
  currentState.searchQuery = query;
  if (currentState.currentView === 'chapters') {
    renderChapterTable();
  } else if (query.trim() !== '') {
    showChapterList();
    const clSearch = document.getElementById('cl-search');
    if (clSearch) clSearch.value = query;
  }
}

function toggleSort() {
  currentState.sortNewestFirst = !currentState.sortNewestFirst;
  const label = document.getElementById('sort-label');
  if (label) {
    label.textContent = currentState.sortNewestFirst ? t('sort_newest') : t('sort_oldest');
  }
  renderChapterTable();
}

function readChapter(chNum, updateHash = true) {
  currentState.currentView = 'reader';
  currentState.currentChapter = chNum;

  homeView.classList.add('hidden');
  chapterListView.classList.add('hidden');
  readerView.classList.remove('hidden');

  window.scrollTo({ top: 0 });
  if (updateHash) updateRoute();

  const chData = CHAPTERS.find(c => c.number === chNum);
  const titleText = chData ? `${formatChapterNumber(chNum)} — ${chData.title}` : `${t('chapter_word')} ${chNum}`;
  readerTitle.textContent = titleText;
  
  const newTitle = chData
    ? `Read Blue Lock Chapter ${chNum}: ${chData.title} Online Free | Blue Lock Reader`
    : `Blue Lock Chapter ${chNum} | Blue Lock Reader`;
  document.title = newTitle;
  trackPageView(`/chapter/${chNum}`, newTitle);

  readerChIndicator.textContent = `${chNum} / ${CHAPTERS.length}`;
  
  prevChBtn.disabled = chNum <= 1;
  prevChBtn2.disabled = chNum <= 1;
  nextChBtn.disabled = chNum >= CHAPTERS.length;
  nextChBtn2.disabled = chNum >= CHAPTERS.length;

  const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
  const lang = currentState.currentLang || 'EN';
  const translatedArc = ARC_TRANSLATIONS[lang] ? ARC_TRANSLATIONS[lang][arc.id] : null;
  const arcName = translatedArc ? translatedArc.name : (arc ? arc.name : '');
  
  readerChapterInfo.innerHTML = `
    <h2>${titleText}</h2>
    ${arc ? `<p class="reader-arc-label" style="color: ${arc.color}">${arcName}</p>` : ''}
    <p class="reader-intro-text">${t('read_chapter_prefix')} <strong>${titleText}</strong>.${arc ? ' ' + t('read_arc_prefix') + ' <strong>' + arcName + '</strong>.' : ''} ${t('read_nav_hint')}</p>
  `;

  const bcCurrent = document.getElementById('reader-breadcrumb-current');
  if (bcCurrent) bcCurrent.textContent = `${t('breadcrumb_chapter_prefix')} ${chNum}${chData ? ': ' + chData.title : ''}`;

  updateClientSeo();
  trackPageView(`/chapter/${chNum}`, document.title);

  readerPages.innerHTML = '';
  const suggestedSection = document.getElementById('suggested-section');
  if (suggestedSection) suggestedSection.innerHTML = '';
  loadChapterPages(chNum);
}

async function loadChapterPages(chNum) {
  if (currentState.currentView !== 'reader' || currentState.currentChapter !== chNum) return;

  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'no-results animate-in';
  loadingMsg.id = 'chapter-loading-msg';
  
  const loadingText = t('loading_pages').replace('{ch}', chNum);
  loadingMsg.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" style="margin-bottom:12px; animation: spin 1.2s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"/>
    </svg>
    <p>${loadingText}</p>
  `;
  readerPages.appendChild(loadingMsg);

  let images = [];
  try {
    const res = await fetch(`/chapter-images?ch=${chNum}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    images = data.images || [];
  } catch (err) {
    console.error('Failed to load chapter images:', err);
  }

  if (currentState.currentView !== 'reader' || currentState.currentChapter !== chNum) return;

  const msg = document.getElementById('chapter-loading-msg');
  if (msg) msg.remove();

  if (images.length === 0) {
    const errMsg = document.createElement('div');
    errMsg.className = 'no-results animate-in';
    errMsg.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>This chapter is currently unavailable.</p>
      <p style="font-size: 0.85rem; margin-top: 8px;">Please try another chapter or try again later.</p>
    `;
    readerPages.appendChild(errMsg);
    return;
  }

  const chData = CHAPTERS.find(c => c.number === chNum);
  const chTitleText = chData ? chData.title : `Chapter ${chNum}`;

  images.forEach((rawUrl, idx) => {
    const pageContainer = document.createElement('div');
    pageContainer.className = 'reader-page-container';

    const skeleton = document.createElement('div');
    skeleton.className = 'page-skeleton';
    pageContainer.appendChild(skeleton);

    const img = document.createElement('img');
    img.className = 'reader-page-img';
    img.alt = `Blue Lock Chapter ${chNum}: "${chTitleText}" — Page ${idx + 1}`;
    img.decoding = 'async';

    const proxiedUrl = `/proxy-image?url=${encodeURIComponent(rawUrl)}`;

    const handleLoadSuccess = () => {
      if (skeleton.parentNode) {
        skeleton.remove();
      }
      img.classList.add('loaded');
    };

    img.onload = handleLoadSuccess;

    img.onerror = () => {
      if (skeleton.parentNode) {
        skeleton.remove();
      }
      img.style.display = 'none';

      const errorCard = document.createElement('div');
      errorCard.className = 'page-error-card';
      errorCard.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Failed to load Page ${idx + 1}</p>
        <button class="btn-retry-page">Retry Page ${idx + 1}</button>
      `;
      const retryBtn = errorCard.querySelector('.btn-retry-page');
      retryBtn.onclick = () => {
        errorCard.remove();
        pageContainer.appendChild(skeleton);
        img.style.display = '';
        img.src = `${proxiedUrl}&t=${Date.now()}`;
      };
      pageContainer.appendChild(errorCard);
    };

    img.src = proxiedUrl;

    if (img.complete && img.naturalWidth > 0) {
      handleLoadSuccess();
    }

    pageContainer.appendChild(img);
    readerPages.appendChild(pageContainer);
  });

  renderSuggestedChapters(chNum);
}

function navigateChapter(direction) {
  const targetCh = currentState.currentChapter + direction;
  if (targetCh >= 1 && targetCh <= CHAPTERS.length) {
    navigateTo(`/chapter/${targetCh}`);
  }
}

function renderSuggestedChapters(chNum) {
  const section = document.getElementById('suggested-section');
  if (!section) return;

  const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
  const lang = currentState.currentLang || 'EN';
  const arcTrans = arc && ARC_TRANSLATIONS[lang] ? ARC_TRANSLATIONS[lang][arc.id] : null;
  const arcName = arcTrans ? arcTrans.name : (arc ? arc.name : '');

  const suggestions = [];

  const prevNum = chNum > 1 ? chNum - 1 : null;
  const nextNum = chNum < CHAPTERS.length ? chNum + 1 : null;

  if (prevNum) {
    const prev = CHAPTERS.find(c => c.number === prevNum);
    suggestions.push({ number: prevNum, title: prev ? prev.title : `Chapter ${prevNum}`, label: 'Previous Chapter' });
  }
  if (nextNum) {
    const next = CHAPTERS.find(c => c.number === nextNum);
    suggestions.push({ number: nextNum, title: next ? next.title : `Chapter ${nextNum}`, label: 'Next Chapter' });
  }

  if (arc) {
    const arcChapters = CHAPTERS.filter(c => c.number >= arc.start && c.number <= arc.end && c.number !== chNum && c.number !== prevNum && c.number !== nextNum);
    const shuffled = arcChapters.sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.forEach(c => suggestions.push({ number: c.number, title: c.title, label: `Ch. ${c.number}` }));
  }

  if (suggestions.length === 0) return;

  section.innerHTML = `
    <div class="suggested-header">
      <h3>More from ${arcName || 'Blue Lock'}</h3>
      <p>Continue reading Blue Lock — explore related chapters</p>
    </div>
    <div class="suggested-grid">
      ${suggestions.map(s => `
        <a href="/chapter/${s.number}" class="suggested-card" aria-label="Read Blue Lock Chapter ${s.number}: ${s.title}">
          <span class="suggested-label">${s.label}</span>
          <span class="suggested-ch">Chapter ${s.number}</span>
          <span class="suggested-title">${s.title}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function trackPageView(viewPath, viewTitle) {
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_path: viewPath,
      page_title: viewTitle,
      page_location: window.location.origin + viewPath
    });
  }
}

/* ═══════════════════════════════════════════
   LANGUAGE SWITCHER
   ═══════════════════════════════════════════ */
const LANGUAGES = [
  { code: 'EN', label: 'English',  flag: '🇬🇧' },
  { code: 'FR', label: 'Français', flag: '🇫🇷' },
  { code: 'ES', label: 'Español',  flag: '🇪🇸' },
  { code: 'DE', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'TR', label: 'Türkçe',   flag: '🇹🇷' },
  { code: 'JP', label: '日本語',   flag: '🇯🇵' },
  { code: 'AR', label: 'العربية',  flag: '🇸🇦' },
];

const LANG_STORAGE_KEY = 'bluelock_lang';

function initLang() {
  const saved = window.__initialLang || localStorage.getItem(LANG_STORAGE_KEY) || 'EN';
  applyLang(saved, false);
}

function toggleLangMenu(e) {
  e.stopPropagation();
  const sw  = document.getElementById('lang-switcher');
  const btn = document.getElementById('lang-btn');
  const isOpen = sw.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  if (isOpen) {
    const active = document.querySelector('#lang-menu .lang-active');
    if (active) active.focus();
    else {
      const first = document.querySelector('#lang-menu li');
      if (first) first.focus();
    }
  }
}

function closeLangMenu() {
  const sw  = document.getElementById('lang-switcher');
  const btn = document.getElementById('lang-btn');
  if (sw) { sw.classList.remove('open'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function selectLang(code) {
  localStorage.setItem(LANG_STORAGE_KEY, code);
  applyLang(code, true);
}

function applyLang(code, closeMenu) {
  currentState.currentLang = code;

  const codeEl = document.getElementById('lang-code');
  if (codeEl) codeEl.textContent = code;

  document.querySelectorAll('#lang-menu li').forEach(li => {
    if (li.dataset.lang === code) {
      li.classList.add('lang-active');
      li.setAttribute('aria-selected', 'true');
    } else {
      li.classList.remove('lang-active');
      li.setAttribute('aria-selected', 'false');
    }
  });

  const langMap = { EN:'en', FR:'fr', ES:'es', DE:'de', TR:'tr', JP:'ja', AR:'ar' };
  document.documentElement.lang = langMap[code] || 'en';
  document.documentElement.dir = code === 'AR' ? 'rtl' : 'ltr';

  translateUI();

  if (closeMenu) closeLangMenu();
}

function langKeyNav(e, item) {
  const items = Array.from(document.querySelectorAll('#lang-menu li'));
  const idx   = items.indexOf(item);

  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      selectLang(item.dataset.lang);
      document.getElementById('lang-btn').focus();
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (idx < items.length - 1) items[idx + 1].focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (idx > 0) items[idx - 1].focus();
      else document.getElementById('lang-btn').focus();
      break;
    case 'Escape':
      closeLangMenu();
      document.getElementById('lang-btn').focus();
      break;
    case 'Tab':
      closeLangMenu();
      break;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sw = document.getElementById('lang-switcher');
    if (sw && sw.classList.contains('open')) {
      closeLangMenu();
      document.getElementById('lang-btn').focus();
    }
  }
});

/* ═══════════════════════════════════════════
   I18N DICTIONARY & TRANSLATION ENGINE
   ═══════════════════════════════════════════ */

const TRANSLATIONS = {
  EN: {
    nav_home: "Home",
    nav_chapters: "Chapters",
    nav_about: "About",
    search_placeholder: "Search chapters…",
    hero_ongoing: "Ongoing · Chapter 358",
    hero_by: "by",
    hero_desc: "Following Japan's disappointing exit at the 2018 World Cup, the Japanese Football Union initiates a revolutionary experiment: Blue Lock. 300 elite high school strikers are locked in a battle royale to forge Japan's ultimate egotistical striker.",
    btn_start_reading: "Start Reading",
    btn_latest_chapter: "Latest Chapter",
    stats_chapters: "Chapters",
    stats_since: "Since",
    stats_rating: "Rating",
    tag_sports: "Sports",
    tag_action: "Action",
    tag_drama: "Drama",
    tag_shounen: "Shounen",
    tag_super_power: "Psychological",
    arcs_title: "Story Arcs",
    arcs_sub: "Explore the stages of the Blue Lock project",
    latest_chapters_title: "Latest Chapters",
    view_all_btn: "View All →",
    about_title: "About Blue Lock",
    about_p1: "Blue Lock is a Japanese manga series written by Muneyuki Kaneshiro and illustrated by Yuusuke Nomura. It has been serialized in Kodansha's Weekly Shōnen Magazine since August 2018.",
    about_p2: "The story follows Isagi Yoichi, a high school striker who joins a revolutionary training program designed to create the world's greatest egoistic striker and lead Japan to World Cup glory.",
    about_author: "Author",
    about_serialized: "Serialized",
    about_published: "Published",
    about_published_val: "2018 – Present",
    about_genre: "Genre",
    about_genre_val: "Sports, Action, Drama",
    cl_title: "All Chapters",
    cl_subtitle: "358 chapters available · Ongoing",
    cl_search_placeholder: "Search chapter number or title…",
    sort_newest: "Newest First",
    sort_oldest: "Oldest First",
    th_title: "Chapter Title",
    th_date: "Date",
    th_read: "Read",
    reader_back: "Back",
    reader_prev: "‹ Prev",
    reader_next: "Next ›",
    reader_prev_ch: "Previous Chapter",
    reader_list: "Chapter List",
    reader_next_ch: "Next Chapter",
    footer_desc: "An unofficial fan site for Blue Lock. All content belongs to Muneyuki Kaneshiro, Yuusuke Nomura & Kodansha.",
    footer_navigate: "Navigate",
    footer_quick_read: "Quick Read",
    footer_legal: "Legal",
    footer_copyright: "© 2026 Blue Lock Fan Site · All rights reserved.",
    chapter_word: "Chapter",
    latest_release: "Latest Release",
    read_arc: "Read Arc",
    arc_word: "Arc",
    loading_pages: "Loading chapter {ch}…",
    no_results: "No chapters found matching \"{query}\"",
    released_label: "Released",
    read_chapter: "Read Chapter",
    legal_privacy: "Privacy Policy",
    legal_terms: "Terms & Conditions",
    legal_dmca: "DMCA",
    legal_disclaimer: "Disclaimer",
    tab_title_home: "Blue Lock Reader",
    tab_title_chapters: "All Chapters | Blue Lock Reader",
    seo_h1: "Blue Lock Manga Online",
    seo_title_home: "Blue Lock Manga Online — Read Free | Blue Lock Reader",
    seo_title_chapters: "Read Blue Lock Chapters Online — Full List | Blue Lock Reader",
    seo_title_chapter: "Read Blue Lock Chapter {ch}: {title} Online Free | Blue Lock Reader",
    seo_desc_home: "Read Blue Lock manga online for free. All 350+ chapters of Muneyuki Kaneshiro's high-stakes soccer series featuring Isagi Yoichi & Ego Jinpachi. Updated regularly.",
    seo_desc_chapters: "Browse all Blue Lock chapters online. From Chapter 1 to the latest, read free manga in English. Updated with new chapters.",
    seo_desc_chapter: "Read Blue Lock Chapter {ch}: \"{title}\" online for free in English. Part of the {arc}. High-quality scans.",
    breadcrumb_home: "Home",
    breadcrumb_chapters: "All Chapters",
    breadcrumb_chapter_prefix: "Chapter",
    alt_cover_home: "Blue Lock Volume 1 manga cover by Muneyuki Kaneshiro & Yuusuke Nomura — read online free",
    alt_cover_about: "Blue Lock manga cover art — Isagi Yoichi by Muneyuki Kaneshiro & Yuusuke Nomura",
    seo_intro_title: "Read Blue Lock Manga Online for Free",
    seo_intro_p1: "Welcome to Blue Lock Reader — your premier destination to read Blue Lock manga online in English, completely free. Muneyuki Kaneshiro and Yuusuke Nomura's smash-hit sports manga has captivated millions worldwide since debuting in Weekly Shōnen Magazine in 2018.",
    seo_intro_h_what: "What Is Blue Lock?",
    seo_intro_p2: "Blue Lock is a Japanese manga series written by Muneyuki Kaneshiro and illustrated by Yuusuke Nomura. The story centres on Isagi Yoichi, a high school forward whose team missed out on the national tournament due to a selfless pass. Recruited into a radical football training facility named 'Blue Lock', Isagi must compete against 299 other gifted strikers to become the world's greatest egotistical goalscorer.",
    seo_intro_p3: "Under the ruthless guidance of master architect Ego Jinpachi, players must abandon traditional teamwork mindsets and embrace their inner 'ego'. Isagi forms rivalries and alliances with remarkable talents like Bachira Meguru, Nagi Seishiro, Rin Itoshi, and Barou Shouei, constantly adapting his spatial awareness to survive each brutal elimination round.",
    seo_intro_h_arcs: "Major Blue Lock Story Arcs",
    seo_intro_p4: "The series features high-octane arcs that continuously push players to evolve. The First Selection Arc pits five teams against each other in a fierce round-robin battle. The Second Selection Arc tests 3v3 and 2v2 small-sided matches where losing means having your teammate stolen. The VS. U-20 Japan Arc unites Blue Lock's top eleven players against Japan's national youth team in a high-stakes match for survival.",
    seo_intro_p5: "Currently, the epic Neo Egoist League Arc sees Blue Lock athletes train alongside Europe's top five football leagues — Bastard München, Manshine City, Ubers, PXG, and Barcha — under world-class mentors like Noel Noa and Chris Prince to secure their places on the world stage.",
    seo_intro_h_read: "Read Blue Lock Chapters Online — Free & In English",
    seo_intro_p6: "Every Blue Lock chapter on Blue Lock Reader loads fast with clean, high-resolution pages and responsive navigation for mobile and desktop. Whether starting from Chapter 1 or reading the latest weekly chapter, enjoy an optimized, ad-light environment.",
    seo_intro_p7: "Our Blue Lock manga updates are synchronized as soon as new releases come out. Browse the full chapter list by story arc or number, use instant search, and dive right into the action. No paywalls, no hassle — just pure football drama.",
    faq_title: "Frequently Asked Questions",
    faq_sub: "Everything you need to know about reading Blue Lock manga online",
    faq_q1: "Where can I read Blue Lock manga online?",
    faq_a1: "You can read Blue Lock manga online for free right here on Blue Lock Reader. All chapters are available in English with high-quality scans and a clean reading interface. No registration or subscription required.",
    faq_q2: "Is Blue Lock manga still ongoing?",
    faq_a2: "Yes, Blue Lock is still ongoing. Written by Muneyuki Kaneshiro and drawn by Yuusuke Nomura, the series continues weekly in Kodansha's Weekly Shōnen Magazine.",
    faq_q3: "What is the latest Blue Lock chapter?",
    faq_a3: "New Blue Lock manga chapters are added to Blue Lock Reader as soon as they release.",
    faq_q4: "Can I read Blue Lock in English for free?",
    faq_a4: "Yes! Blue Lock Reader provides all Blue Lock chapters in English for free. You can read from Chapter 1 all the way to the latest chapter without any paywall.",
    faq_q5: "What are the main Blue Lock story arcs?",
    faq_a5: "Blue Lock has 5 major story arcs: First Selection Arc (Ch. 1–38), Second Selection Arc (Ch. 39–86), Third Selection Arc (Ch. 87–108), VS. U-20 Japan Arc (Ch. 109–151), and the ongoing Neo Egoist League Arc (Ch. 152+).",
    read_chapter_prefix: "You are reading",
    read_arc_prefix: "This chapter is part of the",
    read_nav_hint: "Use the navigation below or the arrow buttons to move between chapters."
  },
  FR: {
    nav_home: "Accueil",
    nav_chapters: "Chapitres",
    nav_about: "À propos",
    search_placeholder: "Rechercher des chapitres…",
    hero_ongoing: "En cours · Chapitre 358",
    hero_by: "par",
    hero_desc: "Après l'élimination du Japon lors de la Coupe du Monde 2018, l'Union Japonaise de Football lance un projet révolutionnaire : le Blue Lock. 300 attaquants lycéens s'affrontent pour devenir le meilleur buteur égoïste du monde.",
    btn_start_reading: "Commencer la lecture",
    btn_latest_chapter: "Dernier chapitre",
    stats_chapters: "Chapitres",
    stats_since: "Depuis",
    stats_rating: "Note",
    tag_sports: "Sports",
    tag_action: "Action",
    tag_drama: "Drame",
    tag_shounen: "Shounen",
    tag_super_power: "Psychologique",
    arcs_title: "Arcs Narratifs",
    arcs_sub: "Découvrez les différentes étapes du projet Blue Lock",
    latest_chapters_title: "Derniers Chapitres",
    view_all_btn: "Voir Tout →",
    about_title: "À propos de Blue Lock",
    about_p1: "Blue Lock est un manga japonais écrit par Muneyuki Kaneshiro et dessiné par Yuusuke Nomura, prépublié dans le Weekly Shōnen Magazine de Kodansha depuis août 2018.",
    about_p2: "L'histoire suit Yoichi Isagi, un jeune attaquant qui rejoint un centre d'entraînement révolutionnaire conçu pour former le meilleur buteur du monde.",
    about_author: "Auteur",
    about_serialized: "Prépublication",
    about_published: "Publication",
    about_published_val: "2018 – Présent",
    about_genre: "Genre",
    about_genre_val: "Sports, Action, Drame",
    cl_title: "Tous les Chapitres",
    cl_subtitle: "358 chapitres disponibles · En cours",
    cl_search_placeholder: "Numéro ou titre du chapitre…",
    sort_newest: "Plus récents",
    sort_oldest: "Plus anciens",
    th_title: "Titre du chapitre",
    th_date: "Date",
    th_read: "Lire",
    reader_back: "Retour",
    reader_prev: "‹ Préc",
    reader_next: "Suiv ›",
    reader_prev_ch: "Chapitre précédent",
    reader_list: "Liste des chapitres",
    reader_next_ch: "Chapitre suivant",
    footer_desc: "Site de fans non officiel pour Blue Lock. Tout le contenu appartient à Muneyuki Kaneshiro, Yuusuke Nomura & Kodansha.",
    footer_navigate: "Navigation",
    footer_quick_read: "Lecture Rapide",
    footer_legal: "Légal",
    footer_copyright: "© 2026 Site de Fans Blue Lock · Tous droits réservés.",
    chapter_word: "Chapitre",
    latest_release: "Dernière sortie",
    read_arc: "Lire l'Arc",
    arc_word: "Arc",
    loading_pages: "Chargement du chapitre {ch}…",
    no_results: "Aucun chapitre ne correspond à \"{query}\"",
    released_label: "Publié",
    read_chapter: "Lire le Chapitre",
    legal_privacy: "Politique de confidentialité",
    legal_terms: "Conditions d'utilisation",
    legal_dmca: "DMCA",
    legal_disclaimer: "Avertissement",
    tab_title_home: "Blue Lock Reader",
    tab_title_chapters: "Tous les Chapitres | Blue Lock Reader",
    seo_h1: "Blue Lock Manga en Ligne",
    seo_title_home: "Blue Lock Manga en Ligne — Lire Gratuit | Blue Lock Reader",
    seo_title_chapters: "Lire Chapitres Blue Lock en Ligne — Liste | Blue Lock Reader",
    seo_title_chapter: "Lire Blue Lock Chapitre {ch}: {title} Gratuit En Ligne | Blue Lock Reader",
    seo_desc_home: "Lisez le manga Blue Lock en ligne gratuitement. Tous les 350+ chapitres de la série intense de football par Muneyuki Kaneshiro et Yuusuke Nomura.",
    seo_desc_chapters: "Parcourez tous les chapitres de Blue Lock en ligne. Lisez le manga gratuit du chapitre 1 au dernier.",
    seo_desc_chapter: "Lisez Blue Lock Chapitre {ch}: \"{title}\" en ligne gratuitement. Fait partie de l'{arc}. Scans de haute qualité.",
    breadcrumb_home: "Accueil",
    breadcrumb_chapters: "Tous les Chapitres",
    breadcrumb_chapter_prefix: "Chapitre",
    alt_cover_home: "Couverture Blue Lock par Muneyuki Kaneshiro & Yuusuke Nomura",
    alt_cover_about: "Illustration Blue Lock par Muneyuki Kaneshiro & Yuusuke Nomura",
    seo_intro_title: "Lire le Manga Blue Lock en Ligne Gratuitement",
    seo_intro_p1: "Bienvenue sur Blue Lock Reader — votre destination privilégiée pour lire le manga Blue Lock en ligne gratuitement.",
    seo_intro_h_what: "Qu'est-ce que Blue Lock ?",
    seo_intro_p2: "Blue Lock suit l'histoire de Yoichi Isagi au sein du projet révolutionnaire d'Ego Jinpachi.",
    seo_intro_p3: "Sous la direction d'Ego Jinpachi, les joueurs doivent éveiller leur ego pour devenir l'attaquant ultime.",
    seo_intro_h_arcs: "Les Arcs Majeurs de Blue Lock",
    seo_intro_p4: "Première Sélection, Seconde Sélection, Troisième Sélection et le match historique contre l'équipe du Japon U-20.",
    seo_intro_p5: "Actuellement, l'arc Neo Egoist League voit les joueurs affronter l'élite des clubs européens.",
    seo_intro_h_read: "Lire les Chapitres de Blue Lock en Ligne",
    seo_intro_p6: "Chaque chapitre de Blue Lock s'affiche en haute qualité pour une expérience de lecture optimale.",
    seo_intro_p7: "Les nouveaux chapitres sont ajoutés dès leur sortie officielle.",
    faq_title: "Foire Aux Questions",
    faq_sub: "Tout ce que vous devez savoir pour lire le manga Blue Lock en ligne",
    faq_q1: "Où puis-je lire le manga Blue Lock en ligne gratuitement ?",
    faq_a1: "Vous pouvez lire le manga Blue Lock gratuitement sur Blue Lock Reader.",
    faq_q2: "Le manga Blue Lock est-il toujours en cours ?",
    faq_a2: "Oui, Blue Lock est toujours en cours de parution.",
    faq_q3: "Quel est le dernier chapitre de Blue Lock ?",
    faq_a3: "Le chapitre le plus récent est le Chapitre {ch}.",
    faq_q4: "Puis-je lire Blue Lock gratuitement ?",
    faq_a4: "Oui, tous les chapitres sont accessibles gratuitement.",
    faq_q5: "Quels sont les principaux arcs de Blue Lock ?",
    faq_a5: "Première Sélection (Ch.1–38), Seconde Sélection (Ch.39–86), Troisième Sélection (Ch.87–108), VS U-20 Japon (Ch.109–151) et Neo Egoist League (Ch.152+).",
    read_chapter_prefix: "Vous lisez",
    read_arc_prefix: "Ce chapitre fait partie de",
    read_nav_hint: "Utilisez les boutons ci-dessous pour naviguer entre les chapitres."
  },
  ES: {
    nav_home: "Inicio",
    nav_chapters: "Capítulos",
    nav_about: "Acerca de",
    search_placeholder: "Buscar capítulos…",
    hero_ongoing: "En emisión · Capítulo 358",
    hero_by: "por",
    hero_desc: "Tras la eliminación de Japón en el Mundial 2018, la Unión Japonesa de Fútbol inicia un experimento revolucionario: Blue Lock. 300 delanteros juveniles compiten para forjar al mejor delantero egoísta del mundo.",
    btn_start_reading: "Empezar a leer",
    btn_latest_chapter: "Último capítulo",
    stats_chapters: "Capítulos",
    stats_since: "Desde",
    stats_rating: "Calificación",
    tag_sports: "Deportes",
    tag_action: "Acción",
    tag_drama: "Drama",
    tag_shounen: "Shounen",
    tag_super_power: "Psicológico",
    arcs_title: "Arcos Argumentales",
    arcs_sub: "Explora las etapas del proyecto Blue Lock",
    latest_chapters_title: "Últimos Capítulos",
    view_all_btn: "Ver Todo →",
    about_title: "Acerca de Blue Lock",
    about_p1: "Blue Lock es un manga escrito por Muneyuki Kaneshiro e ilustrado por Yuusuke Nomura, publicado en la revista Weekly Shōnen Magazine de Kodansha desde agosto de 2018.",
    about_p2: "La historia sigue a Yoichi Isagi, un joven delantero que se une a un centro de entrenamiento revolucionario diseñado para crear al delantero egoísta definitivo.",
    about_author: "Autor",
    about_serialized: "Publicación",
    about_published: "Publicado",
    about_published_val: "2018 – Presente",
    about_genre: "Género",
    about_genre_val: "Deportes, Acción, Drama",
    cl_title: "Todos los Capítulos",
    cl_subtitle: "358 capítulos disponibles · En emisión",
    cl_search_placeholder: "Buscar por número o título…",
    sort_newest: "Más recientes",
    sort_oldest: "Más antiguos",
    th_title: "Título del Capítulo",
    th_date: "Fecha",
    th_read: "Leer",
    reader_back: "Volver",
    reader_prev: "‹ Ant",
    reader_next: "Sig ›",
    reader_prev_ch: "Capítulo anterior",
    reader_list: "Lista de capítulos",
    reader_next_ch: "Capítulo siguiente",
    footer_desc: "Sitio no oficial de fans de Blue Lock. Todo el contenido pertenece a Muneyuki Kaneshiro, Yuusuke Nomura y Kodansha.",
    footer_navigate: "Navegación",
    footer_quick_read: "Lectura Rápida",
    footer_legal: "Legal",
    footer_copyright: "© 2026 Sitio de Fans de Blue Lock · Todos los derechos reservados.",
    chapter_word: "Capítulo",
    latest_release: "Último lanzamiento",
    read_arc: "Leer Arco",
    arc_word: "Arco",
    loading_pages: "Cargando capítulo {ch}…",
    no_results: "No se encontraron capítulos para \"{query}\"",
    released_label: "Publicado",
    read_chapter: "Leer Capítulo",
    legal_privacy: "Política de Privacidad",
    legal_terms: "Términos y Condiciones",
    legal_dmca: "DMCA",
    legal_disclaimer: "Descargo de responsabilidad",
    tab_title_home: "Blue Lock Reader",
    tab_title_chapters: "Todos los Capítulos | Blue Lock Reader",
    seo_h1: "Blue Lock Manga Online en Español",
    seo_title_home: "Blue Lock Manga Online — Leer Gratis | Blue Lock Reader",
    seo_title_chapters: "Leer Capítulos de Blue Lock Online — Lista | Blue Lock Reader",
    seo_title_chapter: "Leer Blue Lock Capítulo {ch}: {title} Gratis Online | Blue Lock Reader",
    seo_desc_home: "Lee el manga Blue Lock online gratis. Todos los 350+ capítulos de la serie de fútbol de Muneyuki Kaneshiro y Yuusuke Nomura.",
    seo_desc_chapters: "Explora todos los capítulos de Blue Lock online. Lee manga gratis en español desde el capítulo 1 hasta el último.",
    seo_desc_chapter: "Lee Blue Lock Capítulo {ch}: \"{title}\" online gratis en español. Parte del {arc}.",
    breadcrumb_home: "Inicio",
    breadcrumb_chapters: "Todos los Capítulos",
    breadcrumb_chapter_prefix: "Capítulo",
    alt_cover_home: "Portada de Blue Lock por Muneyuki Kaneshiro & Yuusuke Nomura",
    alt_cover_about: "Ilustración de Blue Lock por Muneyuki Kaneshiro & Yuusuke Nomura",
    seo_intro_title: "Leer Manga Blue Lock Online Gratis",
    seo_intro_p1: "Bienvenido a Blue Lock Reader — tu destino principal para leer el manga Blue Lock online gratis.",
    seo_intro_h_what: "¿Qué es Blue Lock?",
    seo_intro_p2: "Blue Lock sigue a Yoichi Isagi en su camino dentro del proyecto Blue Lock creado por Ego Jinpachi.",
    seo_intro_p3: "Bajo la dirección de Ego Jinpachi, los jugadores deben despertar su ego para convertirse en el delantero definitivo.",
    seo_intro_h_arcs: "Arcos Argumentales Principales",
    seo_intro_p4: "Primera Selección, Segunda Selección, Tercera Selección y el partido contra la Selección Sub-20 de Japón.",
    seo_intro_p5: "Actualmente en el arco de la Liga Neo Egoísta con los mejores equipos de Europa.",
    seo_intro_h_read: "Leer Capítulos de Blue Lock Online",
    seo_intro_p6: "Disfruta de todos los capítulos con escaneos de alta calidad.",
    seo_intro_p7: "Nuevos capítulos actualizados constantemente.",
    faq_title: "Preguntas Frecuentes",
    faq_sub: "Todo lo que necesitas saber sobre cómo leer el manga Blue Lock online",
    faq_q1: "¿Dónde puedo leer el manga Blue Lock online gratis?",
    faq_a1: "Puedes leer Blue Lock gratis en Blue Lock Reader.",
    faq_q2: "¿El manga de Blue Lock sigue en emisión?",
    faq_a2: "Sí, Blue Lock continúa semanalmente.",
    faq_q3: "¿Cuál es el último capítulo de Blue Lock?",
    faq_a3: "El último capítulo disponible es el Capítulo {ch}.",
    faq_q4: "¿Puedo leer Blue Lock gratis?",
    faq_a4: "¡Sí! Todos los capítulos son gratuitos.",
    faq_q5: "¿Cuáles son los arcos de Blue Lock?",
    faq_a5: "Primera Selección (Cap.1-38), Segunda Selección (Cap.39-86), Tercera Selección (Cap.87-108), VS. Japón Sub-20 (Cap.109-151) y Liga Neo Egoísta (Cap.152+).",
    read_chapter_prefix: "Estás leyendo",
    read_arc_prefix: "Este capítulo forma parte del",
    read_nav_hint: "Utiliza los botones siguientes para navegar entre capítulos."
  },
  DE: {
    nav_home: "Startseite",
    nav_chapters: "Kapitel",
    nav_about: "Über uns",
    search_placeholder: "Kapitel suchen…",
    hero_ongoing: "Laufend · Kapitel 358",
    hero_by: "von",
    hero_desc: "Nach Japans enttäuschendem Ausscheiden bei der WM 2018 startet der japanische Fußballverband das Experiment Blue Lock: 300 Oberschul-Stürmer kämpfen um den Titel des ultimativen egoistischen Stürmers.",
    btn_start_reading: "Jetzt lesen",
    btn_latest_chapter: "Neuestes Kapitel",
    stats_chapters: "Kapitel",
    stats_since: "Seit",
    stats_rating: "Bewertung",
    tag_sports: "Sport",
    tag_action: "Action",
    tag_drama: "Drama",
    tag_shounen: "Shounen",
    tag_super_power: "Psychologisch",
    arcs_title: "Story-Arcs",
    arcs_sub: "Erkunde die Phasen des Blue Lock Projekts",
    latest_chapters_title: "Neueste Kapitel",
    view_all_btn: "Alle anzeigen →",
    about_title: "Über Blue Lock",
    about_p1: "Blue Lock ist eine japanische Manga-Serie von Muneyuki Kaneshiro und Yuusuke Nomura, die seit August 2018 im Weekly Shōnen Magazine von Kodansha erscheint.",
    about_p2: "Die Geschichte folgt Isagi Yoichi, der an einem revolutionären Trainingsprogramm teilnimmt, um der weltbeste Stürmer zu werden.",
    about_author: "Autor",
    about_serialized: "Magazin",
    about_published: "Veröffentlichung",
    about_published_val: "2018 – Heute",
    about_genre: "Genre",
    about_genre_val: "Sport, Action, Drama",
    cl_title: "Alle Kapitel",
    cl_subtitle: "358 Kapitel verfügbar · Laufend",
    cl_search_placeholder: "Kapitelnummer oder Titel suchen…",
    sort_newest: "Neueste zuerst",
    sort_oldest: "Älteste zuerst",
    th_title: "Kapiteltitel",
    th_date: "Datum",
    th_read: "Lesen",
    reader_back: "Zurück",
    reader_prev: "‹ Zurück",
    reader_next: "Weiter ›",
    reader_prev_ch: "Vorheriges Kapitel",
    reader_list: "Kapitelliste",
    reader_next_ch: "Nächstes Kapitel",
    footer_desc: "Inoffizielle Fan-Website für Blue Lock. Alle Inhalte gehören Muneyuki Kaneshiro, Yuusuke Nomura & Kodansha.",
    footer_navigate: "Navigation",
    footer_quick_read: "Schnelllesen",
    footer_legal: "Rechtliches",
    footer_copyright: "© 2026 Blue Lock Fan-Website · Alle Rechte vorbehalten.",
    chapter_word: "Kapitel",
    latest_release: "Neuestes Release",
    read_arc: "Arc lesen",
    arc_word: "Arc",
    loading_pages: "Lade Kapitel {ch}…",
    no_results: "Keine Kapitel für \"{query}\" gefunden",
    released_label: "Veröffentlicht",
    read_chapter: "Kapitel Lesen",
    legal_privacy: "Datenschutz",
    legal_terms: "AGB",
    legal_dmca: "DMCA",
    legal_disclaimer: "Haftungsausschluss",
    tab_title_home: "Blue Lock Reader",
    tab_title_chapters: "Alle Kapitel | Blue Lock Reader",
    seo_h1: "Blue Lock Manga online lesen",
    seo_title_home: "Blue Lock Manga Online Lesen — Kostenlos | Blue Lock Reader",
    seo_title_chapters: "Blue Lock Kapitel Online Lesen — Liste | Blue Lock Reader",
    seo_title_chapter: "Blue Lock Kapitel {ch}: {title} Kostenlos Online Lesen | Blue Lock Reader",
    seo_desc_home: "Lies Blue Lock Manga online kostenlos. Alle 350+ Kapitel von Kaneshiro Muneyukis Fußball-Manga.",
    seo_desc_chapters: "Durchstöbere alle Blue Lock Kapitel online. Lies kostenlose Mangas von Kapitel 1 bis zum neuesten.",
    seo_desc_chapter: "Lies Blue Lock Kapitel {ch}: \"{title}\" online kostenlos. Teil des {arc}.",
    breadcrumb_home: "Startseite",
    breadcrumb_chapters: "Alle Kapitel",
    breadcrumb_chapter_prefix: "Kapitel",
    alt_cover_home: "Blue Lock Cover von Muneyuki Kaneshiro & Yuusuke Nomura",
    alt_cover_about: "Blue Lock Illustration von Muneyuki Kaneshiro & Yuusuke Nomura",
    seo_intro_title: "Blue Lock Manga Kostenlos Online Lesen",
    seo_intro_p1: "Willkommen bei Blue Lock Reader — deiner ersten Anlaufstelle für Blue Lock Manga.",
    seo_intro_h_what: "Was ist Blue Lock?",
    seo_intro_p2: "Blue Lock erzählt die Geschichte von Isagi Yoichi im Blue Lock Projekt.",
    seo_intro_p3: "Unter der Anleitung von Ego Jinpachi lernen die Spieler, ihr Ego zu entfesseln.",
    seo_intro_h_arcs: "Haupt-Arcs in Blue Lock",
    seo_intro_p4: "Erste Auswahl, Zweite Auswahl, Dritte Auswahl und das Spiel gegen Japans U-20 Nationalmannschaft.",
    seo_intro_p5: "Aktuell läuft die Neo Egoist League mit europäischen Top-Klubs.",
    seo_intro_h_read: "Blue Lock Kapitel Online Lesen",
    seo_intro_p6: "Genieße alle Kapitel in hervorragender Scan-Qualität.",
    seo_intro_p7: "Neue Kapitel werden regelmäßig hinzugefügt.",
    faq_title: "Häufig Gestellte Fragen",
    faq_sub: "Alles was du über das Lesen von Blue Lock wissen musst",
    faq_q1: "Wo kann ich den Blue Lock Manga online kostenlos lesen?",
    faq_a1: "Du kannst Blue Lock kostenlos auf Blue Lock Reader lesen.",
    faq_q2: "Wird der Blue Lock Manga noch fortgesetzt?",
    faq_a2: "Ja, der Manga erscheint weiterhin wöchentlich.",
    faq_q3: "Was ist das neueste Kapitel von Blue Lock?",
    faq_a3: "Das neueste Kapitel ist Kapitel {ch}.",
    faq_q4: "Kann ich Blue Lock kostenlos lesen?",
    faq_a4: "Ja, alle Kapitel sind kostenlos verfügbar.",
    faq_q5: "Welches sind die Haupt-Arcs in Blue Lock?",
    faq_a5: "Erste Auswahl (Kap.1-38), Zweite Auswahl (Kap.39-86), Dritte Auswahl (Kap.87-108), VS. U-20 Japan (Kap.109-151) und Neo Egoist League (Kap.152+).",
    read_chapter_prefix: "Du liest",
    read_arc_prefix: "Dieses Kapitel gehört zum",
    read_nav_hint: "Nutze die Buttons unten, um zwischen den Kapiteln zu wechseln."
  },
  TR: {
    nav_home: "Ana Sayfa",
    nav_chapters: "Bölümler",
    nav_about: "Hakkında",
    search_placeholder: "Bölüm ara…",
    hero_ongoing: "Devam Ediyor · Bölüm 358",
    hero_by: "yazan",
    hero_desc: "Japonya'nın 2018 Dünya Kupası'ndaki başarısızlığının ardından Japonya Futbol Federasyonu radikal bir proje başlatır: Blue Lock. 300 genç forvet, dünyanın en egoist golcüsü olmak için yarışır.",
    btn_start_reading: "Okumaya Başla",
    btn_latest_chapter: "En Son Bölüm",
    stats_chapters: "Bölüm",
    stats_since: "Çıkış",
    stats_rating: "Puan",
    tag_sports: "Spor",
    tag_action: "Aksiyon",
    tag_drama: "Dram",
    tag_shounen: "Shounen",
    tag_super_power: "Psikolojik",
    arcs_title: "Hikaye Arkları",
    arcs_sub: "Blue Lock projesinin aşamalarını keşfedin",
    latest_chapters_title: "Son Bölümler",
    view_all_btn: "Tümünü Gör →",
    about_title: "Blue Lock Hakkında",
    about_p1: "Blue Lock, Muneyuki Kaneshiro tarafından yazılan ve Yuusuke Nomura tarafından çizilen, Ağustos 2018'den beri Weekly Shōnen Magazine'de yayınlanan bir Japon manga serisidir.",
    about_p2: "Hikaye, dünyanın en büyük egoist forveti olmak için devrim niteliğindeki Blue Lock tesisine katılan Isagi Yoichi'yi takip eder.",
    about_author: "Yazar",
    about_serialized: "Yayıncı",
    about_published: "Yayın Tarihi",
    about_published_val: "2018 – Günümüz",
    about_genre: "Tür",
    about_genre_val: "Spor, Aksiyon, Dram",
    cl_title: "Tüm Bölümler",
    cl_subtitle: "358 bölüm mevcut · Devam ediyor",
    cl_search_placeholder: "Bölüm numarası veya başlık ara…",
    sort_newest: "En Yeniler",
    sort_oldest: "En Eskiler",
    th_title: "Bölüm Başlığı",
    th_date: "Tarih",
    th_read: "Oku",
    reader_back: "Geri",
    reader_prev: "‹ Önceki",
    reader_next: "Sonraki ›",
    reader_prev_ch: "Önceki Bölüm",
    reader_list: "Bölüm Listesi",
    reader_next_ch: "Sonraki Bölüm",
    footer_desc: "Blue Lock hayran sitesidir. Tüm içerik Muneyuki Kaneshiro, Yuusuke Nomura ve Kodansha'ya aittir.",
    footer_navigate: "Gezinti",
    footer_quick_read: "Hızlı Oku",
    footer_legal: "Yasal",
    footer_copyright: "© 2026 Blue Lock Hayran Sitesi · Tüm hakları saklıdır.",
    chapter_word: "Bölüm",
    latest_release: "Son Yayın",
    read_arc: "Arkı Oku",
    arc_word: "Ark",
    loading_pages: "Bölüm {ch} yükleniyor…",
    no_results: "\"{query}\" ile eşleşen bölüm bulunamadı",
    released_label: "Yayınlandı",
    read_chapter: "Bölümü Oku",
    legal_privacy: "Gizlilik Politikası",
    legal_terms: "Kullanım Şartları",
    legal_dmca: "DMCA",
    legal_disclaimer: "Sorumluluk Reddi",
    tab_title_home: "Blue Lock Reader",
    tab_title_chapters: "Tüm Bölümler | Blue Lock Reader",
    seo_h1: "Blue Lock manga oku",
    seo_title_home: "Blue Lock Manga Oku — Online Ücretsiz | Blue Lock Reader",
    seo_title_chapters: "Blue Lock Bölümleri Oku — Bölüm Listesi | Blue Lock Reader",
    seo_title_chapter: "Blue Lock Bölüm {ch}: {title} Oku | Blue Lock Reader",
    seo_desc_home: "Blue Lock mangasını çevrimiçi ücretsiz oku. Isagi Yoichi ve Blue Lock projesinin tüm 350+ bölümü burada.",
    seo_desc_chapters: "Tüm Blue Lock bölümlerine göz atın. Bölüm 1'den en son bölüme kadar Blue Lock mangasını ücretsiz okuyun.",
    seo_desc_chapter: "Blue Lock Bölüm {ch}: \"{title}\" oku. {arc} parçasıdır.",
    breadcrumb_home: "Ana Sayfa",
    breadcrumb_chapters: "Tüm Bölümler",
    breadcrumb_chapter_prefix: "Bölüm",
    alt_cover_home: "Muneyuki Kaneshiro & Yuusuke Nomura Blue Lock Kapağı",
    alt_cover_about: "Muneyuki Kaneshiro & Yuusuke Nomura Blue Lock Çizimi",
    seo_intro_title: "Blue Lock Mangasını Online Ücretsiz Oku",
    seo_intro_p1: "Blue Lock Reader'a hoş geldiniz — Blue Lock mangasını online okumak için en iyi adres.",
    seo_intro_h_what: "Blue Lock Nedir?",
    seo_intro_p2: "Blue Lock, Isagi Yoichi'nin Blue Lock tesisindeki mücadelesini anlatır.",
    seo_intro_p3: "Ego Jinpachi liderliğinde oyuncular egoizm gücünü keşfeder.",
    seo_intro_h_arcs: "Blue Lock Hikaye Arkları",
    seo_intro_p4: "İlk Seçim, İkinci Seçim, Üçüncü Seçim ve U-20 Japonya maçı.",
    seo_intro_p5: "Neo Egoist Ligi ile Avrupa'nın dev takımlarıyla mücadele.",
    seo_intro_h_read: "Blue Lock Bölümlerini Oku",
    seo_intro_p6: "Yüksek kaliteli görsellerle kesintisiz okuma deneyimi.",
    seo_intro_p7: "Güncel bölümler anında eklenmektedir.",
    faq_title: "Sıkça Sorulan Sorular",
    faq_sub: "Blue Lock mangasını online okumak hakkında bilmeniz gereken her şey",
    faq_q1: "Blue Lock mangasını çevrimiçi nereden ücretsiz okuyabilirim?",
    faq_a1: "Blue Lock Reader üzerinden ücretsiz okuyabilirsiniz.",
    faq_q2: "Blue Lock mangası hala devam ediyor mu?",
    faq_a2: "Evet, seri haftalık olarak devam etmektedir.",
    faq_q3: "En son yayınlanan Blue Lock bölümü hangisidir?",
    faq_a3: "En son bölüm {ch}. bölümdür.",
    faq_q4: "Blue Lock mangasını ücretsiz okuyabilir miyim?",
    faq_a4: "Evet! Tüm bölümler tamamen ücretsizdir.",
    faq_q5: "Blue Lock hikaye arkları nelerdir?",
    faq_a5: "İlk Seçim (1-38), İkinci Seçim (39-86), Üçüncü Seçim (87-108), U-20 Japonya (109-151) ve Neo Egoist Ligi (152+).",
    read_chapter_prefix: "Şu an okuyorsunuz:",
    read_arc_prefix: "Bu bölüm şu arkın parçasıdır:",
    read_nav_hint: "Bölümler arasında geçiş yapmak için aşağıdaki butonları kullanın."
  },
  JP: {
    nav_home: "ホーム",
    nav_chapters: "全話一覧",
    nav_about: "作品概要",
    search_placeholder: "エピソード検索…",
    hero_ongoing: "連載中 · 第 358 話",
    hero_by: "原作・漫画",
    hero_desc: "2018年W杯での敗退を受け、日本フットボール連合はW杯優勝のために「ブルーロック（青い監獄）」プロジェクトを立ち上げる。300人の高校生FWが世界一のエゴイストストライカーを目指す。",
    btn_start_reading: "第1話から読む",
    btn_latest_chapter: "最新話を読む",
    stats_chapters: "話数",
    stats_since: "連載開始",
    stats_rating: "評価",
    tag_sports: "スポーツ",
    tag_action: "バトル",
    tag_drama: "ドラマ",
    tag_shounen: "少年漫画",
    tag_super_power: "心理戦",
    arcs_title: "ストーリー編",
    arcs_sub: "ブルーロックプロジェクトの各選考ステージ",
    latest_chapters_title: "最新話",
    view_all_btn: "全話一覧 →",
    about_title: "ブルーロックについて",
    about_p1: "『ブルーロック』は、金城宗幸（原作）、ノ村優介（漫画）による日本の漫画作品。講談社の『週刊少年マガジン』にて2018年8月より連載中。",
    about_p2: "無名の高校生FW潔世一が、世界一のストライカーを育てるための施設「ブルーロック」で生き残りをかけて戦う。",
    about_author: "作者",
    about_serialized: "掲載誌",
    about_published: "連載期間",
    about_published_val: "2018年 – 現在",
    about_genre: "ジャンル",
    about_genre_val: "スポーツ、アクション、ドラマ",
    cl_title: "全話一覧",
    cl_subtitle: "358話公開中 · 連載中",
    cl_search_placeholder: "話数やタイトルで検索…",
    sort_newest: "新しい順",
    sort_oldest: "古い順",
    th_title: "サブタイトル",
    th_date: "日付",
    th_read: "読む",
    reader_back: "戻る",
    reader_prev: "‹ 前へ",
    reader_next: "次へ ›",
    reader_prev_ch: "前の話",
    reader_list: "全話一覧",
    reader_next_ch: "次の話",
    footer_desc: "ブルーロックの非公式ファンサイトです。すべてのコンテンツの著作権は金城宗幸・ノ村優介・講談社に帰属します。",
    footer_navigate: "ナビゲーション",
    footer_quick_read: "クイックリーディング",
    footer_legal: "法的情報",
    footer_copyright: "© 2026 Blue Lock Fan Site · All rights reserved.",
    chapter_word: "第",
    latest_release: "最新話",
    read_arc: "この編を読む",
    arc_word: "編",
    loading_pages: "第 {ch} 話を読み込み中…",
    no_results: "「{query}」に一致するエピソードは見つかりませんでした",
    released_label: "公開中",
    read_chapter: "読む",
    legal_privacy: "プライバシーポリシー",
    legal_terms: "利用規約",
    legal_dmca: "DMCA",
    legal_disclaimer: "免責事項",
    tab_title_home: "Blue Lock Reader",
    tab_title_chapters: "全話一覧 | Blue Lock Reader",
    seo_h1: "ブルーロック 漫画",
    seo_title_home: "ブルーロック 漫画 — オンラインで読む無料 | Blue Lock Reader",
    seo_title_chapters: "ブルーロック 最新話 — 全話一覧 | Blue Lock Reader",
    seo_title_chapter: "ブルーロック 第 {ch} 話: {title} 無料漫画 | Blue Lock Reader",
    seo_desc_home: "ブルーロックの漫画をオンラインで無料で読みましょう。金城宗幸・ノ村優介の全350話以上を掲載。",
    seo_desc_chapters: "ブルーロックの全話をオンラインで閲覧可能。第1話から最新話まで無料で読めます。",
    seo_desc_chapter: "ブルーロック 第 {ch} 話: 「{title}」の漫画をオンラインで無料閲覧。{arc}。",
    breadcrumb_home: "ホーム",
    breadcrumb_chapters: "全話一覧",
    breadcrumb_chapter_prefix: "第",
    alt_cover_home: "ブルーロック 単行本カバー 金城宗幸・ノ村優介",
    alt_cover_about: "ブルーロック イラスト 金城宗幸・ノ村優介",
    seo_intro_title: "ブルーロックの漫画をオンラインで無料閲覧",
    seo_intro_p1: "Blue Lock Readerへようこそ。ブルーロックの全話を高画質でいつでも無料で読むことができます。",
    seo_intro_h_what: "ブルーロックとは？",
    seo_intro_p2: "潔世一がエゴイストストライカーを目指して青い監獄で競い合う物語。",
    seo_intro_p3: "絵心甚八の指導のもと、300人の選手がエゴを覚醒させる。",
    seo_intro_h_arcs: "主なストーリー編",
    seo_intro_p4: "1次選考、2次選考、3次選考、そしてU-20日本代表戦。",
    seo_intro_p5: "現在はネオ・エゴイスト・リーグ編で世界最高峰のクラブと激突。",
    seo_intro_h_read: "ブルーロックをオンラインで読む",
    seo_intro_p6: "PCでもスマホでも快適な読書体験を提供。",
    seo_intro_p7: "最新話も迅速にアップデートされます。",
    faq_title: "よくある質問",
    faq_sub: "ブルーロックの漫画をオンラインで読むためのQ&A",
    faq_q1: "ブルーロックの漫画はどこで無料で読めますか？",
    faq_a1: "Blue Lock Readerで全話を無料で閲覧できます。",
    faq_q2: "ブルーロックの漫画はまだ連載中ですか？",
    faq_a2: "はい、週刊少年マガジンにて大好評連載中です。",
    faq_q3: "ブルーロックの最新話はどれですか？",
    faq_a3: "現在の最新話は「第 {ch} 話」です。",
    faq_q4: "全エピソードを最初から最後まで無料で読めますか？",
    faq_a4: "はい、全話無料で閲覧可能です。",
    faq_q5: "ブルーロックの主なストーリー編は何ですか？",
    faq_a5: "1次選考編（1-38話）、2次選考編（39-86話）、3次選考編（87-108話）、U-20日本代表戦編（109-151話）、ネオ・エゴイスト・リーグ編（152話以降）。",
    read_chapter_prefix: "閲覧中:",
    read_arc_prefix: "このエピソードの収録編:",
    read_nav_hint: "下のボタンで前の話・次の話に移動できます。"
  },
  AR: {
    nav_home: "الرئيسية",
    nav_chapters: "الفصول",
    nav_about: "حول المانجا",
    search_placeholder: "بحث عن فصل…",
    hero_ongoing: "مستمرة · الفصل 358",
    hero_by: "تأليف",
    hero_desc: "بعد الخروج المخيب لليابان من كأس العالم 2018، يبدأ اتحاد كرة القدم الياباني مشروع 'بلولوك'. 300 مهاجم شاب يتنافسون في معركة ليصبح أحدهم الهداف الأنانية الأول في العالم.",
    btn_start_reading: "ابدأ القراءة",
    btn_latest_chapter: "الفصل الأخير",
    stats_chapters: "فصل",
    stats_since: "منذ",
    stats_rating: "التقييم",
    tag_sports: "رياضة",
    tag_action: "أكشن",
    tag_drama: "دراما",
    tag_shounen: "شونين",
    tag_super_power: "نفسي",
    arcs_title: "أركات القصة",
    arcs_sub: "استكشف مراحل مشروع بلولوك",
    latest_chapters_title: "أحدث الفصول",
    view_all_btn: "عرض الكل ←",
    about_title: "عن مانجا Blue Lock",
    about_p1: "Blue Lock هي سلسلة مانجا يابانية من تأليف مونيوكي كانيشيرو ورسم نومورا يوسوكي، تُنشر في مجلة شونين الأسبوعية منذ أغسطس 2018.",
    about_p2: "تدور القصة حول إيساغي يويتشي الذي ينضم إلى برنامج تدريبي ثوري لتطوير الهداف الأفضل في العالم.",
    about_author: "المؤلف",
    about_serialized: "مجلة النشر",
    about_published: "تاريخ النشر",
    about_published_val: "2018 – المستمر",
    about_genre: "التصنيف",
    about_genre_val: "رياضة، أكشن، دراما",
    cl_title: "جميع الفصول",
    cl_subtitle: "358 فصل متوفر · مستمرة",
    cl_search_placeholder: "ابحث برقم الفصل أو العنوان…",
    sort_newest: "الأحدث أولاً",
    sort_oldest: "الأقدم أولاً",
    th_title: "عنوان الفصل",
    th_date: "التاريخ",
    th_read: "قراءة",
    reader_back: "رجوع",
    reader_prev: "السابق",
    reader_next: "التالي",
    reader_prev_ch: "الفصل السابق",
    reader_list: "قائمة الفصول",
    reader_next_ch: "الفصل التالي",
    footer_desc: "موقع معجبين غير رسمي لمانجا Blue Lock. جميع الحقوق محفوظة لمونيوكي كانيشيرو، نومورا يوسوكي وكودانشا.",
    footer_navigate: "التنقل",
    footer_quick_read: "قراءة سريعة",
    footer_legal: "قانوني",
    footer_copyright: "© 2026 موقع معجبي Blue Lock · جميع الحقوق محفوظة.",
    chapter_word: "الفصل",
    latest_release: "أحدث إصدار",
    read_arc: "اقرأ الأرك",
    arc_word: "أرك",
    loading_pages: "جاري تحميل الفصل {ch}…",
    no_results: "لم يتم العثور على فصول تطابق \"{query}\"",
    released_label: "تم النشر",
    read_chapter: "اقرأ الفصل",
    legal_privacy: "سياسة الخصوصية",
    legal_terms: "الشروط والأحكام",
    legal_dmca: "DMCA",
    legal_disclaimer: "إخلاء المسؤولية",
    tab_title_home: "Blue Lock Reader",
    tab_title_chapters: "جميع الفصول | Blue Lock Reader",
    seo_h1: "مانجا بلولوك (Blue Lock)",
    seo_title_home: "مانجا Blue Lock مترجمة اون لاين — اقرأ مجاناً | Blue Lock Reader",
    seo_title_chapters: "فصول مانجا Blue Lock كاملة — قائمة الفصول | Blue Lock Reader",
    seo_title_chapter: "اقرأ مانجا بلولوك الفصل {ch}: {title} مترجم | Blue Lock Reader",
    seo_desc_home: "اقرأ مانجا Blue Lock مترجمة اون لاين مجاناً. جميع فصول بلولوك (350+ فصل) من تأليف مونيوكي كانيشيرو ونومورا يوسوكي.",
    seo_desc_chapters: "تصفح جميع فصول مانجا Blue Lock مترجمة اون لاين. اقرأ مانجا بلولوك من الفصل الأول إلى الأخير مجاناً.",
    seo_desc_chapter: "اقرأ مانجا Blue Lock الفصل {ch} مترجم: \"{title}\" اون لاين مجاناً.",
    breadcrumb_home: "الرئيسية",
    breadcrumb_chapters: "جميع الفصول",
    breadcrumb_chapter_prefix: "الفصل",
    alt_cover_home: "غلاف مانجا Blue Lock",
    alt_cover_about: "رسمة مانجا Blue Lock",
    seo_intro_title: "اقرأ مانجا Blue Lock اون لاين مجاناً",
    seo_intro_p1: "أهلاً بك في Blue Lock Reader — وجهتك الأولى لقراءة مانجا بلولوك اون لاين مجاناً.",
    seo_intro_h_what: "ما هي مانجا Blue Lock؟",
    seo_intro_p2: "تتبع القصة رحلة إيساغي يويتشي في مشروع بلولوك تحت إشراف إيغو جينباتشي.",
    seo_intro_p3: "يتعلم اللاعبون تطوير إيغو الهداف ليصبحوا الأفضل عالمياً.",
    seo_intro_h_arcs: "أركات القصة الرئيسية",
    seo_intro_p4: "المرحلة الأولى، المرحلة الثانية، المرحلة الثالثة ومباراة منتخب اليابان تحت 20 سنة.",
    seo_intro_p5: "حالياً أرك دوري النيو إيغويست ضد أندية أوروبا الكبرى.",
    seo_intro_h_read: "اقرأ فصول Blue Lock اون لاين",
    seo_intro_p6: "تصفح سريع وجودة عالية لجميع الفصول.",
    seo_intro_p7: "تحديثات مستمرة للفصول الجديدة.",
    faq_title: "الأسئلة الشائعة",
    faq_sub: "كل ما تحتاج معرفته عن قراءة مانجا Blue Lock",
    faq_q1: "أين يمكنني قراءة مانجا Blue Lock مترجمة اون لاين مجاناً؟",
    faq_a1: "يمكنك قراءة مانجا Blue Lock مجاناً هنا على Blue Lock Reader.",
    faq_q2: "هل مانغا Blue Lock لا تزال مستمرة؟",
    faq_a2: "نعم، المانجا مستمرة أسبوعياً.",
    faq_q3: "ما هو الفصل الأخير في Blue Lock؟",
    faq_a3: "الفصل الأخير المتوفر حالياً هو الفصل {ch}.",
    faq_q4: "هل يمكنني قراءة جميع الفصول مجاناً؟",
    faq_a4: "نعم! جميع الفصول مجانية بالكامل.",
    faq_q5: "ما هي أركات Blue Lock بترتيب الفصول؟",
    faq_a5: "المرحلة الأولى (1-38)، المرحلة الثانية (39-86)، المرحلة الثالثة (87-108)، مباراة U-20 (109-151)، ودوري النيو إيغويست (152+).",
    read_chapter_prefix: "أنت تقرأ حالياً:",
    read_arc_prefix: "هذا الفصل جزء من:",
    read_nav_hint: "استخدم الأزرار أدناه للتنقل بين الفصول."
  }
};

const ARC_TRANSLATIONS = {
  EN: {
    1: { name: "First Selection Arc", desc: "300 strikers battle in five teams per building. Team Z must survive a round-robin tournament." },
    2: { name: "Second Selection Arc", desc: "Small-sided 3v3 and 2v2 matches where winning teams steal rival players." },
    3: { name: "Third Selection Arc", desc: "5v5 matches evaluated by Ego Jinpachi to form the Blue Lock Eleven." },
    4: { name: "VS. U-20 Japan Arc", desc: "Blue Lock Eleven takes on the official Japan U-20 National Team at a packed stadium." },
    5: { name: "Neo Egoist League Arc", desc: "Blue Lock players train alongside Europe's top five football leagues under world-class superstars." }
  },
  FR: {
    1: { name: "Arc Première Sélection", desc: "300 attaquants s'affrontent en équipes de 5. L'équipe Z doit survivre au tournoi." },
    2: { name: "Arc Seconde Sélection", desc: "Matches en 3v3 et 2v2 où l'équipe gagnante vole un joueur adverse." },
    3: { name: "Arc Troisième Sélection", desc: "Évaluation en 5v5 par Ego Jinpachi pour former le Blue Lock Eleven." },
    4: { name: "Arc VS U-20 Japon", desc: "Le Blue Lock Eleven affronte la sélection nationale du Japon U-20." },
    5: { name: "Arc Neo Egoist League", desc: "Les joueurs du Blue Lock s'entraînent avec les grands clubs européens." }
  },
  ES: {
    1: { name: "Arco de la Primera Selección", desc: "300 delanteros compiten en equipos. El Equipo Z debe sobrevivir al torneo." },
    2: { name: "Arco de la Segunda Selección", desc: "Partidos de 3v3 y 2v2 donde el equipo ganador roba a un jugador rival." },
    3: { name: "Arco de la Tercera Selección", desc: "Pruebas de 5v5 evaluadas por Ego Jinpachi para formar el Blue Lock Eleven." },
    4: { name: "Arco VS. Japón Sub-20", desc: "El Blue Lock Eleven se enfrenta a la Selección Nacional Sub-20 de Japón." },
    5: { name: "Arco de la Liga Neo Egoísta", desc: "Los jugadores de Blue Lock entrenan con las grandes ligas de Europa." }
  },
  DE: {
    1: { name: "First Selection Arc", desc: "300 Stürmer kämpfen in 5er-Teams. Team Z muss das Turnier überstehen." },
    2: { name: "Second Selection Arc", desc: "3v3 und 2v2 Matches, bei denen das Siegerteam Spieler übernimmt." },
    3: { name: "Third Selection Arc", desc: "5v5 Matches zur Auswahl der Blue Lock Elf durch Ego Jinpachi." },
    4: { name: "VS. U-20 Japan Arc", desc: "Die Blue Lock Elf tritt gegen Japans U-20 Nationalmannschaft an." },
    5: { name: "Neo Egoist League Arc", desc: "Blue Lock Spieler trainieren mit den Top 5 Ligen Europas." }
  },
  TR: {
    1: { name: "İlk Seçim Arkı", desc: "300 forvet takımlar halinde yarışır. Z Takımı turnuvada hayatta kalmalıdır." },
    2: { name: "İkinci Seçim Arkı", desc: "Kazanan takımın oyuncu çaldığı 3v3 ve 2v2 maçlar." },
    3: { name: "Üçüncü Seçim Arkı", desc: "Blue Lock 11'ini seçmek için Ego Jinpachi yönetiminde 5v5 maçlar." },
    4: { name: "U-20 Japonya Maçı Arkı", desc: "Blue Lock 11'i Japonya U-20 Milli Takımı ile karşılaşır." },
    5: { name: "Neo Egoist Ligi Arkı", desc: "Blue Lock oyuncuları Avrupa'nın dev kulüpleriyle antrenman yapar." }
  },
  JP: {
    1: { name: "1次選考編", desc: "300人のFWがチームに分かれて激突。チームZの生存をかけた戦い。" },
    2: { name: "2次選考編", desc: "勝者が相手選手を奪う3v3・2v2のライバル決戦。" },
    3: { name: "3次選考編", desc: "U-20日本代表戦のスタメンを決める5v5適性試験。" },
    4: { name: "U-20日本代表戦編", desc: "ブルーロック11人がU-20日本代表と満員のスタジアムで激突。" },
    5: { name: "ネオ・エゴイスト・リーグ編", desc: "欧州5大大国に分かれ、世界最高峰の環境で覚醒する。" }
  },
  AR: {
    1: { name: "أرك المرحلة الأولى", desc: "300 مهاجم يتنافسون في فرق. على الفريق Z البقاء على قيد الحياة." },
    2: { name: "أرك المرحلة الثانية", desc: "مباريات 3v3 و 2v2 حيث يخطف الفريق الفائز لاعباً من الخاسر." },
    3: { name: "أرك المرحلة الثالثة", desc: "مباريات 5v5 تحت تقييم إيغو جينباتشي لاختيار تشكيلة بلولوك." },
    4: { name: "أرك مباراة منتخب اليابان U-20", desc: "تشكيلة بلولوك تواجه منتخب اليابان للشباب تحت 20 سنة." },
    5: { name: "أرك دوري النيو إيغويست", desc: "لاعبو بلولوك يتدربون جنباً إلى جنب مع أندية أوروبا الكبرى." }
  }
};

function t(key) {
  const lang = currentState.currentLang || 'EN';
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['EN'];
  const raw  = dict[key] !== undefined ? dict[key] : (TRANSLATIONS['EN'][key] || key);
  
  const latestNum = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1].number : 358;
  const totalCount = CHAPTERS.length > 0 ? CHAPTERS.length : 358;
  let str = raw.replace(/\{count\}/g, totalCount);
  if (key !== 'seo_title_chapter' && key !== 'seo_desc_chapter') {
    str = str.replace(/\{ch\}/g, latestNum);
  }
  return str;
}

function translateUI() {
  const lang = currentState.currentLang || 'EN';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val && val !== key) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = t(key);
    if (val && val !== key) el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const key = el.dataset.i18nAlt;
    const val = t(key);
    if (val && val !== key) el.alt = val;
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.dataset.i18nAriaLabel;
    const val = t(key);
    if (val && val !== key) el.setAttribute('aria-label', val);
  });

  if (currentState.currentView === 'home') {
    renderArcs();
    renderRecentChapters();
    renderPopularChapters();
  } else if (currentState.currentView === 'chapters') {
    renderChapterTable();
  }

  updateClientSeo();
}

function updateDynamicUi() {
  const latestNum = CHAPTERS.length > 0 ? CHAPTERS[CHAPTERS.length - 1].number : 358;
  const totalCount = CHAPTERS.length > 0 ? CHAPTERS.length : 358;

  const countEl = document.getElementById('stat-chapters-count');
  if (countEl) countEl.textContent = totalCount;

  const clSub = document.querySelector('.cl-subtitle');
  if (clSub) clSub.textContent = `${totalCount} chapters available · Ongoing`;

  const footerLatest = document.getElementById('footer-latest-link');
  if (footerLatest) footerLatest.textContent = `Latest Chapter (${latestNum})`;
}

function updateClientSeo() {
  const lang = currentState.currentLang || 'EN';

  if (currentState.currentView === 'home') {
    document.title = t('seo_title_home');
    setMeta('description', t('seo_desc_home'));
  } else if (currentState.currentView === 'chapters') {
    document.title = t('seo_title_chapters');
    setMeta('description', t('seo_desc_chapters'));
  } else if (currentState.currentView === 'reader') {
    const chNum = currentState.currentChapter;
    const chData = CHAPTERS.find(c => c.number === chNum);
    const chTitle = chData ? chData.title : `Chapter ${chNum}`;
    const arc = ARCS.find(a => chNum >= a.start && chNum <= a.end);
    const arcTrans = arc && ARC_TRANSLATIONS[lang] ? ARC_TRANSLATIONS[lang][arc.id] : null;
    const arcName = arcTrans ? arcTrans.name : (arc ? arc.name : '');

    const title = t('seo_title_chapter').replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);
    const desc  = t('seo_desc_chapter').replace('{ch}', chNum).replace('{title}', chTitle).replace('{arc}', arcName);

    document.title = title;
    setMeta('description', desc);
  }
}

function setMeta(name, content) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;

  let ogTag = document.querySelector(`meta[property="og:${name}"]`);
  if (ogTag) ogTag.content = content;

  let twTag = document.querySelector(`meta[name="twitter:${name}"]`);
  if (twTag) twTag.content = content;
}

function readLatestChapter() {
  if (CHAPTERS.length > 0) {
    readChapter(CHAPTERS[CHAPTERS.length - 1].number);
  } else {
    readChapter(358);
  }
}

function formatChapterNumber(n) {
  return `Chapter ${n}`;
}
