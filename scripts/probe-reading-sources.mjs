import { load } from 'cheerio';

const sources = [
  ['ziyarat-nahiya', 'https://www.duas.org/ziaratnahiya.htm'],
  ['dua-alqama', 'https://www.duas.org/alqama.htm']
];
const hasArabic = text => /[\\u0600-\\u06ff]/u.test(text);
for (const [id, url] of sources) {
  const response = await fetch(url, { headers: { 'user-agent': 'QuranMemorizer-content-import/1.0 (+https://github.com/mahashemi/QuranMemorizer)' } });
  console.log('\\n=== ' + id + ' HTTP ' + response.status + ' ===');
  if (!response.ok) continue;
  const html = await response.text();
  const $ = load(html);
  const nodes = $('body').find('*').toArray().filter(node => $(node).children().length === 0).map((node, index) => ({
    index,
    tag: node.tagName,
    className: $(node).attr('class') || '',
    id: $(node).attr('id') || '',
    dir: $(node).attr('dir') || '',
    lang: $(node).attr('lang') || '',
    text: $(node).text().replace(/\\s+/g, ' ').trim()
  })).filter(x => x.text && (hasArabic(x.text) || /[A-Za-z]{5}/.test(x.text)));
  console.log('leafNodes=' + nodes.length + ' htmlBytes=' + Buffer.byteLength(html));
  for (const node of nodes.slice(0, 180)) {
    console.log(JSON.stringify({ i: node.index, tag: node.tag, c: node.className, d: node.dir, l: node.lang, ar: hasArabic(node.text), t: node.text.slice(0, 220) }));
  }
  const headings = $('h1,h2,h3,h4,h5').toArray().map(n => $(n).text().replace(/\\s+/g, ' ').trim()).filter(Boolean);
  console.log('HEADINGS ' + JSON.stringify(headings.slice(0, 80)));
}
