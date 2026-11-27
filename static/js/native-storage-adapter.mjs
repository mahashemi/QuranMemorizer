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
const recordingFileNames = new Map();
const mimeForExtension = ext => ({ webm: 'audio/webm', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac' }[ext] || 'application/octet-stream');
const extensionForMime = mime => {
  const type = String(mime || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('aac')) return 'aac';
  return 'webm';
};
function identityFor(sura, aya) {
  if (sura && typeof sura === 'object') {
    if (sura.collection) {
      const identity = { collection: String(sura.collection), readingId: String(sura.readingId), section: Number(aya ?? sura.section) };
      if (!['duas', 'ziyarats'].includes(identity.collection) || !/^[a-z0-9-]+$/i.test(identity.readingId) || !Number.isInteger(identity.section) || identity.section < 1 || identity.section > 1000) throw new Error('Invalid collection recording identity.');
      return identity;
    }
    return { sura: Number(sura.sura), aya: Number(aya ?? sura.aya) };
  }
  return { sura: Number(sura), aya: Number(aya) };
}
function identityKey(identity) {
  return identity.collection ? 'collection:' + identity.collection + ':' + identity.readingId + ':' + identity.section : identity.sura + ':' + identity.aya;
}
function folderKey(identity) {
  return identity.collection ? 'collection:' + identity.collection + ':' + identity.readingId : 'surah:' + identity.sura;
}
function directoryPathFor(identity) {
  if (identity.collection) return 'recordings/collections/' + identity.collection + '/' + identity.readingId;
  const name = SURAH_NAMES[identity.sura - 1] || ('surah-' + String(identity.sura).padStart(3, '0'));
  return 'recordings/surah-' + String(identity.sura).padStart(3, '0') + '-' + name;
}
function pathFor(sura, aya, ext) {
  const identity = identityFor(sura, aya);
  const number = identity.collection ? identity.section : identity.aya;
  return directoryPathFor(identity) + '/' + (identity.collection ? 'passage-' : 'ayah-') + String(number).padStart(3, '0') + '.' + ext;
}
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
async function getRecordingFileNames(identity) {
  const key = folderKey(identity);
  if (recordingFileNames.has(key)) return recordingFileNames.get(key);
  const lookup = (async () => {
    try {
      const listing = await Filesystem.readdir({ path: directoryPathFor(identity), directory: Directory.Data });
      return new Set((listing.files || []).map(item => item.name));
    } catch (error) {
      if (isMissingFile(error)) return new Set();
      throw error;
    }
  })();
  recordingFileNames.set(key, lookup);
  try { return await lookup; }
  catch (error) { recordingFileNames.delete(key); throw error; }
}
async function read(sura, aya) {
  const identity = identityFor(sura, aya);
  const number = identity.collection ? identity.section : identity.aya;
  const prefix = identity.collection ? 'passage-' : 'ayah-';
  const names = await getRecordingFileNames(identity);
  const stem = prefix + String(number).padStart(3, '0') + '.';
  const ext = EXTENSIONS.find(candidate => names.has(stem + candidate));
  if (!ext) return null;
  const path = pathFor(identity, undefined, ext);
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data });
    if (typeof result.data !== 'string') return null;
    const mimeType = mimeForExtension(ext);
    return { key: identityKey(identity), ...identity, blob: base64ToBlob(result.data, mimeType), mimeType, fileName: path.split('/').pop(), updatedAt: Date.now(), storage: 'native' };
  } catch (error) {
    if (isMissingFile(error)) { recordingFileNames.delete(folderKey(identity)); return null; }
    throw error;
  }
}
async function write(sura, aya, blob) {
  const identity = identityFor(sura, aya);
  const ext = extensionForMime(blob.type);
  const path = pathFor(identity, undefined, ext);
  await Filesystem.writeFile({ path, directory: Directory.Data, recursive: true, data: await blobToBase64(blob) });
  for (const oldExt of EXTENSIONS) {
    if (oldExt === ext) continue;
    try { await Filesystem.deleteFile({ path: pathFor(identity, undefined, oldExt), directory: Directory.Data }); }
    catch (_) { /* An old extension is optional. */ }
  }
  recordingFileNames.delete(folderKey(identity));
  return { key: identityKey(identity), ...identity, blob, mimeType: blob.type || mimeForExtension(ext), fileName: path.split('/').pop(), updatedAt: Date.now(), storage: 'native' };
}
async function remove(sura, aya) {
  const identity = identityFor(sura, aya);
  for (const ext of EXTENSIONS) {
    try { await Filesystem.deleteFile({ path: pathFor(identity, undefined, ext), directory: Directory.Data }); }
    catch (error) { if (!isMissingFile(error)) throw error; }
  }
  recordingFileNames.delete(folderKey(identity));
}

