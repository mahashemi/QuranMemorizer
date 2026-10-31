(function () {
'use strict';
const APP_SCRIPT_URL = document.currentScript && document.currentScript.src;
let ayahLinks = null;

/* ==================================================================
   1. RECITERS
   ================================================================== */
const RECITERS = [
  { id: 'minshawi_murattal', name: 'Minshawi Murattal — Mohamed Siddiq El-Minshawi', dir: 'data/audio/minshawi_murattal' }
];

/* ==================================================================
   2. SURA ENGLISH NAMES
   ================================================================== */
const SURA_ENGLISH = [
  "Al-Fatihah","Al-Baqarah","Ali 'Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal",
  "At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl",
  "Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur",
  "Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah",
  "Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir",
  "Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath",
  "Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah",
  "Al-Hadid","Al-Mujadilah","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun",
  "At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn",
  "Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa",
  "At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah",
  "Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq",
  "Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah",
  "Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas",
  "Al-Falaq","An-Nas"
];

/* ==================================================================
   3. HELPERS
   ================================================================== */
const $ = id => document.getElementById(id);
const pad3 = n => String(n).padStart(3, '0');
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmtTime = t => {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
};
const clampInt = (v, lo, hi) => {
  let n = parseInt(v, 10);
  if (isNaN(n)) n = lo;
  return Math.max(lo, Math.min(hi, n));
};
const isMobile = () => window.matchMedia('(max-width: 900px)').matches
  && !window.matchMedia('(max-width: 900px) and (orientation: landscape) and (max-height: 520px)').matches;

/* ==================================================================
   4. DOM REFS (elements below are filled after we inject the repeat block)
   ================================================================== */
const el = {
  sidebar: $('sidebar'),
  sidebarBody: $('sidebarBody'),
  suraList: $('suraList'), suraSearch: $('suraSearch'),
  homeSuraList: $('homeSuraList'), homeSuraSearch: $('homeSuraSearch'), homeSuraEmpty: $('homeSuraEmpty'),
  ayaList: $('ayaList'), ayaColHead: $('ayaColHead'),

  reader: $('reader'),
  reciterSelect: $('reciterSelect'), reciterSub: $('reciterSub'),
  nowPlaying: $('nowPlaying'),

  progress: $('progress'), progressFill: $('progressFill'),
  curTime: $('curTime'), durTime: $('durTime'),
  btnPlay: $('btnPlay'), btnPrev: $('btnPrev'), btnNext: $('btnNext'), btnStop: $('btnStop'),
  iconPlay: $('iconPlay'),
  btnRepeatSettings: $('btnRepeatSettings'),
  mobileStatus: $('mobileStatus'),

  mobHdrSura: $('mobHdrSura'), mobHdrSub: $('mobHdrSub'),

  btnOpenDrawer: $('btnOpenDrawer'), btnCloseDrawer: $('btnCloseDrawer'),
  drawerTabs: $('drawerTabs'), drawerBackdrop: $('drawerBackdrop'),

  settingsSheet: $('settingsSheet'), settingsBackdrop: $('settingsBackdrop'),
  btnOpenSettings: $('btnOpenSettings'),
  btnOpenSettingsDesktop: $('btnOpenSettingsDesktop'),
  sheetDone: $('sheetDone'),
  repeatSlotDesktop: $('repeatSlotDesktop'),
  repeatSlotMobile: $('repeatSlotMobile'),
  mobileReciterSelect: $('mobileReciterSelect'),
  toggleTranslit: $('toggleTranslit'),
  toggleEnglish: $('toggleEnglish'),
  toggleUrdu: $('toggleUrdu'),
  togglePersian: $('togglePersian'),
  mobileToggleBismillah: $('mobileToggleBismillah'),

  toast: $('toast'),
  recordingStorageStatus: $('recordingStorageStatus'),
  btnConnectRecordingFolder: $('btnConnectRecordingFolder'),
  btnUseBrowserStorage: $('btnUseBrowserStorage'),
  recordingArchiveActions: $('recordingArchiveActions'),
  btnExportRecordings: $('btnExportRecordings'),
  btnImportRecordings: $('btnImportRecordings'),
  recordingArchiveInput: $('recordingArchiveInput')
};

/* Repeat block element refs — populated after injecting the template */
let repeatEls = {};

/* ==================================================================
   5. STATE
   ================================================================== */
let SURAS = [];
let SURA_BY_NUM = {};

const state = {
  sura: 1, aya: 1,
  playingAya: null,
  started: false,
  repeatMode: 'none',

  singleCount: 3, singleCounter: 0,

  rangeFrom: 1, rangeTo: 7, rangeCount: 3, rangeLoops: 0,
  repeatEach: false,
  repeatEachCount: 3,
  ayaInner: 0,

  reciter: RECITERS[0].id,
  playBismillah: true,

  showTranslit: true,
  showEnglish: true,
  showUrdu: true,
  showPersian: true
};

let configDirty = true;

const PREFS_KEY = 'quranPlayer.displayPrefs.v1';

function loadDisplayPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (typeof saved.translit === 'boolean') state.showTranslit = saved.translit;
    if (typeof saved.english === 'boolean') state.showEnglish = saved.english;
    if (typeof saved.urdu === 'boolean')    state.showUrdu = saved.urdu;
    if (typeof saved.persian === 'boolean') state.showPersian = saved.persian;
    if (typeof saved.bismillah === 'boolean') state.playBismillah = saved.bismillah;
  } catch (e) { /* ignore */ }
}
function saveDisplayPrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      translit: state.showTranslit,
      english: state.showEnglish,
      urdu: state.showUrdu,
      persian: state.showPersian,
      bismillah: state.playBismillah
    }));
  } catch (e) { /* ignore */ }
}

/* ==================================================================
   6. AUDIO
   ================================================================== */
const audio = new Audio();
audio.preload = 'auto';

function setNativePlaybackActive(active) {
  try {
    const nativePlayback = window.QuranMemorizerNative;
    if (nativePlayback && typeof nativePlayback.setPlaybackActive === 'function') {
      nativePlayback.setPlaybackActive(Boolean(active));
    }
  } catch (error) {
    console.warn('Could not update native playback state.', error);
  }
}

function updateNativeMediaMetadata(playing) {
  try {
    const nativePlayback = window.QuranMemorizerNative;
    const sura = SURA_BY_NUM[state.sura];
    if (!nativePlayback || typeof nativePlayback.updateMediaMetadata !== 'function' || !sura) return;
    const aya = state.playingAya === 0 ? 1 : (state.playingAya || state.aya);
    nativePlayback.updateMediaMetadata(
      sura.englishName + ' — Ayah ' + aya,
      currentReciter().name,
      Boolean(playing)
    );
  } catch (error) {
    console.warn('Could not update Android media-session metadata.', error);
  }
}

function stopNativeMediaSession() {
  try {
    const nativePlayback = window.QuranMemorizerNative;
    if (nativePlayback && typeof nativePlayback.stopMediaSession === 'function') {
      nativePlayback.stopMediaSession();
    }
  } catch (error) {
    console.warn('Could not stop Android media session.', error);
  }
}

window.onQuranMediaAction = function (action) {
  if (action === 'play') {
    if (audio.paused) el.btnPlay.click();
  } else if (action === 'pause') {
    if (!audio.paused) el.btnPlay.click();
  } else if (action === 'next') {
    el.btnNext.click();
  } else if (action === 'previous') {
    el.btnPrev.click();
  }
};

/* ==================================================================
   7. INIT
   ================================================================== */
async function init() {
  ayahLinks = await import('./deep-links.mjs');
  window.QuranMemorizerLinks = Object.freeze({
    urlForAyah: (sura, ayah) => ayahLinks.buildAyahUrl(sura, ayah, window.location.href),
    elementIdForAyah: (sura, ayah) => ayahLinks.ayahElementId(sura, ayah),
    parseUrl: value => ayahLinks.parseAyahUrl(value)
  });
  injectRepeatBlock();
  loadDisplayPrefs();
  buildReciterSelects();
  syncDisplayTogglesUI();
  applyDisplayClasses();
  showMobileHeader();
  positionRepeatBlock();

  try {
    const res = await fetch('data/quran/all_suras.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
    const raw = await res.json();
    buildSuras(raw);
  } catch (err) {
    el.reader.innerHTML =
      '<div class="error-box">' +
        '<h2>Could not load the Qur’an data</h2>' +
        '<p><b>' + esc(err.message) + '</b></p>' +
        '<p>Make sure you start the server from the folder that contains ' +
        '<code>index.html</code> and the <code>data/</code> directory:</p>' +
        '<pre>cd /path/to/simple_quran\npython3 -m http.server 8000</pre>' +
        '<p>Then open <code>http://localhost:8000/</code></p>' +
      '</div>';
    el.nowPlaying.textContent = 'Data not loaded';
    if (el.homeSuraList) {
      el.homeSuraList.innerHTML =
        '<div class="home-sura-load-error" role="alert">' +
          '<strong>Surah list could not load.</strong>' +
          '<span>Open this project through a local web server, not by opening index.html directly.</span>' +
          '<code>python3 -m http.server 8000</code>' +
          '<span>Then visit <code>http://localhost:8000/</code> from the repository root.</span>' +
        '</div>';
    }
    return;
  }
  buildSidebar();
  bindEvents();
  bindRepeatEvents();
  window.addEventListener('hashchange', handleAyahHashChange);
  const initialTarget = ayahLinks.parseAyahHash(window.location.hash);
  if (initialTarget && SURA_BY_NUM[initialTarget.sura] && initialTarget.ayah <= SURA_BY_NUM[initialTarget.sura].ayas.length) {
    openAyahTarget(initialTarget, false);
  } else {
    loadSura(1, { aya: 1, play: false, syncUrl: false });
  }
}

/* Inject the repeat block from the template into the DOM (into the desktop slot by default) */
function injectRepeatBlock() {
  const tpl = document.getElementById('repeatBlockTemplate');
  const fragment = tpl.content.cloneNode(true);
  const block = fragment.querySelector('#repeatBlock');
  el.repeatSlotDesktop.appendChild(fragment);

  // Cache all its inner elements
  repeatEls = {
    block,
    repeatMode: block.querySelector('#repeatMode'),
    optSingle: block.querySelector('#optSingle'),
    optRange: block.querySelector('#optRange'),
    singleCount: block.querySelector('#singleCount'),
    rangeFrom: block.querySelector('#rangeFrom'),
    rangeTo: block.querySelector('#rangeTo'),
    rangeCount: block.querySelector('#rangeCount'),
    repeatEachAyah: block.querySelector('#repeatEachAyah'),
    repeatEachCount: block.querySelector('#repeatEachCount'),
    repeatEachWrap: block.querySelector('#repeatEachWrap'),
    status: block.querySelector('#status')
  };
}

/* Move the block between the desktop slot and the mobile slot based on viewport */
function positionRepeatBlock() {
  const block = repeatEls.block;
  if (!block) return;
  const target = isMobile() ? el.repeatSlotMobile : el.repeatSlotDesktop;
  if (block.parentElement !== target) {
    target.appendChild(block);
  }
}

function buildSuras(raw) {
  SURAS = Object.keys(raw).map(key => {
    const m = key.match(/سورة\s+(\d+)/);
    if (!m) return null;
    const number = parseInt(m[1], 10);
    if (!number) return null;
    const arabicName = (key.split(/[-–—]/)[0] || '').replace(/سورة/g, '').trim();
    const ayas = (raw[key] || []).map((v, i) => ({ ...v, ayaNum: i + 1 }));
    return {
      number, arabicName,
      englishName: SURA_ENGLISH[number - 1] || ('Sura ' + number),
      ayas
    };
  }).filter(Boolean).sort((a, b) => a.number - b.number);
  SURA_BY_NUM = {};
  SURAS.forEach(s => { SURA_BY_NUM[s.number] = s; });
  buildHomeSuraPicker();
}

function buildHomeSuraPicker() {
  if (!el.homeSuraList) return;
  const frag = document.createDocumentFragment();
  SURAS.forEach(s => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'home-sura-item';
    item.dataset.sura = s.number;
    item.dataset.search = (s.number + ' ' + s.englishName + ' ' + s.arabicName).toLowerCase();
    item.setAttribute('aria-label', 'Open Surah ' + s.number + ', ' + s.englishName);
    item.innerHTML =
      '<span class="home-sura-number">' + s.number + '</span>' +
      '<span class="home-sura-names"><span class="home-sura-english">' + esc(s.englishName) + '</span>' +
      '<span class="home-sura-meta">' + s.ayas.length + ' ayat</span></span>' +
      '<span class="home-sura-arabic" dir="rtl" lang="ar">' + esc(s.arabicName) + '</span>' +
      '<span class="home-sura-arrow" aria-hidden="true">›</span>';
    frag.appendChild(item);
  });
  el.homeSuraList.replaceChildren(frag);
}

