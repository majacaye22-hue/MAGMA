const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function harness({owner=true,confirmed=true,fail=false}={}) {
  const state=[[],true,'','',false,'profile','participant','',[],{id:'guest',label:'@guest'},false,'cancelled','rain'];
  let index=0; const calls=[]; const exports={};
  const result=()=>({error:fail?{message:'denied'}:null});
  const db={rpc:async(name,args)=>{calls.push([name,args]);return result();},from:table=>{
    const q={select:()=>q,eq:()=>q,order:async()=>({data:[]}),insert:async args=>{calls.push([table,args]);return result();}};return q;
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/EventManagement.tsx','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
  }).outputText,{exports,window:{confirm:()=>confirmed},require(name){
    if(name==='react/jsx-runtime')return require(name);
    if(name==='react')return {useState(initial){const i=index++;if(!(i in state))state[i]=initial;return [state[i],v=>state[i]=v];},useEffect(){},useCallback:fn=>fn};
    if(name==='next/link')return {default:'a'};
    if(name==='next/navigation')return {useRouter:()=>({refresh:()=>calls.push(['refresh'])})};
    if(name==='@/lib/supabase')return {getSupabaseClient:()=>db};
    if(name==='@/lib/event-management')return require('./event-management-loader.cjs')(true);
    throw Error(name);
  }});
  const walk=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(walk):[n,...walk(n.props?.children)];
  const render=()=>{index=0;return walk(exports.EventManagement({eventId:'event',userId:owner?'host':'guest',ownerId:'host',status:'scheduled',version:7}));};
  return {state,calls,render,async click(label){const b=render().find(n=>n.type==='button'&&n.props.children===label);assert.ok(b);b.props.onClick();await new Promise(resolve=>setImmediate(resolve));}};
}
test('event links preserve role and target type, without granting collaboration permissions',async()=>{
  for(const kind of ['profile','colectivo','project']) {
    const h=harness();h.state[5]=kind;await h.click('añadir vínculo');
    assert.equal(h.calls[0][0],'event_people');
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0][1])),{event_id:'event',role:'participant',[`${kind}_id`]:'guest'});
    assert.equal(h.calls.length,2);
  }
});
test('only owner has event management controls',()=>{
  assert.ok(!harness({owner:false}).render().some(n=>n.type==='details'));
});
test('cancellation requires confirmation and uses optimistic status version',async()=>{
  const cancelled=harness({confirmed:false});await cancelled.click('guardar estado y notificar');assert.equal(cancelled.calls.length,0);
  const h=harness();await h.click('guardar estado y notificar');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])),['change_event_status',{eid:'event',next_status:'cancelled',explanation:'rain',expected_version:7}]);
});
test('failed status update displays an error without a success or refresh',async()=>{
  const h=harness({fail:true});await h.click('guardar estado y notificar');
  assert.equal(h.state[2],'denied');assert.equal(h.state[3],'');assert.equal(h.calls.length,1);
});
test('closed event states are unavailable, legacy missing status remains available',()=>{
  const {eventUnavailable}=require('./event-management-loader.cjs')();
  for(const event_status of ['cancelled','postponed'])assert.equal(eventUnavailable({event_status}),true);
  assert.equal(eventUnavailable({}),false);assert.equal(eventUnavailable({event_status:'scheduled'}),false);
});
