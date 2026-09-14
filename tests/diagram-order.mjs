import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Exercise real Mermaid layout, not the order of declarations in Markdown.
const root = new URL('../', import.meta.url);
const server = createServer(async (req, res) => {
  try {
    const url = new URL('.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname), root);
    if (!url.href.startsWith(root.href)) throw new Error('Outside test root');
    res.setHeader('Content-Type', url.pathname.endsWith('.mjs') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8');
    res.end(await readFile(url));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.READER_BASE || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${base}/output/markdown/reader.html?book=05#page-019`);
    await page.waitForSelector('body[data-ready="true"]');
    const region = page.locator('#page-019');
    const surfaces = region.locator('.diagram-surface');
    for (const surface of await surfaces.all()) {
      await surface.scrollIntoViewIfNeeded();
      await surface.locator('svg').waitFor({ timeout: 60000 });
    }
    const labels = await region.locator('.cluster-label,.nodeLabel').evaluateAll(nodes => nodes.map(node => ({
      text: node.textContent.trim(), y: node.getBoundingClientRect().y,
    })));
    assert.ok(labels.find(n => n.text.startsWith('(a)')).y < labels.find(n => n.text.startsWith('(b)')).y, '(a) precedes (b)');
    for (const suffix of ['', ' + IT']) {
      const positions = ['A', 'B', 'C', 'D', 'E'].map(letter => labels.find(n => n.text === `프로세스 ${letter}${suffix}`).y);
      assert.ok(positions.every((y, i) => i === 0 || y > positions[i - 1]), 'Processes retain A-E reading order');
    }
    // Zoom clones the rendered SVG, retaining the same order.
    await surfaces.first().locator('..').locator('button').click();
    await page.locator('#zoom-dialog').waitFor({ state: 'visible' });
    assert.ok((await page.locator('#zoom-content').textContent()).includes('(a) IT 활용'));
    assert.equal(await region.locator('.diagram-error').count(), 0);
    console.log(`${width}px: (a) before (b), A-E ordered, zoom opens`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