/* ==================================================================
   8. RECITER SELECTS
   ================================================================== */
function buildReciterSelects() {
  const opts = RECITERS.map(r =>
    '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>'
  ).join('');
  el.reciterSelect.innerHTML = opts;
  el.mobileReciterSelect.innerHTML = opts;
  syncReciterUI();
}
function syncReciterUI() {
  el.reciterSelect.value = state.reciter;
  el.mobileReciterSelect.value = state.reciter;
  el.reciterSub.textContent = currentReciter().name;
}
function currentReciter() {
  return RECITERS.find(r => r.id === state.reciter) || RECITERS[0];
}

/* ==================================================================
   9. SIDEBAR
   ================================================================== */
function buildSidebar() {
  const frag = document.createDocumentFragment();
  SURAS.forEach(s => {
    const item = document.createElement('div');
    item.className = 'sura-item';
    item.dataset.sura = s.number;
    item.dataset.search = (s.number + ' ' + s.englishName + ' ' + s.arabicName).toLowerCase();
    item.innerHTML =
      '<span class="sura-num">' + s.number + '</span>' +
      '<span class="sura-names">' +
        '<span class="en">' + esc(s.englishName) + '</span>' +
        '<span class="ar" dir="rtl">' + esc(s.arabicName) + '</span>' +
      '</span>';
    frag.appendChild(item);
  });
  el.suraList.appendChild(frag);
}

function markCurrentSura() {
  el.suraList.querySelectorAll('.sura-item.current').forEach(i => i.classList.remove('current'));
  const item = el.suraList.querySelector('.sura-item[data-sura="' + state.sura + '"]');
  if (item) {
    item.classList.add('current');
    item.scrollIntoView({ block: 'nearest' });
  }
}

/* ==================================================================
   10. AYA LIST
   ================================================================== */
function renderAyaList(num) {
  const s = SURA_BY_NUM[num];
  if (!s) { el.ayaList.innerHTML = ''; return; }

  el.ayaColHead.innerHTML = '<b>' + esc(s.englishName) + '</b> · ' + s.ayas.length;

  let html = '';
  for (const v of s.ayas) {
    const raw = (v.arabic_text || '').trim();
    const preview = raw.length > 100 ? raw.slice(0, 100) : raw;
    html +=
      '<button class="aya-btn" data-aya="' + v.ayaNum + '" title="Aya ' + v.ayaNum + '">' +
        '<span class="aya-btn-num">' + v.ayaNum + '</span>' +
        '<span class="aya-btn-text" dir="rtl" lang="ar">' + esc(preview) + '</span>' +
      '</button>';
  }
  el.ayaList.innerHTML = html;
  el.ayaList.scrollTop = 0;
}

/* ==================================================================
   11. READER
   ================================================================== */
function renderSura() {
  const s = SURA_BY_NUM[state.sura];
  if (!s) return;

  let html =
    '<div class="sura-heading">' +
      '<h1>' + s.number + '. ' + esc(s.englishName) + '</h1>' +
      '<div class="ar-name" dir="rtl">' + esc(s.arabicName) + '</div>' +
      '<div class="meta">' + s.ayas.length + ' ayat</div>' +
      '<div class="sura-download">' +
        '<button type="button" class="sura-download-btn" data-download-sura="' + s.number + '">Download for offline</button>' +
        '<span class="sura-download-status" data-download-status="' + s.number + '" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</div>';

  for (const v of s.ayas) {
    html +=
      '<article class="aya" id="ayah-' + s.number + '-' + v.ayaNum + '" data-aya="' + v.ayaNum + '" data-surah="' + s.number + '" data-ayah="' + v.ayaNum + '">' +
        '<div class="aya-top">' +
          '<span class="aya-num">' + v.ayaNum + '</span>' +
          '<span class="aya-hint">click to play</span>' +
        '</div>' +
        '<div class="arabic" dir="rtl" lang="ar">' + esc(v.arabic_text || '') + '</div>' +
        '<div class="translit">' + esc(v.transliteration || '') + '</div>' +
        '<div class="english">' + esc(v.english_text || '') + '</div>' +
        '<div class="urdu" dir="rtl" lang="ur">' + esc(v.urdu_text || '') + '</div>' +
        '<div class="persian" dir="rtl" lang="fa">' + esc(v.persian_text || '') + '</div>' +
        '<div class="aya-recording" data-recording-for="' + v.ayaNum + '">' +
          '<button type="button" class="aya-record-btn" data-record-aya="' + v.ayaNum + '">Record my voice</button>' +
          '<button type="button" class="aya-play-recording" data-play-recording="' + v.ayaNum + '" hidden>Play my voice</button>' +
          '<button type="button" class="aya-delete-recording" data-delete-recording="' + v.ayaNum + '" hidden>Delete</button>' +
          '<div class="recording-waveform" data-record-waveform="' + v.ayaNum + '" role="img" aria-label="Live microphone audio level" hidden>' + Array.from({ length: 28 }, () => '<span></span>').join('') + '</div>' +
          '<span class="aya-record-status" data-record-status="' + v.ayaNum + '" aria-live="polite"></span>' +
        '</div>' +
      '</article>';
  }
  el.reader.innerHTML = html;
  el.reader.scrollTop = 0;
  refreshRecordingControls(state.sura);
}

/* ==================================================================
   12. DISPLAY TOGGLES
   ================================================================== */
function applyDisplayClasses() {
  el.reader.classList.toggle('hide-translit', !state.showTranslit);
  el.reader.classList.toggle('hide-english', !state.showEnglish);
  el.reader.classList.toggle('hide-urdu', !state.showUrdu);
  el.reader.classList.toggle('hide-persian', !state.showPersian);
}

function syncDisplayTogglesUI() {
  el.toggleTranslit.checked = state.showTranslit;
  el.toggleEnglish.checked = state.showEnglish;
  el.toggleUrdu.checked = state.showUrdu;
  el.togglePersian.checked = state.showPersian;
  el.mobileToggleBismillah.checked = state.playBismillah;
}

/* ==================================================================
   13. UI SYNC
   ================================================================== */
function syncCurrentAyahUrl() {
  if (!ayahLinks) return;
  const next = ayahLinks.buildAyahHash(state.sura, state.aya);
  if (window.location.hash !== next) window.history.replaceState(null, '', window.location.pathname + window.location.search + next);
}

function openAyahTarget(target, syncUrl) {
  if (!target || !SURA_BY_NUM[target.sura]) return false;
  const sura = SURA_BY_NUM[target.sura];
  if (!Number.isInteger(target.ayah) || target.ayah < 1 || target.ayah > sura.ayas.length) return false;
  document.body.classList.add('reader-active');
  const home = document.getElementById('homePage');
  if (home) home.setAttribute('aria-hidden', 'true');
  loadSura(target.sura, { aya: target.ayah, play: false, syncUrl: syncUrl !== false });
  return true;
}

function handleAyahHashChange() {
  const target = ayahLinks && ayahLinks.parseAyahHash(window.location.hash);
  if (!target) return;
  if (!openAyahTarget(target, false)) toast('That Surah or Ayah number is not valid.');
}

