import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.SITE_BASE||'http://localhost:4186/';
const browser=await chromium.launch();
await mkdir('test-results/theme',{recursive:true});
try{
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:'dark'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('textbook/',base).href);
  const toggle=page.locator('#site-theme-toggle');await toggle.waitFor();
  assert.match(await page.locator('.library-bottom').innerText(),/TOPCIT 시험대비/);
  await toggle.click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  for(const route of ['', 'textbook/','textbook/01/','practice/','practice/05-02/','info/','syllabus/','practical/01/','cases/05-01/','cases/05-01/BIZ-11/','study/','instructor/']){
   await page.goto(new URL(route,base).href);await toggle.waitFor();
   assert.equal(await page.locator('html').getAttribute('data-theme'),'dark',route);
   assert.equal(await toggle.getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+width);
   assert.equal(await toggle.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el}),true,route);
   assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 32, 28)',route);
   if(route.endsWith('BIZ-11/'))assert.equal(await page.locator('.story').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(32, 41, 37)');
  }
  await page.goto(new URL('textbook/01/',base).href);await page.locator('#theme').waitFor();
  await page.locator('#theme').click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  await page.reload();await toggle.waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await toggle.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.goto(new URL('practice/',base).href);await page.locator('.area-card').first().waitFor();
  await page.screenshot({path:`test-results/theme/dark-${width}.png`});
  const second=await context.newPage();await second.goto(new URL('syllabus/',base).href);await second.locator('#site-theme-toggle').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  assert.equal(await second.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(246, 246, 239)','explicit light overrides OS dark');
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}px: shared theme, navigation, persistence, keyboard, legacy reader control, cross-tab, title passed`);
 }
 const legacy=await browser.newContext();const page=await legacy.newPage();
 await page.addInitScript(()=>localStorage.setItem('topcit-reader-01-theme','dark'));
 await page.goto(new URL('textbook/01/',base).href);await page.locator('#site-theme-toggle').waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await legacy.close();
 const blocked=await browser.newContext();const bp=await blocked.newPage();
 await bp.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')}});
 await bp.goto(new URL('textbook/',base).href);await bp.locator('#site-theme-toggle').click();
 assert.equal(await bp.locator('html').getAttribute('data-theme'),'dark');await blocked.close();
}finally{await browser.close();}
