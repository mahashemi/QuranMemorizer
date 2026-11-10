import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../static/js/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../static/css/styles.css', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');

test('shared Quran links accept canonical Surah/Ayah routes', () => {
  assert.ok(app.includes('function parseQuranHash(hash)'));
  assert.ok(app.includes('surah|sura'));
  assert.ok(app.includes('ayah|aya'));
});

test('initial deep link activates the reader and loads the requested ayah', () => {
  assert.match(app, /const initialRoute = parseQuranHash\(window\.location\.hash\)/);
  assert.match(app, /if \(initialRoute\) activateReaderView\(\)/);
  assert.ok(app.includes('await loadSura(initialRoute.sura, { aya: initialRoute.aya, play: false })'));
  assert.ok(app.includes('scheduleSharedAyaFocus(initialRoute.aya)'));
});

test('shared ayah is focused after the reader has rendered', () => {
  assert.match(app, /function scheduleSharedAyaFocus\(aya\)[\s\S]*?requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(\(\) => focusSharedAya\(aya\)\)/);
  assert.match(app, /card\.scrollIntoView\(\{ block: 'center', behavior: 'smooth' \}\)/);
  assert.match(app, /card\.setAttribute\('aria-current', 'location'\)/);
});

test('GitHub Pages workflow publishes the app and its Quran data from main', () => {
  assert.match(workflow, /branches: \["main"\]/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /path: www/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test('Quran data URL is resolved relative to the deployed app script', () => {
  assert.ok(app.includes("new URL('../../data/quran/chunked/manifest.json', APP_SCRIPT_URL)"));
  assert.ok(app.includes("new URL('../../data/quran/chunked/chapter_' + sura.number + '/manifest.json', APP_SCRIPT_URL)"));
  assert.ok(app.includes("new URL('../../data/quran/chunked/chapter_' + sura.number + '/' + chunk.file, APP_SCRIPT_URL)"));
  assert.ok(app.includes('async function ensureSuraLoaded(sura, aya, loadAll)'));
  assert.ok(app.includes('indexedDB.open(QURAN_CACHE_DB, 1)'));
  assert.ok(app.includes('await writeCachedChunk(key, records)'));
  assert.ok(app.includes('const chunks = loadAll'));
  assert.ok(app.includes('ensureSuraLoaded(s, chunk.end + 1, false)'));
  assert.ok(app.includes('ayas: new Array(Number(item.ayaCount))'));
});


test('reader renders only loaded Ayahs while retaining full Surah navigation counts', () => {
  assert.match(app, /for \(const v of s\.ayas\) \{\s*if \(!v\) continue;/);
  assert.match(app, /for \(let number = 1; number <= s\.ayaCount; number\+\+\)/);
  assert.match(app, /await ensureSuraLoaded\(surah, 1, true\)/);
});


test('reader lazily fetches adjacent chunks while scrolling and prefetches near boundaries', () => {
  assert.ok(app.includes('async function loadAdjacentReaderChunk()'));
  assert.ok(app.includes("el.reader.addEventListener('scroll', loadAdjacentReaderChunk, { passive: true })"));
  assert.ok(app.includes('ensureSuraLoaded(s, chunk.end + 1, false)'));
  assert.ok(app.includes('readerChunkLoadPending'));
});


test('same-Surah deep-link navigation renders a newly fetched Ayah chunk', () => {
  assert.ok(app.includes('if (suraChanged || !el.reader.querySelector('));
  assert.ok(app.includes("'.aya[data-aya=\"' + aya + '\"]'"));
});


test('Ayah picker is a number-only navigation index on desktop and mobile', () => {
  assert.match(app, /function renderAyaList\(num\)[\s\S]*?data-aya=.*?aria-label="Go to Ayah '[\s\S]*?aya-btn-num/);
  assert.doesNotMatch(app, /aya-btn-text|aya-btn-unloaded/);
  assert.match(app, /const btn = el\.ayaList\.querySelector\('\.aya-btn\[data-aya=/);
  assert.match(app, /btn\.classList\.add\('active'\)/);
  assert.match(styles, /Compact Ayah-number index: no text previews/);
  assert.match(styles, /grid-template-columns:repeat\(auto-fill,minmax\(42px,1fr\)\)/);
  assert.doesNotMatch(styles, /\.aya-btn \.aya-btn-text\s*\{\s*display:\s*block/);
});
