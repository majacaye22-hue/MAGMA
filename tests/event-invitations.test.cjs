const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const labels = { pending: 'sin respuesta', going: 'voy', maybe: 'tal vez', declined: 'no puedo' };
function harness({ host = false, fail = false, ended = false, privateEvent = false, status = 'scheduled' } = {}) {
  const row = { id: 'invitation', event_id: 'event', recipient_id: 'guest', response: 'pending', profiles: { username: 'guest' },
    posts: { event_status: status, title: 'encuentro', event_date: ended ? '2000-01-01' : '2099-01-01', venue: 'CDMX', media_url: '/poster.jpg', audience_colectivo_id: privateEvent ? 'private' : null } };
  const state = [[row], 'guest', true, '', '', false, true]; let index = 0; const calls = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/EventInvitations.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, AbortSignal, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/lib/event-management') return require('./event-management-loader.cjs')(true);
    if (name === 'react') return { useState(initial) { const i=index++; if (!(i in state)) state[i]=initial; return [state[i],v=>{state[i]=v;}]; }, useRef:()=>({current:0}), useCallback:fn=>fn, useEffect() {} };
    if (name === 'next/link') return { default:'a' };
    if (name === '@/lib/event-invitations') return { EVENT_RESPONSES:labels };
    if (name === '@/lib/collaborations') return { inviteUsernames:v=>v.split(','), collaborationError:e=>e.message };
    if (name === './CollaboratorPicker') return { CollaboratorPicker:'picker' };
    if (name === './PostImage') return { PostImage:'poster' };
    if (name === '@/lib/supabase') return { getSupabaseClient:()=>({
      rpc:async(name,args)=>{ calls.push([name,args]); return {error:fail?{message:'denied'}:null}; },
      from() { const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,abortSignal:async()=>({data:[row]})}; return q; },
    }) };
    throw Error(name);
  } });
  function walk(n) { return !n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(walk):[n,...walk(n.props?.children)]; }
  const render=()=>{index=0;return walk(exports.EventInvitations({userId:host?'host':'guest',eventId:host?'event':undefined}));};
  return {state,calls,render,async click(label){const b=render().find(n=>n.type==='button'&&n.props.children===label);assert.ok(b);await b.props.onClick();}};
}
test('recipient RSVP uses invitation RPC only, without public attendance or chats', async()=>{
  const h=harness(); await h.click('voy'); assert.equal(h.calls[0][0],'respond_to_event_invitation');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0][1])),{eid:'event',answer:'going'});
  assert.equal(h.state[4],'respuesta guardada.');
});
test('failed RSVP reports failure without claiming success',async()=>{
  const h=harness({fail:true});await h.click('tal vez');assert.equal(h.state[3],'denied');assert.equal(h.state[4],'');assert.equal(h.state[5],false);
});
test('host sends selected accounts, clears them only on success and has no RSVP buttons',async()=>{
  const h=harness({host:true});await h.click('enviar invitaciones');assert.equal(h.calls[0][0],'invite_to_event');assert.equal(h.state[1],'');
  assert.ok(!h.render().some(n=>n.type==='button'&&n.props.children==='voy'));
  const failed=harness({host:true,fail:true});await failed.click('enviar invitaciones');assert.equal(failed.state[1],'guest');
});
test('past events cannot be answered in UI; private cards do not embed protected media',()=>{
  assert.ok(!harness({ended:true}).render().some(n=>n.type==='button'&&n.props.children==='voy'));
  assert.ok(!harness({privateEvent:true}).render().some(n=>n.type==='poster'));
});
test('cancelled and postponed events cannot be answered even with future dates',()=>{
  for (const status of ['cancelled','postponed']) assert.ok(!harness({status}).render().some(n=>n.type==='button'&&n.props.children==='voy'));
});
