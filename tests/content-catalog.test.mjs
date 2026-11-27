import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectionKind,
  createReadingHash,
  parseReadingHash,
  validateCollectionManifest,
  validateReadingManifest
} from '../scripts/content-catalog.mjs';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReadingCollection } from '../scripts/build-readings.mjs';

test('collection and reading manifests validate stable IDs and contiguous chunks', () => {
  const collection = { version: 1, collection: 'duas', texts: [
    { id: 'dua-kumayl', title: 'Dua Kumayl', manifest: 'dua-kumayl/manifest.json' }
  ] };
  assert.equal(validateCollectionManifest('duas', collection), collection);
  const reading = { version: 1, id: 'dua-kumayl', kind: 'dua', recordCount: 12, chunkSize: 10, chunks: [
    { start: 1, end: 10, file: 'segments_001_010.json' },
    { start: 11, end: 12, file: 'segments_011_012.json' }
  ] };
  assert.equal(validateReadingManifest(reading, 'dua-kumayl', 'dua'), reading);
  assert.throws(() => validateCollectionManifest('duas', {
    version: 1, collection: 'duas', texts: [
      { id: '../escape', title: 'Bad', manifest: '../manifest.json' }
    ]
  }), /invalid or duplicate text id/);
  assert.throws(() => validateReadingManifest({
    ...reading, chunks: [{ start: 2, end: 12, file: 'segments_002_012.json' }]
  }, 'dua-kumayl', 'dua'), /non-contiguous/);
});

test('Dua and Ziyarat routes are canonical and keep their collection identity', () => {
  assert.equal(collectionKind('duas'), 'dua');
  assert.equal(collectionKind('ziyarats'), 'ziyarat');
  assert.deepEqual(parseReadingHash('#/dua/dua-kumayl/section/12'), {
    collection: 'duas', kind: 'dua', id: 'dua-kumayl', section: 12
  });
  assert.deepEqual(parseReadingHash('#/ziyarat/ziyarat-ashura/section/4'), {
    collection: 'ziyarats', kind: 'ziyarat', id: 'ziyarat-ashura', section: 4
  });
  assert.equal(createReadingHash('duas', 'dua-kumayl', 12), '#/dua/dua-kumayl/section/12');
  assert.equal(parseReadingHash('#/dua/../section/2'), null);
  assert.equal(parseReadingHash('#/dua/dua-kumayl/section/0'), null);
});

test('reading collection builder preserves complete records and emits shared chunks', () => {
  const root = mkdtempSync(join(tmpdir(), 'reading-collection-'));
  try {
    const sourceDir = join(root, 'data', 'duas', 'source');
    mkdirSync(sourceDir, { recursive: true });
    const records = Array.from({ length: 12 }, (_, index) => ({
      section: index + 1,
      arabic_text: 'نص ' + (index + 1),
      english_text: 'Passage ' + (index + 1),
      persian_text: 'ترجمه ' + (index + 1)
    }));
    writeFileSync(join(sourceDir, 'dua-kumayl.json'), JSON.stringify({
      id: 'dua-kumayl',
      title: 'Dua Kumayl',
      arabicTitle: 'دعاء كميل',
      attribution: 'Attributed to Imam Ali (a)',
      source: { title: 'Verified source', url: 'https://example.org/source' },
      records
    }));
    const manifest = buildReadingCollection(root, 'duas');
    assert.equal(manifest.texts.length, 1);
    assert.equal(manifest.texts[0].id, 'dua-kumayl');
    const textDir = join(root, 'data', 'duas', 'dua-kumayl');
    const textManifest = JSON.parse(readFileSync(join(textDir, 'manifest.json'), 'utf8'));
    assert.deepEqual(textManifest.chunks.map(({ start, end }) => [start, end]), [[1, 10], [11, 12]]);
    assert.deepEqual(JSON.parse(readFileSync(join(textDir, 'segments_001_010.json'), 'utf8')), records.slice(0, 10));
    assert.deepEqual(JSON.parse(readFileSync(join(textDir, 'segments_011_012.json'), 'utf8')), records.slice(10));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
