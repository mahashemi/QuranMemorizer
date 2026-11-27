const COLLECTIONS = Object.freeze({ duas: 'dua', ziyarats: 'ziyarat' });
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_FILE = /^segments_\d{3,}_\d{3,}\.json$/;

export function collectionKind(collection) {
  return COLLECTIONS[collection] || null;
}

export function validateCollectionManifest(collection, manifest) {
  if (!collectionKind(collection)) throw new Error('Unknown reading collection: ' + collection);
  if (!manifest || manifest.version !== 1 || manifest.collection !== collection || !Array.isArray(manifest.texts)) {
    throw new Error('Invalid ' + collection + ' collection manifest.');
  }
  const ids = new Set();
  for (const text of manifest.texts) {
    if (!text || !SAFE_ID.test(text.id || '') || ids.has(text.id)) {
      throw new Error('Collection contains an invalid or duplicate text id.');
    }
    if (!text.title || typeof text.title !== 'string' || text.manifest !== text.id + '/manifest.json') {
      throw new Error('Collection entry ' + text.id + ' is missing safe metadata or manifest path.');
    }
    ids.add(text.id);
  }
  return manifest;
}

export function validateReadingManifest(manifest, expectedId, expectedKind) {
  if (!manifest || manifest.version !== 1 || manifest.id !== expectedId || manifest.kind !== expectedKind ||
      !Array.isArray(manifest.chunks) || !Number.isInteger(manifest.recordCount) || manifest.recordCount < 1) {
    throw new Error('Invalid reading manifest for ' + expectedId + '.');
  }
  let nextStart = 1;
  for (const chunk of manifest.chunks) {
    if (!chunk || chunk.start !== nextStart || !Number.isInteger(chunk.end) ||
        chunk.end < chunk.start || chunk.end > manifest.recordCount || !SAFE_FILE.test(chunk.file || '')) {
      throw new Error('Invalid or non-contiguous chunk entry in ' + expectedId + '.');
    }
    nextStart = chunk.end + 1;
  }
  if (nextStart !== manifest.recordCount + 1) {
    throw new Error('Reading manifest does not cover every record in ' + expectedId + '.');
  }
  return manifest;
}

export function parseReadingHash(hash) {
  const match = String(hash || '').match(/^#\/(dua|ziyarat)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/section\/(\d+)\/?$/i);
  if (!match) return null;
  const section = Number(match[3]);
  if (!Number.isSafeInteger(section) || section < 1) return null;
  const kind = match[1].toLowerCase();
  return { collection: kind === 'dua' ? 'duas' : 'ziyarats', kind, id: match[2].toLowerCase(), section };
}

export function createReadingHash(collection, id, section = 1) {
  const kind = collectionKind(collection);
  if (!kind || !SAFE_ID.test(String(id || '')) || !Number.isSafeInteger(section) || section < 1) {
    throw new Error('Invalid reading route.');
  }
  return '#/' + kind + '/' + id + '/section/' + section;
}
