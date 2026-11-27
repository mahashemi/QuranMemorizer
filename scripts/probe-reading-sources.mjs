import { load } from 'cheerio';

const sources = [
  ['ziyarat-nahiya', 'https://www.duas.org/ziaratnahiya.htm'],
  ['dua-alqama', 'https://www.duas.org/alqama.htm']
];
for (const [id, url] of sources) {
  const response = await fetch(url, { headers: { 'user-agent': 'QuranMemorizer-content-import/1.0 (+https://github.com/mahashemi/QuranMemorizer)' } });
  console.log('\n=== ' + id + ' HTTP ' + response.status + ' ===');
  if (!response.ok) continue;
  const html = await response.text();
  const $ = load(html);
  const raw = tag => $(tag).toArray().map(node => $(node).text().replace(/\s+/g, ' ').trim());
  const arabic = raw('a1');
  const transliteration = raw('t2');
  const english = raw('t1');
  console.log(JSON.stringify({ tagCounts: { a1: arabic.length, t2: transliteration.length, t1: english.length }, empty: { a1: arabic.map((v,i)=>v?null:i).filter(v=>v!==null), t2: transliteration.map((v,i)=>v?null:i).filter(v=>v!==null), t1: english.map((v,i)=>v?null:i).filter(v=>v!==null) } }));
  const end = id === 'ziyarat-nahiya' ? arabic.length - 1 : arabic.length;
  const emptyT2 = transliteration.map((value, index) => value ? null : index).filter(value => value !== null);
  for (const index of emptyT2) {
    console.log('EMPTY_T2 ' + JSON.stringify({ index, arabic: arabic[index], english: english[index] }));
  }
  console.log('FIRST ' + JSON.stringify({ arabic: arabic.slice(0, 3), transliteration: transliteration.slice(0, 3), english: english.slice(0, 3) }));
  console.log('LAST ' + JSON.stringify({ arabic: arabic.slice(end - 3, end), transliteration: transliteration.slice(-3), english: english.slice(-3) }));
}
