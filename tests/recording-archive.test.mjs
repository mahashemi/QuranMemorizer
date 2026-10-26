import assert from 'node:assert/strict';
import test from 'node:test';
import { createZip, readZip } from '../static/js/recording-archive.mjs';

test('ZIP export/import preserves nested audio and manifest files', async () => {
  const audio = new Blob([new Uint8Array([0, 1, 2, 3, 127, 255])], { type: 'audio/webm' });
  const manifest = new Blob([JSON.stringify({ schemaVersion: 1, app: 'QuranMemorizer' })], { type: 'application/json' });
  const zip = await createZip([
    { name: 'QuranMemorizer/recordings/surah-001-al-fatihah/ayah-001.webm', data: audio },
    { name: 'QuranMemorizer/recordings/manifest.json', data: manifest }
  ]);
  const entries = await readZip(zip);

  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map(entry => entry.name).sort(), [
    'QuranMemorizer/recordings/manifest.json',
    'QuranMemorizer/recordings/surah-001-al-fatihah/ayah-001.webm'
  ]);
  const restoredAudio = entries.find(entry => entry.name.endsWith('.webm'));
  assert.deepEqual(Array.from(new Uint8Array(await restoredAudio.blob.arrayBuffer())), [0, 1, 2, 3, 127, 255]);
  const restoredManifest = entries.find(entry => entry.name.endsWith('manifest.json'));
  assert.equal(JSON.parse(await restoredManifest.blob.text()).app, 'QuranMemorizer');
});

test('ZIP creator rejects unsafe relative paths', async () => {
  await assert.rejects(
    createZip([{ name: '../outside.webm', data: new Blob(['not allowed']) }]),
    /relative|segments/i
  );
});

test('ZIP reader rejects malformed input', async () => {
  await assert.rejects(readZip(new Blob(['not a ZIP archive'])), /ZIP|directory/i);
});

test('ZIP reader detects a corrupted audio payload', async () => {
  const zip = await createZip([{
    name: 'QuranMemorizer/recordings/surah-001-al-fatihah/ayah-001.webm',
    data: new Blob(['audio-payload'])
  }]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  let payloadIndex = -1;
  const target = new TextEncoder().encode('audio-payload');
  outer: for (let i = 0; i <= bytes.length - target.length; i++) {
    for (let j = 0; j < target.length; j++) if (bytes[i + j] !== target[j]) continue outer;
    payloadIndex = i;
    break;
  }
  assert.notEqual(payloadIndex, -1);
  bytes[payloadIndex + 3] ^= 0x01;
  await assert.rejects(readZip(new Blob([bytes])), /integrity check/i);
});
