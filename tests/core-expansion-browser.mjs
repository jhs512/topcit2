import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expandedCaseSources } from '../scripts/expanded-case-source.mjs';
const base=process.env.SITE_BASE || 'http://localhost:4186/';
const url=path=>new URL(path,base).href;
const browser=await chromium.launch();
try {
  for(const width of [1440,900,390,320]){
    const page=await browser.newPage({viewport:{width,height:950}}); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url('instructor/'));
    assert.equal(await page.locator('h1').innerText(),'장희성');
    assert.equal(await page.locator('#site-navigation a[aria-current="page"]').innerText(),'강사소개');
    assert.ok(!(await page.locator('.profile-source').innerText()).includes('이력서'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(width<=960)await page.locator('.site-toggle').click();
    await page.getByRole('button',{name:'핵심노트',exact:true}).click();
    await page.locator('#site-practical>a').first().click();
    assert.equal(await page.locator('h1').innerText(),'핵심노트');
    for(const collection of expandedCaseSources()){
      const c=collection.cases.at(-1),id=collection.subjectId;
      await page.goto(url(`cases/${id}/`));
      assert.equal(await page.locator('.case-list>a').count(),20);
      await page.locator('.case-list>a').last().click();
      assert.equal(await page.locator('article h1').innerText(),c.title);
      assert.match(await page.locator('.case-type').innerText(),/가상/);
      assert.equal(await page.locator('.story-navigation a').count(),2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const basis=page.locator('.lesson-basis a');
      assert.equal(await basis.getAttribute('href'),c.lesson.basis.url);
      if(base.includes('localhost'))await basis.evaluate((a,href)=>a.href=href,url(`practical/${id}/#concept-20`));
      await basis.click();await page.locator('#concept-20').waitFor();
      assert.equal(new URL(page.url()).hash,'#concept-20');
      await page.goto(url(`cases/${id}/${c.id}/`));
      if(await page.locator('#site-tts-toggle').getAttribute('aria-pressed')!=='true')await page.locator('#site-tts-toggle').click();
      await page.locator('.case-body .block-speech-button').first().waitFor();
      assert.ok(await page.locator('.case-conclusion .block-speech-button').count()>0);
    }
    await page.goto(url('instructor/'));
    if(width===1440)await page.screenshot({path:'C:/Users/jangk/AppData/Local/Temp/topcit-instructor-desktop.png',fullPage:true});
    if(width===390)await page.screenshot({path:'C:/Users/jangk/AppData/Local/Temp/topcit-instructor-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]); await page.close();
    console.log(`core expansion ${width}px: instructor, menu, 8 case lists, note links, TTS passed`);
  }
}finally{await browser.close();}
