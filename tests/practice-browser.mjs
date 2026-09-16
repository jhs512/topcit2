import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const base=process.env.PRACTICE_BASE||'http://localhost:4186';
const business=JSON.parse(await readFile(new URL('../practice/data/business.json',import.meta.url),'utf8')).filter(q=>Number(q.syllabus.split('.')[1])<4);
const systems=JSON.parse(await readFile(new URL('../practice/data/systems-security.json',import.meta.url),'utf8')).filter(q=>q.syllabus!=='3.1.1.3'&&Number(q.syllabus.split('.')[1])<6);
const browser=await chromium.launch();
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/practice/index.html`);await page.locator('[data-area="05"]').waitFor();assert.equal(await page.locator('.area-card').count(),6);
  await page.locator('[data-area="05"]').click();
  const firstId=await page.locator('[data-question-id]').getAttribute('data-question-id');const first=business.find(q=>q.id===firstId);
  await page.locator(`input[value="${first.answer}"]`).check();await page.getByRole('button',{name:'정답 확인',exact:true}).click();await page.locator('.feedback').waitFor();assert.match(await page.locator('.result').innerText(),/정답입니다/);
  await page.reload();await page.locator('[data-question-id]').waitFor();assert.notEqual(await page.locator('[data-question-id]').getAttribute('data-question-id'),firstId);assert.match(await page.locator('.progress-label').innerText(),/완료 1개/);
  const nextId=await page.locator('[data-question-id]').getAttribute('data-question-id');const q=business.find(q=>q.id===nextId);await page.locator(`input[value="${(q.answer+1)%4}"]`).check();await page.getByRole('button',{name:'정답 확인',exact:true}).click();await page.locator('.feedback').waitFor();assert.match(await page.locator('.result').innerText(),/오답입니다/);assert.match(await page.locator('.progress-label').innerText(),/완료 1개/);
  await page.getByRole('button',{name:'전체모드',exact:true}).click();assert.equal(await page.locator('.reading-list article').count(),business.length);assert.equal(await page.locator('.reading-explanation').count(),0);assert.equal(await page.locator('.pagination').count(),0);
  await page.getByRole('button',{name:'설명모드',exact:true}).click();assert.equal(await page.locator('.reading-explanation').count(),20);await page.locator('#topic').selectOption({label:business[0].topic});assert.ok(await page.locator('.reading-list article').count()>0);assert.match(await page.locator('.progress-label').innerText(),/완료 1개/);
  await page.getByRole('button',{name:'이 과목 진도 초기화',exact:true}).click();await page.getByRole('button',{name:'취소',exact:true}).click();assert.match(await page.locator('.progress-label').innerText(),/완료 1개/);
  // Persist a completion in the second area, then reset only the selected first area.
  await page.evaluate(q=>{const key='topcit2-practice-v1';const s=JSON.parse(localStorage.getItem(key));s.solved[`${q.id}@${q.revision}`]=true;localStorage.setItem(key,JSON.stringify(s));},systems[0]);
  await page.getByRole('button',{name:'이 과목 진도 초기화',exact:true}).click();await page.getByRole('button',{name:'이 과목 초기화',exact:true}).click();await page.locator('dialog').waitFor({state:'detached'});assert.match(await page.locator('.progress-label').innerText(),/완료 0개/);
  await page.goto(`${base}/practice/index.html?area=systems-security`);await page.locator('[data-question-id]').waitFor();assert.match(await page.locator('.progress-label').innerText(),/완료 1개/);
  // All complete, and one remaining wrong answer: neither state may stall or repeat a solved question.
  await page.evaluate(qs=>{const solved=Object.fromEntries(qs.map(q=>[`${q.id}@${q.revision}`,true]));localStorage.setItem('topcit2-practice-v1',JSON.stringify({version:1,solved}));},systems);
  await page.reload();await page.locator('.complete').waitFor();assert.match(await page.locator('.complete').innerText(),/모두 맞혔습니다/);
  await page.evaluate(q=>{const k='topcit2-practice-v1';const s=JSON.parse(localStorage.getItem(k));delete s.solved[`${q.id}@${q.revision}`];localStorage.setItem(k,JSON.stringify(s));},systems[0]);
  await page.reload();await page.locator('[data-question-id]').waitFor();assert.equal(await page.locator('[data-question-id]').getAttribute('data-question-id'),systems[0].id);
  await page.locator(`input[value="${(systems[0].answer+1)%4}"]`).check();await page.getByRole('button',{name:'정답 확인',exact:true}).click();await page.getByRole('button',{name:'다음 랜덤 문제',exact:false}).click();assert.equal(await page.locator('[data-question-id]').getAttribute('data-question-id'),systems[0].id);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');assert.deepEqual(errors,[]);
  console.log(`${width}px: both subjects, modes, progress persistence, wrong answer, completion, reset passed`);await context.close();
 }
 // A delayed cross-tab save must grade the submitted choice even after mode navigation.
 const raceContext=await browser.newContext();const race=await raceContext.newPage();const holder=await raceContext.newPage();const raceErrors=[];race.on('pageerror',e=>raceErrors.push(e.message));
 await race.goto(`${base}/practice/index.html?area=business`);await race.locator('[data-question-id]').waitFor();const raceId=await race.locator('[data-question-id]').getAttribute('data-question-id');const raceQ=business.find(q=>q.id===raceId);
 await holder.goto(`${base}/practice/index.html`);await holder.locator('.area-card').first().waitFor();
 await holder.evaluate(()=>{navigator.locks.request('topcit2-practice-v1',async()=>{window.lockHeld=true;await new Promise(resolve=>{window.releaseLock=resolve;});});});await holder.waitForFunction(()=>window.lockHeld);
 await race.locator(`input[value="${raceQ.answer}"]`).check();await race.getByRole('button',{name:'정답 확인',exact:true}).click();await race.getByRole('button',{name:'전체모드',exact:true}).click();await holder.evaluate(()=>window.releaseLock());
 await race.waitForFunction(q=>JSON.parse(localStorage.getItem('topcit2-practice-v1')||'{}').solved?.[`${q.id}@${q.revision}`]===true,raceQ);assert.deepEqual(raceErrors,[]);await raceContext.close();console.log('Cross-tab delayed save and mode navigation passed');
 // Surface storage failures without erasing saved data or preventing practice.
 const page=await browser.newPage();await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('blocked','SecurityError');};});await page.goto(`${base}/practice/index.html?area=business`);await page.locator('[data-question-id]').waitFor();assert.match(await page.locator('[role="alert"]').innerText(),/임시/);await page.close();
}finally{await browser.close();}
