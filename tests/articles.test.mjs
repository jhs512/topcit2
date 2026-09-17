import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {articles,tableTitles} from '../article/catalog.mjs';
import {learningSubjects} from '../shared/learning-subjects.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=async p=>(await readFile(resolve(root,p),'utf8')).replace(/\r\n/g,'\n');
test('eight complete practical stories have matching content, diagrams, tables and local links',async()=>{
  assert.deepEqual(articles.map(a=>a.id),learningSubjects.map(s=>s.id));
  const manifest=JSON.parse(await read('article/manifest.json'));
  assert.equal(manifest.articles.length,8);
  for(const a of articles){
    const source=await read(`article/content/${a.id}.md`),html=await read(`article/${a.id}/index.html`);
    assert.ok(source.startsWith('# '+a.title+'\n'));
    assert.ok(source.length>4500,a.id+' is a complete long-form story');
    assert.match(source,/가상/);
    assert.ok((source.match(/^## /gm)||[]).length>=7,a.id);
    const figures=[...source.matchAll(/^```mermaid (.+)$/gm)];
    assert.ok(figures.length>=4,a.id);
    assert.equal((html.match(/<figure /g)||[]).length,figures.length);
    assert.equal((html.match(/<table>/g)||[]).length,tableTitles[a.id].length);
    for(const [i] of figures.entries()){
      const svg=await read(`article/assets/${a.id}-${i+1}.svg`);
      assert.match(svg,/<svg/);assert.match(svg,/viewBox=/);assert.doesNotMatch(svg,/Syntax error|<script\b/);
    }
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,a.id+' duplicate anchors');
    for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      if(href.startsWith('#')){assert.ok(ids.includes(href.slice(1)),href);continue;}
      if(/^(https?:|data:)/.test(href))continue;
      const path=href.split('#')[0].split('?')[0];
      await access(resolve(root,`article/${a.id}`,path.endsWith('/')?path+'index.html':path));
    }
    assert.ok(!html.includes('node_modules'));
    assert.ok(!html.includes('cdn.jsdelivr'));
    const record=manifest.articles.find(r=>r.id===a.id);
    assert.equal(record.diagrams,figures.length);
  }
  assert.equal(manifest.diagramCount,38);assert.equal(manifest.tableCount,18);
});
test('architecture story explains the tradeoffs rather than requiring every tool',async()=>{
  const text=await read('article/content/03.md');
  for(const term of ['Redis','복제 지연','Kafka','outbox','MSA','멱등성','스티키 세션','운영 부담','필요 없을'])assert.ok(text.includes(term),term);
  assert.ok(text.indexOf('## 3.')<text.indexOf('## 8.')&&text.indexOf('## 8.')<text.indexOf('## 10.'));
  assert.match(text,/원본 가격과 판매 가능 수량/);
  assert.match(text,/복제를 백업으로 보지도/);
});
