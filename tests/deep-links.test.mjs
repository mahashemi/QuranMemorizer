import test from 'node:test';
import assert from 'node:assert/strict';
import { ayahElementId, buildAyahHash, buildAyahUrl, parseAyahHash, parseAyahUrl } from '../static/js/deep-links.mjs';

test('creates globally unique ayah element IDs', () => {
  assert.equal(ayahElementId(2, 255), 'ayah-2-255');
  assert.notEqual(ayahElementId(1, 7), ayahElementId(2, 7));
});

test('builds canonical hash routes and URLs', () => {
  assert.equal(buildAyahHash(2, 255), '#/surah/2/ayah/255');
  assert.equal(buildAyahUrl(2, 255), 'https://mahashemi.github.io/QuranMemorizer/#/surah/2/ayah/255');
});

test('parses canonical hashes and full URLs', () => {
  assert.deepEqual(parseAyahHash('#/surah/2/ayah/255'), { surah: 2, ayah: 255 });
  assert.deepEqual(parseAyahUrl('https://example.org/app/#/surah/36/ayah/12'), { surah: 36, ayah: 12 });
});

test('rejects malformed and out-of-range routes', () => {
  assert.equal(parseAyahHash('#/surah/0/ayah/1'), null);
  assert.equal(parseAyahHash('#/surah/115/ayah/1'), null);
  assert.equal(parseAyahHash('#/surah/2/ayah/0'), null);
  assert.equal(parseAyahHash('#/surah/two/ayah/3'), null);
  assert.throws(() => ayahElementId(115, 1), RangeError);
});
