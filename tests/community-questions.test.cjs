const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function harness(fail=false){
 const state=[],refs=[];let i=0,r=0;const calls=[],exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/QuestionComposer.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,
 {exports,crypto:{randomUUID:()=> 'retry-key'},require(name){
 if(name==='react/jsx-runtime')return require(name);
 if(name==='react')return {useState(initial){const k=i++;if(!(k in state))state[k]=initial;return [state[k],v=>state[k]=v];},useRef(initial){const k=r++;return refs[k]??=( {current:initial});}};
 if(name==='next/link')return {default:'a'};
 if(name==='next/navigation')return {useRouter:()=>({push:url=>calls.push(['route',url]),refresh(){}})};
 if(name==='@/lib/supabase')return {getSupabaseClient:()=>({rpc:async(name,args)=>{calls.push([name,args]);return fail?{error:{message:'network failed'}}:{data:'post-id'};}})};
 throw Error(name);
 }});
 const walk=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(walk):[n,...walk(n.props?.children)];
 const render=()=>{i=0;r=0;return walk(exports.QuestionComposer());};
 return {calls,state,render,async publish(){await render().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});}};
}
test('questions use the private publishing RPC, signed by default, with explicit anonymous opt-in',async()=>{
 for(const anonymous of [false,true]){
 const h=harness();h.render();h.state[0]=' ¿qué escuchas? ';h.state[1]=' contexto ';h.state[2]=anonymous;
 await h.publish();assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])),['publish_question',{question:'¿qué escuchas?',context:'contexto',anonymous,request_id:'retry-key'}]);
 assert.deepEqual(h.calls[1],['route','/post/post-id']);
 }
});
test('uncertain failures retain the same request and lock content/privacy during retry',async()=>{
 const h=harness(true);h.render();h.state[0]='pregunta';await h.publish();await h.publish();
 assert.equal(h.calls.length,2);assert.equal(h.calls[0][1].request_id,h.calls[1][1].request_id);
 assert.equal(h.render().find(n=>n.type==='fieldset').props.disabled,true);
 assert.equal(h.state[4],'network failed');
});
test('questions are rollout disabled by default',()=>{
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/community-questions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,process:{env:{}}});
 assert.equal(exports.QUESTIONS_ENABLED,false);
});
