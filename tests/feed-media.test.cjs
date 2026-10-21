const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => mocks[id] ?? require(id), URL, ...globals });
  return exports;
}
const media = load('lib/feed-media.ts');
const src = 'https://jbzkdzcaqmxsmmyrlwif.supabase.co/storage/v1/object/public/media/photo.jpg';

test('optimization is restricted to Magma public media; preserves GIFs and legacy sources', () => {
  assert.equal(media.canOptimizeFeedImage(src), true);
  for (const value of [src.replace('.jpg','.GIF'), src.replace('.jpg','.svg'), src+'?token=private', src.replace('/public/','/sign/'), src.replace('https:','http:'), src.replace('jbzkdzcaqmxsmmyrlwif','untrusted'), 'data:image/png;base64,abc', '/local.jpg']) {
    assert.equal(media.canOptimizeFeedImage(value), false, value);
  }
  assert.equal(media.canOptimizeFeedImage(src, 'image/gif'), false);
  assert.equal(media.canOptimizeFeedImage('/api/colectivo-media?path=private/photo.jpg'), false);
});

test('responsive image URLs keep natural-height layout and fall back only once', () => {
  let failed = null;
  const { FeedImage } = load('app/components/FeedImage.tsx', {
    react: { useState: () => [failed, value => { failed = value; }] },
    '@/lib/feed-media': media,
    'next/image': { getImageProps: options => {
      assert.equal(options.quality,75); assert.ok(options.sizes);
      return { props: { src: '/_next/image?small', srcSet: '/_next/image?small 640w', style: { position:'absolute' } } };
    } },
  });
  const props = { src, alt:'test', style:{ width:'100%',height:'auto' } };
  const first = FeedImage(props);
  assert.equal(first.props.src, '/_next/image?small');
  assert.equal(first.props.width, undefined); assert.equal(first.props.height, undefined);
  assert.equal(first.props.style.height,'auto'); assert.equal(first.props.style.position,undefined);
  assert.equal(first.props.loading,'lazy'); assert.equal(first.props.decoding,'async');
  first.props.onError({});
  const fallback = FeedImage(props);
  assert.equal(fallback.props.src,src); assert.equal(fallback.props.srcSet,undefined);
});

test('video loads near viewport, plays only on demand, and pauses offscreen or hidden', () => {
  let effect; const observers = [], events = {};
  let playCalls = 0, pauseCalls = 0;
  const video = { src: '', getAttribute() { return this.src; }, play() { playCalls++; return Promise.resolve(); }, pause() { pauseCalls++; } };
  const document = { hidden: false, addEventListener: (name, fn) => { events[name] = fn; }, removeEventListener() {} };
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  }
  const { FeedVideo } = load('app/components/FeedVideo.tsx', {
    react: { useRef: () => ({ current: video }), useEffect: fn => { effect = fn; }, useState: initial => [initial, () => {}] },
  }, { IntersectionObserver: Observer, document });
  const element = FeedVideo({ src: 'https://media.test/video.mp4' });
  const media = element.props.children[0], button = element.props.children[1];
  assert.equal(media.props.src, undefined); assert.equal(media.props.autoPlay, undefined);
  assert.equal(media.props.style.maxHeight, undefined);
  const fittedMedia = FeedVideo({ src: 'https://media.test/video.mp4', fitScreen: true }).props.children[0];
  assert.equal(fittedMedia.props.style.maxHeight, 'min(560px, 60svh)');
  assert.equal(fittedMedia.props.style.objectFit, 'contain');
  const cleanup = effect();
  assert.equal(observers[0].options.rootMargin, '200px 0px');
  observers[0].callback([{ isIntersecting: false }]); assert.equal(video.src, '');
  observers[0].callback([{ isIntersecting: true }]); assert.equal(video.src, 'https://media.test/video.mp4#t=0.001');
  assert.equal(playCalls, 0); assert.equal(media.props.preload, 'metadata');
  button.props.onClick(); assert.equal(playCalls, 1);
  observers[1].callback([{ isIntersecting: false }]); assert.equal(pauseCalls, 1);
  document.hidden = true; events.visibilitychange(); assert.equal(pauseCalls, 2);
  cleanup(); assert.ok(observers.every(item => item.disconnected));
});
