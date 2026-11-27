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
  const get = tag => $(tag).toArray().map(node => $(node).text().replace(/\s+/g, ' ').trim()).filter(Boolean);
  const arabic = get('a1');
  const transliteration = get('t2');
  const english = get('t1');
  console.log(JSON.stringify({
    counts: { a1: arabic.length, t2: transliteration.length, t1: english.length },
    missing: { arabic: arabic.filter(Boolean).length, transliteration: transliteration.filter(Boolean).length, english: english.filter(Boolean).length },
    first: { arabic: arabic.slice(0, 3), transliteration: transliteration.slice(0, 3), english: english.slice(0, 3) },
    last: { arabic: arabic.slice(-3), transliteration: transliteration.slice(-3), english: english.slice(-3) }
  }));
  const all = $('body').find('*').toArray();
  const indexOf = node => all.indexOf(node);
  const arabicNodes = $('a1').toArray();
  const headings = $('h1,h2,h3,h4,h5').toArray().map(node => {
    const index = indexOf(node);
    return {
      tag: node.tagName,
      text: $(node).text().replace(/\s+/g, ' ').trim(),
      index,
      arabicBefore: arabicNodes.filter(a => indexOf(a) < index).length,
      arabicAfter: arabicNodes.filter(a => indexOf(a) > index).length,
      parent: node.parent && node.parent.tagName,
      parentClass: node.parent ? $(node.parent).attr('class') || '' : ''
    };
  });
  console.log('HEADINGS ' + JSON.stringify(headings));
}
