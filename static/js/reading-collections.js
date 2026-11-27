(function () {
'use strict';

const CONFIG = {
  duas: { kind: 'dua', title: 'Duas', subtitle: 'Supplications narrated in the teachings of Ahl al-Bayt (عليهم السلام)' },
  ziyarats: { kind: 'ziyarat', title: 'Ziyarats', subtitle: 'Visitations and salutations to the Prophet and his purified family (عليهم السلام)' }
};
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const catalogs = {};
const suras = new Map();
const numberByKey = new Map();
let activeCollection = 'duas';
let routeToken = 0;

const reader = $('#reader');
const topbar = $('.topbar');
const home = $('#homePage');
if (!reader || !topbar) return;

const nav = document.createElement('nav');
nav.className = 'reading-domain-nav';
nav.setAttribute('aria-label', 'Reading collections');
nav.innerHTML =
  '<button type="button" data-domain="quran">Qur’an</button>' +
  '<button type="button" data-domain="duas">Duas</button>' +
  '<button type="button" data-domain="ziyarats">Ziyarat</button>';
const spacer = $('.spacer', topbar);
topbar.insertBefore(nav, spacer || null);

const homeActions = $('.home-actions');
if (homeActions) {
  const links = document.createElement('div');
  links.className = 'home-collection-links';
  links.innerHTML =
    '<button type="button" data-open-domain="duas">Explore Duas <span>→</span></button>' +
    '<button type="button" data-open-domain="ziyarats">Explore Ziyarat <span>→</span></button>';
  homeActions.appendChild(links);
}

function baseUrl(path) {
  return new URL(path, document.baseURI).href;
}
function safeSourceUrl(source) {
  try {
    const url = new URL(source && source.url || '', document.baseURI);
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) { return ''; }
}
function setDomain(domain) {
  document.body.classList.toggle('collection-active', domain !== 'quran');
  nav.querySelectorAll('button').forEach(button => {
    const selected = button.dataset.domain === domain;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
function writeRoute(collection, id, section = 1) {
  const kind = CONFIG[collection] && CONFIG[collection].kind;
  if (!kind || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(id || '')) ||
      !Number.isSafeInteger(Number(section)) || Number(section) < 1) return;
  const next = '#/' + kind + '/' + id + '/section/' + Number(section);
  if (location.hash !== next) location.hash = next;
}
function parseRoute() {
  const match = String(location.hash || '').match(/^#\/(dua|ziyarat)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/section\/(\d+)\/?$/i);
  if (!match) return null;
  const section = Number(match[3]);
  if (!Number.isSafeInteger(section) || section < 1) return null;
  return { collection: match[1].toLowerCase() === 'dua' ? 'duas' : 'ziyarats', id: match[2].toLowerCase(), section };
}
async function fetchJson(path) {
  const response = await fetch(baseUrl(path), { cache: 'default' });
  if (!response.ok) throw new Error('Could not load ' + path + ' (HTTP ' + response.status + ').');
  return response.json();
}
function validateCollection(collection, manifest) {
  if (!CONFIG[collection] || !manifest || manifest.version !== 1 ||
      manifest.collection !== collection || !Array.isArray(manifest.texts)) {
    throw new Error('The ' + collection + ' catalogue is invalid.');
  }
  const ids = new Set();
  for (const item of manifest.texts) {
    if (!item || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(item.id || '') ||
        ids.has(item.id) || !item.title || item.manifest !== item.id + '/manifest.json') {
      throw new Error('The ' + collection + ' catalogue contains invalid or duplicate reading metadata.');
    }
    ids.add(item.id);
  }
  return manifest;
}
function validateReadingManifest(manifest, id, kind) {
  if (!manifest || manifest.version !== 1 || manifest.id !== id || manifest.kind !== kind ||
      !Number.isInteger(manifest.recordCount) || manifest.recordCount < 1 ||
      !Array.isArray(manifest.chunks) || !manifest.chunks.length) {
    throw new Error('The reading manifest is invalid.');
  }
  let next = 1;
  for (const chunk of manifest.chunks) {
    if (!chunk || chunk.start !== next || !Number.isInteger(chunk.end) ||
        chunk.end < chunk.start || chunk.end > manifest.recordCount ||
        !/^segments_\d{3,}_\d{3,}\.json$/.test(chunk.file || '')) {
      throw new Error('The reading manifest has a missing or invalid passage range.');
    }
    next = chunk.end + 1;
  }
  if (next !== manifest.recordCount + 1) throw new Error('The reading manifest does not cover every passage.');
  return manifest;
}
function stableNumber(key, used) {
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const capacity = 885; // 115–999; Quran Surah IDs remain 1–114.
  let slot = (hash >>> 0) % capacity;
  for (let attempt = 0; attempt < capacity; attempt++) {
    const number = 115 + slot;
    if (!used.has(number)) {
      used.add(number);
      return number;
    }
    slot = (slot + 1) % capacity;
  }
  throw new Error('The collection recording identity space is exhausted.');
}
function registerStableNumbers() {
  const keys = [];
  for (const collection of Object.keys(CONFIG)) {
    for (const item of catalogs[collection].texts) keys.push(collection + ':' + item.id);
  }
  keys.sort();
  const used = new Set();
  keys.forEach(key => numberByKey.set(key, stableNumber(key, used)));
}
function orderedTexts(collection) {
  return (catalogs[collection]?.texts || []).slice().sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
    return orderA - orderB || String(a.title).localeCompare(String(b.title));
  });
}
function setSidebar(collection, activeId) {
  const items = orderedTexts(collection).map((item, index) => ({
    id: item.id,
    collection,
    number: numberByKey.get(collection + ':' + item.id),
    order: item.canonicalNumber || item.order || index + 1,
    title: item.title,
    arabicTitle: item.arabicTitle || '',
    active: item.id === activeId
  }));
  if (window.QuranMemorizerReader) window.QuranMemorizerReader.showCollectionNavigation(items, CONFIG[collection].title);
}
function showCatalog(collection) {
  activeCollection = collection;
  setDomain(collection);
  const config = CONFIG[collection];
  const items = orderedTexts(collection);
  const groups = new Map();
  items.forEach(item => {
    const group = item.group || config.title;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  });
  let html =
    '<section class="collection-page">' +
      '<header class="collection-heading">' +
        '<div class="collection-kicker">READING LIBRARY</div>' +
        '<h1>' + esc(config.title) + '</h1>' +
        '<p>' + esc(config.subtitle) + '</p>' +
        '<div class="collection-count">' + items.length + ' readings imported · review status shown individually</div>' +
      '</header>';
  for (const [group, groupItems] of groups) {
    html += '<section class="collection-group"><h2>' + esc(group) + '</h2><div class="collection-cards">';
    for (const item of groupItems) {
      const status = item.sourceStatus === 'verified' ? 'Verified' : 'Imported · review pending';
      html +=
        '<button class="collection-card" type="button" data-text-id="' + esc(item.id) + '">' +
          '<span class="collection-card-mark">✦</span>' +
          '<span class="collection-card-copy"><strong>' + esc(item.title) + '</strong>' +
          (item.arabicTitle ? '<span class="collection-arabic" lang="ar" dir="rtl">' + esc(item.arabicTitle) + '</span>' : '') +
          (item.description ? '<span>' + esc(item.description) + '</span>' : '') +
          '<span class="collection-status">' + status + '</span></span>' +
          '<span class="collection-card-arrow">→</span>' +
        '</button>';
    }
    html += '</div></section>';
  }
  html += '</section>';
  reader.innerHTML = html;
  setSidebar(collection, null);
}
async function openCatalog(collection) {
  await window.QuranMemorizerReaderReady;
  if (!catalogs[collection]) throw new Error('Unknown reading collection.');
  routeToken++;
  window.QuranMemorizerReader.stopPlayback();
  activeCollection = collection;
  setDomain(collection);
  showCatalog(collection);
  if (home) home.setAttribute('aria-hidden', 'true');
}
function createSura(collection, meta, manifest) {
  const key = collection + ':' + meta.id;
  const number = numberByKey.get(key);
  if (!number) throw new Error('A stable recording identity was not assigned to this reading.');
  const cached = suras.get(key);
  if (cached && cached.ayaCount === manifest.recordCount) return cached;
  const sura = {
    number,
    englishName: meta.title,
    arabicName: meta.arabicTitle || '',
    ayaCount: manifest.recordCount,
    ayas: new Array(manifest.recordCount),
    loadedChunks: new Set(),
    loadingChunks: new Map(),
    chunkManifest: manifest,
    chunkManifestPromise: Promise.resolve(manifest),
    collection: {
      collection,
      id: meta.id,
      kind: CONFIG[collection].kind,
      sourceUrl: safeSourceUrl(meta.source),
      sourceLabel: meta.source && meta.source.label || 'Text source',
      sourceStatus: meta.sourceStatus || 'imported-review-required'
    },
    sourceUrl: safeSourceUrl(meta.source),
    sourceLabel: meta.source && meta.source.label || 'Text source'
  };
  sura.collectionLoad = async (targetSura, targetSection, loadAll) => {
    const target = Math.max(1, Math.min(Number(targetSection) || 1, targetSura.ayaCount));
    const chunks = loadAll
      ? manifest.chunks
      : manifest.chunks.filter(chunk => target >= chunk.start && target <= chunk.end);
    for (const chunk of chunks) {
      const chunkKey = targetSura.number + ':' + chunk.start;
      if (targetSura.loadedChunks.has(chunkKey)) continue;
      let pending = targetSura.loadingChunks.get(chunkKey);
      if (!pending) {
        pending = (async () => {
          const records = await fetchJson('data/' + collection + '/' + meta.id + '/' + chunk.file);
          if (!Array.isArray(records) || records.length !== chunk.end - chunk.start + 1) {
            throw new Error(meta.title + ' passages ' + chunk.start + '–' + chunk.end + ' failed validation.');
          }
          records.forEach((record, index) => {
            if (!record || typeof record.arabic_text !== 'string' || !record.arabic_text.trim()) {
              throw new Error(meta.title + ' contains an empty Arabic passage at ' + (chunk.start + index) + '.');
            }
            targetSura.ayas[chunk.start + index - 1] = { ...record, ayaNum: chunk.start + index };
          });
          targetSura.loadedChunks.add(chunkKey);
        })();
        targetSura.loadingChunks.set(chunkKey, pending);
      }
      try { await pending; }
      finally { if (targetSura.loadingChunks.get(chunkKey) === pending) targetSura.loadingChunks.delete(chunkKey); }
    }
    return targetSura;
  };
  suras.set(key, sura);
  return sura;
}
async function openText(collection, id, section = 1) {
  await window.QuranMemorizerReaderReady;
  const config = CONFIG[collection];
  const meta = catalogs[collection] && catalogs[collection].texts.find(item => item.id === id);
  if (!config || !meta) return openCatalog(collection);
  const token = ++routeToken;
  activeCollection = collection;
  setDomain(collection);
  setSidebar(collection, id);
  reader.innerHTML = '<section class="collection-state"><h1>' + esc(meta.title) + '</h1><p>Loading recitation passages…</p></section>';
  try {
    const manifest = validateReadingManifest(
      await fetchJson('data/' + collection + '/' + id + '/manifest.json'),
      id,
      config.kind
    );
    if (token !== routeToken) return;
    const sura = createSura(collection, meta, manifest);
    await window.QuranMemorizerReader.openCollectionSura(sura, section);
  } catch (error) {
    if (token !== routeToken) return;
    reader.innerHTML =
      '<section class="collection-state"><h1>' + esc(meta.title) + '</h1><p>' + esc(error.message) + '</p>' +
      '<button class="collection-back" type="button" data-back-collection>← Back to ' + esc(config.title) + '</button></section>';
  }
}
async function handleRoute() {
  const route = parseRoute();
  if (!route) return;
  await window.QuranMemorizerReaderReady;
  const config = CONFIG[route.collection];
  if (!config || !catalogs[route.collection]) return;
  await openText(route.collection, route.id, route.section);
}
async function initialize() {
  try {
    await window.QuranMemorizerReaderReady;
    const loaded = await Promise.all(Object.keys(CONFIG).map(async collection => {
      catalogs[collection] = validateCollection(collection, await fetchJson('data/' + collection + '/manifest.json'));
    }));
    registerStableNumbers();
    const route = parseRoute();
    if (route) await handleRoute();
    else setDomain('quran');
  } catch (error) {
    console.error('Dua/Ziyarat catalog could not be initialized.', error);
  }
}
nav.addEventListener('click', event => {
  const button = event.target.closest('[data-domain]');
  if (!button) return;
  if (button.dataset.domain === 'quran') {
    setDomain('quran');
    window.QuranMemorizerReader.openQuranSura(1, 1);
  } else {
    openCatalog(button.dataset.domain).catch(error => {
      reader.innerHTML = '<section class="collection-state"><h1>Unable to open library</h1><p>' + esc(error.message) + '</p></section>';
    });
  }
});
document.addEventListener('click', event => {
  const homeButton = event.target.closest('[data-open-domain]');
  if (homeButton) {
    openCatalog(homeButton.dataset.openDomain).catch(error => console.error(error));
    return;
  }
  const card = event.target.closest('[data-text-id]');
  if (card) {
    writeRoute(activeCollection, card.dataset.textId, 1);
    return;
  }
  if (event.target.closest('[data-back-collection]')) {
    history.replaceState(null, '', location.pathname + location.search);
    openCatalog(activeCollection).catch(error => console.error(error));
  }
});
window.addEventListener('hashchange', handleRoute);
window.QuranMemorizerCollections = Object.freeze({
  writeRoute,
  openText,
  openCatalog,
  getCatalog: collection => catalogs[collection] || null
});
initialize();
})();
