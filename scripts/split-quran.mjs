import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chunkRecords, createContentManifest } from './content-chunks.mjs';

const ENGLISH_NAMES = [
  "Al-Fatihah","Al-Baqarah","Ali 'Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal",
  "At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl",
  "Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur",
  "Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah",
  "Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir",
  "Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath",
  "Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah",
  "Al-Hadid","Al-Mujadilah","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun",
  "At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn",
  "Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa",
  "At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah",
  "Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq",
  "Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah",
  "Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas",
  "Al-Falaq","An-Nas"
];

export function splitQuranData(sourceFile, outputDir) {
  const raw = JSON.parse(readFileSync(sourceFile, 'utf8'));
  const chapters = new Map();

  for (const [key, ayas] of Object.entries(raw)) {
    const match = key.match(/سورة\s+(\d+)/);
    if (!match) continue;
    const number = Number(match[1]);
    if (!Number.isInteger(number) || number < 1 || number > 114 || chapters.has(number)) {
      throw new Error('Unexpected or duplicate Surah key in source Quran JSON: ' + key);
    }
    if (!Array.isArray(ayas) || ayas.length === 0) {
      throw new Error('Surah ' + number + ' has no Ayah array in source Quran JSON.');
    }
    const arabicName = (key.split(/[-–—]/)[0] || '').replace(/سورة/g, '').trim();
    chapters.set(number, { number, arabicName, ayas });
  }

  if (chapters.size !== 114) {
    throw new Error('Expected exactly 114 Surahs in source Quran JSON; found ' + chapters.size + '.');
  }

  // Only replace generated output after the canonical source has passed validation.
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const manifest = [];
  for (let number = 1; number <= 114; number++) {
    const chapter = chapters.get(number);
    if (!chapter) throw new Error('Missing Surah ' + number + ' in source Quran JSON.');
    const chapterDir = join(outputDir, 'chapter_' + number);
    mkdirSync(chapterDir, { recursive: true });
    const chunks = chunkRecords(chapter.ayas, 10);
    for (const chunk of chunks) {
      const filename = 'ayat_' + String(chunk.start).padStart(3, '0') + '_' + String(chunk.end).padStart(3, '0') + '.json';
      writeFileSync(join(chapterDir, filename), JSON.stringify(chunk.records));
    }
    const chapterManifest = createContentManifest({
      id: 'quran-surah-' + number,
      title: chapter.arabicName || ENGLISH_NAMES[number - 1],
      kind: 'quran-surah',
      records: chapter.ayas,
      chunkSize: 10
    });
    chapterManifest.chunks = chapterManifest.chunks.map(item => ({
      ...item,
      file: 'ayat_' + String(item.start).padStart(3, '0') + '_' + String(item.end).padStart(3, '0') + '.json'
    }));
    writeFileSync(join(chapterDir, 'manifest.json'), JSON.stringify(chapterManifest, null, 2) + '\n');
    manifest.push({
      number,
      arabicName: chapter.arabicName,
      englishName: ENGLISH_NAMES[number - 1] || ('Sura ' + number),
      ayaCount: chapter.ayas.length,
      manifest: 'chapter_' + number + '/manifest.json'
    });
  }
  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify({
    version: 1,
    chapters: manifest
  }, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const source = process.argv[2] || 'data/quran/all_suras.json';
  const output = process.argv[3] || 'data/quran/chunked';
  const manifest = splitQuranData(source, output);
  console.log('Generated ' + manifest.length + ' Surah manifests and Ayah chunks from the unchanged source Quran JSON.');
}
