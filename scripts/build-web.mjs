import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { splitQuranData } from './split-quran.mjs';
import { validateCollectionManifest } from './content-catalog.mjs';

const root = process.cwd();
const output = resolve(root, 'www');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
mkdirSync(resolve(output, 'data'), { recursive: true });

for (const path of ['index.html', 'static', 'assets', 'data/hadith', 'data/duas', 'data/ziyarats']) {
  cpSync(resolve(root, path), resolve(output, path), { recursive: true });
}

// Ship only committed collection manifests and generated payloads. Canonical
// source JSON stays in the repository and is not duplicated in the app bundle.
for (const collection of ['duas', 'ziyarats']) {
  const collectionDir = resolve(root, 'data', collection);
  const manifestPath = resolve(collectionDir, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error('Missing ' + collection + ' collection manifest.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  validateCollectionManifest(collection, manifest);
  const outputDir = resolve(output, 'data', collection);
  mkdirSync(outputDir, { recursive: true });
  cpSync(manifestPath, resolve(outputDir, 'manifest.json'));
  for (const text of manifest.texts) {
    const textDir = resolve(collectionDir, text.id);
    if (!existsSync(resolve(textDir, 'manifest.json'))) {
      throw new Error('Missing generated reading manifest for ' + collection + '/' + text.id);
    }
    cpSync(textDir, resolve(outputDir, text.id), { recursive: true });
  }
}

// Ship pre-generated, version-controlled Quran chunks. Ordinary builds never
// regenerate them, and Dua/Ziyarat generation never reads the canonical Quran JSON.
const quranChunks = resolve(root, 'data/quran/chunked');
if (!existsSync(resolve(quranChunks, 'manifest.json'))) {
  splitQuranData(resolve(root, 'data/quran/all_suras.json'), quranChunks);
}
cpSync(quranChunks, resolve(output, 'data/quran/chunked'), { recursive: true });

await build({
  entryPoints: [resolve(root, 'static/js/native-storage-adapter.mjs')],
  outfile: resolve(output, 'static/js/native-storage-adapter.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020']
});

const indexPath = resolve(output, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');
const appScript = '<script src="static/js/app.js" defer></script>';
if (!indexHtml.includes(appScript)) throw new Error('Could not find the app.js script tag to prepare the Capacitor bridge.');
writeFileSync(indexPath, indexHtml.replace(appScript, '<script src="capacitor.js"></script>\n' + appScript));
rmSync(resolve(output, 'static/js/native-storage-adapter.mjs'), { force: true });
console.log('Built QuranMemorizer web assets with committed Quran, Dua, and Ziyarat content collections.');
