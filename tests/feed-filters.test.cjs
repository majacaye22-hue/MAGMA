const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(placement, circle) {
  const state = []; let cursor = 0; const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/feed.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useEffect() {}, useState(initial) {
      const i = cursor++; if (!(i in state)) state[i] = initial;
      return [state[i], v => { state[i] = typeof v === 'function' ? v(state[i]) : v; }];
    } };
    if (name === 'next/link') return { default: 'a' };
    if (name === '@/lib/circle-feed') return { feedHref: (url, circle) => circle ? `${url}&feed=circulo` : url };
    if (name === './FeedMenuIcon') return { FeedMenuIcon: 'icon' };
    if (name === './card-art') return { PostCard: 'post' };
    if (name.endsWith('.css')) return { default: {} };
    if (name === '@/lib/supabase') return {};
    throw Error(name);
  } });
  const posts = [
    { id:'photo', type:'fotografía' }, { id:'music', type:'música' },
    { id:'video', type:'video' }, { id:'writing', type:'escrito' },
    { id:'art', type:'arte', open_collab:true },
  ];
  const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  const render = () => { cursor = 0; return walk(exports.Feed({posts, filterPlacement:placement, archiveNav:{view:'reciente', circle}})); };
  return { render, visible: () => render().filter(n => n.props?.post).map(n => n.props.post.id), click: label => render().find(n => n.type === 'button' && n.props['aria-label'] === label).props.onClick() };
}
test('format buttons toggle off to all posts, on both layouts and feed audiences', () => {
  for (const placement of ['left','top']) for (const circle of [false,true]) {
    const h = harness(placement, circle);
    assert.equal(h.visible().length,5);
    assert.ok(!h.render().some(n => n.type === 'button' && n.props['aria-label'] === 'todos los formatos'));
    assert.ok(h.render().filter(n => n.type === 'button').every(n => !n.props['aria-pressed']));
    for (const [label,id] of [['fotografía','photo'],['música','music'],['video','video'],['letras','writing'],['colaboración','art']]) {
      h.click(label); assert.deepEqual(h.visible(),[id]);
      h.click(label); assert.equal(h.visible().length,5);
    }
    h.click('fotografía'); h.click('música'); assert.deepEqual(h.visible(),['music']);
  }
});
