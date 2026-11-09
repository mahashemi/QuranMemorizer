import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../static/js/app.js', import.meta.url), 'utf8');
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
  assert.ok(app.includes("new URL('../../data/quran/manifest.json', APP_SCRIPT_URL)"));
  assert.ok(app.includes("new URL('../../data/quran/chapter_' + sura.number + '/chapter.json', APP_SCRIPT_URL)"));
  assert.ok(app.includes('async function ensureSuraLoaded(sura)'));
  assert.ok(app.includes('indexedDB.open(QURAN_CACHE_DB, 1)'));
  assert.ok(app.includes('await writeCachedChapter(sura.number, sura.ayas)'));
});
