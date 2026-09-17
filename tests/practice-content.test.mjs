import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {objectives,statements} from '../practice/syllabus.mjs';
import {distribution} from '../practice/distribution.mjs';
import {questionSubject} from '../shared/learning-subjects.mjs';
// Reviewed explanation-only edits: docs/student-content-renewal-legacy-edits.json.
const hashes={business:'b0ec8641021afeb24da05890cf132c8aea261ba1f0503d733de5de812a7e5ad4','systems-security':'d776af840db0e994ea292f5e7f45557b6d9229fc51cadf8c98af2a3b8d26950a'};
test('weighted bank: exact ratios, every objective, unique questions, reviewed 600 records',async()=>{
 const ids=new Set(),prompts=new Set(),covered=new Set(),subjects={};
 const prefixes={software:'1.',data:'2.','systems-security':'3.',business:'4.'};
 for(const area of distribution.areas){
  const qs=JSON.parse(await readFile(new URL(`../practice/data/${area.id}.json`,import.meta.url),'utf8'));
  assert.equal(qs.length,area.target,area.id);
  assert.equal(qs.length*1000,distribution.total*area.points,area.id);
  if(hashes[area.id])assert.equal(createHash('sha256').update(JSON.stringify(qs.slice(0,300))).digest('hex'),hashes[area.id],'reviewed 600-question editorial baseline');
  const answers=[0,0,0,0];
  for(const q of qs){
   assert.ok(!ids.has(q.id),q.id);ids.add(q.id);
   const key=JSON.stringify([q.prompt.trim().replace(/\s+/g,' '),q.code||'']);
   assert.ok(!prompts.has(key),`duplicate ${q.id}`);prompts.add(key);
   assert.equal(q.area,area.id);assert.match(q.id,/^(biz4|sys4|sw4|data4)-\d{3,4}$/);
   assert.ok(Number.isInteger(q.revision)&&q.revision>=1,q.id);
   assert.ok(q.prompt.length>=12,q.id);assert.equal(q.options.length,4,q.id);
   assert.equal(new Set(q.options.map(s=>s.trim())).size,4,q.id);
   assert.ok(q.options.every(s=>typeof s==='string'&&s.trim()),q.id);
   assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id);answers[q.answer]++;
   for(const label of ['핵심 개념:','정답인 이유:','오답 구분:'])assert.ok(q.explanation.includes(label),q.id+' '+label);
   assert.ok(q.syllabus.startsWith(prefixes[area.id])&&objectives[q.syllabus]&&statements[q.syllabus],q.id);
   covered.add(q.syllabus);const subject=questionSubject(q);subjects[subject]=(subjects[subject]||0)+1;
   assert.ok(q.source.section);assert.equal(new URL(q.source.url).protocol,'https:');
   if(q.code)assert.ok(q.language&&q.reference?.url,q.id);
  }
  assert.ok(answers.every(n=>n>=qs.length*.2&&n<=qs.length*.3),`${area.id}: ${answers}`);
 }
 assert.equal(ids.size,distribution.total);assert.deepEqual(subjects,distribution.subjects);
 assert.deepEqual(Object.keys(objectives).filter(id=>!covered.has(id)),[]);
 const official=JSON.parse(await readFile(new URL('../syllabus/data.json',import.meta.url),'utf8')).entries.filter(e=>e.code.split('.').length===4);
 assert.equal(official.length,163);
 for(const entry of official)assert.equal(statements[entry.code],entry.text,entry.code);
});