async function list() {
  const recordings = [];
  async function visit(directoryPath) {
    let listing;
    try { listing = await Filesystem.readdir({ path: directoryPath, directory: Directory.Data }); }
    catch (error) { if (isMissingFile(error)) return; throw error; }
    for (const item of (listing.files || [])) {
      const childPath = directoryPath + '/' + item.name;
      if (item.type === 'directory') { await visit(childPath); continue; }
      const quranMatch = childPath.match(/^recordings\/(surah-(\d{3})-[^/]+)\/(ayah-(\d{3}))\.(webm|m4a|mp4|ogg|wav|aac)$/i);
      const collectionMatch = childPath.match(/^recordings\/collections\/(duas|ziyarats)\/([a-z0-9-]+)\/(passage-(\d{3}))\.(webm|m4a|mp4|ogg|wav|aac)$/i);
      if (!quranMatch && !collectionMatch) continue;
      const result = await Filesystem.readFile({ path: childPath, directory: Directory.Data });
      if (typeof result.data !== 'string') continue;
      const extension = (quranMatch ? quranMatch[5] : collectionMatch[5]).toLowerCase();
      const identity = quranMatch
        ? { sura: Number(quranMatch[2]), aya: Number(quranMatch[4]) }
        : { collection: collectionMatch[1].toLowerCase(), readingId: collectionMatch[2], section: Number(collectionMatch[4]) };
      recordings.push({ name: childPath.replace(/^recordings\//, ''), key: identityKey(identity), ...identity, blob: base64ToBlob(result.data, mimeForExtension(extension)), mimeType: mimeForExtension(extension), storage: 'native' });
    }
  }
  await visit('recordings');
  return recordings;
}
const recitationPathFor = (sura, aya) =>
  'recitations/minshawi_murattal/' + String(sura).padStart(3, '0') + String(aya).padStart(3, '0') + '.mp3';

async function readRecitation(sura, aya) {
  const path = recitationPathFor(sura, aya);
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data });
    if (typeof result.data !== 'string') return null;
    const blob = base64ToBlob(result.data, 'audio/mpeg');
    return {
      key: 'minshawi_murattal:' + sura + ':' + aya,
      sura, aya, reciter: 'minshawi_murattal', blob, size: blob.size,
      savedAt: Date.now(), fileName: path.split('/').pop(), storage: 'native'
    };
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

async function writeRecitation(sura, aya, blob) {
  const path = recitationPathFor(sura, aya);
  await Filesystem.writeFile({
    path,
    directory: Directory.Data,
    recursive: true,
    data: await blobToBase64(blob)
  });
  return {
    key: 'minshawi_murattal:' + sura + ':' + aya,
    sura, aya, reciter: 'minshawi_murattal', blob, size: blob.size,
    savedAt: Date.now(), fileName: path.split('/').pop(), storage: 'native'
  };
}

window.QuranMemorizerNativeStorage = {
  available: Capacitor.isNativePlatform(),
  read,
  write,
  remove,
  list,
  readRecitation,
  writeRecitation
};
