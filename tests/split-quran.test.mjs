import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { splitQuranData } from '../scripts/split-quran.mjs';
import { chunkRecords, createContentManifest } from '../scripts/content-chunks.mjs';

test('splitter writes 114 chapter folders and preserves every source Ayah record', () => {
  const root = mkdtempSync(join(tmpdir(), 'quran-chapters-'));
  try {
    const source = {};
    for (let number = 1; number <= 114; number++) {
      source['سورة ' + number + ' - اسم ' + number] = [
        { arabic_text: 'نص ' + number, english_text: 'Text ' + number, extra_field: number },
        { arabic_text: 'نص ثان ' + number, transliteration: 'second ' + number }
      ];
    }
    const sourcePath = join(root, 'all_suras.json');
    const output = join(root, 'generated');
    writeFileSync(sourcePath, JSON.stringify(source));
    const manifest = splitQuranData(sourcePath, output);

    assert.equal(manifest.length, 114);
    assert.deepEqual(JSON.parse(readFileSync(join(output, 'chapter_2', 'chapter.json'), 'utf8')), source['سورة 2 - اسم 2']);
    assert.deepEqual(JSON.parse(readFileSync(join(output, 'chapter_114', 'chapter.json'), 'utf8')), source['سورة 114 - اسم 114']);
    const savedManifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
    assert.equal(savedManifest.chapters[1].ayaCount, 2);
    assert.equal(savedManifest.chapters[113].number, 114);
    assert.equal(savedManifest.chapters[1].manifest, 'chapter_2/manifest.json');
    const chapterManifest = JSON.parse(readFileSync(join(output, 'chapter_2', 'manifest.json'), 'utf8'));
    assert.equal(chapterManifest.recordCount, 2);
    assert.deepEqual(chapterManifest.chunks.map(({ start, end }) => [start, end]), [[1, 2]]);
    assert.deepEqual(JSON.parse(readFileSync(join(output, 'chapter_2', 'ayat_001_002.json'), 'utf8')), source['سورة 2 - اسم 2']);
    assert.equal(readFileSync(sourcePath, 'utf8'), JSON.stringify(source));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('splitter refuses incomplete source data instead of silently publishing missing Surahs', () => {
  const root = mkdtempSync(join(tmpdir(), 'quran-chapters-invalid-'));
  try {
    const sourcePath = join(root, 'all_suras.json');
    writeFileSync(sourcePath, JSON.stringify({ 'سورة 1 - الفاتحة': [{ arabic_text: 'بسم الله' }] }));
    assert.throws(() => splitQuranData(sourcePath, join(root, 'generated')), /exactly 114 Surahs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test('shared chunk primitives preserve logical records and create generic manifests', () => {
  const records = Array.from({ length: 23 }, (_, index) => ({ id: index + 1, text: 'passage ' + (index + 1) }));
  const chunks = chunkRecords(records, 10);
  assert.deepEqual(chunks.map(({ start, end }) => [start, end]), [[1, 10], [11, 20], [21, 23]]);
  assert.deepEqual(chunks.flatMap(chunk => chunk.records), records);
  assert.equal(chunks[0].file, 'segments_001_010.json');
  const manifest = createContentManifest({ id: 'dua-kumayl', title: 'Dua Kumayl', kind: 'dua', records, chunkSize: 10 });
  assert.equal(manifest.recordCount, 23);
  assert.deepEqual(manifest.chunks.map(({ start, end }) => [start, end]), [[1, 10], [11, 20], [21, 23]]);
});
