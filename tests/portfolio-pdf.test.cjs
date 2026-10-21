const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/portfolio-pdf.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: api, URL, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://staging.supabase.co' } } });
test('portfolio PDFs require PDF MIME, extension, nonempty file and 15 MB limit', () => {
  const file = { name: 'portfolio.pdf', type: 'application/pdf', size: 1024 };
  assert.equal(api.portfolioPdfError(file), null);
  for (const patch of [{ name: 'file.html' }, { type: 'text/html' }, { size: 0 }, { size: api.PDF_MAX_SIZE + 1 }]) assert.ok(api.portfolioPdfError({ ...file, ...patch }));
  assert.equal(api.portfolioPdfError({ ...file, size: api.PDF_MAX_SIZE }), null);
});
test('reader accepts only this project public PDF storage URLs', () => {
  const path = '/storage/v1/object/public/media/12345678-abcd-1234-1234-123456789012.pdf';
  assert.equal(api.isPortfolioPdfUrl('https://staging.supabase.co' + path), true);
  for (const url of ['https://evil.com' + path, 'javascript:alert(1)', 'https://staging.supabase.co' + path + '?download=1', 'https://staging.supabase.co' + path.replace('.pdf', '.html')]) assert.equal(api.isPortfolioPdfUrl(url), false);
});
test('proxy body buffer accommodates maximum PDF plus multipart overhead', () => {
  const config = fs.readFileSync('next.config.ts', 'utf8');
  const limit = config.match(/proxyClientMaxBodySize:\s*'(\d+)mb'/);
  assert.ok(limit);
  assert.ok(Number(limit[1]) * 1024 * 1024 > api.PDF_MAX_SIZE + 65536);
});
