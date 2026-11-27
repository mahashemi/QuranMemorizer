import { writeFile } from 'node:fs/promises';
import { load } from 'cheerio';

const USER_AGENT = 'QuranMemorizer-content-import/1.0 (+https://github.com/mahashemi/QuranMemorizer)';
const TERMS_URL = 'https://www.duas.org/mobile/about-us.html';
const sourceTerms = 'Duas.org states that its content may be freely used without copyright and appreciates a reference to the site.';
const sourceCaveat = 'Duas.org notes that errors may exist in Arabic text, punctuation, transliteration and translation, and that verifying authenticity or chains of narrators is beyond its scope. This import therefore remains review-required.';
const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();

async function fetchSource(url) {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok) throw new Error('Source request failed: ' + url + ' (HTTP ' + response.status + ')');
  return load(await response.text());
}
function values($, selector) {
  return $(selector).toArray().map(node => normalize($(node).text()));
}
function record(sequence, arabic, transliteration, english, sourceStart, sourceEnd = sourceStart) {
  const number = String(sequence).padStart(3, '0');
  return {
    id: 'passage-' + number,
    sequence,
    arabic_text: arabic,
    transliteration,
    english_text: english,
    source_pair_start: sourceStart,
    source_pair_end: sourceEnd,
    recitation_segment: {
      id: 'segment-' + number,
      title: 'Recitation segment ' + sequence,
      repeatable: true,
      suggested_repetitions: 3,
      pause_after: true
    }
  };
}
function sourceMeta(label, url) {
  return {
    provider: 'Duas.org',
    label,
    url,
    terms_url: TERMS_URL,
    license: sourceTerms
  };
}
async function importAlqama() {
  const url = 'https://www.duas.org/alqama.htm';
  const $ = await fetchSource(url);
  const arabic = values($, 'a1');
  const transliteration = values($, 't2');
  const english = values($, 't1');
  if (arabic.length !== 191 || transliteration.length !== 191 || english.length !== 191 ||
      arabic.some((v, i) => !v || !transliteration[i] || !english[i])) {
    throw new Error('Dua Alqama source shape changed or contains an incomplete aligned phrase: ' +
      JSON.stringify({ arabic: arabic.length, transliteration: transliteration.length, english: english.length }));
  }
  const records = arabic.map((text, i) =>
    record(i + 1, text, transliteration[i], english[i], i + 1)
  );
  return {
    id: 'dua-alqama',
    title: 'Dua Alqama (Safwan)',
    arabicTitle: 'دعاء العلقمة',
    description: 'A supplication recited after Ziyarat Ashura, also known as Dua Safwan.',
    group: 'Supplications after Ziyarat Ashura',
    order: 50,
    source: sourceMeta('Duas.org — Dua Alqama', url),
    attribution: 'Arabic text, transliteration and English translation from Duas.org. ' + sourceTerms + ' ' + sourceCaveat,
    sourceStatus: 'imported-review-required',
    sourcePairCount: 191,
    storageChunkSize: 30,
    segmentationMethod: 'One aligned source phrase per repeatable recitation segment; storage chunks are independent.',
    records
  };
}
async function importNahiya() {
  const url = 'https://www.duas.org/ziaratnahiya.htm';
  const $ = await fetchSource(url);
  const arabic = values($, 'a1');
  const transliteration = values($, 't2');
  const english = values($, 't1');
  if (arabic.length !== 484 || transliteration.length !== 483 || english.length !== 483) {
    throw new Error('Ziyarat Nahiya source shape changed: ' +
      JSON.stringify({ arabic: arabic.length, transliteration: transliteration.length, english: english.length }));
  }
  const diagnostics = {
    counts: { arabic: arabic.length, transliteration: transliteration.length, english: english.length },
    source99: { arabic: arabic[99], transliteration: transliteration[99], english: english[99] },
    source421: { arabic: arabic[421], transliteration: transliteration[421], english: english[421] },
    finalArabic: arabic[483] ? arabic[483].slice(0, 220) : null
  };
  console.log('Ziyarat Nahiya source alignment diagnostics: ' + JSON.stringify(diagnostics));
  if (arabic[99] || transliteration[99] || !english[99] ||
      !arabic[421] || !transliteration[421] || english[421] ||
      !arabic[483] || arabic[483].length < 200) {
    throw new Error('Ziyarat Nahiya continuation/source-note positions changed; stop rather than misalign translations.');
  }
  const records = [];
  for (let i = 0; i < 483; i++) {
    if (i === 99) {
      const previous = records.at(-1);
      if (!previous) throw new Error('Unexpected leading translation continuation.');
      previous.english_text = normalize(previous.english_text + ' ' + english[i]);
      previous.source_pair_end = 100;
      continue;
    }
    if (i === 421) {
      const previous = records.at(-1);
      if (!previous) throw new Error('Unexpected leading Arabic continuation.');
      previous.arabic_text = normalize(previous.arabic_text + ' ' + arabic[i]);
      previous.transliteration = normalize(previous.transliteration + ' ' + transliteration[i]);
      previous.source_pair_end = 422;
      continue;
    }
    if (!arabic[i] || !transliteration[i] || !english[i]) {
      throw new Error('Incomplete Ziyarat Nahiya source phrase at source index ' + i);
    }
    records.push(record(records.length + 1, arabic[i], transliteration[i], english[i], i + 1));
  }
  if (records.length !== 481 || records[98].source_pair_end !== 100 || records[419].source_pair_end !== 422) {
    throw new Error('Ziyarat Nahiya phrase alignment did not produce the expected 481 segments.');
  }
  return {
    id: 'ziyarat-nahiya',
    title: 'Ziyarat Nahiya al-Muqaddasa',
    arabicTitle: 'زيارة الناحية المقدسة',
    description: 'The visitation attributed to the Sacred Deputation, including salutations to Imam al-Husayn and the martyrs of Karbala.',
    group: 'Karbala visitations',
    order: 30,
    source: sourceMeta('Duas.org — Ziyarat Nahiya', url),
    attribution: 'Arabic text, transliteration and English translation from Duas.org. ' + sourceTerms + ' ' + sourceCaveat,
    sourceStatus: 'imported-review-required',
    sourcePairCount: 483,
    storageChunkSize: 30,
    segmentationMethod: 'One aligned source phrase per repeatable recitation segment. The source page splits two phrases across language rows; the translation continuation at source pairs 99–100 and Arabic/transliteration continuation at 421–422 are joined to preserve alignment. The final Arabic-only chain-of-transmission note is not part of the recitation and is excluded.',
    sourceNotes: [
      'Source phrase rows 99–100 and 421–422 were joined after inspecting the aligned Arabic, transliteration and English columns.',
      'The final Arabic-only chain-of-transmission note on the source page is not included as a recitation segment.'
    ],
    records
  };
}
const alqama = await importAlqama();
const nahiya = await importNahiya();
await writeFile('data/duas/source/dua-alqama.json', JSON.stringify(alqama, null, 2) + '\n');
await writeFile('data/ziyarats/source/ziyarat-nahiya.json', JSON.stringify(nahiya, null, 2) + '\n');
console.log(JSON.stringify({
  imported: [
    { id: alqama.id, records: alqama.records.length, sourcePairs: alqama.sourcePairCount },
    { id: nahiya.id, records: nahiya.records.length, sourcePairs: nahiya.sourcePairCount }
  ],
  termsUrl: TERMS_URL,
  sourceStatus: 'imported-review-required'
}, null, 2));