function updateAyaUI(scrollReader) {
  const s = SURA_BY_NUM[state.sura];
  if (!s) return;

  el.reader.querySelectorAll('.aya.active').forEach(n => n.classList.remove('active'));
  const card = document.getElementById(ayahLinks ? ayahLinks.ayahElementId(state.sura, state.aya) : ('ayah-' + state.sura + '-' + state.aya));
  if (card) {
    card.classList.add('active');
    if (scrollReader !== false) {
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  el.ayaList.querySelectorAll('.aya-btn.active').forEach(b => b.classList.remove('active'));
  const btn = el.ayaList.querySelector('.aya-btn[data-aya="' + state.aya + '"]');
  if (btn) {
    btn.classList.add('active');
    btn.scrollIntoView({ block: 'nearest' });
  }

  markCurrentSura();

  const line = s.number + '. ' + s.englishName + '  ·  Aya ' + state.aya + ' / ' + s.ayas.length;
  el.nowPlaying.textContent = line;
  showMobileHeader();

  updateStatus();
}

function showMobileHeader() {
  const s = SURA_BY_NUM[state.sura];
  if (!s) return;
  el.mobHdrSura.textContent = s.englishName;
  el.mobHdrSub.textContent = 'Aya ' + state.aya + ' of ' + s.ayas.length;
}

function updateStatus() {
  let txt = '';
  if (state.repeatMode === 'single') {
    const total = state.singleCount === 0 ? '∞' : state.singleCount;
    txt = 'Aya repeat ' + state.singleCounter + ' / ' + total;

  } else if (state.repeatMode === 'range') {
    const total = state.rangeCount === 0 ? '∞' : state.rangeCount;
    const shownLoop = state.rangeCount === 0
      ? (state.rangeLoops + 1)
      : Math.min(state.rangeLoops + 1, state.rangeCount);

    txt = 'Range ' + state.rangeFrom + '–' + state.rangeTo;
    if (state.repeatEach) {
      const eachDone = Math.min(state.ayaInner + 1, state.repeatEachCount);
      txt += '  ·  aya ' + eachDone + '/' + state.repeatEachCount;
    }
    txt += '  ·  loop ' + shownLoop + '/' + total;
  }

  if (repeatEls.status) repeatEls.status.textContent = txt;
  if (el.mobileStatus) el.mobileStatus.textContent = txt;

  // the repeat icon button in the mobile player becomes highlighted when a repeat mode is active
  if (el.btnRepeatSettings) {
    el.btnRepeatSettings.classList.toggle('active', state.repeatMode !== 'none');
  }
}

function updateOpts() {
  if (!repeatEls.optSingle) return;
  repeatEls.optSingle.classList.toggle('show', state.repeatMode === 'single');
  repeatEls.optRange.classList.toggle('show', state.repeatMode === 'range');
  repeatEls.repeatEachWrap.classList.toggle('show', state.repeatEach);
}

function syncRangeInputs() {
  const s = SURA_BY_NUM[state.sura];
  if (!s) return;
  const total = s.ayas.length;
  repeatEls.rangeFrom.max = total;
  repeatEls.rangeTo.max = total;

  if (state.rangeTo > total) state.rangeTo = total;
  if (state.rangeTo < 1) state.rangeTo = 1;
  if (state.rangeFrom > total) state.rangeFrom = total;
  if (state.rangeFrom < 1) state.rangeFrom = 1;
  // Keep the endpoints independent while the user edits them.
  repeatEls.rangeFrom.value = state.rangeFrom;
  repeatEls.rangeTo.value = state.rangeTo;
}

function resetCounters() {
  state.singleCounter = 0;
  state.rangeLoops = 0;
  state.ayaInner = 0;
}

/* ==================================================================
   14. PLAYBACK ENGINE
   ================================================================== */
function trackUrl(sura, aya) {
  // Git LFS media endpoint serves the actual public MP3 rather than the small LFS pointer file.
  return 'https://media.githubusercontent.com/media/mahashemi/QuranMemorizer/main/' +
    currentReciter().dir + '/' + pad3(sura) + pad3(aya) + '.mp3';
}

/* Recordings prefer app-private native files or user-authorized folders; IndexedDB remains the web fallback. */
const RECORDINGS_DB = 'quranMemorizerRecordings';
const RECORDINGS_STORE = 'ayah-recordings';
const RECITATION_STORE = 'recitation-audio';
const RECORDING_FOLDER_SETTING = 'recordingsParentFolder';
let recordingsDbPromise;
let activeRecorder = null;
let activeRecordingKey = null;
let activeRecordingChunks = [];
let playbackRequestId = 0;
let playbackMode = 'idle'; // idle | sequence | preview
let activeRecordingObjectUrl = null;
let activeRecitationObjectUrl = null;
let activeSurahDownload = null;
let recordingAudioContext = null;
let recordingAnalyser = null;
let recordingWaveFrame = null;
let recordingStorageMode = 'needs-folder-choice'; // native | folder | folder-needs-permission | needs-folder-choice | browser
let recordingsParentHandle = null;
let folderRecordingIndex = new Map();
let browserFallbackRecordingKeys = new Set();
let recordingStorageReadyPromise = null;
let nativeRecordingStoragePromise = null;
let recordingArchiveModulePromise = null;

const supportsRecordingFolderAccess = () => window.isSecureContext === true
  && typeof window.showDirectoryPicker === 'function';

function openRecordingsDb() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('Browser-local recording storage is not supported here.'));
  if (!recordingsDbPromise) {
    recordingsDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(RECORDINGS_DB, 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
          db.createObjectStore(RECORDINGS_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(RECITATION_STORE)) {
          db.createObjectStore(RECITATION_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local recording storage.'));
    });
  }
  return recordingsDbPromise;
}

async function getNativeRecordingStorage() {
  if (!nativeRecordingStoragePromise) {
    nativeRecordingStoragePromise = (async () => {
      const capacitor = window.Capacitor;
      if (!capacitor || typeof capacitor.isNativePlatform !== 'function' || !capacitor.isNativePlatform()) return null;
      try {
        await import(APP_SCRIPT_URL ? new URL('./native-storage-adapter.js', APP_SCRIPT_URL).href : './static/js/native-storage-adapter.js');
        const adapter = window.QuranMemorizerNativeStorage;
        return adapter && adapter.available ? adapter : null;
      } catch (error) {
        console.error('Native recording storage adapter could not be loaded.', error);
        return null;
      }
    })();
  }
  return nativeRecordingStoragePromise;
}

async function getRecordingFolderSetting() {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('settings', 'readonly').objectStore('settings').get(RECORDING_FOLDER_SETTING);
    request.onsuccess = () => resolve(request.result && request.result.handle ? request.result.handle : null);
    request.onerror = () => reject(request.error || new Error('Could not read recordings-folder settings.'));
  });
}

async function saveRecordingFolderSetting(handle) {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const store = db.transaction('settings', 'readwrite').objectStore('settings');
    const request = handle
      ? store.put({ key: RECORDING_FOLDER_SETTING, handle: handle })
      : store.delete(RECORDING_FOLDER_SETTING);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Could not save recordings-folder settings.'));
  });
}

function recitationKey(sura, aya) { return 'minshawi_murattal:' + sura + ':' + aya; }

async function getCachedRecitation(sura, aya) {
  const nativeStorage = await getNativeRecordingStorage();
  if (nativeStorage && typeof nativeStorage.readRecitation === 'function') {
    const nativeRecord = await nativeStorage.readRecitation(sura, aya);
    if (nativeRecord && nativeRecord.blob instanceof Blob && nativeRecord.blob.size > 0) return nativeRecord;
  }
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(RECITATION_STORE, 'readonly').objectStore(RECITATION_STORE).get(recitationKey(sura, aya));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not read downloaded recitation.'));
  });
}

async function saveCachedRecitation(sura, aya, blob) {
  const nativeStorage = await getNativeRecordingStorage();
  if (nativeStorage && typeof nativeStorage.writeRecitation === 'function') {
    return nativeStorage.writeRecitation(sura, aya, blob);
  }
  const db = await openRecordingsDb();
  const record = { key: recitationKey(sura, aya), sura, aya, reciter: 'minshawi_murattal', blob, size: blob.size, savedAt: Date.now(), storage: 'browser' };
  return new Promise((resolve, reject) => {
    const request = db.transaction(RECITATION_STORE, 'readwrite').objectStore(RECITATION_STORE).put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error || new Error('Could not save downloaded recitation. Device storage may be full.'));
  });
}

async function downloadSurahAudio(sura, button) {
  const surah = SURA_BY_NUM[sura];
  if (!surah) return;
  if (activeSurahDownload) {
    if (activeSurahDownload.sura === sura) {
      activeSurahDownload.cancelled = true;
      button.textContent = 'Cancelling…';
      return;
    }
    toast('Please wait for the current Surah download to finish or cancel it first.');
    return;
  }
  const status = el.reader.querySelector('[data-download-status="' + sura + '"]');
  const job = { sura, cancelled: false };
  activeSurahDownload = job;
  button.disabled = false;
  button.textContent = 'Cancel download';
  let completed = 0;
  let bytes = 0;
  try {
    for (const ayah of surah.ayas) {
      if (job.cancelled) break;
      const existing = await getCachedRecitation(sura, ayah.ayaNum);
      if (existing && existing.blob instanceof Blob && existing.blob.size > 0) {
        completed++;
        bytes += existing.blob.size;
      } else {
        const response = await fetch(trackUrl(sura, ayah.ayaNum), { cache: 'no-store' });
        if (!response.ok) throw new Error('Ayah ' + ayah.ayaNum + ' download failed (HTTP ' + response.status + ').');
        const blob = await response.blob();
        if (blob.size < 100 || (blob.type && !blob.type.startsWith('audio/') && blob.type !== 'application/octet-stream')) {
          throw new Error('Ayah ' + ayah.ayaNum + ' did not return a valid audio file.');
        }
        const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        const isMp3 = (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
          (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
        if (!isMp3) throw new Error('Ayah ' + ayah.ayaNum + ' response was not an MP3. Check the public audio source.');
        await saveCachedRecitation(sura, ayah.ayaNum, blob);
        completed++;
        bytes += blob.size;
      }
      if (status) status.textContent = 'Downloaded ' + completed + ' / ' + surah.ayas.length + ' ayat';
    }
    if (job.cancelled) {
      if (status) status.textContent = 'Paused after ' + completed + ' / ' + surah.ayas.length + ' ayat. Download again to resume.';
    } else {
      if (status) status.textContent = 'Ready offline · ' + completed + ' ayat · ' + (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      toast(surah.englishName + ' is ready for offline playback.');
    }
  } catch (error) {
    if (status) status.textContent = 'Download stopped: ' + (error.message || 'unknown error');
    toast('Surah download stopped: ' + (error.message || 'unknown error'));
  } finally {
    if (activeSurahDownload === job) activeSurahDownload = null;
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = 'Download for offline';
    }
  }
}

async function getBrowserRecording(sura, aya) {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(RECORDINGS_STORE, 'readonly').objectStore(RECORDINGS_STORE).get(sura + ':' + aya);
    request.onsuccess = () => {
      const record = request.result || null;
      if (record) record.storage = 'browser';
      resolve(record);
    };
    request.onerror = () => reject(request.error || new Error('Could not read recording.'));
  });
}

async function getAllBrowserRecordings() {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(RECORDINGS_STORE, 'readonly').objectStore(RECORDINGS_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Could not list local recordings.'));
  });
}

async function saveBrowserRecording(sura, aya, blob) {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const record = { key: sura + ':' + aya, sura, aya, blob, mimeType: blob.type || 'audio/webm', updatedAt: Date.now(), storage: 'browser' };
    const request = db.transaction(RECORDINGS_STORE, 'readwrite').objectStore(RECORDINGS_STORE).put(record);
    request.onsuccess = () => {
      if (recordingStorageMode !== 'browser' && recordingStorageMode !== 'needs-folder-choice') {
        browserFallbackRecordingKeys.add(record.key);
      }
      resolve(record);
    };
    request.onerror = () => reject(request.error || new Error('Could not save recording.'));
  });
}

async function deleteBrowserRecording(sura, aya) {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(RECORDINGS_STORE, 'readwrite').objectStore(RECORDINGS_STORE).delete(sura + ':' + aya);
    request.onsuccess = () => {
      browserFallbackRecordingKeys.delete(sura + ':' + aya);
      resolve();
    };
    request.onerror = () => reject(request.error || new Error('Could not delete recording.'));
  });
}

function isNotFoundError(error) {
  return !!error && (error.name === 'NotFoundError' || /not found|does not exist/i.test(String(error.message || error)));
}

function recordingExtension(mimeType) {
  const type = String(mimeType || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('aac')) return 'aac';
  return 'webm';
}

function recordingExtensions() {
  return ['webm', 'm4a', 'mp4', 'ogg', 'wav', 'aac'];
}

