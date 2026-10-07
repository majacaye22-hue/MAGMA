const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
const code = ts.transpileModule(fs.readFileSync('lib/post-images.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
let uploads = [];
let fail = false;
const formats = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/photo-format.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: formats });
vm.runInNewContext(code, { exports: exportsForTest, require: () => formats, FormData, fetch: async (_url, request) => {
  uploads.push(request.body.get('file').name);
  return { ok: !fail, json: async () => fail ? { error: 'failed' } : { url: `https://media/${uploads.length}` } };
} });
const { postImages, supportsCarousel, validatePhotos, uploadPhotos } = exportsForTest;

test('only art and photography use a gallery; legacy posts keep their image', () => {
  assert.equal(supportsCarousel('arte'), true);
  assert.equal(supportsCarousel('fotografía'), true);
  assert.equal(supportsCarousel('evento'), false);
  assert.equal(postImages({ type: 'arte', media_url: 'legacy' })[0], 'legacy');
  assert.equal(postImages({ type: 'arte', media_base64: 'legacy-data' })[0], 'legacy-data');
  assert.equal(postImages({ type: 'arte', image_urls: ['a', 'b', 'c', 'd'] }).join(','), 'a,b,c');
  assert.equal(postImages({ type: 'evento', image_urls: ['a', 'b'], media_url: 'poster' }).join(','), 'poster');
});
test('photo selection enforces count, formats, and size before uploading', () => {
  const photo = { type: 'image/jpeg', size: 100 };
  assert.equal(validatePhotos([photo, photo, photo], 0), null);
  assert.ok(validatePhotos([photo, photo], 2));
  assert.equal(validatePhotos([{ type: 'image/heic', size: 100 }], 0), null);
  assert.equal(validatePhotos([{ type: '', name: 'IMG_100.HEIC', size: 100 }], 0), null);
  assert.equal(validatePhotos([{ type: 'image/heif', size: 100 }], 0), null);
  assert.ok(validatePhotos([{ type: 'video/mp4', size: 100 }], 0));
  assert.ok(validatePhotos([{ type: 'image/png', size: 16 * 1024 * 1024 }], 0));
});
test('uploads retain existing images and preserve ordering; errors stop publication', async () => {
  const photo = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
  assert.equal((await uploadPhotos(['existing', photo])).join(','), 'existing,https://media/1');
  assert.deepEqual(uploads, ['photo.jpg']);
  fail = true;
  await assert.rejects(uploadPhotos([photo]), /no se pudo subir/);
});
