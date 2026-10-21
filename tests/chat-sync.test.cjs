const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');

function load(path, context = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, crypto: webcrypto, ...context });
  return exports;
}
const sync = load('lib/chat-sync.ts');
const { sendDirectMessage } = load('lib/send-direct-message.ts');
const message = n => ({ id: String(n).padStart(8, '0'), created_at: '2026-09-28T18:00:00.000Z', sender_id: 'other', body: String(n), read: false });

test('stable merge deduplicates and orders timestamp ties; cursors use both fields', () => {
  const rows = sync.mergeMessages([message(2), message(1)], [{ ...message(2), read: true }, message(3)]);
  assert.equal(rows.map(row => row.id).join(','), '00000001,00000002,00000003');
  assert.equal(rows[1].read, true);
  assert.match(sync.cursorFilter(message(2), 'before'), /id.lt.00000002/);
  assert.match(sync.cursorFilter(message(2), 'after'), /id.gt.00000002/);
  const ids = new Set(Array.from({ length: 100 }, () => sync.messageId()));
  assert.equal(ids.size, 100);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('retry after an ambiguous send uses the same primary key and does not insert twice', async () => {
  const saved = new Map();
  let offline = true;
  const db = { from() {
    let insert, filters = {};
    const query = {
      insert(value) { insert = value; return query; }, select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      async single() {
        if (!saved.has(insert.id)) saved.set(insert.id, insert);
        return { data: null, error: new Error('response lost or duplicate key') };
      },
      async maybeSingle() {
        if (offline) return { data: null, error: new Error('offline') };
        return { data: [...saved.values()].find(row => Object.entries(filters).every(([key, value]) => row[key] === value)), error: null };
      },
    };
    return query;
  } };
  const attempt = { id: sync.messageId(), body: 'hola', offering_reference: { id: sync.messageId(), title: 'retratos', username: 'cctv' } };
  await assert.rejects(sendDirectMessage(db, 'conversation', 'me', attempt));
  offline = false;
  await sendDirectMessage(db, 'conversation', 'me', attempt);
  assert.equal(saved.size, 1);
  assert.equal(saved.get(attempt.id).offering_reference.title, 'retratos');
  await assert.rejects(sendDirectMessage(db, 'conversation', 'me', { ...attempt, offering_reference: { ...attempt.offering_reference, title: 'changed' } }));
  await assert.rejects(sendDirectMessage(db, 'conversation', 'me', { ...attempt, body: 'different' }));
});

test('offering references validate snapshots and generate only local profile links', () => {
  const api = load('lib/offering-reference.ts');
  const ref = { id: sync.messageId(), title: 'retratos', username: 'cctv' };
  assert.equal(api.offeringReference(ref).title, 'retratos');
  assert.equal(api.offeringReferenceHref(ref), `/profile/cctv?tab=comparto#offering-${ref.id}`);
  for (const value of [null, {}, { ...ref, id: 'javascript:alert(1)' }, { ...ref, title: 'a'.repeat(81) }]) assert.equal(api.offeringReference(value), null);
  assert.ok(api.offeringReferenceHref({ ...ref, username: 'a/b?c' }).startsWith('/profile/a%2Fb%3Fc?'));
});

// Small hook harness: exercise query boundaries, reconnects, reading and scroll anchoring
// without writing real messages or changing the staging database.
function historyHarness(count, kind = 'direct') {
  const dbRows = Array.from({ length: count }, (_, i) => message(i + 1));
  const requests = [], changes = [];
  let failed = false, member = true, focused = true, index = 0, dirty = false, result;
  const slots = [], effects = [], layouts = [], cleanups = [];
  const window = new EventTarget();
  window.setInterval = () => 1; window.clearInterval = () => {};
  const document = new EventTarget();
  document.hidden = false; document.hasFocus = () => focused;
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; dirty = true; }];
    },
    useRef(initial) { const slot = index++; return slots[slot] ??= { current: initial }; },
    useCallback(fn) { index++; return fn; },
    useEffect(fn, deps) { effect(fn, deps, effects); },
    useLayoutEffect(fn, deps) { effect(fn, deps, layouts); },
  };
  function effect(fn, deps, queue) {
    const slot = index++, previous = slots[slot];
    if (!previous || deps.some((value, i) => value !== previous[i])) { slots[slot] = deps; queue.push(fn); }
  }
  const db = {
    channel() { return { on() { return this; }, subscribe() { return this; } }; }, removeChannel() {},
    async rpc() { changes.push('read'); return { error: null }; },
    from(table) {
      let limit, ascending, filter, update = false;
      const query = {
        select() { return query; }, eq() { return query; }, neq() { return query; },
        update() { update = true; return query; },
        order(_key, options) { ascending = options.ascending; return query; },
        limit(value) { limit = value; return query; }, or(value) { filter = value; return query; },
        async maybeSingle() { return { data: member ? { id: 'membership' } : null, error: null }; },
        then(resolve, reject) { return Promise.resolve().then(() => {
          if (failed) return { data: null, error: new Error('network') };
          if (update) { changes.push('read'); return { error: null }; }
          requests.push({ table, limit, filter, ascending });
          let rows = [...dbRows];
          if (filter) {
            const match = filter.match(/id\.(lt|gt)\.([^\)]+)/);
            rows = rows.filter(row => match[1] === 'lt' ? row.id < match[2] : row.id > match[2]);
          }
          rows.sort((a, b) => sync.compareMessages(a, b) * (ascending ? 1 : -1));
          return { data: rows.slice(0, limit), error: null };
        }).then(resolve, reject); },
      };
      return query;
    },
  };
  const helpers = { ...sync, notifyInbox: change => changes.push(change) };
  const { useMessageHistory } = load('app/mensajes/useMessageHistory.ts', {
    require: name => name === 'react' ? react : name === '@/lib/supabase' ? { getSupabaseClient: () => db } : helpers,
    window, document, clearInterval() {},
  });
  const viewport = { scrollTop: 0, clientHeight: 200, get scrollHeight() { return result.messages.length * 30; } };
  function render() {
    dirty = false; index = 0; result = useMessageHistory(kind, 'chat', 'me'); result.scroll.current = viewport;
    while (layouts.length) layouts.shift()();
    while (effects.length) { const cleanup = effects.shift()(); if (cleanup) cleanups.push(cleanup); }
  }
  async function flush() { for (let i = 0; i < 20; i++) { await new Promise(resolve => setImmediate(resolve)); if (dirty) render(); } }
  render();
  return {
    flush, requests, changes, dbRows, viewport, document,
    get result() { return result; },
    fail(value) { failed = value; }, focus(value) { focused = value; }, membership(value) { member = value; },
    close() { cleanups.forEach(cleanup => cleanup()); },
  };
}

