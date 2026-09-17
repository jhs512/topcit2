import {readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {subjects} from '../practical/content.mjs';
import {expandedCaseSources} from './expanded-case-source.mjs';
import {parseCases} from './case-schema.mjs';
import {books} from '../output/markdown/books.mjs';
import {questionSubject} from '../shared/learning-subjects.mjs';
import {studyPaths} from '../shared/textbook-alignment.mjs';

const root = new URL('../', import.meta.url);
const target = new URL('docs/student-content-renewal-baseline.json', root);
if (existsSync(target)) throw new Error('기존 기준선은 덮어쓰지 않습니다.');
const read = path => readFileSync(new URL(path, root));
const hash = value => createHash('sha256').update(value).digest('hex');
const questions = ['software','data','systems-security','business'].flatMap(area => JSON.parse(read(`practice/data/${area}.json`)));
const cases = [...parseCases(read('reading/it-business-stories.md').toString()).cases, ...expandedCaseSources().flatMap(s=>s.cases)];
const items = [
  ...subjects.flatMap(s=>s.items.map((item,i)=>({kind:'note',id:`${s.id}/${i+1}`,subject:s.id,title:item[0],hash:hash(JSON.stringify(item))}))),
  ...cases.map(c=>({kind:'case',id:c.id,title:c.title,hash:hash(JSON.stringify(c))})),
  ...questions.map(q=>({kind:'question',id:q.id,subject:questionSubject(q),revision:q.revision,answer:q.answer,options:q.options,hash:hash(JSON.stringify(q))})),
  ...Object.entries(studyPaths).flatMap(([id,paths])=>paths.map((p,i)=>({kind:'study-path',id:`${id}/${i+1}`,subject:id,title:p.concept,hash:hash(JSON.stringify(p))})))
];
const textbookFiles = books.map(b=>({path:`output/markdown/${b.source.replace(/^\.\//,'')}`,hash:hash(read(`output/markdown/${b.source}`))}));
for(const name of readdirSync(new URL('sources/',root))) if(name.endsWith('.pdf')) textbookFiles.push({path:`sources/${name}`,hash:hash(read(`sources/${name}`))});
writeFileSync(target,JSON.stringify({createdAt:new Date().toISOString(),textbookFiles,items},null,2)+'\n');
writeFileSync(new URL('docs/student-content-renewal-progress.json',root),JSON.stringify({items:items.map(({kind,id,subject})=>({kind,id,subject,status:'미검토',evidence:''}))},null,2)+'\n');
console.log(`기준선 ${items.length}항목, 교재 ${textbookFiles.length}파일`);
