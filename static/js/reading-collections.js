(function () {
'use strict';
const COLLECTIONS = {
  duas: { kind: 'dua', title: 'Duas', subtitle: 'Supplications narrated in the teachings of Ahl al-Bayt (عليهم السلام)', planned: ['Dua Nudba','Dua Kumayl','Dua Ahad','Dua al-Jamiʿa al-Kabira','Dua Jawshan al-Kabir','Sahifa Sajjadiya'] },
  ziyarats: { kind: 'ziyarat', title: 'Ziyarats', subtitle: 'Visitations and salutations to the Prophet and his purified family (عليهم السلام)', planned: ['Ziyarat Nahiya','Ziyarat Ashura','Ziyarat Alqama'] }
};
const $ = (s, root=document) => root.querySelector(s);
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let activeCollection = null, activeText = null, activeManifest = null, activeCatalog = null;
let activeChunk = 0, requestToken = 0;
const reader = $('#reader'), topbar = $('.topbar');
if (!reader || !topbar) return;

const nav = document.createElement('nav');
nav.className = 'reading-domain-nav';
nav.setAttribute('aria-label','Reading collections');
nav.innerHTML = '<button type="button" data-domain="quran">Qur’an</button><button type="button" data-domain="duas">Duas</button><button type="button" data-domain="ziyarats">Ziyarat</button>';
const spacer = $('.spacer', topbar);
topbar.insertBefore(nav, spacer || null);
const homeActions = $('.home-actions');
if (homeActions) {
  const links = document.createElement('div');
  links.className = 'home-collection-links';
  links.innerHTML = '<button type="button" data-open-domain="duas">Explore Duas <span>→</span></button><button type="button" data-open-domain="ziyarats">Explore Ziyarat <span>→</span></button>';
  homeActions.appendChild(links);
}
const home = $('#homePage');

function baseUrl(path) { return new URL(path, document.baseURI).href; }
function safeSourceUrl(source) { const value = source && source.url; if (!value) return ''; try { const url = new URL(value, document.baseURI); return url.protocol === 'https:' ? url.href : ''; } catch (_) { return ''; } }
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
  if (home) home.setAttribute('aria-hidden','true');
}
function writeRoute(collection, id, section=1) {
  const kind = COLLECTIONS[collection].kind;
  const next = '#/' + kind + '/' + id + '/section/' + section;
  if (location.hash !== next) location.hash = next;
}
function parseRoute() {
  const match = String(location.hash || '').match(/^#\/(dua|ziyarat)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/section\/(\d+)\/?$/i);
  if (!match) return null;
  return { collection: match[1].toLowerCase()==='dua'?'duas':'ziyarats', id:match[2].toLowerCase(), section:Math.max(1,Number(match[3])||1) };
}
function setLoading(message) {
  reader.innerHTML = '<section class="collection-state"><div class="collection-kicker">QURAN &amp; DUA READING</div><h1>'+esc(message)+'</h1><p>Please wait…</p></section>';
}
function showCatalog(collection, manifest) {
  activeCollection = collection; activeCatalog = manifest;
  activeText = null; activeManifest = null;
  setDomain(collection); showReader();
  const config = COLLECTIONS[collection];
  let html = '<section class="collection-page"><header class="collection-heading"><div class="collection-kicker">READING LIBRARY</div><h1>'+config.title+'</h1><p>'+config.subtitle+'</p><div class="collection-count">'+manifest.texts.length+' verified reading'+(manifest.texts.length===1?'':'s')+' available</div></header>';
  if (manifest.texts.length) {
    html += '<div class="collection-cards">';
    manifest.texts.forEach(text => {
      html += '<button class="collection-card" type="button" data-text-id="'+esc(text.id)+'"><span class="collection-card-mark">✦</span><span class="collection-card-copy"><strong>'+esc(text.title)+'</strong>'+(text.arabicTitle?'<span class="collection-arabic" lang="ar" dir="rtl">'+esc(text.arabicTitle)+'</span>':'')+(text.description?'<span>'+esc(text.description)+'</span>':'')+'</span><span class="collection-card-arrow">→</span></button>';
    });
    html += '</div>';
  } else {
    html += '<section class="collection-empty"><div class="collection-empty-symbol">۞</div><h2>The reading library is being prepared</h2><p>The reading interface and separate content catalogue are now connected. Verified, complete source texts will appear here as they are reviewed and added. We will not label an excerpt as a complete dua or ziyarat.</p><div class="collection-planned"><h3>Planned readings</h3><ul>'+config.planned.map(name=>'<li>'+esc(name)+' <span>in preparation</span></li>').join('')+'</ul></div></section>';
  }
  html += '<button class="collection-back" type="button" data-back-home>← Back to home</button></section>';
  reader.innerHTML = html;
}
async function fetchJson(path) {
  const response = await fetch(baseUrl(path), {cache:'no-cache'});
  if (!response.ok) throw new Error('Could not load '+path+' (HTTP '+response.status+').');
  return response.json();
}
async function openCatalog(collection) {
  const token = ++requestToken;
  activeCollection = collection;
  setDomain(collection); showReader(); setLoading(COLLECTIONS[collection].title);
  try {
    const manifest = await fetchJson('data/'+collection+'/manifest.json');
    if (token !== requestToken) return;
    if (!manifest || manifest.version !== 1 || manifest.collection !== collection || !Array.isArray(manifest.texts)) throw new Error('The collection catalogue is not valid.');
    showCatalog(collection, manifest);
  } catch (error) {
    if (token !== requestToken) return;
    reader.innerHTML = '<section class="collection-state"><h1>Unable to open '+esc(COLLECTIONS[collection].title)+'</h1><p>'+esc(error.message)+'</p><button class="collection-back" data-back-home type="button">← Back to home</button></section>';
  }
}
async function openText(collection, id, section=1) {
  const token = ++requestToken;
  const config = COLLECTIONS[collection];
  const textMeta = activeCatalog && activeCatalog.texts.find(item => item.id === id);
  if (!textMeta) return openCatalog(collection);
  activeText = textMeta; activeCollection = collection;
  setDomain(collection); showReader(); setLoading(textMeta.title);
  try {
    const manifest = await fetchJson('data/'+collection+'/'+id+'/manifest.json');
    if (token !== requestToken) return;
    if (!manifest || manifest.version !== 1 || manifest.id !== id || manifest.kind !== config.kind || !Array.isArray(manifest.chunks) || !manifest.recordCount) throw new Error('The reading manifest is invalid.');
    activeManifest = manifest;
    const target = Math.min(manifest.recordCount, Math.max(1,section));
    const chunkIndex = manifest.chunks.findIndex(chunk => target >= chunk.start && target <= chunk.end);
    if (chunkIndex < 0) throw new Error('The requested passage is not available.');
    await renderChunk(chunkIndex, token);
  } catch (error) {
    if (token !== requestToken) return;
    reader.innerHTML = '<section class="collection-state"><h1>'+esc(textMeta.title)+'</h1><p>'+esc(error.message)+'</p><button class="collection-back" data-back-catalog type="button">← Back to '+config.title+'</button></section>';
  }
}
async function renderChunk(index, token=requestToken) {
  const chunk = activeManifest.chunks[index];
  if (!chunk) return;
  setLoading(activeText.title);
  try {
    const records = await fetchJson('data/'+activeCollection+'/'+activeText.id+'/'+chunk.file);
    if (token !== requestToken) return;
    if (!Array.isArray(records) || records.length !== chunk.end-chunk.start+1) throw new Error('A content segment failed validation.');
    activeChunk = index;
    let html = '<section class="collection-reading"><header class="collection-reading-heading"><button class="collection-back" type="button" data-back-catalog>← '+esc(COLLECTIONS[activeCollection].title)+'</button><div class="collection-kicker">'+(activeCollection==='duas'?'SUPPLICATION':'ZIYARAT')+'</div><h1>'+esc(activeText.title)+'</h1>'+(activeText.arabicTitle?'<div class="collection-arabic-title" lang="ar" dir="rtl">'+esc(activeText.arabicTitle)+'</div>':'')+(activeText.description?'<p>'+esc(activeText.description)+'</p>':'')+'</header>';
    html += '<div class="collection-records">';
    records.forEach((record, i) => {
      const number = chunk.start+i;
      html += '<article class="collection-record" id="reading-section-'+number+'"><div class="collection-record-number">'+number+'</div>';
      if (record.arabic_text) html += '<div class="collection-record-arabic" lang="ar" dir="rtl">'+esc(record.arabic_text)+'</div>';
      if (record.transliteration) html += '<p class="collection-record-translit">'+esc(record.transliteration)+'</p>';
      if (record.english_text) html += '<p class="collection-record-english">'+esc(record.english_text)+'</p>';
      if (record.urdu_text) html += '<p class="collection-record-urdu" lang="ur" dir="rtl">'+esc(record.urdu_text)+'</p>';
      if (record.persian_text) html += '<p class="collection-record-persian" lang="fa" dir="rtl">'+esc(record.persian_text)+'</p>';
      if (record.meaning) html += '<details class="collection-word-meaning"><summary>Word meanings &amp; reflection</summary><p>'+esc(record.meaning)+'</p></details>';
      html += '</article>';
    });
    html += '</div><footer class="collection-pagination"><button type="button" data-chunk="'+(index-1)+'" '+(index===0?'disabled':'')+'>← Previous passages</button><span>Passages '+chunk.start+'–'+chunk.end+' of '+activeManifest.recordCount+'</span><button type="button" data-chunk="'+(index+1)+'" '+(index===activeManifest.chunks.length-1?'disabled':'')+'>Next passages →</button></footer>';
    if (activeText.attribution || activeText.source) html += '<p class="collection-attribution">'+(activeText.attribution?esc(activeText.attribution)+' · ':'')+(safeSourceUrl(activeText.source)?'<a href="'+esc(safeSourceUrl(activeText.source))+'" target="_blank" rel="noopener noreferrer">'+esc(activeText.source.label||'Source')+'</a>':'')+'</p>';
    html += '</section>';
    reader.innerHTML = html;
    const route = parseRoute();
    if (route && route.section > chunk.start && route.section <= chunk.end) {
      const target = $('#reading-section-'+route.section);
      if (target) requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
    } else reader.scrollTop = 0;
  } catch (error) {
    if (token !== requestToken) return;
    reader.innerHTML = '<section class="collection-state"><h1>Could not load this passage</h1><p>'+esc(error.message)+'</p></section>';
  }
}
async function handleRoute() {
  const route = parseRoute();
  if (!route) {
    if (location.hash.startsWith('#/surah/') || location.hash.startsWith('#/sura/')) setDomain('quran');
    return;
  }
  const config = COLLECTIONS[route.collection];
  if (!config) return;
  if (!activeCatalog || activeCollection !== route.collection) {
    const token = ++requestToken;
    setDomain(route.collection); showReader(); setLoading(config.title);
    try {
      const manifest = await fetchJson('data/'+route.collection+'/manifest.json');
      if (token !== requestToken) return;
      activeCatalog = manifest; activeCollection = route.collection;
    } catch (error) { reader.innerHTML='<section class="collection-state"><h1>Unable to open library</h1><p>'+esc(error.message)+'</p></section>'; return; }
  }
  await openText(route.collection, route.id, route.section);
}
nav.addEventListener('click', event => {
  const button = event.target.closest('[data-domain]');
  if (!button) return;
  if (button.dataset.domain === 'quran') { setDomain('quran'); location.hash = '#/surah/1/ayah/1'; }
  else openCatalog(button.dataset.domain);
});
document.addEventListener('click', event => {
  const homeButton = event.target.closest('[data-open-domain]');
  if (homeButton) { openCatalog(homeButton.dataset.openDomain); return; }
  const card = event.target.closest('[data-text-id]');
  if (card) { writeRoute(activeCollection, card.dataset.textId, 1); return; }
  if (event.target.closest('[data-back-home]')) {
    document.body.classList.remove('reader-active','collection-active');
    if (home) home.removeAttribute('aria-hidden');
    history.replaceState(null,'',location.pathname+location.search);
    return;
  }
  if (event.target.closest('[data-back-catalog]')) { openCatalog(activeCollection); return; }
  const chunkButton = event.target.closest('[data-chunk]');
  if (chunkButton && !chunkButton.disabled) {
    const index = Number(chunkButton.dataset.chunk), chunk = activeManifest && activeManifest.chunks[index];
    if (!chunk) return;
    const section = chunk.start;
    writeRoute(activeCollection,activeText.id,section);
  }
});
window.addEventListener('hashchange', handleRoute);
const initial = parseRoute();
if (initial) handleRoute();
else setDomain('quran');
})();