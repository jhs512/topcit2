import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
const results = [];
const measure = element => {
  const rgb = value => value.match(/[\d.]+/g).map(Number);
  const luminance = c => c.slice(0, 3).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((a, n, i) => a + n * [.2126, .7152, .0722][i], 0);
  const style = getComputedStyle(element), color = rgb(style.color);
  let node = element, background;
  while (node) { const value = rgb(getComputedStyle(node).backgroundColor); if (value.length === 3 || value[3] === 1) { background = value; break; } node = node.parentElement; }
  background ||= [255, 255, 255];
  const a = luminance(color), b = luminance(background);
  const large = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700;
  return { text: element.textContent.trim(), color: style.color, background: background.slice(0, 3), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), target: large ? 3 : 4.5, outline: style.outlineStyle };
};
try {
  for (const width of process.env.REPRO_ONLY ? [1440] : [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    for (const theme of process.env.REPRO_ONLY ? ['home'] : ['home', 'light', 'dark']) {
      await page.goto(new URL(theme === 'home' ? '' : 'textbook/02/', base).href);
      if (theme !== 'home') {
        await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
        if (await page.evaluate(() => document.documentElement.dataset.theme) !== theme) await page.locator('#theme').click();
      }
      const record = async (locator, state) => results.push({ width, theme, state, ...await locator.evaluate(measure) });
      const states = async locator => {
        const ensureVisible = async () => {
          if (width < 760 && await locator.evaluate(el => !!el.closest('#site-links')) && await page.locator('.site-toggle').getAttribute('aria-expanded') === 'false') await page.locator('.site-toggle').click();
          const submenu = await locator.evaluate(el => el.closest('.site-submenu')?.id);
          if (submenu && await page.locator(`#${submenu}`).isHidden()) await page.locator(`[aria-controls="${submenu}"]`).click();
        };
        await ensureVisible();
        await page.mouse.move(0, 900); await record(locator, 'normal/current');
        await locator.hover(); await record(locator, 'hover');
        await page.mouse.down(); await record(locator, 'active'); await page.mouse.move(0, 900); await page.mouse.up();
        await ensureVisible(); await locator.focus(); await page.keyboard.press('ArrowRight'); await record(locator, 'focus');
        assert.equal(await locator.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      };
      await states(page.locator('.site-brand'));
      if (width < 760) await page.locator('.site-toggle').click();
      if (!process.env.REPRO_ONLY) {
        for (const el of await page.locator('#site-tts-toggle, #site-links > a, .site-group > button').all()) await states(el);
      }
      for (const name of process.env.REPRO_ONLY ? ['site-textbooks'] : ['site-textbooks', 'site-practice']) {
        await page.locator(`[aria-controls="${name}"]`).click();
        const links = process.env.REPRO_ONLY ? [page.locator(`#${name} a`).nth(2)] : await page.locator(`#${name} a`).all();
        for (const link of links) await states(link);
        if (process.env.NAV_SCREENSHOT_DIR && name === 'site-textbooks') {
          await page.locator(`#${name} a`).nth(2).hover();
          await page.screenshot({ path: `${process.env.NAV_SCREENSHOT_DIR}/nav-${theme}-${width}.png` });
        }
        await page.locator(`[aria-controls="${name}"]`).click();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    // Visit and return through the actual link; visited links retain the common text palette.
    if (!process.env.REPRO_ONLY) {
      await page.goto(new URL('', base).href);
      if (width < 760) await page.locator('.site-toggle').click();
      await page.locator('#site-links > a').first().click();
      await page.goBack();
      if (width < 760 && await page.locator('.site-toggle').getAttribute('aria-expanded') === 'false') await page.locator('.site-toggle').click();
      results.push({ width, theme: 'home', state: 'visited-return', ...await page.locator('#site-links > a').first().evaluate(measure) });
    }
    await page.close();
  }
  const failures = results.filter(r => r.ratio < r.target);
  console.log(JSON.stringify({ checks: results.length, minimum: Math.min(...results.map(r => r.ratio)), byTheme: ['home','light','dark'].map(theme => ({ theme, minimum: Math.min(...results.filter(r => r.theme === theme).map(r => r.ratio)) })), failures: failures.slice(0, 6) }, null, 2));
  assert.equal(failures.length, 0, 'Navigation text must meet WCAG contrast in each actual state');
} finally { await browser.close(); }
