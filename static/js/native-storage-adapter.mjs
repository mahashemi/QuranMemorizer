import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const SURAH_NAMES = [
  'al-fatihah',
  'al-baqarah',
  'ali-imran',
  'an-nisa',
  'al-ma-idah',
  'al-an-am',
  'al-a-raf',
  'al-anfal',
  'at-tawbah',
  'yunus',
  'hud',
  'yusuf',
  'ar-ra-d',
  'ibrahim',
  'al-hijr',
  'an-nahl',
  'al-isra',
  'al-kahf',
  'maryam',
  'ta-ha',
  'al-anbiya',
  'al-hajj',
  'al-mu-minun',
  'an-nur',
  'al-furqan',
  'ash-shu-ara',
  'an-naml',
  'al-qasas',
  'al-ankabut',
  'ar-rum',
  'luqman',
  'as-sajdah',
  'al-ahzab',
  'saba',
  'fatir',
  'ya-sin',
  'as-saffat',
  'sad',
  'az-zumar',
  'ghafir',
  'fussilat',
  'ash-shura',
  'az-zukhruf',
  'ad-dukhan',
  'al-jathiyah',
  'al-ahqaf',
  'muhammad',
  'al-fath',
  'al-hujurat',
  'qaf',
  'adh-dhariyat',
  'at-tur',
  'an-najm',
  'al-qamar',
  'ar-rahman',
  'al-waqi-ah',
  'al-hadid',
  'al-mujadilah',
  'al-hashr',
  'al-mumtahanah',
  'as-saff',
  'al-jumu-ah',
  'al-munafiqun',
  'at-taghabun',
  'at-talaq',
  'at-tahrim',
  'al-mulk',
  'al-qalam',
  'al-haqqah',
  'al-ma-arij',
  'nuh',
  'al-jinn',
  'al-muzzammil',
  'al-muddaththir',
  'al-qiyamah',
  'al-insan',
  'al-mursalat',
  'an-naba',
  'an-nazi-at',
  'abasa',
  'at-takwir',
  'al-infitar',
  'al-mutaffifin',
  'al-inshiqaq',
  'al-buruj',
  'at-tariq',
  'al-a-la',
  'al-ghashiyah',
  'al-fajr',
  'al-balad',
  'ash-shams',
  'al-layl',
  'ad-duha',
  'ash-sharh',
  'at-tin',
  'al-alaq',
  'al-qadr',
  'al-bayyinah',
  'az-zalzalah',
  'al-adiyat',
  'al-qari-ah',
  'at-takathur',
  'al-asr',
  'al-humazah',
  'al-fil',
  'quraysh',
  'al-ma-un',
  'al-kawthar',
  'al-kafirun',
  'an-nasr',
  'al-masad',
  'al-ikhlas',
  'al-falaq',
  'an-nas'
];
const EXTENSIONS = ['webm', 'm4a', 'mp4', 'ogg', 'wav', 'aac'];
const surahFileNames = new Map();
const mimeForExtension = ext => ({ webm: 'audio/webm', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac' }[ext] || 'application/octet-stream');
const extensionForMime = mime => {
  const type = String(mime || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('aac')) return 'aac';
  return 'webm';
};
const pathFor = (sura, aya, ext) => {
  const name = SURAH_NAMES[sura - 1] || ('surah-' + String(sura).padStart(3, '0'));
  return 'recordings/surah-' + String(sura).padStart(3, '0') + '-' + name +
    '/ayah-' + String(aya).padStart(3, '0') + '.' + ext;
};
async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}
function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
function isMissingFile(error) {
  const message = String(error && (error.message || error));
  return /does not exist|not found|no such file|ENOENT/i.test(message);
}
async function getSurahFileNames(sura) {
  if (surahFileNames.has(sura)) return surahFileNames.get(sura);
  const lookup = (async () => {
    const directoryPath = pathFor(sura, 1, 'webm').replace(/\/ayah-\d{3}\.webm$/, '');
    try {
      const listing = await Filesystem.readdir({ path: directoryPath, directory: Directory.Data });
      return new Set((listing.files || []).map(item => item.name));
    } catch (error) {
      if (isMissingFile(error)) return new Set();
      throw error;
    }
  })();
  surahFileNames.set(sura, lookup);
  try {
    return await lookup;
  } catch (error) {
    surahFileNames.delete(sura);
    throw error;
  }
}
async function read(sura, aya) {
  const names = await getSurahFileNames(sura);
  const ext = EXTENSIONS.find(candidate => names.has('ayah-' + String(aya).padStart(3, '0') + '.' + candidate));
  if (!ext) return null;
  const path = pathFor(sura, aya, ext);
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data });
    if (typeof result.data !== 'string') return null;
    const mimeType = mimeForExtension(ext);
    return {
      key: sura + ':' + aya, sura, aya,
      blob: base64ToBlob(result.data, mimeType),
      mimeType, fileName: path.split('/').pop(), updatedAt: Date.now(), storage: 'native'
    };
  } catch (error) {
    if (isMissingFile(error)) {
      surahFileNames.delete(sura);
      return null;
    }
    throw error;
  }
}
async function write(sura, aya, blob) {
  const ext = extensionForMime(blob.type);
  const path = pathFor(sura, aya, ext);
  const data = await blobToBase64(blob);
  await Filesystem.writeFile({
    path, directory: Directory.Data, recursive: true, data
  });
  for (const oldExt of EXTENSIONS) {
    if (oldExt === ext) continue;
    try { await Filesystem.deleteFile({ path: pathFor(sura, aya, oldExt), directory: Directory.Data }); }
    catch (_) { /* An old extension is optional. */ }
  }
  surahFileNames.delete(sura);
  return {
    key: sura + ':' + aya, sura, aya, blob,
    mimeType: blob.type || mimeForExtension(ext),
    fileName: path.split('/').pop(), updatedAt: Date.now(), storage: 'native'
  };
}
async function remove(sura, aya) {
  for (const ext of EXTENSIONS) {
    try { await Filesystem.deleteFile({ path: pathFor(sura, aya, ext), directory: Directory.Data }); }
    catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
  surahFileNames.delete(sura);
}

// List existing recordings for portable export without probing every possible ayah/extension.
async function list() {
  const recordings = [];
  async function visit(directoryPath) {
    let listing;
    try {
      listing = await Filesystem.readdir({ path: directoryPath, directory: Directory.Data });
    } catch (error) {
      if (isMissingFile(error)) return;
      throw error;
    }
    for (const item of (listing.files || [])) {
      const childPath = directoryPath + '/' + item.name;
      if (item.type === 'directory') {
        await visit(childPath);
        continue;
      }
      const match = childPath.match(/^recordings\/(surah-\d{3}-[^/]+)\/(ayah-\d{3})\.(webm|m4a|mp4|ogg|wav|aac)$/i);
      if (!match) continue;
      const result = await Filesystem.readFile({ path: childPath, directory: Directory.Data });
      if (typeof result.data !== 'string') continue;
      const sura = Number(match[1].match(/^surah-(\d{3})-/i)[1]);
      const aya = Number(match[2].slice(5));
      const extension = match[3].toLowerCase();
      const mimeType = mimeForExtension(extension);
      recordings.push({
        name: match[1] + '/' + match[2] + '.' + extension,
        sura,
        aya,
        blob: base64ToBlob(result.data, mimeType),
        mimeType,
        storage: 'native'
      });
    }
  }
  await visit('recordings');
  return recordings;
}
window.QuranMemorizerNativeStorage = {
  available: Capacitor.isNativePlatform(),
  read,
  write,
  remove,
  list
};
