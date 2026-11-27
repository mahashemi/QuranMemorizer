(function () {
'use strict';

const COLLECTIONS = {
  duas: { kind: 'dua', title: 'Duas', subtitle: 'Supplications narrated in the teachings of Ahl al-Bayt (عليهم السلام)' },
  ziyarats: { kind: 'ziyarat', title: 'Ziyarats', subtitle: 'Visitations and salutations to the Prophet and his purified family (عليهم السلام)' }
};
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
let activeCollection = null;
let activeText = null;
let activeManifest = null;
let activeCatalog = null;
let requestToken = 0;

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

function setDomain(domain) {
  document.body.classList.toggle('collection-active', domain !== 'quran');
  nav.querySelectorAll('button').forEach(button => {
    const selected = button.dataset.domain === domain;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
function showReader() {
  document.body.classList.add('reader-active');
  if (home) home.setAttribute('aria-hidden', 'true');
}
function writeRoute(collection, id, section = 1) {
  const config = COLLECTIONS[collection];
  if (!config || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(id || '')) ||
      !Number.isSafeInteger(Number(section)) || Number(section) < 1) return;
  const next = '#/' + config.kind + '/' + id + '/section/' + Number(section);
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
  const response = await fetch(new URL(path, document.baseURI).href, { cache: 'no-cache' });
  if (!response.ok) throw new Error('Could not load ' + path + ' (HTTP ' + response.status + ').');
  return response.json();
}
function validateCatalog(collection, manifest) {
  if (!COLLECTIONS[collection] || !manifest || manifest.version !== 1 ||
      manifest.collection !== collection || !Array.isArray(manifest.texts)) {
    throw new Error('The ' + collection + ' catalogue is invalid.');
  }
  const seen = new Set();
  for (const item of manifest.texts) {
    if (!item || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(item.id || '') ||
        seen.has(item.id) || !item.title || item.manifest !== item.id + '/manifest.json') {
      throw new Error('The collection catalogue contains invalid or duplicate reading metadata.');
    }
    seen.add(item.id);
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
function orderedTexts(manifest) {
  return (manifest && manifest.texts || []).slice().sort((a, b) =>
    (Number(a.order || a.canonicalNumber || 999999) - Number(b.order || b.canonicalNumber || 999999)) ||
    String(a.title).localeCompare(String(b.title))
  );
}
function showCatalog(collection, manifest) {
  activeCollection = collection;
  activeCatalog = manifest;
  activeText = null;
  activeManifest = null;
  setDomain(collection);
  showReader();
  const config = COLLECTIONS[collection];
  const groups = new Map();
  for (const item of orderedTexts(manifest)) {
    const group = item.group || config.title;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  let html =
    '<section class="collection-page">' +
      '<header class="collection-heading">' +
        '<div class="collection-kicker">READING LIBRARY</div>' +
        '<h1>' + esc(config.title) + '</h1>' +
        '<p>' + esc(config.subtitle) + '</p>' +
        '<div class="collection-count">' + manifest.texts.length + ' readings · source review status shown individually</div>' +
      '</header>';
  for (const [group, items] of groups) {
    html += '<section class="collection-group"><h2>' + esc(group) + '</h2><div class="collection-cards">';
    for (const item of items) {
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
  html += '<button class="collection-back" type="button" data-back-home>← Back to home</button></section>';
  reader.innerHTML = html;
  window.QuranMemorizerReader.showCollectionCatalog(collection, manifest);
}
async function openCatalog(collection) {
  const config = COLLECTIONS[collection];
  if (!config) return;
  await window.QuranMemorizerReader.ready;
  if (window.QuranMemorizerReader.isRecording()) {
    window.QuranMemorizerReader.notify('Finish the current recording before leaving this passage. Your recording is still active.');
    return;
  }
  const token = ++requestToken;
  if (parseRoute()) history.replaceState(null, '', location.pathname + location.search);
  setDomain(collection);
  showReader();
  reader.innerHTML = '<section class="collection-state"><h1>' + esc(config.title) + '</h1><p>Loading reading library…</p></section>';
  try {
    const manifest = validateCatalog(collection, await fetchJson('data/' + collection + '/manifest.json'));
    if (token !== requestToken) return;
    await window.QuranMemorizerReader.exitCollection();
    if (token !== requestToken) return;
    showCatalog(collection, manifest);
  } catch (error) {
    if (token !== requestToken) return;
    reader.innerHTML = '<section class="collection-state"><h1>Unable to open ' + esc(config.title) + '</h1><p>' + esc(error.message) + '</p></section>';
  }
}
async function openText(collection, id, section = 1) {
  await window.QuranMemorizerReader.ready;
  const config = COLLECTIONS[collection];
  if (!config) return;
  const token = ++requestToken;
  try {
    if (!activeCatalog || activeCollection !== collection) {
      activeCatalog = validateCatalog(collection, await fetchJson('data/' + collection + '/manifest.json'));
    }
    const textMeta = activeCatalog.texts.find(item => item.id === id);
    if (!textMeta) throw new Error('This reading is not present in the current catalogue.');
    setDomain(collection);
    showReader();
    reader.innerHTML = '<section class="collection-state"><h1>' + esc(textMeta.title) + '</h1><p>Loading recitation passages…</p></section>';
    const manifest = validateReadingManifest(
      await fetchJson('data/' + collection + '/' + id + '/manifest.json'),
      id,
      config.kind
    );
    if (token !== requestToken) return;
    activeCollection = collection;
    activeText = textMeta;
    activeManifest = manifest;
    await window.QuranMemorizerReader.openCollection(collection, id, section, textMeta, activeCatalog, manifest);
  } catch (error) {
    if (token !== requestToken) return;
    reader.innerHTML =
      '<section class="collection-state"><h1>' + esc(id) + '</h1><p>' + esc(error.message) + '</p>' +
      '<button class="collection-back" type="button" data-back-catalog>← Back to ' + esc(config.title) + '</button></section>';
  }
}
async function handleRoute() {
  const route = parseRoute();
  if (!route) {
    if (/^#\/surah\//i.test(location.hash) || /^#\/sura\//i.test(location.hash)) setDomain('quran');
    else if (window.QuranMemorizerReader && window.QuranMemorizerReader.isCollectionReading()) openCatalog(activeCollection || 'duas');
    return;
  }
  const config = COLLECTIONS[route.collection];
  if (!config) return;
  const current = window.QuranMemorizerReader.getActiveReading();
  const state = window.QuranMemorizerReader.getState();
  if (current && current.collection === route.collection && current.id === route.id) {
    if (state.section !== route.section) window.QuranMemorizerReader.goToCollectionSection(route.section, { play: false });
    return;
  }
  await openText(route.collection, route.id, route.section);
}
nav.addEventListener('click', async event => {
  const button = event.target.closest('[data-domain]');
  if (!button) return;
  if (button.dataset.domain === 'quran') {
    requestToken++;
    await window.QuranMemorizerReader.exitCollection();
    setDomain('quran');
  } else {
    openCatalog(button.dataset.domain);
  }
});
document.addEventListener('click', async event => {
  const homeButton = event.target.closest('[data-open-domain]');
  if (homeButton) {
    openCatalog(homeButton.dataset.openDomain);
    return;
  }
  const card = event.target.closest('[data-text-id]');
  if (card) {
    writeRoute(activeCollection, card.dataset.textId, 1);
    return;
  }
  if (event.target.closest('[data-back-catalog]')) {
    openCatalog(activeCollection || 'duas');
    return;
  }
  if (event.target.closest('[data-back-home]')) {
    requestToken++;
    await window.QuranMemorizerReader.exitCollection();
    document.body.classList.remove('reader-active', 'collection-active');
    if (home) home.removeAttribute('aria-hidden');
    history.replaceState(null, '', location.pathname + location.search);
  }
});
window.addEventListener('hashchange', handleRoute);
async function resolveRecordingIdentity(collection, readingId, section) {
  const config = COLLECTIONS[collection];
  const target = Number(section);
  if (!config || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(readingId || '')) ||
      !Number.isSafeInteger(target) || target < 1) return null;
  const catalog = activeCatalog && activeCollection === collection
    ? activeCatalog
    : validateCatalog(collection, await fetchJson('data/' + collection + '/manifest.json'));
  if (!catalog.texts.some(item => item.id === readingId)) return null;
  const manifest = validateReadingManifest(
    await fetchJson('data/' + collection + '/' + readingId + '/manifest.json'),
    readingId,
    config.kind
  );
  return target <= manifest.recordCount ? { collection, readingId, section: target } : null;
}

window.QuranMemorizerCollections = Object.freeze({
  writeRoute,
  openText,
  openCatalog,
  resolveRecordingIdentity,
  getCatalog: collection => collection === activeCollection ? activeCatalog : null
});
async function initialize() {
  await window.QuranMemorizerReader.ready;
  const initial = parseRoute();
  if (initial) await handleRoute();
  else setDomain('quran');
}
initialize().catch(error => console.error('Reading collections could not be initialized.', error));
})();
