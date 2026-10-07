// Regenerate email PNGs from the same installed Geist Pixel Square as the site.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
const fontfile = path.join(root, 'node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2');
const out = path.join(root, 'public/email');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    const font = fs.readFileSync(fontfile).toString('base64');
    for (const [name, text, size, color, background, weight, tracking] of [
      ['magma-wordmark.png', 'MAGMA', 38, '#ff5638', '#090a0d', 800, '.08em'],
      ['confirm-heading.png', 'ya casi estás dentro.', 28, '#ffffff', '#151519', 400, '.02em'],
    ]) {
      await page.setContent(`<style>@font-face{font-family:Pixel;src:url(data:font/woff2;base64,${font})}body{margin:0}span{display:inline-block;font-family:Pixel;font-size:${size}px;font-weight:${weight};letter-spacing:${tracking};line-height:1.3;color:${color};background:${background};padding:4px 0}</style><span>${text}</span>`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('span').screenshot({ path: path.join(out, name) });
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
