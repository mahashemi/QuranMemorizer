/**
 * Shared chunk primitives for Quran Ayahs and future Dua/Ziyarat reading units.
 * Records are kept intact: the caller chooses logical boundaries before chunking.
 */
export function chunkRecords(records, chunkSize = 10) {
  if (!Array.isArray(records)) throw new TypeError('Content records must be an array.');
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new RangeError('Chunk size must be a positive integer.');
  const chunks = [];
  for (let offset = 0; offset < records.length; offset += chunkSize) {
    const start = offset + 1;
    const end = Math.min(offset + chunkSize, records.length);
    chunks.push({
      start,
      end,
      records: records.slice(offset, end),
      file: 'segments_' + String(start).padStart(3, '0') + '_' + String(end).padStart(3, '0') + '.json'
    });
  }
  return chunks;
}

/**
 * Build a manifest for any ordered reading text. For Duas and Ziyarats,
 * pass paragraph/section-level records so a sentence or passage is never split.
 */
export function createContentManifest({ id, title, kind, records, chunkSize = 10 }) {
  if (!id || !title || !kind) throw new Error('Content id, title and kind are required.');
  const chunks = chunkRecords(records, chunkSize).map(({ start, end, file }) => ({ start, end, file }));
  return {
    version: 1,
    id,
    title,
    kind,
    recordCount: records.length,
    chunkSize,
    chunks
  };
}