function recordingMimeForExtension(ext) {
  return ({ webm: 'audio/webm', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac' })[ext] || 'application/octet-stream';
}

function recordingSuraFolderName(sura) {
  const name = SURA_ENGLISH[sura - 1] || ('Surah ' + sura);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return 'surah-' + pad3(sura) + '-' + (slug || 'unknown');
}

async function getConnectedRecordingDirectories(create) {
  if (!recordingsParentHandle) throw new Error('Reconnect your recordings folder in Settings before using your saved files.');
  let permission = await recordingsParentHandle.queryPermission({ mode: 'readwrite' });
  if (permission !== 'granted') {
    throw new Error('Permission to your recordings folder has expired. Reconnect it in Settings.');
  }
  const appDirectory = await recordingsParentHandle.getDirectoryHandle('QuranMemorizer', { create: create !== false });
  const recordingsDirectory = await appDirectory.getDirectoryHandle('recordings', { create: create !== false });
  return { appDirectory, recordingsDirectory };
}

async function getFolderRecordingDirectory(sura) {
  if (folderRecordingIndex.has(sura)) return folderRecordingIndex.get(sura);
  const lookup = (async () => {
    const dirs = await getConnectedRecordingDirectories(false);
    let suraDirectory;
    try {
      suraDirectory = await dirs.recordingsDirectory.getDirectoryHandle(recordingSuraFolderName(sura), { create: false });
    } catch (error) {
      if (isNotFoundError(error)) return { directory: null, files: new Map() };
      throw error;
    }
    const files = new Map();
    for await (const [name, handle] of suraDirectory.entries()) {
      if (handle.kind !== 'file') continue;
      const match = name.match(/^ayah-(\d{3})\.(webm|m4a|mp4|ogg|wav|aac)$/i);
      if (match) files.set(Number(match[1]), { name, ext: match[2].toLowerCase() });
    }
    return { directory: suraDirectory, files };
  })();
  folderRecordingIndex.set(sura, lookup);
  try {
    return await lookup;
  } catch (error) {
    folderRecordingIndex.delete(sura);
    throw error;
  }
}

async function getFolderRecording(sura, aya) {
  const indexed = await getFolderRecordingDirectory(sura);
  if (!indexed.directory) return null;
  const fileInfo = indexed.files.get(aya);
  if (!fileInfo) return null;
  const handle = await indexed.directory.getFileHandle(fileInfo.name, { create: false });
  const file = await handle.getFile();
  return {
    key: sura + ':' + aya, sura, aya, blob: file,
    mimeType: file.type || recordingMimeForExtension(fileInfo.ext),
    fileName: fileInfo.name, updatedAt: file.lastModified, storage: 'folder'
  };
}

async function writeFolderRecording(sura, aya, blob) {
  const dirs = await getConnectedRecordingDirectories(true);
  const suraDirectory = await dirs.recordingsDirectory.getDirectoryHandle(recordingSuraFolderName(sura), { create: true });
  const ext = recordingExtension(blob.type);
  const fileName = 'ayah-' + pad3(aya) + '.' + ext;
  const fileHandle = await suraDirectory.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  folderRecordingIndex.delete(sura);
  for (const oldExt of recordingExtensions()) {
    if (oldExt === ext) continue;
    try { await suraDirectory.removeEntry('ayah-' + pad3(aya) + '.' + oldExt); }
    catch (error) { if (!isNotFoundError(error)) throw error; }
  }
  try {
    await updateFolderManifest(dirs.recordingsDirectory, sura, aya, fileName, blob.type || 'audio/' + ext, blob.size);
  } catch (manifestError) {
    // The audio file is already safely written. A stale manifest must not cause
    // the app to report that the recording itself failed.
    console.warn('Could not update the recordings manifest.', manifestError);
  }
  return {
    key: sura + ':' + aya, sura, aya, blob, mimeType: blob.type || 'audio/' + ext,
    fileName, updatedAt: Date.now(), storage: 'folder'
  };
}

async function updateFolderManifest(recordingsDirectory, sura, aya, fileName, mimeType, size) {
  const manifestName = 'manifest.json';
  let manifest = { schemaVersion: 1, app: 'QuranMemorizer', updatedAt: Date.now(), recordings: [] };
  try {
    const handle = await recordingsDirectory.getFileHandle(manifestName, { create: false });
    manifest = JSON.parse(await (await handle.getFile()).text());
    if (!Array.isArray(manifest.recordings)) manifest.recordings = [];
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }
  const key = sura + ':' + aya;
  manifest.recordings = manifest.recordings.filter(item => item.key !== key);
  manifest.recordings.push({ key, sura, aya, fileName, folder: recordingSuraFolderName(sura), mimeType, size, updatedAt: Date.now() });
  manifest.updatedAt = Date.now();
  const manifestHandle = await recordingsDirectory.getFileHandle(manifestName, { create: true });
  const writable = await manifestHandle.createWritable();
  await writable.write(JSON.stringify(manifest, null, 2));
  await writable.close();
}

async function removeFolderRecording(sura, aya) {
  const dirs = await getConnectedRecordingDirectories(false);
  folderRecordingIndex.delete(sura);
  let suraDirectory;
  try {
    suraDirectory = await dirs.recordingsDirectory.getDirectoryHandle(recordingSuraFolderName(sura), { create: false });
  } catch (error) {
    if (isNotFoundError(error)) return;
    throw error;
  }
  for (const ext of recordingExtensions()) {
    try { await suraDirectory.removeEntry('ayah-' + pad3(aya) + '.' + ext); }
    catch (error) { if (!isNotFoundError(error)) throw error; }
  }
  try {
    const handle = await dirs.recordingsDirectory.getFileHandle('manifest.json', { create: false });
    const manifest = JSON.parse(await (await handle.getFile()).text());
    if (Array.isArray(manifest.recordings)) {
      manifest.recordings = manifest.recordings.filter(item => item.key !== sura + ':' + aya);
      manifest.updatedAt = Date.now();
      const writable = await (await dirs.recordingsDirectory.getFileHandle('manifest.json', { create: true })).createWritable();
      await writable.write(JSON.stringify(manifest, null, 2));
      await writable.close();
    }
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }
}

async function migrateBrowserRecordingsToFolder() {
  if (recordingStorageMode !== 'folder') return 0;
  const records = await getAllBrowserRecordings();
  let copied = 0;
  browserFallbackRecordingKeys = new Set();
  for (const record of records) {
    if (!record || !record.blob || !record.sura || !record.aya) continue;
    const key = record.key || record.sura + ':' + record.aya;
    // Keep track only of ayat that actually exist in IndexedDB, so the file
    // path is checked first and IndexedDB is consulted only for those keys.
    browserFallbackRecordingKeys.add(key);
    try {
      const existing = await getFolderRecording(record.sura, record.aya);
      if (!existing) {
        await writeFolderRecording(record.sura, record.aya, record.blob);
        copied++;
      }
    } catch (migrationError) {
      // Retain a sparse list of browser-backed recordings. The reader can use
      // them as a fallback without querying IndexedDB for every unrecorded ayah.
      browserFallbackRecordingKeys.add(key);
      console.warn('Could not migrate browser recording ' + key + '.', migrationError);
    }
  }
  return copied;
}

async function migrateBrowserRecordingsToNative(native) {
  const records = await getAllBrowserRecordings();
  browserFallbackRecordingKeys = new Set();
  let copied = 0;
  for (const record of records) {
    if (!record || !record.blob || !record.sura || !record.aya) continue;
    const key = record.key || record.sura + ':' + record.aya;
    // Keep a sparse fallback index while native files become the primary copy.
    browserFallbackRecordingKeys.add(key);
    try {
      const existing = await native.read(record.sura, record.aya);
      if (!existing) {
        await native.write(record.sura, record.aya, record.blob);
        copied++;
      }
    } catch (migrationError) {
      console.warn('Could not migrate Android browser recording ' + key + '.', migrationError);
    }
  }
  return copied;
}

async function initializeRecordingStorage() {
  const capacitor = window.Capacitor;
  const nativeRuntime = !!(capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform());
  const native = await getNativeRecordingStorage();
  if (native) {
    recordingStorageMode = 'native';
    try {
      await migrateBrowserRecordingsToNative(native);
    } catch (migrationError) {
      // Native files remain the primary storage; this scan only preserves legacy data.
      console.warn('Could not scan legacy browser recordings for migration.', migrationError);
    }
    updateRecordingStorageUI();
    return;
  }
  if (nativeRuntime) {
    recordingStorageMode = 'native-fallback';
    updateRecordingStorageUI();
    return;
  }
  if (!supportsRecordingFolderAccess()) {
    recordingStorageMode = 'browser';
    updateRecordingStorageUI();
    return;
  }
  try {
    recordingsParentHandle = await getRecordingFolderSetting();
    if (!recordingsParentHandle) {
      recordingStorageMode = 'needs-folder-choice';
    } else {
      const permission = await recordingsParentHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        recordingStorageMode = 'folder';
        await getConnectedRecordingDirectories(true);
        try {
          await migrateBrowserRecordingsToFolder();
        } catch (migrationError) {
          // The connected folder remains usable even if old browser data could
          // not be copied (for example, because IndexedDB is unavailable).
          console.warn('Browser recording migration was skipped.', migrationError);
        }
      } else {
        recordingStorageMode = 'folder-needs-permission';
      }
    }
  } catch (error) {
    console.warn('Could not restore recordings-folder access.', error);
    recordingStorageMode = recordingsParentHandle ? 'folder-needs-permission' : 'browser';
  }
  updateRecordingStorageUI();
}

function ensureRecordingStorageInitialized() {
  if (!recordingStorageReadyPromise) recordingStorageReadyPromise = initializeRecordingStorage();
  return recordingStorageReadyPromise;
}

function updateRecordingStorageUI() {
  const status = el.recordingStorageStatus;
  const connectButton = el.btnConnectRecordingFolder;
  const browserButton = el.btnUseBrowserStorage;
  const archiveActions = el.recordingArchiveActions;
  if (archiveActions) archiveActions.hidden = recordingStorageMode === 'native' || recordingStorageMode === 'native-fallback';
  if (el.btnImportRecordings) el.btnImportRecordings.disabled = recordingStorageMode === 'folder-needs-permission' || recordingStorageMode === 'needs-folder-choice';
  if (el.btnExportRecordings) el.btnExportRecordings.disabled = recordingStorageMode === 'folder-needs-permission';
  if (!status) return;
  const folderSupported = supportsRecordingFolderAccess();
  if (recordingStorageMode === 'native') {
    status.textContent = 'Saved as audio files in this app’s private storage. No folder selection or cloud account is needed.';
    if (connectButton) connectButton.hidden = true;
    if (browserButton) browserButton.hidden = true;
    return;
  }
  if (recordingStorageMode === 'native-fallback') {
    status.textContent = 'Native file storage could not load in this build, so recordings will use this app’s local browser storage. Rebuild and sync the Android app to enable ordinary audio files.';
    if (connectButton) connectButton.hidden = true;
    if (browserButton) browserButton.hidden = true;
    return;
  }
  if (!folderSupported) {
    status.textContent = 'Saved locally in this browser. This browser does not offer direct folder access here; recordings are not automatically shared with other browsers.';
    if (connectButton) connectButton.hidden = true;
    if (browserButton) browserButton.hidden = true;
    return;
  }
  if (recordingStorageMode === 'folder') {
    status.textContent = 'Portable files are saved in the selected folder under QuranMemorizer/recordings/. Other browsers can use them after you connect that same folder.';
    if (connectButton) { connectButton.hidden = false; connectButton.textContent = 'Change recordings folder'; }
    if (browserButton) { browserButton.hidden = false; browserButton.textContent = 'Use browser-local storage instead'; }
  } else if (recordingStorageMode === 'folder-needs-permission') {
    status.textContent = 'The previously selected folder needs permission again. Reconnect it to access those recordings; they remain on disk.';
    if (connectButton) { connectButton.hidden = false; connectButton.textContent = 'Reconnect recordings folder'; }
    if (browserButton) { browserButton.hidden = false; browserButton.textContent = 'Use browser-local storage instead'; }
  } else if (recordingStorageMode === 'needs-folder-choice') {
    status.textContent = 'Portable audio files are preferred here. Choose the parent folder where QuranMemorizer can create its own recordings folder, or explicitly use browser-local storage.';
    if (connectButton) { connectButton.hidden = false; connectButton.textContent = 'Choose recordings folder'; }
    if (browserButton) { browserButton.hidden = false; browserButton.textContent = 'Use browser-local storage instead'; }
  } else {
    status.textContent = 'Saved locally in this browser because browser-local mode was selected. You can switch back to portable audio files at any time.';
    if (connectButton) { connectButton.hidden = false; connectButton.textContent = 'Choose recordings folder'; }
    if (browserButton) browserButton.hidden = true;
  }
}

async function connectRecordingFolder() {
  if (!supportsRecordingFolderAccess()) {
    toast('Direct folder access is not supported by this browser.');
    return;
  }
  const previousParent = recordingsParentHandle;
  const previousMode = recordingStorageMode;
  try {
    const parent = await window.showDirectoryPicker({
      id: 'quranmemorizer-recordings',
      mode: 'readwrite',
      startIn: 'documents'
    });
    let permission = await parent.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') permission = await parent.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') throw new Error('Folder permission was not granted.');

    // Validate/create the app directories before replacing the currently active folder.
    const appDirectory = await parent.getDirectoryHandle('QuranMemorizer', { create: true });
    await appDirectory.getDirectoryHandle('recordings', { create: true });
    await saveRecordingFolderSetting(parent);
    recordingsParentHandle = parent;
    folderRecordingIndex.clear();
    recordingStorageMode = 'folder';

    let copied = 0;
    let migrationFailed = false;
    try { copied = await migrateBrowserRecordingsToFolder(); }
    catch (migrationError) {
      migrationFailed = true;
      console.warn('Some browser recordings could not be copied to the selected folder.', migrationError);
    }
    updateRecordingStorageUI();
    refreshRecordingControls(state.sura);
    if (migrationFailed) {
      toast('Folder connected, but some older recordings could not be copied. They remain in browser storage.');
    } else {
      toast(copied ? 'Folder connected. ' + copied + ' browser recording(s) copied to files.' : 'Recordings folder connected.');
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    recordingsParentHandle = previousParent;
    folderRecordingIndex.clear();
    recordingStorageMode = previousMode;
    updateRecordingStorageUI();
    toast('Could not connect recordings folder: ' + (error.message || 'permission unavailable'));
  }
}

async function useBrowserRecordingStorage() {
  try {
    await saveRecordingFolderSetting(null);
    recordingsParentHandle = null;
    folderRecordingIndex.clear();
    recordingStorageMode = 'browser';
    updateRecordingStorageUI();
    refreshRecordingControls(state.sura);
    toast('Browser-local storage enabled. Files in the disconnected folder are left untouched.');
  } catch (error) {
    toast('Could not change recording storage: ' + (error.message || 'unknown error'));
  }
}


async function getUserRecording(sura, aya) {
  await ensureRecordingStorageInitialized();
  const native = await getNativeRecordingStorage();
  if (native) {
    const record = await native.read(sura, aya);
    if (record) return record;
    if (recordingStorageMode === 'native' && !browserFallbackRecordingKeys.has(sura + ':' + aya)) return null;
  }
  if (recordingStorageMode === 'folder-needs-permission') {
    const browserRecord = await getBrowserRecording(sura, aya);
    if (browserRecord) return browserRecord;
    throw new Error('Reconnect your recordings folder in Settings to access saved files.');
  }
  if (recordingStorageMode === 'folder') {
    const key = sura + ':' + aya;
    try {
      const record = await getFolderRecording(sura, aya);
      if (record) return record;
    } catch (folderError) {
      if (browserFallbackRecordingKeys.has(key)) {
        const browserRecord = await getBrowserRecording(sura, aya);
        if (browserRecord) return browserRecord;
      }
      throw folderError;
    }
    if (!browserFallbackRecordingKeys.has(key)) return null;
    return getBrowserRecording(sura, aya);
  }
  return getBrowserRecording(sura, aya);
}

async function saveUserRecording(sura, aya, blob) {
  await ensureRecordingStorageInitialized();
  const native = await getNativeRecordingStorage();
  if (native) return native.write(sura, aya, blob);
  if (recordingStorageMode === 'folder-needs-permission') {
    throw new Error('Reconnect your recordings folder in Settings before recording.');
  }
  if (recordingStorageMode === 'needs-folder-choice') {
    throw new Error('Choose a recordings folder or browser-local storage in Settings before recording.');
  }
  if (recordingStorageMode === 'folder') return writeFolderRecording(sura, aya, blob);
  return saveBrowserRecording(sura, aya, blob);
}

async function deleteUserRecording(sura, aya) {
  await ensureRecordingStorageInitialized();
  const native = await getNativeRecordingStorage();
  if (native) await native.remove(sura, aya);
  if (recordingStorageMode === 'folder-needs-permission') {
    throw new Error('Reconnect your recordings folder in Settings before deleting a recording.');
  }
  if (recordingStorageMode === 'folder') await removeFolderRecording(sura, aya);
  await deleteBrowserRecording(sura, aya);
}

async function getRecordingArchiveModule() {
  return import(APP_SCRIPT_URL
    ? new URL('./recording-archive.mjs', APP_SCRIPT_URL).href
    : './static/js/recording-archive.mjs');
}

function recordingArchivePath(sura, aya, mimeType) {
  const ext = recordingExtension(mimeType);
  return 'recordings/' + recordingSuraFolderName(sura) + '/ayah-' + pad3(aya) + '.' + ext;
}

async function collectFolderRecordingsForArchive() {
  if (recordingStorageMode !== 'folder') return [];
  const dirs = await getConnectedRecordingDirectories(false);
  const records = [];
  const seen = new Set();
  const folderPattern = /^surah-(\d{3})-/i;
  const filePattern = /^ayah-(\d{3})\.(webm|m4a|mp4|ogg|wav|aac)$/i;

  // Discover files directly so an interrupted manifest update cannot hide audio.
  for await (const [folderName, folderHandle] of dirs.recordingsDirectory.entries()) {
    if (folderHandle.kind !== 'directory') continue;
    const folderMatch = folderName.match(folderPattern);
    if (!folderMatch) continue;
    const sura = Number(folderMatch[1]);
    if (!Number.isInteger(sura) || sura < 1 || sura > 114) continue;
    for await (const [fileName, fileHandle] of folderHandle.entries()) {
      if (fileHandle.kind !== 'file') continue;
      const fileMatch = fileName.match(filePattern);
      if (!fileMatch) continue;
      const aya = Number(fileMatch[1]);
      const key = sura + ':' + aya;
      if (seen.has(key)) continue;
      const file = await fileHandle.getFile();
      records.push({
        key, sura, aya, blob: file,
        mimeType: file.type || recordingMimeForExtension(fileMatch[2].toLowerCase()),
        fileName, updatedAt: file.lastModified, storage: 'folder'
      });
      seen.add(key);
    }
  }
  return records;
}

async function collectRecordingsForArchive() {
  await ensureRecordingStorageInitialized();
  if (recordingStorageMode === 'folder-needs-permission') {
    throw new Error('Reconnect the recordings folder in Settings before exporting.');
  }
  const records = [];
  const seen = new Set();
  const native = await getNativeRecordingStorage();
  if (native && typeof native.list === 'function') {
    const nativeRecords = await native.list();
    for (const record of nativeRecords) {
      if (!record || !record.blob) continue;
      const key = record.key || (record.sura + ':' + record.aya);
      if (seen.has(key)) continue;
      records.push(record);
      seen.add(key);
    }
  }
  if (recordingStorageMode === 'folder') {
    const folderRecords = await collectFolderRecordingsForArchive();
    for (const record of folderRecords) {
      const key = record.key || (record.sura + ':' + record.aya);
      if (seen.has(key)) continue;
      records.push(record);
      seen.add(key);
    }
  }
  // Include browser-local recordings that could not yet be migrated.
  if (!native) {
    const localRecords = await getAllBrowserRecordings();
    for (const record of localRecords) {
      if (!record || !record.blob) continue;
      const key = record.key || (record.sura + ':' + record.aya);
      if (seen.has(key)) continue;
      records.push(record);
      seen.add(key);
    }
  }
  return records.filter(record => record && record.blob && Number.isInteger(Number(record.sura)) && Number.isInteger(Number(record.aya)));
}

async function exportRecordingsArchive() {
  try {
    const records = await collectRecordingsForArchive();
    if (!records.length) {
      toast('There are no saved recordings to export yet.');
      return;
    }
    const { createZip } = await getRecordingArchiveModule();
    const manifest = {
      schemaVersion: 1,
      app: 'QuranMemorizer',
      exportedAt: new Date().toISOString(),
      recordings: []
    };
    const entries = [];
    for (const record of records) {
      const sura = Number(record.sura);
      const aya = Number(record.aya);
      const mimeType = record.mimeType || record.blob.type || 'audio/webm';
      const name = recordingArchivePath(sura, aya, mimeType);
      entries.push({ name, data: record.blob });
      manifest.recordings.push({
        key: sura + ':' + aya, sura, aya, fileName: name.split('/').pop(),
        folder: recordingSuraFolderName(sura), mimeType, size: record.blob.size,
        updatedAt: record.updatedAt || Date.now()
      });
    }
    entries.push({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) });
    const zip = await createZip(entries);
    const url = URL.createObjectURL(zip);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'QuranMemorizer-recordings-' + new Date().toISOString().slice(0, 10) + '.zip';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('Exported ' + records.length + ' recording(s) as a ZIP archive.');
  } catch (error) {
    toast('Could not export recordings: ' + (error.message || 'unknown error'));
  }
}

