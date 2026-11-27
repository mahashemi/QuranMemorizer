import { load } from 'cheerio';

const sources = [
  ['ziyarat-nahiya', 'https://www.duas.org/ziaratnahiya.htm'],
  ['dua-alqama', 'https://www.duas.org/alqama.htm']
];
const hasArabic = text => Array.from(text).some(char => {
  const code = char.codePointAt(0);
  return code >= 0x0600 && code <= 0x06ff;
});
for (const [id, url] of sources) {
  const response = await fetch(url, { headers: { 'user-agent': 'QuranMemorizer-content-import/1.0 (+https://github.com/mahashemi/QuranMemorizer)' } });
  console.log('\n=== ' + id + ' HTTP ' + response.status + ' ===');
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
    text: $(node).text().replace(/\s+/g, ' ').trim()
  })).filter(x => x.text && (hasArabic(x.text) || /[A-Za-z]{5}/.test(x.text)));
  console.log('leafNodes=' + nodes.length + ' htmlBytes=' + Buffer.byteLength(html));
  const arabicNodes = nodes.filter(node => hasArabic(node.text));
  console.log('arabicLeafNodes=' + arabicNodes.length);
  for (const node of arabicNodes.slice(0, 120)) {
    console.log(JSON.stringify({ i: node.index, tag: node.tag, c: node.className, d: node.dir, l: node.lang, t: node.text.slice(0, 220) }));
  }
  const imageNodes = $('img').toArray().map(node => ({
    alt: $(node).attr('alt') || '',
    src: $(node).attr('src') || '',
    className: $(node).attr('class') || ''
  })).filter(x => x.alt || /arab|ziyar|nahiya/i.test(x.src));
  console.log('IMAGES ' + JSON.stringify(imageNodes.slice(0, 50)));
  const headings = $('h1,h2,h3,h4,h5').toArray().map(n => $(n).text().replace(/\s+/g, ' ').trim()).filter(Boolean);
  console.log('HEADINGS ' + JSON.stringify(headings.slice(0, 80)));
}
