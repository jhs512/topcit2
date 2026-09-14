import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {objectives} from '../practice/syllabus.mjs';
test('600 original well-formed questions cover every official objective',async()=>{
 const ids=new Set(),prompts=new Set(),covered=new Set();
 for(const [area,prefix] of [['business','4.'],['systems-security','3.']]){
  const questions=JSON.parse(await readFile(new URL(`../practice/data/${area}.json`,import.meta.url),'utf8'));
  assert.equal(questions.length,300,area);const answerCounts=[0,0,0,0];
  for(const q of questions){
   assert.ok(!ids.has(q.id),q.id);ids.add(q.id);const prompt=q.prompt.trim().replace(/\s+/g,' ');assert.ok(!prompts.has(prompt),q.id);prompts.add(prompt);
   assert.equal(q.area,area);assert.match(q.id,/^(biz4|sys4)-\d{3}$/);assert.ok(Number.isInteger(q.revision)&&q.revision>=1);assert.ok(q.prompt.length>=12,q.id);assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(s=>s.trim())).size,4,q.id);assert.ok(q.options.every(s=>typeof s==='string'&&s.trim()),q.id);
   assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=3,q.id);answerCounts[q.answer]++;
   assert.ok(q.explanation.length>=30,q.id);assert.ok(q.syllabus.startsWith(prefix)&&objectives[q.syllabus],`${q.id}: ${q.syllabus}`);covered.add(q.syllabus);
   assert.ok(q.source.section);assert.equal(new URL(q.source.url).protocol,'https:');
  }
  assert.ok(answerCounts.every(n=>n>=50&&n<=100),`${area}: answer balance ${answerCounts}`);
 }
 assert.equal(ids.size,600);assert.deepEqual(Object.keys(objectives).filter(id=>!covered.has(id)),[],'uncovered objectives');
});
