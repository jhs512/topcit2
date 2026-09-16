import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SITE_BASE||'http://localhost:4186/';
const browser=await chromium.launch();
try {
  for(const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'});
    await page.goto(new URL('textbook/01/',base).href);
    await page.waitForSelector('body[data-ready="true"]');
    const links=page.locator('#toc a').filter({hasText:'소프트웨어 공학의 4가지 중요요소'});
    const href=await links.first().getAttribute('href');
    if(width===390)await page.locator('#menu').click();
    await links.first().click();
    await page.waitForFunction(()=>location.hash.length>1);
    assert.equal(await page.locator('#toc [aria-current="true"]').getAttribute('href'),href,'Clicked heading must be highlighted');
    const top=await page.locator(href).evaluate(node=>node.getBoundingClientRect().top);
    const navBottom=await page.locator('#site-navigation').evaluate(node=>node.getBoundingClientRect().bottom);
    assert.ok(top>=navBottom&&top<=navBottom+24,`Heading below navigation without double spacing: ${top}`);
    const next=await page.evaluate(id=>{
      const headings=[...document.querySelectorAll('#book h2,#book h3,#book h4')];
      return headings[headings.findIndex(node=>node.id===id)+1].id;
    },href.slice(1));
    await page.evaluate(id=>document.getElementById(id).scrollIntoView({behavior:'instant'}),next);
    await page.waitForFunction(id=>document.querySelector('#toc [aria-current="true"]')?.hash==='#'+id,next);
    await page.goBack();
    await page.goForward();
    await page.waitForFunction(hash=>document.querySelector('#toc [aria-current="true"]')?.hash===hash,href);
    await page.close();
    console.log(`${width}px: clicked heading, scroll tracking and history passed`);
  }
}finally{await browser.close();}
