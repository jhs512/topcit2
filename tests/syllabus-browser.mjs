import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statements} from '../practice/syllabus.mjs';
const data=JSON.parse(readFileSync(new URL('../syllabus/data.json',import.meta.url),'utf8'));
const base=process.env.SITE_BASE||'http://localhost:4186/';
const browser=await chromium.launch();
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(new URL('syllabus/#ref-4.2.2.2',base).href);
  await page.locator('#site-navigation').waitFor();
  assert.equal(await page.locator('main [id^="ref-"]').count(),253);
  assert.equal(await page.locator('.criterion').count(),163);
  for(const entry of data.entries){
   const node=page.locator(`[id="ref-${entry.code}"]`);
   assert.ok((await node.textContent()).includes(entry.text));
   if(statements[entry.code])assert.equal(entry.text,statements[entry.code]);
  }
  const target=page.locator('[id="ref-4.2.2.2"]');
  const box=await target.boundingBox();assert.ok(box.y>=0&&box.y<900);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(new URL('practice/05/?mode=all',base).href);
  const link=page.locator('[data-question-id="biz4-151"] .syllabus-detail a');await link.waitFor();
  await link.click();await page.waitForURL('**/syllabus/#ref-4.2.2.2');
  assert.ok((await page.locator('[id="ref-4.2.2.2"]').innerText()).includes(statements['4.2.2.2']));
  await page.close();
 }
 console.log('PASS syllabus: all 253 source entries, 163 objectives, practice deep links and desktop/mobile layout');
}finally{await browser.close();}

