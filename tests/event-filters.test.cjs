const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');

test('compact event filters combine, reset, and expose a mobile disclosure', () => {
  const state = []; let cursor = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/eventos/EventosClient.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date, Set, require(name) {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === '@/lib/event-details') return require('./event-details-loader.cjs')(true);
    if (name === '@/lib/event-management') return require('./event-management-loader.cjs')(true);
    if (name === 'react') return {
      useMemo: fn => fn(),
      useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; },
    };
    if (name.includes('FlyerCard')) return { FlyerCard: props => jsx.jsx('article', { 'data-event': props.post.id }) };
    if (name.includes('event-preview')) return { eventDay: () => '2026-10-20' };
    throw Error(name);
  } });
  const now = Date.parse('2026-10-20T12:00:00-06:00');
  const eventos = [
    { id: 'free', title: 'Poesía', event_date: '2026-10-20T18:00:00-06:00', event_category: 'lectura', address: 'Roma Norte', is_free: true },
    { id: 'paid', title: 'Música', event_date: '2026-10-21T18:00:00-06:00', address: 'Condesa', is_free: false },
  ];
  function flatten(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...flatten(node.props?.children)];
  }
  function render() { cursor = 0; return flatten(exports.EventosClient({ eventos, now })); }
  const cards = nodes => nodes.filter(n => n.type === 'article').map(n => n.props['data-event']);
  let nodes = render();
  assert.equal(cards(nodes).length, 2);
  assert.equal(nodes.find(n => n.props['aria-controls'] === 'event-filters').props['aria-expanded'], false);
  nodes.find(n => n.props['aria-controls'] === 'event-filters').props.onClick();
  nodes = render();
  assert.equal(nodes.find(n => n.props['aria-controls'] === 'event-filters').props['aria-expanded'], true);
  const selects = nodes.filter(n => n.type === 'select');
  selects[0].props.onChange({ target: { value: 'hoy' } });
  selects[1].props.onChange({ target: { value: 'Roma Norte' } });
  selects[2].props.onChange({ target: { value: 'gratis' } });
  selects[3].props.onChange({ target: { value: 'lectura' } });
  nodes = render();
  assert.deepEqual(cards(nodes), ['free']);
  nodes.find(n => n.type === 'input').props.onChange({ target: { value: 'no match' } });
  nodes = render();
  assert.equal(cards(nodes).length, 0);
  nodes.find(n => n.type === 'button' && n.props.children === 'limpiar filtros').props.onClick();
  nodes = render();
  assert.equal(cards(nodes).length, 2);
  assert.ok(!nodes.some(n => n.type === 'button' && n.props.children === 'limpiar filtros'));
});
