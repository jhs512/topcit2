import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const route of ['','textbook/','info/',...['01','02','03','04','05','06'].map(n=>`textbook/${n}/`)]){
 const response=await page.goto(`http://localhost:4183/${route}`);assert.equal(response.status(),200);
 if(route.match(/textbook\/\d/))await page.waitForSelector('#site-navigation');
}
for(const n of ['01','02','03','04','05','06']){
 await page.goto(`http://localhost:4183/practice/${n}/`);
 await page.waitForSelector('.quiz-heading');
 if(Number(n)<3)await page.getByText('문제 준비 중입니다.').waitFor();
 else {
  await page.waitForSelector('.question-context');
  assert.equal(await page.locator('.question-context a').count(),0);
  assert.ok((await page.locator('.syllabus-detail').innerText()).includes('학습목표 요약'));
  await page.getByRole('button',{name:'설명모드',exact:true}).click();
  await page.waitForSelector('.reading-explanation');
  assert.equal(await page.locator('.reading-explanation a').count(),0);
  assert.ok(page.url().includes(`/practice/${n}/?mode=explain`));
  await page.reload();await page.waitForSelector('.reading-explanation');
 }
}
await page.goto('http://localhost:4183/practice/');await page.waitForSelector('.area-card');assert.equal(await page.locator('.area-card').count(),6);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: hub, info, 6 textbooks, 6 practice routes, text criteria, mode and reload');