async function importRecordingsArchive(file) {
  if (!file) return;
  try {
    await ensureRecordingStorageInitialized();
    if (recordingStorageMode === 'folder-needs-permission') {
      throw new Error('Reconnect the recordings folder in Settings before importing.');
    }
    if (recordingStorageMode === 'needs-folder-choice') {
      throw new Error('Choose a recordings folder or explicitly select browser-local storage in Settings first.');
    }
    const { readZip } = await getRecordingArchiveModule();
    const entries = await readZip(file);
    const audioPath = /(?:^|\/)(?:QuranMemorizer\/)?recordings\/(surah-(\d{3})-[^/]+)\/(ayah-(\d{3}))\.(webm|m4a|mp4|ogg|wav|aac)$/i;
    const byKey = new Map();
    let ignored = 0;
    for (const entry of entries) {
      const entryName = String(entry.name || '').replace(/\\/g, '/');
      if (/(?:^|\/)manifest\.json$/i.test(entryName)) continue;
      const match = entryName.match(audioPath);
      if (!match) { ignored++; continue; }
      const sura = Number(match[2]);
      const aya = Number(match[4]);
      const extension = match[5].toLowerCase();
      const suraData = SURA_BY_NUM[sura];
      if (!suraData || !Array.isArray(suraData.ayas) || aya < 1 || aya > suraData.ayas.length) {
        ignored++;
        continue;
      }
      byKey.set(sura + ':' + aya, {
        sura,
        aya,
        blob: new Blob([entry.blob], { type: recordingMimeForExtension(extension) })
      });
    }
    const recordings = Array.from(byKey.values());
    if (!recordings.length) {
      toast('No valid QuranMemorizer ayah recordings were found in this ZIP archive.');
      return;
    }

    let duplicateCount = 0;
    for (const recording of recordings) {
      try {
        if (await getUserRecording(recording.sura, recording.aya)) duplicateCount++;
      } catch (_) { /* A missing or inaccessible record is not counted as a conflict. */ }
    }
    if (duplicateCount && !window.confirm('This archive contains ' + recordings.length +
      ' recording(s), including ' + duplicateCount + ' ayah(s) that already have recordings. Replace matching recordings?')) return;

    let imported = 0;
    let browserFallback = 0;
    let failed = 0;
    for (const recording of recordings) {
      try {
        await saveUserRecording(recording.sura, recording.aya, recording.blob);
        imported++;
      } catch (storageError) {
        try {
          await saveBrowserRecording(recording.sura, recording.aya, recording.blob);
          imported++;
          browserFallback++;
        } catch (_) {
          failed++;
        }
      }
    }
    refreshRecordingControls(state.sura);
    let message = 'Imported ' + imported + ' recording(s).';
    if (browserFallback) message += ' ' + browserFallback + ' were saved in this browser because the selected folder was unavailable.';
    if (failed) message += ' ' + failed + ' could not be saved.';
    if (ignored) message += ' Skipped ' + ignored + ' unrelated or invalid file(s).';
    toast(message);
  } catch (error) {
    toast('Could not import recordings: ' + (error.message || 'unknown error'));
  } finally {
    if (el.recordingArchiveInput) el.recordingArchiveInput.value = '';
  }
}

