import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { subjects } from '../practical/content.mjs';
import { parseCases, renderCase } from '../scripts/case-schema.mjs';
import { expandedCaseSources } from '../scripts/expanded-case-source.mjs';
import { alignment, studyPaths, legacyCaseAlignment, caseAlignment, textbookUrl, validateTextbookAlignment, renderTextbookConnection } from '../shared/textbook-alignment.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('320 items have textbook concepts, body explanations, specific connections and real source pages', () => {
  validateTextbookAlignment();
  assert.equal(Object.keys(alignment).length, 8);
  assert.equal(Object.keys(legacyCaseAlignment).length, 11);
  assert.equal(Object.values(studyPaths).flat().length, 35);
  for (const subject of subjects) {
    const html = read(`practical/${subject.id}/index.html`);
    assert.equal((html.match(/class="textbook-connection"/g) || []).length, 20);
    subject.items.forEach((item, i) => {
      const record = alignment[subject.id][i];
      assert.ok(item[1].includes(record.noteExplanation || record.core));
      assert.ok(html.includes(renderTextbookConnection(record, `concept-${i + 1}`)));
    });
  }
  const original = parseCases(read('reading/it-business-stories.md')).cases;
  const cases = [...original, ...expandedCaseSources().flatMap(s => s.cases)];
  assert.equal(cases.length, 160);
  assert.equal(cases.filter(c => c.type.startsWith('실제')).length, 4);
  for (const c of cases) {
    const record = caseAlignment(c.id);
    assert.ok(record.caseReason.length > 25, c.id);
    const html = renderCase(c).story;
    assert.ok(html.includes(record.caseReason), c.id);
    assert.ok(html.includes(textbookUrl(record).replaceAll('&', '&amp;')), c.id);
  }
});

test('new textbook links are required; mismatched pages and legacy viewers are rejected', () => {
 const source=read('reading/it-business-stories.md');
 assert.doesNotThrow(()=>parseCases(source));
 for(const path of ['/topcit2/textbook/05/#page-021','/topcit/viewer/index.html?book=05&page=20','/topcit2/viewer/index.html?book=05&page=20','/topcit/sources/book.pdf'])
  assert.throws(()=>parseCases(source.replace('/topcit2/textbook/05/#page-020',path)));
});

test('mismatched cases now teach the linked concept and EVM uses a monetary comparison', () => {
  const cases = expandedCaseSources().flatMap(s => s.cases);
  const get = id => cases.find(c => c.id === id);
  assert.match(get('ETH-18').body, /공개|노출/);
  assert.match(get('SEC-04').body, /매개변수/);
  assert.match(get('SEC-17').body, /서명/);
  assert.match(get('PM-15').body, /PV.*100만 원.*EV.*80만 원.*AC.*90만 원/);
  assert.match(get('PM-15').conclusion, /지연 일수를 단정하지/);
  assert.equal(caseAlignment('BIZ-11').page, 20);
  assert.equal(alignment['05-01'][10].page, 107);
});
