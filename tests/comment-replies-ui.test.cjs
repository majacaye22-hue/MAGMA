const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const root = {id:'root',author_id:'other',body:'a question',created_at:'2026-10-20',profiles:{username:'other'}};
const reply = {id:'reply',parent_id:'root',author_id:'self',body:'an answer',created_at:'2026-10-21',profiles:{username:'self'}};
function harness({enabled=true,commentsEnabled=true,comments=[root,reply],failure=null}={}) {
  let index=0; const state=[]; const writes=[]; const exports={};
  const helpers={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/comment-threads.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS},
  }).outputText,{exports:helpers,process:{env:{}}});
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/CommentsSection.tsx','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020},
  }).outputText,{exports,crypto:{randomUUID:()=> 'new-comment'},require(name){
    if(name==='react/jsx-runtime') return require(name);
    if(name==='react') return {
      useState(initial){const i=index++; if(!(i in state)) state[i]=initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},
      useRef:()=>({current:null}),useEffect(){},
    };
    if(name==='next/link') return {default:'a'};
    if(name==='./ReportModal') return {ReportModal:()=>null};
    if(name==='@/lib/comment-threads') return {...helpers,COMMENT_REPLIES_ENABLED:enabled};
    if(name==='@/lib/supabase') return {getSupabaseClient:()=>({
      auth:{getUser:async()=>({data:{user:{id:'self'}}})},
      from:()=>({insert:async value=>{writes.push(value); if(failure==='network') throw Error('offline');return {error:failure?{message:failure}:null};}}),
    })};
    throw Error(name);
  }});
  function walk(n){return !n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(walk):[n,...walk(n.props?.children)];}
  const render=()=>{index=0;return walk(exports.CommentsSection({postId:'post',initialComments:comments,currentUserId:'self',currentProfile:{username:'self'},commentsEnabled}));};
  const input=()=>render().find(n=>n.type==='textarea');
  return {render,writes,input,type(text){input().props.onChange({target:{value:text}});},
    choose(id){render().find(n=>n.props?.comment?.id===id).props.onReply();},
    submit(){return render().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});}};
}
test('composer opens immediately under the selected root or reply, preserving drafts when moved',()=>{
  const h=harness();
  for(const id of ['root','reply']) {
    h.choose(id);
    const nodes=h.render();
    assert.equal(nodes.filter(n=>n.type==='form').length,1);
    const container=nodes.find(n=>Array.isArray(n.props?.children)&&n.props.children.some(child=>child?.props?.comment?.id===id));
    const children=container.props.children;
    const index=children.findIndex(child=>child?.props?.comment?.id===id);
    assert.equal(children[index+1].type,'form');
    assert.equal(children[index+1].props['data-reply-to'],id);
    if(id==='root') h.type('draft stays');
    else assert.equal(h.input().props.value,'draft stays');
  }
});
test('replying within a thread writes its root ID and clears composer on success',async()=>{
  const h=harness(); h.choose('reply');h.type('another thought');await h.submit();
  assert.equal(h.writes[0].parent_id,'root'); assert.equal(h.input().props.value,'');
  assert.ok(h.render().some(n=>n.props?.comment?.id==='new-comment'));
});
test('cancelling a reply keeps text and submits as a standalone comment',async()=>{
  const h=harness();h.choose('root');h.type('keep this');
  h.render().find(n=>n.type==='button'&&n.props.children==='cancelar respuesta').props.onClick();
  assert.equal(h.input().props.value,'keep this');await h.submit();assert.equal(h.writes[0].parent_id,null);
});
for(const failure of ['network','reply target unavailable']) test(`${failure} preserves draft and reply target`,async()=>{
  const h=harness({failure});h.choose('root');h.type('do not lose');await h.submit();
  assert.equal(h.input().props.value,'do not lose');assert.ok(h.render().some(n=>n.props?.role==='alert'));
  assert.ok(h.render().some(n=>n.type==='button'&&n.props.children==='cancelar respuesta'));
  assert.equal(h.render().filter(n=>n.props?.comment).length,2);
});
test('rollout off omits parent field and exposes no reply controls',async()=>{
  const h=harness({enabled:false});assert.ok(h.render().filter(n=>n.props?.comment).every(n=>!n.props.onReply));
  h.type('plain comment');await h.submit();assert.equal('parent_id' in h.writes[0],false);
});
test('closed, hidden and unavailable parent threads cannot be replied to',()=>{
  for(const opts of [{commentsEnabled:false},{comments:[{...root,is_hidden:true},reply]},{comments:[reply]}]){
    const h=harness(opts);assert.ok(h.render().filter(n=>n.props?.comment).every(n=>!n.props.onReply));
  }
});
