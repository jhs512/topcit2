import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {distribution} from '../practice/distribution.mjs';
import {questionSubject} from '../shared/learning-subjects.mjs';
const base=process.env.SITE_BASE||'http://localhost:4186/';
const qs=(await Promise.all(distribution.areas.map(a=>readFile(new URL(`../practice/data/${a.id}.json`,import.meta.url),'utf8').then(JSON.parse)))).flat();
const browser=await chromium.launch();
await mkdir('test-results/qa-weighted',{recursive:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('practice/',base).href);await page.locator('.allocation').waitFor();
  assert.equal(await page.locator('.allocation tbody tr').count(),4);
  assert.match(await page.locator('.total').innerText(),/3000개/);
  assert.match(await page.locator('.allocation').innerText(),/15문항/);
  for(const subject of Object.keys(distribution.subjects)){
   const q=qs.find(q=>questionSubject(q)===subject&&q.code)||qs.find(q=>questionSubject(q)===subject&&q.kind)||qs.find(q=>questionSubject(q)===subject);
   const start=Date.now();
   await page.goto(new URL(`practice/${subject}/?mode=all#question-${q.id}`,base).href);
   const card=page.locator(`[data-question-id="${q.id}"]`);await card.waitFor();
   assert.equal(await page.locator('.question-card').count(),distribution.subjects[subject]);
   if(q.code)assert.equal(await card.locator('pre code').innerText(),q.code);
   await card.locator(`label:has(input[value="${q.answer}"])`).click();
   await card.getByRole('button',{name:'정답 확인',exact:true}).click();await card.locator('.feedback').waitFor();
   assert.match(await card.locator('.result').innerText(),/정답/);
   await page.locator('#history').click();assert.equal(await page.locator('.history-list a').count(),1);
   await page.locator('.history-close').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,subject);
   if(['01','02'].includes(subject))await card.screenshot({path:`test-results/qa-weighted/${subject}-${width}.png`});
   await page.getByRole('button',{name:'설명모드',exact:true}).click();
   assert.equal(await page.locator('.reading-explanation').count(),distribution.subjects[subject]);
   if(q.code)assert.ok(await page.locator('.question-code pre').count()>0);
   await page.getByRole('button',{name:'랜덤모드',exact:true}).click();
   assert.notEqual(await page.locator('[data-question-id]').getAttribute('data-question-id'),q.id);
   console.log(`${width}px ${subject}: ${distribution.subjects[subject]} questions, code/render/grade/history/modes ${Date.now()-start}ms`);
  }
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();}
