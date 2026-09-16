import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { subjects } from '../practical/content.mjs';
import { expandedCaseSources } from '../scripts/expanded-case-source.mjs';
import { parseCases, renderCase } from '../scripts/case-schema.mjs';

test('160 complete notes, 149 new cases, 11 preserved cases and matching generated pages', async () => {
  assert.equal(subjects.length,8);
  const titles = new Set(), bodies = new Set();
  const original = parseCases(await readFile(new URL('../reading/it-business-stories.md',import.meta.url),'utf8')).cases;
  assert.equal(original.length,11);
  const collections = expandedCaseSources();
  assert.equal(collections.reduce((sum,s)=>sum+s.cases.length,0),149);
  for (const subject of subjects) {
    assert.equal(subject.items.length,20);
    for (const item of subject.items) assert.ok(item.length===4 && item.every(s=>s.length>15));
    const collection = collections.find(c=>c.subjectId===subject.id);
    assert.equal(collection.cases.length + (subject.id==='05-01' ? original.length : 0),20);
    assert.equal(await readFile(new URL('../'+collection.path,import.meta.url),'utf8'),collection.source);
    for (const c of collection.cases) {
      assert.ok(!titles.has(c.title)); titles.add(c.title);
      assert.ok(!bodies.has(c.body)); bodies.add(c.body);
      assert.ok(c.body.length>130 && c.conclusion.length>50, c.id);
      assert.equal(c.lesson.basis.kind,'note');
      const number=Number(c.lesson.basis.url.split('#concept-')[1]);
      assert.equal(c.concept,subject.items[number-1][0]);
      const html=await readFile(new URL(`../cases/${subject.id}/${c.id}/index.html`,import.meta.url),'utf8');
      assert.ok(html.includes(renderCase(c).story));
      assert.ok(html.includes('실제 사건이나 검증된 성과가 아닙니다.'));
      const note=await readFile(new URL(`../practical/${subject.id}/index.html`,import.meta.url),'utf8');
      assert.ok(note.includes(`id="concept-${number}"`));
    }
  }
  for(const c of original){
    assert.equal(c.lesson.basis.kind,'textbook');
    const html=await readFile(new URL(`../cases/05-01/${c.id}/index.html`,import.meta.url),'utf8');
    assert.ok(html.includes(renderCase(c).story));
  }
});

test('note basis cannot masquerade as a textbook, real event, wrong anchor or wrong subject',()=>{
 const source=expandedCaseSources()[0].source;
 for(const bad of [source.replace('핵심노트 개념:','교재 개념:'),source.replace('가상 이야기 · 핵심노트 기반','실제 사례'),source.replace('#concept-1)','#concept-2)'),source.replace('/practical/01/','/practical/99/')])assert.throws(()=>parseCases(bad));
});
