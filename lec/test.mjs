import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lectures} from './content.mjs';
const base=process.env.SITE_BASE||'http://localhost:4186/';
const browser=await chromium.launch();
try{
 for(const width of [1440,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:950}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const lecture of lectures){
   await page.goto(new URL(`lec/${lecture.date}`,base).href);
   await page.locator('#site-navigation').waitFor();
   assert.equal(await page.locator('h1').innerText(),lecture.title);
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow, noarchive');
   assert.equal(await page.locator('tbody tr').count(),7);
   if(lecture.study){
    assert.equal(await page.locator('.lesson-stage').count(),4);
    assert.equal(await page.locator('.lesson-block').count(),0);
    assert.equal(await page.locator('main a[href*="/cases/"]').count(),1);
    assert.equal(await page.locator('#materials a').count(),4);
    for(const stage of await page.locator('.lesson-stage').all()){
     assert.ok(await stage.locator('a[href*="topcit/viewer/index.html?book="]').count());
     assert.equal(await stage.locator('.step-output').count(),1);
    }
    await page.locator('.lesson-steps a').last().click();
    assert.equal(new URL(page.url()).hash,'#lesson-step-4');
    assert.equal(await page.locator('#application').count(),1);
   }else{
    assert.equal(await page.locator('.lesson-stage,#materials,#scenario,#application').count(),0);
   }
   assert.equal(await page.locator('#site-navigation a[href*="/lec/"]').count(),0);
   const linkProblems=await page.locator('a[href]').evaluateAll(links=>links.flatMap(link=>{
    const destination=new URL(link.href),current=new URL(location.href);
    const internal=destination.origin===current.origin&&destination.pathname===current.pathname&&destination.search===current.search&&!!destination.hash;
    return internal
     ? (link.target==='_blank'?[`anchor opens new tab: ${link.href}`]:[])
     : (link.target!=='_blank'||!link.relList.contains('noopener')?[`missing new tab: ${link.href}`]:[]);
   }));
   assert.deepEqual(linkProblems,[]);
   for(const href of await page.locator('.resource-links a[href*="/cases/"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')))){
    assert.match(href,/^\.\.\/\.\.\/cases\/(03|04|05-01|05-02|06-01|06-02)\/$/);
   }
   if(width===1440){
    const resource=page.locator('.resource-links a[href*="/cases/"]').first();
    const destination=await resource.getAttribute('href');
    const popupPromise=page.waitForEvent('popup');
    await resource.click();
    const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(),new URL(destination,page.url()).href);await popup.close();
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('.contents a[href="#comments"]').click();
   assert.equal(new URL(page.url()).hash,'#comments');
   await page.waitForFunction(()=>!document.querySelector('#comments').hasAttribute('aria-busy'));
   assert.match(await page.locator('.comment-write').getAttribute('href'),/^https:\/\/github.com\/jhs512\/topcit2\/issues\/[123]#new_comment_field$/);
   if(base.includes('localhost')){
    for(const href of await page.locator('main a').evaluateAll(xs=>xs.map(a=>a.href).filter(h=>h.includes('localhost'))))assert.ok((await page.request.get(href)).ok(),href);
   }
   if(width===1440&&lecture.number===1){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'C:/Users/jangk/AppData/Local/Temp/topcit-lecture.png'});}
  }
  assert.deepEqual(errors,[]);await page.close();console.log(`lectures ${width}px: 3 dates, unlisted menus, responsive layout, links passed`);
 }
 if(base.includes('localhost')){
  const page=await browser.newPage();let mode='first';
  await page.route('https://api.github.com/repos/jhs512/topcit2/issues/*/comments?*',route=>{
   if(mode==='error')return route.fulfill({status:403,body:'{}'});
   const next=new URL(route.request().url()).searchParams.get('page')==='2';
   return route.fulfill({status:200,contentType:'application/json',headers:next?{'access-control-allow-origin':'*'}:{'access-control-allow-origin':'*','access-control-expose-headers':'link',link:'<https://api.github.com/?page=2>; rel="next"'},body:JSON.stringify([{id:next?2:1,user:{login:'test-user'},created_at:'2026-09-16T09:00:00Z',body_text:next?'두 번째 댓글':'<img src=x onerror=alert(1)> 안전한 일반 텍스트'}])});
  });
  await page.goto(new URL('lec/2026-09-16/',base).href);await page.locator('#comments-fallback summary').click();await page.locator('.github-comment').waitFor();
  assert.equal(await page.locator('.github-comment img').count(),0);
  assert.match(await page.locator('.comment-body').innerText(),/<img/);
  await page.locator('#comments-more').click();await page.waitForFunction(()=>document.querySelectorAll('.github-comment').length===2);
  assert.equal(await page.locator('#comments-more').isVisible(),false);
  mode='error';await page.locator('#comments-refresh').click();await page.waitForFunction(()=>document.querySelector('#comments-status').textContent.includes('못했습니다'));
  assert.equal(await page.locator('.github-comment').count(),2);
  assert.equal(await page.locator('.comment-write').isVisible(),true);
  mode='first';await page.locator('#comments-refresh').click();await page.waitForFunction(()=>document.querySelectorAll('.github-comment').length===1);
  await page.locator('#site-tts-toggle').click();await page.locator('.lesson-block .block-speech-button').first().waitFor();
  await page.close();console.log('comments: safe text, pagination, failure fallback, refresh and lesson TTS passed');
 }
 // Existing entry points have no reverse link to the lectures.
 for(const path of ['index.html','shared/site-navigation.mjs','README.md'])assert.ok(!(await readFile(new URL('../'+path,import.meta.url),'utf8')).includes('lec/'),path);
}finally{await browser.close();}
