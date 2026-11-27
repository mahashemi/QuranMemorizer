import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../static/js/app.js', import.meta.url), 'utf8');
const collectionAdapter = readFileSync(new URL('../static/js/reading-collections.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../static/css/styles.css', import.meta.url), 'utf8');
const duas = JSON.parse(readFileSync(new URL('../data/duas/manifest.json', import.meta.url), 'utf8'));
const ziyarats = JSON.parse(readFileSync(new URL('../data/ziyarats/manifest.json', import.meta.url), 'utf8'));

test('Dua and Ziyarat passage records use the existing Quran reader and transport', () => {
  assert.match(app, /window\.QuranMemorizerReader = Object\.freeze/);
  assert.match(app, /openCollectionSura\(sura, section = 1\)[\s\S]*?return loadSura\(sura\.number/);
  assert.match(app, /async function ensureSuraLoaded\(sura, aya, loadAll\)[\s\S]*?sura\.collectionLoad/);
  assert.match(app, /function renderSura\(restoreScrollTop\)[\s\S]*?class="aya"/);
  assert.match(app, /startUserRecording\(state\.sura, aya, recordButton\)/);
  assert.match(app, /function handleEnded\(\)/);
  assert.match(app, /navigateCollectionSection\(section, play = false\)/);
  assert.doesNotMatch(collectionAdapter, /class="collection-reading"|class="collection-record"/);
  assert.doesNotMatch(collectionAdapter, /reader\.innerHTML = html;[\s\S]*?collection-records/);
});

test('collection recording identities are kept outside the 114 Quran Surah IDs', () => {
  assert.match(collectionAdapter, /const capacity = 885; \/\/ 115–999/);
  assert.match(app, /sura\.number <= 114/);
  assert.match(app, /Collection recording identity collision/);
  assert.match(app, /getUserRecording\(sura, aya\)/);
});

test('the collection view does not hide the existing sidebar or player', () => {
  assert.doesNotMatch(styles, /\.collection-active \.sidebar,\.collection-active \.player\s*\{\s*display:\s*none/);
  assert.doesNotMatch(styles, /\.collection-active \.mobile-header\s*\{\s*display:\s*none/);
});

test('the imported library includes all 54 Sahifa supplications and 15 Munajat', () => {
  assert.equal(duas.texts.length, 73);
  const sahifa = duas.texts.filter(item => item.group === 'Sahifa Sajjadiya — 54 Supplications');
  const munajat = duas.texts.filter(item => item.group === '15 Munajat');
  assert.equal(sahifa.length, 54);
  assert.deepEqual(sahifa.map(item => item.canonicalNumber).sort((a, b) => a - b), Array.from({ length: 54 }, (_, i) => i + 1));
  assert.equal(munajat.length, 15);
  assert.ok(munajat.every(item => item.id.startsWith('munajat-')));
  assert.ok(duas.texts.some(item => item.id === 'dua-ahad'));
  assert.ok(duas.texts.some(item => item.id === 'dua-jawshan-kabir'));
  assert.ok(duas.texts.some(item => item.id === 'dua-ahad'));
  assert.ok(duas.texts.some(item => item.id === 'dua-jawshan-kabir'));
});

test('all imported Dua and Ziyarat source records have Arabic, transliteration, and English fields', () => {
  for (const [collection, manifest] of [['duas', duas], ['ziyarats', ziyarats]]) {
    const sourceDir = new URL('../data/' + collection + '/source/', import.meta.url);
    for (const filename of readdirSync(sourceDir).filter(name => name.endsWith('.json'))) {
      const source = JSON.parse(readFileSync(new URL(filename, sourceDir), 'utf8'));
      const readings = Array.isArray(source.readings) ? source.readings : [source];
      for (const reading of readings) {
        assert.ok(manifest.texts.some(item => item.id === reading.id), collection + ' manifest missing ' + reading.id);
        assert.ok(reading.records.length > 0, reading.id + ' has no records');
        for (const [index, record] of reading.records.entries()) {
          for (const field of ['arabic_text', 'transliteration', 'english_text']) {
            assert.equal(typeof record[field], 'string', reading.id + ' record ' + (index + 1) + ' missing ' + field);
            assert.ok(record[field].trim(), reading.id + ' record ' + (index + 1) + ' empty ' + field);
          }
        }
      }
    }
  }
});

test('no imported text is silently promoted to verified status', () => {
  for (const item of [...duas.texts, ...ziyarats.texts]) {
    assert.notEqual(item.sourceStatus, 'verified', item.id + ' must remain review-required until checked');
  }
});