function refreshRecordingControls(sura) {
  const cards = el.reader.querySelectorAll('.aya[data-aya]');
  cards.forEach(card => {
    const aya = Number(card.dataset.aya);
    const playButton = card.querySelector('[data-play-recording]');
    const deleteButton = card.querySelector('[data-delete-recording]');
    const recordButton = card.querySelector('[data-record-aya]');
    if (!playButton || !deleteButton || !recordButton) return;
    getUserRecording(sura, aya).then(record => {
      playButton.hidden = !record;
      deleteButton.hidden = !record;
      recordButton.textContent = record ? 'Re-record my voice' : 'Record my voice';
    }).catch(() => {
      const status = card.querySelector('[data-record-status]');
      if (status) status.textContent = 'Local recording storage unavailable';
    });
  });
}


function setRecordingPlaybackLock(locked) {
  [el.btnPlay, el.btnPrev, el.btnNext].forEach(button => {
    if (!button) return;
    button.disabled = locked;
    button.setAttribute('aria-disabled', String(locked));
  });
  el.reader.querySelectorAll('[data-play-recording]').forEach(button => {
    button.disabled = locked;
    button.setAttribute('aria-disabled', String(locked));
  });
}

function stopRecordingWaveform() {
  if (recordingWaveFrame !== null) cancelAnimationFrame(recordingWaveFrame);
  recordingWaveFrame = null;
  recordingAnalyser = null;
  const context = recordingAudioContext;
  recordingAudioContext = null;
  if (context && context.state !== 'closed') context.close().catch(() => {});
  document.querySelectorAll('.recording-waveform').forEach(wave => {
    wave.hidden = true;
    wave.classList.remove('is-live');
  });
}

function startRecordingWaveform(stream, sura, aya) {
  const wave = document.querySelector('[data-record-waveform="' + aya + '"]');
  if (!wave || state.sura !== sura) return;
  wave.hidden = false;
  wave.classList.add('is-live');
  const bars = Array.from(wave.children);
  let analyser = null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    recordingAudioContext = new AudioContextClass();
    analyser = recordingAudioContext.createAnalyser();
    analyser.fftSize = 64;
    recordingAudioContext.createMediaStreamSource(stream).connect(analyser);
    recordingAnalyser = analyser;
  } catch (error) {
    // The CSS fallback still provides a gentle recording cue if analysis is unavailable.
    return;
  }
  const samples = new Uint8Array(analyser.frequencyBinCount);
  const draw = () => {
    if (!activeRecorder || !recordingAnalyser || state.sura !== sura) return;
    recordingAnalyser.getByteTimeDomainData(samples);
    const middle = samples.length / 2;
    bars.forEach((bar, index) => {
      const sample = samples[Math.min(samples.length - 1, Math.floor(index / bars.length * samples.length))];
      const level = Math.abs(sample - 128) / 128;
      const envelope = 0.18 + Math.min(1, level * 2.8) * (0.25 + 0.75 * Math.sin((index / bars.length) * Math.PI));
      bar.style.transform = 'scaleY(' + Math.max(0.12, envelope) + ')';
    });
    recordingWaveFrame = requestAnimationFrame(draw);
  };
  recordingWaveFrame = requestAnimationFrame(draw);
}

async function startUserRecording(sura, aya, button) {
  try {
    await ensureRecordingStorageInitialized();
    if (recordingStorageMode === 'folder-needs-permission') {
      openSettings();
      toast('Reconnect the recordings folder in Settings before recording.');
      return;
    }
    if (recordingStorageMode === 'needs-folder-choice') {
      openSettings();
      toast('Choose a recordings folder or explicitly select browser-local storage in Settings first.');
      return;
    }
  } catch (storageError) {
    toast('Recording storage is unavailable: ' + (storageError.message || 'unknown error'));
    return;
  }
  // Recording is its own interaction: cancel pending reciter loads and stop audio first.
  ++playbackRequestId;
  playbackMode = 'idle';
  state.started = false;
  state.aya = aya;
  updateAyaUI(false);
  audio.pause();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    toast('Voice recording is not supported by this browser or WebView.');
    return;
  }
  if (activeRecorder) {
    toast('Finish the current recording before starting another.');
    return;
  }
  let stream = null;
  try {
    // Keep the initial request deliberately simple for Android WebView compatibility.
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = {};
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus';
    }
    let recorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (preferredRecorderError) {
      // Some WebViews advertise a MIME type but cannot instantiate it. Retry the
      // platform default before treating recording as unavailable.
      if (!options.mimeType) throw preferredRecorderError;
      recorder = new MediaRecorder(stream);
    }
    activeRecorder = recorder;
    activeRecordingKey = { sura, aya };
    activeRecordingChunks = [];
    recorder.ondataavailable = event => {
      if (event.data && event.data.size) activeRecordingChunks.push(event.data);
    };
    recorder.onerror = () => {
      stream.getTracks().forEach(track => track.stop());
      activeRecorder = null;
      activeRecordingKey = null;
      button.textContent = 'Record my voice';
      const recordingCard = button.closest('.aya-recording');
      if (recordingCard) recordingCard.classList.remove('is-recording');
      setRecordingPlaybackLock(false);
      stopRecordingWaveform();
      const status = button.parentElement && button.parentElement.querySelector('[data-record-status]');
      if (status) status.textContent = 'Recording failed. Please try again.';
      toast('Recording failed. Please try again.');
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      const key = activeRecordingKey;
      const blob = new Blob(activeRecordingChunks, { type: recorder.mimeType || 'audio/webm' });
      activeRecorder = null;
      activeRecordingKey = null;
      activeRecordingChunks = [];
      button.textContent = 'Record my voice';
      const recordingCard = button.closest('.aya-recording');
      if (recordingCard) recordingCard.classList.remove('is-recording');
      setRecordingPlaybackLock(false);
      stopRecordingWaveform();
      const status = button.parentElement && button.parentElement.querySelector('[data-record-status]');
      if (status) status.textContent = '';
      if (!key || !blob.size) return;
      let savedRecord;
      try {
        savedRecord = await saveUserRecording(key.sura, key.aya, blob);
      } catch (error) {
        // Preserve the take in browser-local storage if a removable folder or native
        // filesystem unexpectedly becomes unavailable at the moment recording stops.
        try {
          savedRecord = await saveBrowserRecording(key.sura, key.aya, blob);
          toast('The selected storage was unavailable. Your take was kept in this browser instead.');
        } catch (fallbackError) {
          toast('Could not save recording: ' + (error.message || fallbackError.message));
          return;
        }
      }
      refreshRecordingControls(key.sura);
      if (state.sura === key.sura && state.aya === key.aya) {
        toast((savedRecord.storage === 'folder' ? 'Audio file saved. ' : savedRecord.storage === 'native' ? 'Saved in app-private storage. ' : 'Saved in this browser. ') + 'Playing it back now.');
        await playUserRecording(key.sura, key.aya);
      } else {
        toast(savedRecord.storage === 'folder' ? 'Audio file saved.' : savedRecord.storage === 'native' ? 'Saved in app-private storage.' : 'Saved in this browser.');
      }
    };
    recorder.start();
    button.textContent = 'Stop recording';
    setRecordingPlaybackLock(true);
    startRecordingWaveform(stream, sura, aya);
    const recordingCard = button.closest('.aya-recording');
    if (recordingCard) recordingCard.classList.add('is-recording');
    const status = button.parentElement.querySelector('[data-record-status]');
    if (status) status.textContent = ''; // The recording dot and live waveform provide the active-state cue.
  } catch (error) {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setRecordingPlaybackLock(false);
    stopRecordingWaveform();
    const status = button.parentElement && button.parentElement.querySelector('[data-record-status]');
    const errorName = error && error.name ? error.name : 'UnknownError';
    const errorMessage = error && error.message ? error.message : 'No error message supplied';
    const constraint = error && error.constraint ? error.constraint : '';
    // Keep the browser's original exception visible. The previous friendly message
    // hid the distinction between a WebView permission failure and an OS audio-input failure.
    console.error('[QuranMemorizer] Microphone initialization failed', {
      name: errorName,
      message: errorMessage,
      constraint,
      secureContext: window.isSecureContext,
      mediaDevicesAvailable: !!navigator.mediaDevices,
      getUserMediaAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      mediaRecorderAvailable: typeof window.MediaRecorder !== 'undefined',
      nativePlatform: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
      userAgent: navigator.userAgent
    });
    let guidance;
    if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
      guidance = 'Microphone access was denied. Check Android microphone permission and the app’s microphone privacy toggle.';
    } else if (errorName === 'NotReadableError' || /could not start audio source/i.test(errorMessage)) {
      guidance = 'Android could not initialize microphone input. Check whether another app is using the microphone, then retry.';
    } else if (errorName === 'OverconstrainedError') {
      guidance = 'The device rejected the requested microphone constraints.';
    } else {
      guidance = 'Could not start recording.';
    }
    const details = errorName + ': ' + errorMessage + (constraint ? ' (constraint: ' + constraint + ')' : '');
    const message = guidance + ' Details: ' + details;
    if (status) status.textContent = message;
    toast(message);
  }
}

async function playUserRecording(sura, aya) {
  try {
    const record = await getUserRecording(sura, aya);
    if (!record || !record.blob) {
      toast('No saved voice recording for this aya yet.');
      return;
    }
    ++playbackRequestId;
    playbackMode = 'preview';
    audio.pause();
    if (activeRecordingObjectUrl) URL.revokeObjectURL(activeRecordingObjectUrl);
    activeRecordingObjectUrl = URL.createObjectURL(record.blob);
    state.aya = aya;
    state.playingAya = aya;
    state.started = true;
    updateAyaUI(false);
    audio.src = activeRecordingObjectUrl;
    await audio.play();
  } catch (error) {
    toast('Could not play your recording: ' + (error.message || 'unknown error'));
  }
}

function hasOpening(sura) { return sura !== 1 && sura !== 9; }

