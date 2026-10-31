const SURAH_COUNT = 114;

export function ayahElementId(surah, ayah) {
  const s = Number(surah), a = Number(ayah);
  if (!Number.isInteger(s) || s < 1 || s > SURAH_COUNT || !Number.isInteger(a) || a < 1) throw new RangeError('Surah and ayah must be positive integers in range.');
  return 'ayah-' + s + '-' + a;
}

export function buildAyahHash(surah, ayah) {
  const id = ayahElementId(surah, ayah);
  const [, s, a] = id.match(/^ayah-(\d+)-(\d+)$/);
  return '#/surah/' + s + '/ayah/' + a;
}

export function parseAyahHash(hash) {
  const match = String(hash || '').match(/^#\/surah\/(\d+)\/ayah\/(\d+)\/?$/i);
  if (!match) return null;
  const surah = Number(match[1]), ayah = Number(match[2]);
  if (!Number.isInteger(surah) || surah < 1 || surah > SURAH_COUNT || !Number.isInteger(ayah) || ayah < 1) return null;
  return { surah, ayah };
}

export function buildAyahUrl(surah, ayah, baseUrl) {
  const url = new URL(baseUrl || 'https://mahashemi.github.io/QuranMemorizer/');
  url.hash = buildAyahHash(surah, ayah);
  return url.href;
}

export function parseAyahUrl(value) {
  try { return parseAyahHash(new URL(value, 'https://mahashemi.github.io').hash); }
  catch { return null; }
}