test('history starts with 50, prepends without jumping, and catches up beyond one batch', async () => {
  const h = historyHarness(130);
  await h.flush();
  assert.equal(h.result.messages.length, 50);
  assert.equal(h.result.messages[0].id, message(81).id);
  h.viewport.scrollTop = 25; h.result.onScroll();
  await h.result.older(); await h.flush();
  assert.equal(h.result.messages.length, 100);
  assert.equal(h.viewport.scrollTop, 1525);
  h.dbRows.push(...Array.from({ length: 125 }, (_, i) => message(131 + i)));
  h.result.refresh(); await h.flush();
  assert.equal(h.result.messages.length, 225);
  assert.equal(h.result.messages.at(-1).id, message(255).id);
  assert.ok(h.requests.every(request => request.limit === 50));
  assert.equal(new Set(h.result.messages.map(row => row.id)).size, 225);
  h.close();
});

test('hidden/unfocused chats are not marked read; network errors preserve history', async () => {
  const h = historyHarness(3); h.focus(false);
  await h.flush(); assert.equal(h.changes.filter(change => change.readThrough).length, 0);
  assert.equal(h.changes.find(change => change.latest)?.latest.body, '3');
  h.focus(true); h.result.onScroll(); await h.flush();
  assert.ok(h.changes.some(change => change.readThrough));
  h.fail(true); h.result.refresh(); await h.flush();
  assert.equal(h.result.messages.length, 3); assert.ok(h.result.error);
  h.fail(false); h.document.hidden = true;
  const requestCount = h.requests.length;
  h.result.refresh(); await h.flush(); assert.equal(h.requests.length, requestCount);
  h.document.hidden = false; h.result.refresh(); await h.flush(); assert.equal(h.result.error, '');
  h.close();
});

test('colectivo removal clears visible history and disables sending', async () => {
  const h = historyHarness(4, 'group'); await h.flush();
  assert.equal(h.result.allowed, true);
  h.membership(false); h.result.refresh(); await h.flush();
  assert.equal(h.result.allowed, false); assert.equal(h.result.messages.length, 0);
  h.close();
});

test('new messages notify inbox previews even while the thread is unfocused', async () => {
  for (const kind of ['direct', 'group']) {
    const h = historyHarness(3, kind); h.focus(false); await h.flush();
    const before = h.changes.length;
    h.dbRows.push(message(4)); h.result.refresh(); await h.flush();
    const updates = h.changes.slice(before);
    assert.equal(updates.find(change => change.latest)?.latest.body, '4');
    assert.equal(updates.filter(change => change.readThrough).length, 0);
    const after = h.changes.length;
    h.result.refresh(); await h.flush();
    assert.equal(h.changes.length, after);
    h.close();
  }
});
