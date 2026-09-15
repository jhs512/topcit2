import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const base=process.env.SITE_BASE || 'http://localhost:4183/';
for(const width of [1280,390]) {
 const page=await browser.newPage({viewport:{width,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['', 'textbook/', 'info/', 'practice/', 'viewer/?book=01', 'exam/', 'output/markdown/', 'output/markdown/reader.html?book=02', ...['01','02','03','04','05','06'].flatMap(n=>[`textbook/${n}/`,`practice/${n}/`])]) {
  await page.goto(new URL(route,base).href);await page.waitForSelector('#site-navigation');
  assert.equal(await page.locator('#site-navigation').count(),1);
  assert.equal(await page.locator('.book-navigation,.library-header,.site-header').count(),0);
  assert.equal(await page.locator('.site-brand').getAttribute('href'),base);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');
  if(width<760)await page.locator('.site-toggle').click();
  await page.locator('[aria-controls="site-textbooks"]').click();
  await page.locator('#site-textbooks a').last().waitFor({state:'visible'});
  await page.locator('#site-textbooks a').last().focus();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#site-textbooks').isVisible(),false);
  await page.locator('[aria-controls="site-practice"]').focus();await page.keyboard.press('ArrowDown');
  assert.ok(await page.locator('#site-practice a').first().evaluate(e=>e===document.activeElement));
  await page.locator('.site-brand').click();await page.waitForURL(base);
 }
 await page.goto(new URL('practice/03/',base).href);await page.waitForSelector('.quiz-heading');
 if(width<760)await page.locator('.site-toggle').click();
 await page.locator('[aria-controls="site-practice"]').click();assert.equal(await page.locator('#site-practice [aria-current="page"]').count(),1);
 await page.mouse.click(width-5,840);assert.equal(await page.locator('#site-practice').isVisible(),false);
 assert.deepEqual(errors,[]);await page.close();
}
await browser.close();console.log('PASS shared navigation on 20 routes at desktop/mobile widths');