function loadSura(num, opts) {
  opts = opts || {};
  const s = SURA_BY_NUM[num];
  if (!s) return;

  // If the user navigates away mid-recording, stop and save the current take.
  if (activeRecorder && activeRecordingKey && activeRecordingKey.sura !== num) {
    activeRecorder.stop();
    toast('Recording stopped and will be saved before changing surah.');
  }

  const aya = Math.max(1, Math.min(opts.aya || 1, s.ayas.length));
  const suraChanged = state.sura !== num;

  state.sura = num;
  state.aya = aya;

  if (suraChanged || !el.reader.querySelector('.aya[data-aya]')) {
    renderSura();
    syncRangeInputs();
    resetCounters();
  }
  renderAyaList(num);
  updateAyaUI(true);

  if (isMobile()) setDrawerTab('aya');

  if (opts.syncUrl !== false) syncCurrentAyahUrl();
  if (opts.play) {
    goToAya(state.aya, { play: true, opening: opts.opening !== false && state.aya === 1, syncUrl: opts.syncUrl });
  }
}

function goToAya(aya, opts) {
  opts = opts || {};
  const s = SURA_BY_NUM[state.sura];
  if (!s) return;

  const n = Math.max(1, Math.min(aya, s.ayas.length));
  state.aya = n;
  state.ayaInner = 0;
  updateAyaUI(true);
  if (opts.syncUrl !== false) syncCurrentAyahUrl();

  if (opts.play) {
    if (opts.opening && n === 1 && state.playBismillah && hasOpening(state.sura)) {
      playTrack(state.sura, 0);
    } else {
      playTrack(state.sura, n);
    }
  }
}

async function playTrack(sura, aya) {
  if (activeRecitationObjectUrl) { URL.revokeObjectURL(activeRecitationObjectUrl); activeRecitationObjectUrl = null; }
  const requestId = ++playbackRequestId;
  playbackMode = 'sequence';
  setNativePlaybackActive(true);
  state.playingAya = aya;
  state.started = true;
  updateNativeMediaMetadata(true);
  if (aya > 0) {
    try {
      const custom = await getUserRecording(sura, aya);
      if (requestId !== playbackRequestId) return;
      if (custom && custom.blob) {
        if (activeRecordingObjectUrl) URL.revokeObjectURL(activeRecordingObjectUrl);
        activeRecordingObjectUrl = URL.createObjectURL(custom.blob);
        audio.src = activeRecordingObjectUrl;
        try {
          await audio.play();
          return;
        } catch (playError) {
          if (requestId !== playbackRequestId) return;
          // Unsupported recording codecs should not prevent default recitation playback.
        }
      }
    } catch (error) {
      // Fall back to the selected reciter if local storage is unavailable.
    }
  }
  if (requestId !== playbackRequestId) return;
  if (aya > 0) {
    try {
      const cached = await getCachedRecitation(sura, aya);
      if (requestId !== playbackRequestId) return;
      if (cached && cached.blob instanceof Blob && cached.blob.size > 0) {
        if (activeRecitationObjectUrl) URL.revokeObjectURL(activeRecitationObjectUrl);
        activeRecitationObjectUrl = URL.createObjectURL(cached.blob);
        audio.src = activeRecitationObjectUrl;
        try { await audio.play(); return; }
        catch (cachedPlayError) {
          if (requestId !== playbackRequestId) return;
          URL.revokeObjectURL(activeRecitationObjectUrl);
          activeRecitationObjectUrl = null;
        }
      }
    } catch (cacheError) { console.warn('Could not read offline recitation; streaming instead.', cacheError); }
  }
  if (requestId !== playbackRequestId) return;
  audio.src = trackUrl(sura, aya);
  audio.play().catch(err => {
    if (err && err.name === 'NotAllowedError') {
      toast('Browser blocked autoplay — press ▶ to start.');
    }
  });
}

function replayCurrent() {
  try { audio.currentTime = 0; } catch (e) {}
  audio.play().catch(() => {});
}

function stopAll() {
  ++playbackRequestId;
  playbackMode = 'idle';
  state.started = false;
  setNativePlaybackActive(false);
  stopNativeMediaSession();
  audio.pause();
  try { audio.currentTime = 0; } catch (e) {}
  if (activeRecitationObjectUrl) { URL.revokeObjectURL(activeRecitationObjectUrl); activeRecitationObjectUrl = null; }
  resetCounters();
  updateStatus();
}

function startPlayback() {
  configDirty = false;
  if (state.repeatMode === 'range') {
    const s = SURA_BY_NUM[state.sura];
    const total = s ? s.ayas.length : 1;
    state.rangeFrom = clampInt(state.rangeFrom, 1, total);
    state.rangeTo   = clampInt(state.rangeTo, 1, total);
    if (state.rangeFrom > state.rangeTo) {
      toast('Range “From” must be less than or equal to “To”.');
      return;
    }
    syncRangeInputs();
    state.aya = state.rangeFrom;
    updateAyaUI(true);
  }
  resetCounters();
  goToAya(state.aya, { play: true, opening: state.aya === 1 });
}

function handleEnded() {
  const s = SURA_BY_NUM[state.sura];
  if (!s) return;
  const total = s.ayas.length;

  if (state.repeatMode === 'single') {
    state.singleCounter++;
    if (state.singleCount === 0 || state.singleCounter < state.singleCount) {
      updateStatus();
      replayCurrent();
      return;
    }
    state.singleCounter = 0;
    updateStatus();
    if (state.aya < total) goToAya(state.aya + 1, { play: true });
    else stopAll();
    return;
  }

  if (state.repeatMode === 'range') {
    if (state.repeatEach) {
      state.ayaInner++;
      if (state.ayaInner < state.repeatEachCount) {
        updateStatus();
        replayCurrent();
        return;
      }
    }
    if (state.aya < state.rangeTo) {
      goToAya(state.aya + 1, { play: true });
      return;
    }
    state.rangeLoops++;
    if (state.rangeCount === 0 || state.rangeLoops < state.rangeCount) {
      updateStatus();
      goToAya(state.rangeFrom, { play: true });
      return;
    }
    state.rangeLoops = 0;
    updateStatus();
    stopAll();
    toast('Range finished — ' + state.rangeCount + ' loop(s) done.');
    return;
  }

  if (state.aya < total) goToAya(state.aya + 1, { play: true });
  else stopAll();
}

/* ==================================================================
   15. AUDIO EVENTS
   ================================================================== */
audio.addEventListener('ended', () => {
  // A personal recording is a one-shot preview, never part of continuous playback.
  if (playbackMode === 'preview') {
    playbackMode = 'idle';
    state.started = false;
    setNativePlaybackActive(false);
    setPlayIcon(false);
    return;
  }
  if (playbackMode !== 'sequence') return;
  if (state.playingAya === 0) {
    goToAya(1, { play: true, opening: false });
    return;
  }
  handleEnded();
});

audio.addEventListener('play', () => {
  setPlayIcon(true);
  if (playbackMode === 'sequence') updateNativeMediaMetadata(true);
});
audio.addEventListener('pause', () => {
  setPlayIcon(false);
  if (playbackMode === 'sequence') updateNativeMediaMetadata(false);
});

function setPlayIcon(playing) {
  el.iconPlay.innerHTML = playing
    ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
    : '<path d="M8 5v14l11-7z"/>';
}

audio.addEventListener('timeupdate', () => {
  const d = audio.duration || 0;
  const c = audio.currentTime || 0;
  el.progressFill.style.width = d ? (c / d * 100) + '%' : '0%';
  el.curTime.textContent = fmtTime(c);
  el.durTime.textContent = fmtTime(d);
});

audio.addEventListener('loadedmetadata', () => {
  el.durTime.textContent = fmtTime(audio.duration);
});

audio.addEventListener('error', () => {
  if (activeRecitationObjectUrl && audio.src === activeRecitationObjectUrl) {
    URL.revokeObjectURL(activeRecitationObjectUrl);
    activeRecitationObjectUrl = null;
    toast('Downloaded audio could not be played. Trying the online copy.');
    audio.src = trackUrl(state.sura, state.playingAya);
    audio.play().catch(() => stopAll());
    return;
  }
  if (state.playingAya === 0) {
    goToAya(1, { play: true, opening: false });
    return;
  }
  if (activeRecordingObjectUrl && audio.src === activeRecordingObjectUrl) {
    URL.revokeObjectURL(activeRecordingObjectUrl);
    activeRecordingObjectUrl = null;
    toast('Your recording could not be played. Trying Minshawi instead.');
    audio.src = trackUrl(state.sura, state.playingAya);
    audio.play().catch(() => stopAll());
    return;
  }
  const src = audio.src || '';
  toast('Audio file not found: ' + src.split('/').pop());
  stopAll();
});

/* ==================================================================
   16. INPUT HELPERS
   ================================================================== */
function wireNumberInput(inputEl, key, min, max, onUpdate) {
  const commit = () => {
    const prev = state[key];
    const n = parseInt(inputEl.value, 10);
    state[key] = isNaN(n) ? prev : clampInt(n, min, max);
    inputEl.value = state[key];
    configDirty = true;
    resetCounters();
    if (onUpdate) onUpdate();
    updateStatus();
  };
  inputEl.addEventListener('change', commit);
  inputEl.addEventListener('blur',   commit);
  inputEl.addEventListener('input', () => {
    const n = parseInt(inputEl.value, 10);
    if (!isNaN(n)) {
      state[key] = Math.max(min, Math.min(max, n));
      configDirty = true;
      resetCounters();
      if (onUpdate) onUpdate();
      updateStatus();
    }
  });
}

/* ==================================================================
   17. DRAWER / SETTINGS
   ================================================================== */
