import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chunkRecords, createContentManifest } from './content-chunks.mjs';

const COLLECTIONS = ['duas', 'ziyarats'];
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readSources(sourceDir) {
  if (!existsSync(sourceDir)) return [];
  return readdirSync(sourceDir).filter(name => name.endsWith('.json')).sort().map(name => {
    const source = JSON.parse(readFileSync(join(sourceDir, name), 'utf8'));
    if (!source || !SAFE_ID.test(source.id || '') || !source.title ||
        !Array.isArray(source.records) || source.records.length === 0) {
      throw new Error('Invalid reading source file: ' + name);
    }
    if (name !== source.id + '.json') {
      throw new Error('Source filename must match its stable id: ' + source.id);
    }
    return source;
  });
}

export function buildReadingCollection(rootDir, collection) {
  if (!COLLECTIONS.includes(collection)) throw new Error('Unknown collection: ' + collection);
  const collectionDir = resolve(rootDir, 'data', collection);
  const sourceDir = join(collectionDir, 'source');
  const sources = readSources(sourceDir);
  const ids = new Set();
  const texts = [];

  for (const source of sources) {
    if (ids.has(source.id)) throw new Error('Duplicate reading id: ' + source.id);
    ids.add(source.id);
    const kind = collection === 'duas' ? 'dua' : 'ziyarat';
    const outputDir = join(collectionDir, source.id);
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    const chunks = chunkRecords(source.records, 10);
    for (const chunk of chunks) {
      writeFileSync(join(outputDir, chunk.file), JSON.stringify(chunk.records) + '\n');
    }
    const manifest = createContentManifest({
      id: source.id,
      title: source.title,
      kind,
      records: source.records,
      chunkSize: 10
    });
    writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    texts.push({
      id: source.id,
      title: source.title,
      arabicTitle: source.arabicTitle || '',
      description: source.description || '',
      occasion: source.occasion || '',
      attribution: source.attribution || '',
      source: source.source || null,
      manifest: source.id + '/manifest.json'
    });
  }

  const collectionManifest = { version: 1, collection, texts };
  writeFileSync(join(collectionDir, 'manifest.json'), JSON.stringify(collectionManifest, null, 2) + '\n');
  return collectionManifest;
}

export function buildAllReadingCollections(rootDir = process.cwd()) {
  return Object.fromEntries(COLLECTIONS.map(collection => [
    collection,
    buildReadingCollection(rootDir, collection)
  ]));
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const result = buildAllReadingCollections(resolve('.'));
  for (const [collection, manifest] of Object.entries(result)) {
    console.log('Generated ' + manifest.texts.length + ' ' + collection + ' reading(s).');
  }
}
