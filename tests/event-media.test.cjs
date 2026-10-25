const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireModule) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: requireModule });
  return exports;
}
const formats = load('lib/photo-format.ts');
const media = load('lib/event-media.ts', () => formats);
test('event media supports poster only, video only, and poster before video', () => {
  assert.equal(media.eventMedia({ media_url: '/poster.jpg' }).poster, '/poster.jpg');
  assert.equal(media.eventMedia({ media_url: '/poster.jpg' }).video, null);
  assert.equal(media.eventMedia({ media_url: '/v.mp4', media_type: 'video/mp4' }).poster, null);
  const both = media.eventMedia({ media_url: '/v.mp4', media_type: 'video/mp4', cover_url: '/poster.jpg' });
  assert.equal(both.poster, '/poster.jpg');
  assert.equal(both.video, '/v.mp4');
  assert.equal(media.eventMedia({ media_url: '/v.MOV?x=1' }).video, '/v.MOV?x=1');
  assert.equal(media.eventMedia({ media_base64: 'legacy' }).poster, 'legacy');
});
test('event media validates supported formats and existing 15MB limit', () => {
  for (const type of ['image/jpeg', 'video/mp4', 'video/webm', 'video/quicktime']) {
    assert.equal(media.eventMediaError({ type, size: 15 * 1024 * 1024 }), null);
  }
  assert.ok(media.eventMediaError({ type: 'video/mp4', size: 15 * 1024 * 1024 + 1 }));
  assert.ok(media.eventMediaError({ type: 'audio/mpeg', size: 100 }));
});
test('gallery arrows switch poster to video and back, with no autoplay or nested link', () => {
  let state = false;
  const gallery = load('app/components/EventMediaGallery.tsx', id => {
    if (id === 'react') return { useState: () => [state, value => { state = value; }] };
    if (id === 'react/jsx-runtime') return require(id);
    if (id === '@/lib/event-media') return media;
    return { PostImage: 'poster' };
  });
  const post = { media_url: '/v.mp4', media_type: 'video/mp4', cover_url: '/p.jpg' };
  let tree = gallery.EventMediaGallery({ post });
  assert.equal(tree.props.children[0].type, 'poster');
  tree.props.children[1].props.children[2].props.onClick();
  tree = gallery.EventMediaGallery({ post });
  assert.equal(tree.props.children[0].type, 'video');
  assert.equal(tree.props.children[0].props.controls, true);
  assert.equal(tree.props.children[0].props.autoPlay, undefined);
  tree.props.children[1].props.children[0].props.onClick();
  assert.equal(gallery.EventMediaGallery({ post }).props.children[0].type, 'poster');
  state = false;
  assert.equal(gallery.EventMediaGallery({ post: { media_url: '/v.mp4' } }).props.children[0].type, 'video');
});
