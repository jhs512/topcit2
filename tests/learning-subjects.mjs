import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { learningSubjects, questionSubject } from '../shared/learning-subjects.mjs';
import { distribution } from '../practice/distribution.mjs';
import { subjects } from '../practical/content.mjs';
const base=process.env.SITE_BASE||'http://localhost:4186/';
const url=path=>new URL(path,base).href;
const questions=(await Promise.all(distribution.areas.map(a=>a.id).map(id=>readFile(new URL(`../practice/data/${id}.json`,import.meta.url),'utf8').then(JSON.parse)))).flat();
const expected=distribution.subjects;
assert.equal(questions.length,distribution.total);
assert.deepEqual(Object.fromEntries(learningSubjects.map(s=>[s.id,questions.filter(q=>questionSubject(q)===s.id).length])),expected);
assert.equal(subjects.reduce((n,s)=>n+s.items.length,0),160);
assert.deepEqual(subjects.map(s=>s.id),learningSubjects.map(s=>s.id));
const browser=await chromium.launch();
try{
  for(const width of [1440,720,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    for(const section of ['practice','practical','cases']){
      await page.goto(url(section+'/'));await page.locator('.area-card').first().waitFor();
      assert.equal(await page.locator('main .area-card').count(),8);
      assert.equal(await page.locator('#site-textbooks>a').count(),7);
      for(const name of ['practice','practical','cases'])assert.equal(await page.locator(`#site-${name}>a`).count(),9);
      assert.equal(await page.locator('.site-topic-links,.site-book-group').count(),0);
      for(const s of learningSubjects){
        await page.goto(url(`${section}/${s.id}/`));
        await page.locator('main h1').waitFor();
        assert.equal(await page.locator('main h1').innerText(),s.title);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${section}/${s.id} ${width}`);
        if(section==='cases')assert.equal(await page.locator('.case-list>a').count(),20);
      }
    }
    await page.goto(url('practice/'));
    if(width<=960)await page.locator('.site-toggle').click();
    const trigger=page.locator('[aria-controls="site-practice"]');await trigger.focus();await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#site-practice>a').first().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    await trigger.click();await page.locator('#site-practice>a').filter({hasText:'05-02 윤리'}).click();
    await page.locator('.question-card').waitFor();assert.equal(new URL(page.url()).pathname.endsWith('/practice/05-02/'),true);
    for(const s of learningSubjects){
      await page.goto(url(`practice/${s.id}/?mode=all`));await page.locator('#panel').waitFor();
      assert.equal(await page.locator('.question-card').count(),expected[s.id]);
    }
    const seeds=['05-01','05-02','06-01','06-02'].map(id=>questions.find(q=>questionSubject(q)===id));
    await page.evaluate(qs=>localStorage.setItem('topcit2-practice-v1',JSON.stringify({version:1,solved:Object.fromEntries(qs.map(q=>[q.id+'@'+q.revision,true]))})),seeds);
    await page.goto(url('practice/05-02/?mode=quiz'));await page.locator('#history').waitFor();assert.match(await page.locator('#history').innerText(),/완료 1개/);
    await page.locator('#history').click();assert.equal(await page.locator('.history-list a').count(),1);await page.locator('.history-list a').click();
    assert.equal(new URL(page.url()).hash,'#question-'+seeds[1].id);assert.match(page.url(),/05-02/);
    await page.reload();await page.locator('.history-target').waitFor();
    await page.getByRole('button',{name:'설명모드',exact:true}).click();assert.equal(await page.locator('.question-card').count(),expected['05-02']);
    await page.goBack();await page.locator('.history-target').waitFor();
    await page.locator('#reset').click();await page.locator('#confirm').click();await page.locator('dialog').waitFor({state:'detached'});
    const solved=await page.evaluate(()=>JSON.parse(localStorage.getItem('topcit2-practice-v1')).solved);
    assert.ok(!solved[seeds[1].id+'@'+seeds[1].revision]);for(const q of [seeds[0],seeds[2],seeds[3]])assert.equal(solved[q.id+'@'+q.revision],true);
    await page.goto(url('practice/05/?mode=all#question-'+seeds[0].id));await page.locator('.history-target').waitFor();assert.equal(await page.locator('.question-card').count(),expected['05-01']+expected['05-02']);
    await page.goto(url('cases/05/BIZ-11/#BIZ-11-ref-1'));await page.locator('article h1').waitFor();assert.match(page.url(),/cases\/05-01\/BIZ-11\/#BIZ-11-ref-1/);
    await page.goto(url('practical/06/#concept-3'));await page.locator('#concept-3').waitFor();assert.match(page.url(),/practical\/06-01\/#concept-3/);
    assert.deepEqual(errors,[]);await context.close();console.log(`flat subjects ${width}px: menus, 24 routes, counts, history, reset, legacy links passed`);
  }
}finally{await browser.close();}
