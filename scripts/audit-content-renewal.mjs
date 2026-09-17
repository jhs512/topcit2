// Compare the finished editorial sources with the saved pre-renewal inventory.
// This checks compatibility and coverage, not whether a student understood the prose.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { subjects } from '../practical/content.mjs';
import { studyPaths } from '../shared/textbook-alignment.mjs';
import { parseCases } from './case-schema.mjs';
import { expandedCaseSources } from './expanded-case-source.mjs';
import { lectures } from '../lec/content.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const baseline=JSON.parse(read('docs/student-content-renewal-baseline.json'));
const previous=new Map(baseline.items.map(item=>[item.kind+'/'+item.id,item]));
const lessons=JSON.parse(read('reading/case-lessons.json'));
const legacyEdits=new Set(JSON.parse(read('docs/student-content-renewal-legacy-edits.json')).ids);
assert.equal(Object.keys(lessons).length,149);
for(const file of baseline.textbookFiles)assert.equal(hash(read(file.path)),file.hash,file.path);
const records=[];
function record(kind,id,value,status,evidence){
 const before=previous.get(kind+'/'+id);
 assert.ok(before,kind+'/'+id);
 records.push({kind,id,subject:before.subject,status,changed:hash(JSON.stringify(value))!==before.hash,evidence});
}
for(const subject of subjects)for(const [i,note] of subject.items.entries())
 record('note',`${subject.id}/${i+1}`,note,'본문 재집필', '용어를 먼저 풀고 상황·선택 이유·예를 연결한 완성 원고. 설명 자동 결합 제거. 예시·질문과 연결해 검토.');
for(const [subject,paths] of Object.entries(studyPaths))for(const [i,path] of paths.entries())
 record('study-path',`${subject}/${i+1}`,path,'설명 재집필','전문용어의 뜻과 짧은 예시·계산을 추가. 기존 교재 위치와 확인 질문 유지.');
const originalCases=parseCases(read('reading/it-business-stories.md').toString()).cases;
for(const item of originalCases)record('case',item.id,item,'서사 유지','11편의 상황·행동·결과와 일반화의 한계를 읽고 유지. 실제 4편의 사건·수치·출처를 이번에 변경하지 않음.');
for(const item of expandedCaseSources().flatMap(s=>s.cases))
 record('case',item.id,item,'교훈 재집필',item.id.startsWith('ARCH-')?'교훈과 상황·행동·결과 모두 재집필.':'상황·행동·결과 검토 후 유지. 일반 원리와 해당 사례의 적용을 별도 원고로 작성.');
const counts={};
for(const area of ['software','data','systems-security','business']){
 const questions=JSON.parse(read(`practice/data/${area}.json`));
 counts[area]=questions.length;
 for(const q of questions){
  const before=previous.get('question/'+q.id);
  assert.ok(before,q.id);
  assert.deepEqual([q.revision,q.answer,q.options],[before.revision,before.answer,before.options],q.id);
  for(const label of ['핵심 개념:','정답인 이유:','오답 구분:'])assert.ok(q.explanation.includes(label),q.id);
  const changed=hash(JSON.stringify(q))!==before.hash;
  const executable=['code','sql','trace','policy'].includes(q.kind);
  record('question',q.id,q,changed?'해설 보완':'기존 해설 유지',legacyEdits.has(q.id)?'기존 핵심 개념 구획의 약어·압축된 정의를 풀어 씀. 정답 이유와 오답 구분 유지; 변경 목록과 600문항 해시 기준 갱신.':executable?'유형별 해설 원본 검토 및 용어·단계·계산 보완. 2,189문항 독립 실행으로 정답 대조.':changed?'개념 원고에서 어려운 정의를 풀어 씀. 생성 시 정답·오답 설명에도 반영.':'기존 핵심 개념·정답 이유·오답 구분을 유지. 전체 구조·ID·정답·보기 대조; 이번 개편에서 개별 문항 전부를 독해 재검토했다고 뜻하지 않음.');
 }
}
assert.equal(records.length,3355);
assert.equal(new Set(records.map(r=>r.kind+'/'+r.id)).size,3355);
for(const lecture of lectures)for(const [title,body,question] of lecture.sections)assert.ok(title&&body&&question,lecture.date);
const totals=Object.fromEntries(['note','case','question','study-path'].map(kind=>[kind,{total:records.filter(r=>r.kind===kind).length,changed:records.filter(r=>r.kind===kind&&r.changed).length}]));
const report={checkedAt:new Date().toISOString(),textbookFilesUnchanged:baseline.textbookFiles.length,counts,totals,studentReadbackTest:false,reviewLimit:'문제 전체의 자동 구조·정답·호환성 검증과 유형별 원고 검토를 구분한다. 기존 개념·상황 문항 전체의 개별 독해 재검토 완료로 보고하지 않는다.',items:records};
writeFileSync(new URL('../docs/student-content-renewal-progress.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({textbookFilesUnchanged:report.textbookFilesUnchanged,counts,totals},null,2));
