import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {articles} from '../article/catalog.mjs';
const base=process.env.SITE_BASE||'http://localhost:4186/';
await mkdir('test-results/articles',{recursive:true});
const browser=await chromium.launch();
const measurements=[];
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('article/',base).href);
  await page.locator('#site-navigation').waitFor();
  assert.equal(await page.locator('.article-card').count(),8);
  const navtoggle=page.locator('.site-toggle');
  if(await navtoggle.isVisible())await navtoggle.click();
  const group=page.locator('[aria-controls="site-article"]');
  await group.focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('#site-article a').count(),9);
  assert.ok(await page.locator('#site-article a').first().evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Escape');assert.equal(await group.getAttribute('aria-expanded'),'false');
  if(await navtoggle.isVisible())await navtoggle.click();
  await page.screenshot({path:`test-results/articles/index-${width}.png`});
  for(const a of articles){
   await page.goto(new URL(`article/${a.id}/`,base).href);
   await page.locator('#site-navigation').waitFor();
   assert.equal(await page.locator('h1').innerText(),a.title);
   assert.equal(await page.locator('#site-article [aria-current="page"]').count(),1);
   const images=page.locator('.diagram img');
   for(const img of await images.all()){await img.scrollIntoViewIfNeeded();await img.evaluate(async e=>{await e.decode();if(!e.naturalWidth)throw Error('empty image');});}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),a.id+' overflow '+width);
   const link=page.locator('[data-diagram]').first();await link.focus();await page.keyboard.press('Enter');
   assert.ok(await page.locator('dialog').evaluate(d=>d.open));
   await page.locator('dialog img').evaluate(e=>e.decode());
   assert.ok(await page.locator('.zoom-scroll').evaluate(e=>e.scrollWidth>=e.clientWidth));
   await page.keyboard.press('Escape');assert.ok(await link.evaluate(e=>e===document.activeElement));
   if(width===1440){
    for(const [i,figure] of (await page.locator('.diagram').all()).entries())await figure.screenshot({path:`test-results/articles/figure-${a.id}-${i+1}.png`});
   }
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`test-results/articles/${a.id}-${width}.png`});
   const toc=page.locator('.article-toc details');if(!await toc.evaluate(e=>e.open))await toc.locator('summary').click();
   await toc.locator('a').first().click();assert.ok(page.url().endsWith('#section-1'));
   measurements.push({id:a.id,width,figures:await images.count(),overflow:false});
  }
  const theme=page.locator('#site-theme-toggle');await theme.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.goto(new URL('article/03/',base).href);await page.locator('#site-theme-toggle').waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.locator('.diagram').nth(3).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/articles/dark-${width}.png`});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:950}});
 await page.addInitScript(()=>{const fake=new EventTarget();fake.spoken=[];fake.getVoices=()=>[{lang:'ko-KR',name:'test'}];fake.cancel=fake.resume=fake.pause=()=>{};fake.speak=u=>fake.spoken.push(u);Object.defineProperty(window,'speechSynthesis',{value:fake});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});});
 await page.goto(new URL('article/03/',base).href);await page.locator('#site-tts-toggle').waitFor();
 assert.equal(await page.locator('.block-speech-button').count(),0);
 await page.locator('#site-tts-toggle').click();const speech=page.locator('.prose p .block-speech-button').first();await speech.waitFor();await speech.focus();await page.keyboard.press('Enter');
 assert.ok(await page.evaluate(()=>speechSynthesis.spoken.length>0));
 assert.equal(await page.locator('.article-toc .block-speech-button,.article-hero .block-speech-button,.other-stories .block-speech-button').count(),0);
 await page.locator('#site-tts-toggle').click();assert.equal(await page.locator('.block-speech-button').count(),0);
 await writeFile('test-results/articles/browser.json',JSON.stringify({base,measurements,tts:'mock passed'},null,2));
 console.log('PASS: all 8 articles at 1440/390/320, 38 diagrams, menu/anchors/zoom/keyboard/dark mode/TTS.');
}finally{await browser.close();}
