import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'www');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const path of ['index.html', 'static', 'data/quran']) {
  cpSync(resolve(root, path), resolve(output, path), { recursive: true });
}

console.log('Built QuranMemorizer web assets into ./www (Qur’an text only; ignored audio is not copied).');
