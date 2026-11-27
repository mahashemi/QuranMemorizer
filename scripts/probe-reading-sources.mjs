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
  const paragraphs = $('p').toArray().map((node, index) => ({
    index,
    tag: node.tagName,
    className: $(node).attr('class') || '',
    id: $(node).attr('id') || '',
    dir: $(node).attr('dir') || '',
    text: $(node).text().replace(/\\s+/g, ' ').trim()
  })).filter(x => x.text);
  console.log('paragraphs=' + paragraphs.length + ' htmlBytes=' + Buffer.byteLength(html));
  for (const p of paragraphs.slice(0, 100)) {
    console.log(JSON.stringify({ i: p.index, c: p.className, d: p.dir, t: p.text.slice(0, 220) }));
  }
  const headings = $('h1,h2,h3,h4,h5').toArray().map(n => $(n).text().replace(/\\s+/g, ' ').trim()).filter(Boolean);
  console.log('HEADINGS ' + JSON.stringify(headings.slice(0, 80)));
}
