import { readFile, writeFile } from 'node:fs/promises';
import { books } from '../output/markdown/books.mjs';
import { subjects } from '../practical/content.mjs';
const root = new URL('../', import.meta.url);
const sources = [];
for (const book of books) sources.push([`textbook/${book.id}`, await readFile(new URL(`output/markdown/${book.source}`, root), 'utf8')]);
for (const s of subjects) sources.push([`practical/${s.id}`, s.items.flat().join('\n')]);
for (const file of ['software', 'data', 'systems-security', 'business']) {
  const questions = JSON.parse(await readFile(new URL(`practice/data/${file}.json`, root)));
  for (const q of questions) sources.push([q.id, [q.prompt, ...q.options, q.explanation].join('\n')]);
}
const patterns = {
  complexity: /(?:O\([^\n)]{1,30}\)|[nN]\s*log\s*[nN]|log[₂_]?\s*[nN])/g,
  superscripts: /(?:[A-Za-z0-9][²³ⁿ⁰¹⁴⁵⁶⁷⁸⁹]+|<sup>[^<]{1,20}<\/sup>|\^\s*-?\d+)/g,
  subscripts: /(?:<sub>[^<]{1,20}<\/sub>|[A-Za-z][₀-₉]+)/g,
  comparison: /[≤≥≠≈≡]|[<>]=?/g,
  mathSymbols: /[×÷−±√∞∑∏∈∉∪∩⊂⊆⊃⊇∅¬∧∨⊕σπθλ]/g,
  fractions: /\b\d+\s*\/\s*\d+\b|[½¼¾⅓⅔]/g,
  units: /\d+(?:\.\d+)?\s*(?:GHz|MHz|kHz|Hz|GB|MB|KB|Gbps|Mbps|Kbps|ms|ns|µs|μs|%|℃)/g,
  arrows: /[→←↔⇒⇔]/g,
};
const result = Object.fromEntries(Object.entries(patterns).map(([category, regex]) => {
  let count = 0; const samples = [];
  for (const [source, raw] of sources) {
    const text = category === 'superscripts' || category === 'subscripts' ? raw : raw.replace(/<[^>]+>/g, '').replace(/```[\s\S]*?```/g, '');
    for (const match of text.matchAll(regex)) { count++; if (samples.length < 8) samples.push({ source, text: text.slice(Math.max(0, match.index - 28), match.index + match[0].length + 42).replace(/\s+/g, ' ') }); }
  }
  return [category, { count, samples }];
}));
await writeFile(new URL('docs/tts-notation-audit.json', root), JSON.stringify({ sourceCount: sources.length, categories: result }, null, 2) + '\n');
console.log(Object.fromEntries(Object.entries(result).map(([k,v]) => [k,v.count])));
