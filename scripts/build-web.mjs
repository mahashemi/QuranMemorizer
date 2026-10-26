import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const output = resolve(root, 'www');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
mkdirSync(resolve(output, 'data'), { recursive: true });

for (const path of ['index.html', 'static', 'data/quran', 'data/hadith']) {
  cpSync(resolve(root, path), resolve(output, path), { recursive: true });
}

// Bundle the Capacitor plugin adapter only into native web assets. The ordinary
// GitHub Pages build remains dependency-free and uses the browser storage path.
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
if (!indexHtml.includes(appScript)) {
  throw new Error('Could not find the app.js script tag to prepare the Capacitor bridge.');
}
writeFileSync(indexPath, indexHtml.replace(
  appScript,
  '<script src="capacitor.js"></script>\n' + appScript
));

console.log('Built QuranMemorizer web assets into ./www with native app-private recording support.');
