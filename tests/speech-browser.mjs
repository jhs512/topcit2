import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
 for (const width of [1280, 390]) {
  const page = await browser.newPage({viewport:{width,height:950}});
  await page.addInitScript(() => {
   const fake = new EventTarget(); fake.voices=[{name:'모의 한국어',lang:'ko-KR'}]; fake.spoken=[]; fake.canceled=0;
   fake.getVoices=()=>fake.voices; fake.cancel=()=>{fake.canceled++};fake.resume=()=>{};
   fake.speak=u=>{fake.spoken.push(u);u.onstart?.()};
   Object.defineProperty(window,'speechSynthesis',{value:fake});
   Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text}}});
  });
  const center = async () => assert.ok(await page.locator('.speech-controls').evaluate(el=>{const r=el.getBoundingClientRect();return getComputedStyle(el).position==='fixed'&&Math.abs(r.x+r.width/2-innerWidth/2)<2&&Math.abs(r.y+r.height/2-innerHeight/2)<2&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));
  for (const route of ['', 'textbook/', 'info/', 'practice/', 'cases/', 'cases/05/', 'cases/05/BIZ-01/', 'textbook/05/#page-020']) {
   await page.goto(new URL(route,base).href);
   const toggle=page.locator('#site-tts-toggle');await toggle.waitFor();
   if(await toggle.getAttribute('aria-pressed')==='false')await toggle.click();
   assert.equal(await page.evaluate(()=>speechSynthesis.spoken.length),0);
   if(!route.startsWith('cases/05/BIZ-') && !route.startsWith('textbook/05/')) { await page.waitForSelector('.speech-controls',{state:'attached'}); assert.equal(await page.locator('.block-speech-button').count(),0); continue; }
   if(route.startsWith('textbook/'))await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
   const button=route.startsWith('textbook/')?page.locator('#page-020 .block-speech-button').first():page.locator('main .block-speech-button').first();
   await button.waitFor();await button.evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top-100));
   await button.focus();await page.keyboard.press('Enter');
   await page.waitForSelector('.speech-controls[data-state="speaking"]');await center();
   await page.evaluate(()=>scrollBy(0,250));await center();
   await page.getByRole('button',{name:'일시정지',exact:true}).click();
   await page.getByRole('combobox',{name:'읽기 속도'}).selectOption('1.5');
   await page.getByRole('button',{name:'이어읽기',exact:true}).click();
   assert.equal(await page.evaluate(()=>speechSynthesis.spoken.at(-1).rate),1.5);
   await page.getByRole('button',{name:'읽어주기 닫기 및 정지'}).focus();await page.keyboard.press('Escape');
   assert.ok(await button.evaluate(el=>el===document.activeElement));
   assert.equal(await page.locator('nav .block-speech-button').count(),0);
   if(process.env.SPEECH_SCREENSHOT_DIR && route==='info/'){
    await button.click();await page.screenshot({path:process.env.SPEECH_SCREENSHOT_DIR+'/global-speech-'+width+'.png'});await page.getByRole('button',{name:'정지',exact:true}).click();
   }
  }
  // A second book uses the same shared module after navigation.
  await page.goto(new URL('textbook/02/#page-147',base).href);await page.waitForSelector('body[data-ready="true"]',{timeout:60000});await page.locator('#page-147 .block-speech-button').first().waitFor();
  // Options remain selectable; no feedback exists until grading.
  await page.goto(new URL('practice/05/',base).href);await page.locator('#prompt .block-speech-button').waitFor();
  assert.equal(await page.locator('.feedback').count(),0);
  assert.equal(await page.locator('.selection-tag .block-speech-button').count(),0);
  const option=page.locator('.tts-option').first();await option.locator('.block-speech-button').click();
  assert.equal(await page.locator('input[name="answer"]:checked').count(),0);
  assert.equal(await page.locator('#submit').isDisabled(),true);
  await option.locator('input').focus();await page.keyboard.press('Space');await page.locator('#submit').focus();await page.keyboard.press('Enter');
  await page.locator('.feedback .block-speech-button').first().waitFor();
  assert.equal(await page.locator('.speech-controls').isVisible(),false);
  const oldCount=await page.evaluate(()=>speechSynthesis.spoken.length);await page.evaluate(()=>speechSynthesis.spoken.at(-1).onend?.());assert.equal(await page.evaluate(()=>speechSynthesis.spoken.length),oldCount);
  await page.locator('.feedback p .block-speech-button').first().click();await page.locator('#next').focus();await page.keyboard.press('Enter');await page.locator('#prompt .block-speech-button').waitFor();assert.equal(await page.locator('.speech-controls').isVisible(),false);assert.equal(await page.locator('.feedback').count(),0);
  await page.getByRole('button',{name:'설명모드',exact:true}).click();await page.locator('.reading-explanation .block-speech-button').first().waitFor();
  // Explicit opt-in, nested markers, hidden descendants, replacement and removal.
  await page.evaluate(()=>{const f=document.createElement('section');f.id='tts-fixture';f.dataset.ttsContent='';f.innerHTML='<p id="unmarked">UNMARKED</p><div id="outer" class="tts-readable">VISIBLE <span class="tts-readable">CHILD</span><span hidden>SECRET-HIDDEN</span><span aria-hidden="true">SECRET-ARIA</span><span style="display:none">SECRET-CSS</span></div><div id="secret" hidden><p class="tts-readable">SECRET-PARENT</p></div>';document.querySelector('main').append(f)});
  const outer=page.locator('#outer');await outer.locator('.block-speech-button').waitFor();assert.equal(await outer.locator('.block-speech-button').count(),1);assert.equal(await page.locator('#unmarked .block-speech-button,#secret .block-speech-button').count(),0);
  await outer.locator('.block-speech-button').click();assert.equal(await page.evaluate(()=>speechSynthesis.spoken.at(-1).text),'VISIBLE CHILD');
  await outer.evaluate(el=>el.firstChild.data='UPDATED ');await page.waitForFunction(()=>document.querySelector('.speech-controls').hidden);
  await outer.locator('.block-speech-button').click();assert.equal(await page.evaluate(()=>speechSynthesis.spoken.at(-1).text),'UPDATED CHILD');
  await outer.evaluate(el=>el.setAttribute('aria-hidden','true'));await page.waitForFunction(()=>!document.querySelector('#outer .block-speech-button'));assert.equal(await page.locator('.speech-controls').isVisible(),false);
  await outer.evaluate(el=>el.removeAttribute('aria-hidden'));await outer.locator('.block-speech-button').waitFor();await outer.locator('.block-speech-button').click();await outer.evaluate(el=>el.remove());await page.waitForFunction(()=>document.querySelector('.speech-controls').hidden);
  assert.equal(await page.locator('.speech-controls').count(),1);
  await page.close();
 }
 console.log('PASS ON (mock): all page types, two books, dynamic quiz/options/grading/explanations, opt-in nesting, hidden text, stale speech, fixed panel and keyboard');
} finally { await browser.close(); }