function openDrawer() {
  el.sidebar.classList.add('open');
  el.drawerBackdrop.classList.add('show');
  document.body.style.overflow = 'hidden';

  if (el.sidebarBody.dataset.tab === 'aya') {
    setTimeout(() => {
      const active = el.ayaList.querySelector('.aya-btn.active');
      if (active) active.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, 320);
  }
}
function closeDrawer() {
  el.sidebar.classList.remove('open');
  el.drawerBackdrop.classList.remove('show');
  document.body.style.overflow = '';
}
function setDrawerTab(name) {
  el.sidebarBody.dataset.tab = name;
  el.drawerTabs.querySelectorAll('.drawer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
}
function openSettings() {
  el.settingsSheet.classList.add('open');
  el.settingsBackdrop.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSettings() {
  el.settingsSheet.classList.remove('open');
  el.settingsBackdrop.classList.remove('show');
  document.body.style.overflow = '';
}

/* ==================================================================
   18. REPEAT BLOCK EVENTS (wired once, elements never replaced)
   ================================================================== */
function bindRepeatEvents() {
  const r = repeatEls;

  r.repeatMode.addEventListener('change', () => {
    state.repeatMode = r.repeatMode.value;
    configDirty = true;
    resetCounters();

    if (state.repeatMode === 'range') {
      const s = SURA_BY_NUM[state.sura];
      const total = s ? s.ayas.length : 1;
      if (state.aya < state.rangeFrom || state.aya > state.rangeTo) {
        state.rangeFrom = state.aya;
        state.rangeTo = Math.min(state.aya, total);
      }
      syncRangeInputs();
    }
    updateOpts();
    updateStatus();
  });

  wireNumberInput(r.singleCount, 'singleCount', 0, 9999);

  wireNumberInput(r.rangeFrom, 'rangeFrom', 1, 9999, () => {
    const total = (SURA_BY_NUM[state.sura] || { ayas: [] }).ayas.length || 1;
    state.rangeFrom = clampInt(state.rangeFrom, 1, total);
    syncRangeInputs();
  });

  wireNumberInput(r.rangeTo, 'rangeTo', 1, 9999, () => {
    const total = (SURA_BY_NUM[state.sura] || { ayas: [] }).ayas.length || 1;
    state.rangeTo = clampInt(state.rangeTo, 1, total);
    syncRangeInputs();
  });

  wireNumberInput(r.rangeCount, 'rangeCount', 0, 9999);
  wireNumberInput(r.repeatEachCount, 'repeatEachCount', 1, 9999);

  r.repeatEachAyah.addEventListener('change', () => {
    state.repeatEach = r.repeatEachAyah.checked;
    configDirty = true;
    resetCounters();
    updateOpts();
    updateStatus();
  });
}

/* ==================================================================
   19. EVENTS
   ================================================================== */
function bindEvents() {

  /* --- homepage Surah picker --- */
  if (el.homeSuraList) {
    el.homeSuraList.addEventListener('click', e => {
      const item = e.target.closest('.home-sura-item');
      if (!item) return;
      const num = Number(item.dataset.sura);
      if (!SURA_BY_NUM[num]) return;
      document.body.classList.add('reader-active');
      document.getElementById('homePage').setAttribute('aria-hidden', 'true');
      loadSura(num, { aya: 1, play: false });
    });
  }
  if (el.homeSuraSearch) {
    el.homeSuraSearch.addEventListener('input', () => {
      const q = el.homeSuraSearch.value.trim().toLowerCase();
      let visible = 0;
      el.homeSuraList.querySelectorAll('.home-sura-item').forEach(item => {
        const hit = !q || item.dataset.search.includes(q);
        item.hidden = !hit;
        if (hit) visible++;
      });
      if (el.homeSuraEmpty) el.homeSuraEmpty.hidden = visible !== 0;
    });
  }

  /* --- sura column --- */
  el.suraList.addEventListener('click', e => {
    const item = e.target.closest('.sura-item');
    if (!item) return;
    loadSura(+item.dataset.sura, { aya: 1, play: true, opening: true });
    if (isMobile()) setTimeout(closeDrawer, 140);
  });

  /* --- aya column --- */
  el.ayaList.addEventListener('click', e => {
    const btn = e.target.closest('.aya-btn');
    if (!btn) return;
    const n = +btn.dataset.aya;
    goToAya(n, { play: true, opening: n === 1 });
    if (isMobile()) setTimeout(closeDrawer, 140);
  });

  /* --- sura search --- */
  el.suraSearch.addEventListener('input', () => {
    const q = el.suraSearch.value.trim().toLowerCase();
    el.suraList.querySelectorAll('.sura-item').forEach(item => {
      const hit = !q || item.dataset.search.indexOf(q) !== -1;
      item.style.display = hit ? '' : 'none';
    });
  });

  /* --- reader click --- */
  el.reader.addEventListener('click', e => {
    const downloadButton = e.target.closest('[data-download-sura]');
    if (downloadButton) {
      e.preventDefault();
      e.stopPropagation();
      downloadSurahAudio(Number(downloadButton.dataset.downloadSura), downloadButton);
      return;
    }
    const recordButton = e.target.closest('[data-record-aya]');
    const playRecordingButton = e.target.closest('[data-play-recording]');
    const deleteRecordingButton = e.target.closest('[data-delete-recording]');
    if (recordButton || playRecordingButton || deleteRecordingButton) {
      e.preventDefault();
      e.stopPropagation();
      const aya = Number((recordButton || playRecordingButton || deleteRecordingButton).dataset[
        recordButton ? 'recordAya' : playRecordingButton ? 'playRecording' : 'deleteRecording'
      ]);
      if (recordButton) {
        if (activeRecorder && activeRecordingKey && activeRecordingKey.sura === state.sura && activeRecordingKey.aya === aya) {
          activeRecorder.stop();
          recordButton.textContent = 'Saving…';
        } else {
          startUserRecording(state.sura, aya, recordButton);
        }
      } else if (playRecordingButton) {
        playUserRecording(state.sura, aya);
      } else {
        deleteUserRecording(state.sura, aya).then(() => {
          refreshRecordingControls(state.sura);
          toast('Saved recording deleted.');
        }).catch(error => toast('Could not delete recording: ' + error.message));
      }
      return;
    }
    const card = e.target.closest('.aya');
    if (!card) return;
    if (e.target.closest('.aya-recording')) return;
    const sel = window.getSelection && String(window.getSelection());
    if (sel && sel.length > 0) return;
    const n = +card.dataset.aya;
    goToAya(n, { play: true, opening: n === 1 });
  });

  /* --- transport --- */
  el.btnPlay.addEventListener('click', () => {
    if (activeRecorder) return;
    if (!audio.paused) {
      audio.pause();
      setNativePlaybackActive(false);
      return;
    }
    if (configDirty || !state.started || !audio.src) startPlayback();
    else {
      setNativePlaybackActive(playbackMode === 'sequence');
      audio.play().catch(() => setNativePlaybackActive(false));
    }
  });

  el.btnNext.addEventListener('click', () => {
    const s = SURA_BY_NUM[state.sura];
    if (!s) return;
    if (state.aya < s.ayas.length) goToAya(state.aya + 1, { play: true });
    else stopAll();
  });

  el.btnPrev.addEventListener('click', () => {
    if (audio.currentTime > 3 && state.playingAya !== null) { replayCurrent(); return; }
    if (state.aya > 1) goToAya(state.aya - 1, { play: true });
    else replayCurrent();
  });

  el.btnStop.addEventListener('click', stopAll);

  /* --- mobile repeat icon button : opens settings sheet --- */
  el.btnRepeatSettings.addEventListener('click', () => {
    openSettings();
    // give the sheet a moment to open, then scroll the repeat section into view
    setTimeout(() => {
      const section = el.settingsSheet.querySelector('.repeat-section');
      if (section) section.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 320);
  });

  /* --- progress seek --- */
  el.progress.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = el.progress.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  });

  /* --- display toggles --- */
  el.toggleTranslit.addEventListener('change', () => {
    state.showTranslit = el.toggleTranslit.checked;
    applyDisplayClasses();
    saveDisplayPrefs();
  });
  el.toggleEnglish.addEventListener('change', () => {
    state.showEnglish = el.toggleEnglish.checked;
    applyDisplayClasses();
    saveDisplayPrefs();
  });
  el.toggleUrdu.addEventListener('change', () => {
    state.showUrdu = el.toggleUrdu.checked;
    applyDisplayClasses();
    saveDisplayPrefs();
  });
  el.togglePersian.addEventListener('change', () => {
    state.showPersian = el.togglePersian.checked;
    applyDisplayClasses();
    saveDisplayPrefs();
  });
  el.mobileToggleBismillah.addEventListener('change', () => {
    state.playBismillah = el.mobileToggleBismillah.checked;
    saveDisplayPrefs();
  });

  /* --- reciter selects --- */
  el.reciterSelect.addEventListener('change', () => setReciter(el.reciterSelect.value));
  el.mobileReciterSelect.addEventListener('change', () => setReciter(el.mobileReciterSelect.value));

  /* --- drawer --- */
  el.btnOpenDrawer.addEventListener('click', openDrawer);
  el.btnCloseDrawer.addEventListener('click', closeDrawer);
  el.drawerBackdrop.addEventListener('click', closeDrawer);
  el.drawerTabs.addEventListener('click', e => {
    const t = e.target.closest('.drawer-tab');
    if (!t) return;
    setDrawerTab(t.dataset.tab);
  });

  /* --- settings sheet --- */
  el.btnOpenSettings.addEventListener('click', openSettings);
  el.btnOpenSettingsDesktop.addEventListener('click', openSettings);
  el.settingsBackdrop.addEventListener('click', closeSettings);
  el.sheetDone.addEventListener('click', closeSettings);
  if (el.btnConnectRecordingFolder) el.btnConnectRecordingFolder.addEventListener('click', connectRecordingFolder);
  if (el.btnUseBrowserStorage) el.btnUseBrowserStorage.addEventListener('click', useBrowserRecordingStorage);
  if (el.btnExportRecordings) el.btnExportRecordings.addEventListener('click', exportRecordingsArchive);
  if (el.btnImportRecordings && el.recordingArchiveInput) {
    el.btnImportRecordings.addEventListener('click', () => el.recordingArchiveInput.click());
    el.recordingArchiveInput.addEventListener('change', () => importRecordingsArchive(el.recordingArchiveInput.files && el.recordingArchiveInput.files[0]));
  }

  /* --- edge swipe to open drawer --- */
  let swipeTracking = false;
  let sx = 0, sy = 0, st = 0;

  document.addEventListener('touchstart', e => {
    if (!isMobile()) { swipeTracking = false; return; }
    if (e.touches.length !== 1) { swipeTracking = false; return; }
    const t = e.touches[0];
    if (t.clientX <= 16 &&
        !el.sidebar.classList.contains('open') &&
        !el.settingsSheet.classList.contains('open')) {
      swipeTracking = true;
      sx = t.clientX; sy = t.clientY; st = Date.now();
    } else {
      swipeTracking = false;
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!swipeTracking) return;
    swipeTracking = false;
    if (!isMobile()) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const dt = Date.now() - st;

    if (dx >= 80 && dt <= 350 && Math.abs(dy) <= 25 && dx > 0) {
      openDrawer();
    }
  }, { passive: true });

  /* --- keyboard --- */
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

    if (e.code === 'Escape') {
      if (el.sidebar.classList.contains('open')) { closeDrawer(); return; }
      if (el.settingsSheet.classList.contains('open')) { closeSettings(); return; }
    }
    if (e.code === 'Space')           { e.preventDefault(); el.btnPlay.click(); }
    else if (e.code === 'ArrowRight')  { e.preventDefault(); el.btnNext.click(); }
    else if (e.code === 'ArrowLeft')   { e.preventDefault(); el.btnPrev.click(); }
  });

  /* --- viewport sync --- */
  const syncViewport = () => {
    el.btnCloseDrawer.style.display = isMobile() ? 'flex' : 'none';
    positionRepeatBlock();
    if (!isMobile()) closeDrawer();
  };
  syncViewport();
  window.addEventListener('resize', syncViewport);
  window.addEventListener('orientationchange', () => setTimeout(syncViewport, 120));
}

function setReciter(id) {
  state.reciter = id;
  configDirty = true;
  syncReciterUI();
  if (state.playingAya !== null && state.started) {
    const wasPlaying = !audio.paused;
    const aya = state.playingAya;
    playTrack(state.sura, aya);
    if (!wasPlaying) audio.pause();
  }
  toast('Reciter: ' + currentReciter().name);
}

/* ==================================================================
   20. TOAST
   ================================================================== */
let toastTimer = null;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 3500);
}

/* ==================================================================
   HOME PAGE
   ================================================================== */
/* The inline homepage handler in index.html opens the Surah chooser.
   Do not add reader-active here: that hides the homepage immediately. */

/* ==================================================================
   21. GO
   ================================================================== */
updateOpts();
init();
ensureRecordingStorageInitialized().catch(error => {
  console.warn('Could not initialize local recording storage.', error);
  updateRecordingStorageUI();
});

})();