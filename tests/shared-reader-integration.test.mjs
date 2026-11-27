import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../static/js/app.js', import.meta.url), 'utf8');
const adapter = readFileSync(new URL('../static/js/reading-collections.js', import.meta.url), 'utf8');
const native = readFileSync(new URL('../static/js/native-storage-adapter.mjs', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../static/css/styles.css', import.meta.url), 'utf8');
const duas = JSON.parse(readFileSync(new URL('../data/duas/manifest.json', import.meta.url), 'utf8'));
const ziyarats = JSON.parse(readFileSync(new URL('../data/ziyarats/manifest.json', import.meta.url), 'utf8'));

test('Dua and Ziyarat passages are rendered by the shared Quran reader', () => {
  assert.match(app, /window\.QuranMemorizerReader = Object\.freeze/);
  assert.match(app, /openCollectionReading\(collection, readingId, section, textMeta, catalog, manifest\)/);
  assert.match(app, /ensureCollectionSectionLoaded\(state\.activeReading, target\)/);
  assert.match(app, /function renderSura\(restoreScrollTop\)[\s\S]*?class="aya"/);
  assert.match(app, /function playCollectionTrack\(section\)/);
  assert.match(app, /async function startUserRecording\(sura, aya, button\)/);
  assert.match(app, /goToCollectionSection\(aya, opts\)/);
  assert.match(app, /async function loadAdjacentReaderChunk\(\)[\s\S]*?ensureCollectionSectionLoaded\(reading, adjacent\.start\)/);
  assert.match(adapter, /QuranMemorizerReader\.openCollection/);
  assert.match(adapter, /QuranMemorizerReader\.goToCollectionSection/);
  assert.match(adapter, /async function resolveRecordingIdentity\(collection, readingId, section\)/);
  assert.match(app, /await resolver\(identity\.collection, identity\.readingId, identity\.section\)/);
  assert.doesNotMatch(adapter, /class="collection-reading"|class="collection-record"/);
});

test('collection recordings use namespaced identities in browser and Android storage', () => {
  assert.match(app, /collection:\s*String\(sura\.collection\), readingId:\s*String\(sura\.readingId\), section:/);
  assert.match(app, /recordingIdentityKey\(sura, aya\)/);
  assert.match(native, /recordings\/collections\/' \+ identity\.collection \+ '\/' \+ identity\.readingId/);
  assert.match(native, /identity\.collection \? 'passage-' : 'ayah-'/);
  assert.match(native, /String\(number\)\.padStart\(3/);
  assert.match(app, /getCurrentRecordingIdentity\(aya\)/);
  assert.match(app, /recordings\/collections\/' \+ identity\.collection \+ '\/' \+ identity\.readingId/);
  assert.ok(app.includes("const collectionPath = /(?:^|[/])(?:QuranMemorizer[/])?recordings[/]collections[/]"));
});

test('the existing Quran sidebar, mobile header, and player remain available in collection mode', () => {
  assert.doesNotMatch(styles, /\.collection-active \.sidebar,\.collection-active \.player\s*\{\s*display:\s*none/);
  assert.doesNotMatch(styles, /\.collection-active \.mobile-header\s*\{\s*display:\s*none/);
  assert.match(app, /renderCollectionSidebar\(\)/);
  assert.match(app, /collection-empty-state/);
  assert.doesNotMatch(styles, /collection-active \.topbar \.topbar-btn\s*\{\s*display:\s*none/);
  assert.match(app, /if \(wasCollection\) buildSidebar\(\)/);
});

test('the Dua catalogue includes all 54 Sahifa supplications, 15 Munajat, Ahad, and Jawshan Kabir', () => {
  assert.equal(duas.texts.length, 74);
  const sahifa = duas.texts.filter(item => item.group === 'Sahifa Sajjadiya — 54 Supplications');
  const munajat = duas.texts.filter(item => item.group === '15 Munajat');
  assert.equal(sahifa.length, 54);
  assert.deepEqual(sahifa.map(item => item.canonicalNumber).sort((a, b) => a - b), Array.from({ length: 54 }, (_, i) => i + 1));
  assert.equal(munajat.length, 15);
  assert.ok(munajat.every(item => item.id.startsWith('munajat-')));
  assert.ok(duas.texts.some(item => item.id === 'dua-ahad'));
  assert.ok(duas.texts.some(item => item.id === 'dua-jawshan-kabir'));
  assert.ok(duas.texts.some(item => item.id === 'dua-alqama'));
});

test('the current Ziyarat catalogue contains the two imported readings', () => {
  assert.equal(ziyarats.texts.length, 3);
  assert.deepEqual(ziyarats.texts.map(item => item.id).sort(), ['ziyarat-ashura', 'ziyarat-jamia-kabira', 'ziyarat-nahiya']);
});

test('the new Duas.org imports preserve their inspected source segmentation and attribution', () => {
  const dua = JSON.parse(readFileSync(new URL('../data/duas/source/dua-alqama.json', import.meta.url), 'utf8'));
  const ziyarat = JSON.parse(readFileSync(new URL('../data/ziyarats/source/ziyarat-nahiya.json', import.meta.url), 'utf8'));
  assert.equal(dua.records.length, 191);
  assert.equal(dua.sourcePairCount, 191);
  assert.equal(ziyarat.records.length, 481);
  assert.equal(ziyarat.sourcePairCount, 483);
  assert.equal(ziyarat.records[98].source_pair_end, 100);
  assert.equal(ziyarat.records[419].source_pair_end, 422);
  for (const reading of [dua, ziyarat]) {
    assert.equal(reading.sourceStatus, 'imported-review-required');
    assert.equal(reading.source.provider, 'Duas.org');
    assert.ok(reading.source.terms_url.includes('about-us'));
    assert.ok(reading.attribution.includes('freely used'));
  }
});

test('Nahiya and Alqama source ranges are continuous and recitation segments are repeatable', () => {
  const dua = JSON.parse(readFileSync(new URL('../data/duas/source/dua-alqama.json', import.meta.url), 'utf8'));
  const ziyarat = JSON.parse(readFileSync(new URL('../data/ziyarats/source/ziyarat-nahiya.json', import.meta.url), 'utf8'));
  for (const reading of [dua, ziyarat]) {
    const records = reading.records;
    assert.deepEqual(records.map(item => item.sequence), Array.from({ length: records.length }, (_, i) => i + 1));
    assert.equal(new Set(records.map(item => item.id)).size, records.length);
    assert.equal(records[0].source_pair_start, 1);
    assert.equal(records.at(-1).source_pair_end, reading.sourcePairCount);
    assert.ok(records.every(item => item.recitation_segment && item.recitation_segment.repeatable));
    for (let i = 1; i < records.length; i++) {
      assert.equal(records[i].source_pair_start, records[i - 1].source_pair_end + 1);
    }
  }
  const nahiyaManifest = JSON.parse(readFileSync(new URL('../data/ziyarats/ziyarat-nahiya/manifest.json', import.meta.url), 'utf8'));
  const alqamaManifest = JSON.parse(readFileSync(new URL('../data/duas/dua-alqama/manifest.json', import.meta.url), 'utf8'));
  assert.equal(nahiyaManifest.recordCount, 481);
  assert.equal(nahiyaManifest.chunks[0].start, 1);
  assert.equal(nahiyaManifest.chunks.at(-1).end, 481);
  assert.equal(alqamaManifest.recordCount, 191);
  assert.equal(alqamaManifest.chunks.at(-1).end, 191);
});

test('all imported source records have non-empty Arabic, transliteration, and English fields', () => {
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

test('no imported reading is silently promoted to verified status', () => {
  for (const item of [...duas.texts, ...ziyarats.texts]) assert.notEqual(item.sourceStatus, 'verified', item.id);
});
