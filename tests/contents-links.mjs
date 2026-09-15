import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const page=await browser.newPage();
const base=process.env.SITE_BASE || 'http://localhost:4183/';
for(const id of ['01','02','03','04','05','06']){
 await page.goto(new URL(`textbook/${id}/`,base).href);await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
 const result=await page.evaluate(()=>{
  const links=[...document.querySelectorAll('.contents-link')];
  const invalid=links.filter(a=>!document.getElementById(a.hash.slice(1)));
  const ordinary=[...document.querySelectorAll('table')].filter(t=>t.rows[0]?.cells[0]?.textContent.trim()!=='목차');
  return {count:links.length,invalid:invalid.length,ordinaryLinks:ordinary.reduce((n,t)=>n+t.querySelectorAll('.contents-link').length,0)};
 });
 assert.ok(result.count>100,id);assert.equal(result.invalid,0);assert.equal(result.ordinaryLinks,0);
 const link=page.locator('.contents-link').first();const hash=await link.getAttribute('href');await link.focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,hash);
 console.log(id,result.count/2,'linked rows');
}
await page.goto(new URL('textbook/02/#page-019',base).href);await page.waitForSelector('body[data-ready="true"]');
const link=page.locator('#page-019 .contents-link').filter({hasText:'NoSQL의 BASE 속성'});
assert.ok((await link.getAttribute('href')).startsWith('#p147-'));
await link.click();assert.ok(new URL(page.url()).hash.startsWith('#p147-'));
await page.waitForFunction(()=>localStorage.getItem('topcit-reader-02-page')==='147');
await page.goto(new URL('textbook/02/#page-019',base).href);await page.waitForSelector('body[data-ready="true"]');
await page.locator('#page-019 .rich-block button').click();await page.locator('#zoom-dialog .contents-link').filter({hasText:'XV. 인공지능 이해'}).click();
assert.equal(await page.locator('#zoom-dialog').isVisible(),false);assert.ok(new URL(page.url()).hash.startsWith('#p150-'));
assert.equal(await page.locator('#page-019 table').count(),1);
await browser.close();console.log('PASS contents links, keyboard, exact sample headings, saved page, zoom close/restore');
