import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const bank=JSON.parse(readFileSync(new URL('../practice/data/business.json',import.meta.url),'utf8'));
const questions=bank.filter(q=>Number(q.syllabus.split('.')[1])<4);
const [first,second]=[questions[0],questions.at(-1)];
const other=bank.find(q=>Number(q.syllabus.split('.')[1])>=4);
const base=process.env.PRACTICE_BASE||'http://localhost:4186/';
const browser=await chromium.launch();
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('practice/05/?mode=quiz',base).href);
  await page.locator('#history').click();await page.locator('.history-empty').waitFor();
  await page.keyboard.press('Escape');await page.locator('.history-dialog').waitFor({state:'detached'});
  assert.equal(await page.locator('#history').evaluate(e=>e===document.activeElement),true);
  await page.evaluate(({first,second,other})=>localStorage.setItem('topcit2-practice-v1',JSON.stringify({version:1,solved:{[`${first.id}@${first.revision}`]:true,[`${other.id}@${other.revision}`]:true,[`${second.id}@${second.revision}`]:true,[`${first.id}@999`]:true}})),{first,second,other});
  await page.reload();await page.locator('#history').click();
  assert.deepEqual(await page.locator('[data-history-id]').evaluateAll(es=>es.map(e=>e.dataset.historyId)),[second.id,first.id]);
  const geometry=await page.locator('.history-dialog').evaluate(e=>{const r=e.getBoundingClientRect();return {fixed:getComputedStyle(e).position==='fixed',x:r.x+r.width/2-innerWidth/2,y:r.y+r.height/2-innerHeight/2,left:r.left,right:r.right,width:innerWidth};});
  assert.ok(geometry.fixed&&Math.abs(geometry.x)<2&&Math.abs(geometry.y)<2&&geometry.left>=0&&geometry.right<=geometry.width);
  await page.locator(`[data-history-id="${second.id}"]`).click();
  await page.waitForURL(`**/?mode=all#question-${second.id}`);
  const target=page.locator(`[data-question-id="${second.id}"].history-target`);await target.waitFor();
  assert.equal(await target.evaluate(e=>e===document.activeElement),true);
  assert.ok((await target.boundingBox()).y>=0&&(await target.boundingBox()).y<900);
  await page.reload();await target.waitFor();
  assert.equal(await target.evaluate(e=>e===document.activeElement),true);
  await page.locator('#history').click();await page.locator('.history-close').click();await page.locator('.history-dialog').waitFor({state:'detached'});
  const fresh=questions[1],card=page.locator(`[data-question-id="${fresh.id}"]`);
  await card.locator(`input[value="${fresh.answer}"]`).check();await card.locator('[type="submit"]').click();await card.locator('.feedback').waitFor();
  assert.equal(await page.locator('#history').innerText(),'완료 3개');
  await page.locator('#history').click();assert.equal(await page.locator('[data-history-id]').first().getAttribute('data-history-id'),fresh.id);
  await page.keyboard.press('Escape');await page.locator('.history-dialog').waitFor({state:'detached'});
  await page.locator('#reset').click();await page.getByRole('button',{name:'이 과목 초기화',exact:true}).click();await page.locator('dialog').waitFor({state:'detached'});
  await page.locator('#history').click();await page.locator('.history-empty').waitFor();
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS history: empty/saved/revision/book scope, centered PC/mobile modal, keyboard, links/reload, grading and reset');
}finally{await browser.close();}
