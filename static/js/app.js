(function () {
'use strict';

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

  toast: $('toast')
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

/* ==================================================================
   7. INIT
   ================================================================== */
async function init() {
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
  loadSura(1, { aya: 1, play: false });
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
    '</div>';

  for (const v of s.ayas) {
    html +=
      '<article class="aya" id="aya-' + v.ayaNum + '" data-aya="' + v.ayaNum + '">' +
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
function updateAyaUI(scrollReader) {
  const s = SURA_BY_NUM[state.sura];
  if (!s) return;

  el.reader.querySelectorAll('.aya.active').forEach(n => n.classList.remove('active'));
  const card = document.getElementById('aya-' + state.aya);
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
  return currentReciter().dir + '/' + pad3(sura) + pad3(aya) + '.mp3';
}

/* Per-ayah recordings are stored locally in IndexedDB; they never upload. */
const RECORDINGS_DB = 'quranMemorizerRecordings';
const RECORDINGS_STORE = 'ayah-recordings';
let recordingsDbPromise;
let activeRecorder = null;
let activeRecordingKey = null;
let activeRecordingChunks = [];
let playbackRequestId = 0;
let playbackMode = 'idle'; // idle | sequence | preview
let activeRecordingObjectUrl = null;
let recordingAudioContext = null;
let recordingAnalyser = null;
let recordingWaveFrame = null;

function openRecordingsDb() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('Local recording storage is not supported here.'));
  if (!recordingsDbPromise) {
    recordingsDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(RECORDINGS_DB, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
          db.createObjectStore(RECORDINGS_STORE, { keyPath: 'key' });
        }
        // Retain schema v2 compatibility with earlier test builds that created this store.
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local recording storage.'));
    });
  }
  return recordingsDbPromise;
}

async function getUserRecording(sura, aya) {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(RECORDINGS_STORE, 'readonly')
      .objectStore(RECORDINGS_STORE).get(sura + ':' + aya);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not read recording.'));
  });
}

async function saveUserRecording(sura, aya, blob) {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const record = { key: sura + ':' + aya, sura, aya, blob, mimeType: blob.type || 'audio/webm', updatedAt: Date.now() };
    const request = db.transaction(RECORDINGS_STORE, 'readwrite').objectStore(RECORDINGS_STORE).put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error || new Error('Could not save recording.'));
  });
}

async function deleteUserRecording(sura, aya) {
  const db = await openRecordingsDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(RECORDINGS_STORE, 'readwrite')
      .objectStore(RECORDINGS_STORE).delete(sura + ':' + aya);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Could not delete recording.'));
  });
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
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = {};
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus';
    }
    const recorder = new MediaRecorder(stream, options);
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
      try {
        await saveUserRecording(key.sura, key.aya, blob);
        refreshRecordingControls(key.sura);
        if (state.sura === key.sura && state.aya === key.aya) {
          toast('Your recording was saved privately on this device. Playing it back now.');
          await playUserRecording(key.sura, key.aya);
        } else {
          toast('Your recording was saved privately on this device.');
        }
      } catch (error) {
        toast('Could not save recording: ' + error.message);
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
    setRecordingPlaybackLock(false);
    stopRecordingWaveform();
    const status = button.parentElement && button.parentElement.querySelector('[data-record-status]');
    if (status) status.textContent = error && error.name === 'NotAllowedError' ? 'Allow microphone access to begin.' : '';
    toast(error && error.name === 'NotAllowedError'
      ? 'Microphone permission was denied.'
      : 'Could not start recording: ' + (error.message || 'unknown error'));
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

  if (opts.play) {
    goToAya(state.aya, { play: true, opening: opts.opening !== false && state.aya === 1 });
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

  if (opts.play) {
    if (opts.opening && n === 1 && state.playBismillah && hasOpening(state.sura)) {
      playTrack(state.sura, 0);
    } else {
      playTrack(state.sura, n);
    }
  }
}

async function playTrack(sura, aya) {
  const requestId = ++playbackRequestId;
  playbackMode = 'sequence';
  state.playingAya = aya;
  state.started = true;
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
  audio.pause();
  try { audio.currentTime = 0; } catch (e) {}
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

audio.addEventListener('play',  () => { setPlayIcon(true); });
audio.addEventListener('pause', () => { setPlayIcon(false); });

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
    if (!audio.paused) { audio.pause(); return; }
    if (configDirty || !state.started || !audio.src) startPlayback();
    else audio.play().catch(() => {});
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

})();