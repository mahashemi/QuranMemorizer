import assert from 'node:assert/strict';
import { createZip, readZip } from '../static/js/recording-archive.mjs';

const sourceEntries = [
  { name: 'recordings/surah-001-al-fatihah/ayah-001.webm', data: new Blob([new Uint8Array([0, 1, 2, 255])], { type: 'audio/webm' }) },
  { name: 'manifest.json', data: JSON.stringify({ schemaVersion: 1, recordings: [{ sura: 1, aya: 1 }] }) }
];

const archive = await createZip(sourceEntries);
assert.equal(archive.type, 'application/zip');

const extracted = await readZip(archive);
assert.equal(extracted.length, sourceEntries.length);

const audio = extracted.find(entry => entry.name.endsWith('.webm'));
assert.ok(audio, 'audio entry should survive ZIP round trip');
assert.deepEqual(
  Array.from(new Uint8Array(await audio.blob.arrayBuffer())),
  [0, 1, 2, 255]
);

const manifest = extracted.find(entry => entry.name === 'manifest.json');
assert.ok(manifest, 'manifest should survive ZIP round trip');
assert.deepEqual(
  JSON.parse(await manifest.blob.text()),
  { schemaVersion: 1, recordings: [{ sura: 1, aya: 1 }] }
);

await assert.rejects(
  createZip([{ name: '../outside.txt', data: 'unsafe' }]),
  /relative|cannot contain/
);

console.log('Recording ZIP round-trip and path-safety checks passed.');
