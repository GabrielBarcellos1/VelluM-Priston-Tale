'use strict';
/**
 * Browser smoke test for the public Classic launcher.
 * Requires Puppeteer, provided with PUPPETEER_MODULE or installed locally.
 * Does not authenticate, alter accounts or interact with saved characters.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const URL = process.env.CLASSIC_TEST_URL || 'https://acesso.gbtechnology.com.br/priston-classic/';
const SIZE = { width: 1600, height: 900 };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(SIZE);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const response = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert.equal(response.status(), 200, 'public launcher must return HTTP 200');
    let result;
    for (let attempt = 0; attempt < 30; attempt++) {
      result = await page.evaluate(() => {
        const canvas = document.getElementById('canvas');
        const rect = canvas?.getBoundingClientRect();
        const bar = document.getElementById('bar');
        return {
          status: document.getElementById('status')?.textContent?.trim(),
          viewport: [innerWidth, innerHeight],
          canvas: rect ? [rect.x, rect.y, rect.width, rect.height] : null,
          lang: window.Module?.ptOpts?.lang,
          toolbarHidden: !!bar && getComputedStyle(bar).display === 'none',
          canvasFilter: canvas ? getComputedStyle(canvas).filter : null
        };
      });
      if (result.status === 'Running') break;
      await wait(2000);
    }
    assert.equal(result.status, 'Running', 'Classic WASM launcher must reach Running');
    assert.ok(result.canvas, 'canvas must exist');
    assert.deepEqual(result.viewport, [1600, 900]);
    assert.deepEqual(result.canvas.map(Math.round), [0, 0, 1600, 900], 'canvas must fill viewport');
    assert.equal(result.lang, 7, 'PT-BR language must be selected');
    assert.equal(result.toolbarHidden, true, 'developer toolbar must be hidden');
    assert.match(result.canvasFilter || '', /contrast\(/, 'HD filter must remain active');
    assert.deepEqual(errors, [], 'no uncaught JavaScript exceptions');
    console.log(JSON.stringify({ ok: true, checks: 8, url: URL, result }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(err => { console.error('CLASSIC_VISUAL_SMOKE_FAILED:', err.stack || err); process.exitCode = 1; });
