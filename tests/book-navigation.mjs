import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.READER_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch();
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/output/markdown/index.html');await page.waitForSelector('.card-exam');assert.equal(await page.locator('.card-exam').count(),6);
  for(const mode of ['text','pdf']){
   await page.goto(base+(mode==='text'?'/output/markdown/reader.html?book=01':'/viewer/index.html?book=01&page=1'));
   for(const id of ['01','02','03','04','05','06']){
    const nav=page.getByRole('navigation',{name:'다른 교재로 바로 이동'});
    if(id!=='01')await nav.locator(`a[href*="book=${id}"]`).click();
    await nav.locator(`a[aria-current="page"][href*="book=${id}"]`).waitFor();
    assert.equal(await nav.locator('a').count(),6);
    for(const link of await nav.locator('a').all())assert.ok(await link.isVisible());
    const expected=['소프트웨어 개발','데이터 관리','시스템아키텍처 및 정보보안','시스템아키텍처 및 정보보안','IT비즈니스','IT비즈니스'][Number(id)-1]; assert.ok((await page.locator('.exam-summary').innerText()).includes('시험 영역 · '+expected));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
    if(mode==='text')await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
    else await page.waitForSelector('#pages canvas',{timeout:60000});
    console.log(`${width}px ${mode} book ${id}: mapping and direct switch passed`);
   }
   await page.screenshot({path:`test-results/navigation-${mode}-${width}.png`});
   if(mode==='pdf'){
    await page.waitForTimeout(3700);assert.ok(await page.locator('#menu').isHidden());assert.ok(await page.locator('.book-navigation').isVisible());
    await page.mouse.move(10,200);await page.locator('#layout').selectOption('single');await page.locator('#page').fill('10');await page.locator('#go').click();await page.waitForFunction(()=>document.querySelector('#pages canvas')?.getAttribute('aria-label')==='PDF 10쪽');
   }
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();}
