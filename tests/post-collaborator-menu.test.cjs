const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function harness({user='owner',enabled=true}={}) {
  const state=[false,false,0,false,null,true,false,false,{left:0,top:0}];let cursor=0;const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/PostInteractionBar.tsx','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
  }).outputText,{exports,document:{body:{}},require(name){
    if(name==='react/jsx-runtime')return require(name);
    if(name==='react')return {useState(initial){const i=cursor++;return [state[i]??initial,v=>state[i]=typeof v==='function'?v(state[i]):v];},useEffect(){},useRef:()=>({current:null})};
    if(name==='react-dom')return {createPortal:n=>n};
    if(name==='next/link')return {default:'a'};
    if(name==='next/navigation')return {useRouter:()=>({}),usePathname:()=>'/post/test'};
    if(name==='@/lib/supabase')return {};
    if(name==='@/lib/collaborations')return {COLLABORATIONS_ENABLED:enabled};
    for(const component of ['BookmarkButton','ReportModal','EchoButton','PostCollaboratorsDialog'])if(name===`./${component}`)return {[component]:component};
    throw Error(name);
  }});
  const walk=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(walk):[n,...walk(n.props?.children)];
  return ()=>{cursor=0;return walk(exports.PostInteractionBar({postId:'test',postAuthorId:'owner',currentUserId:user,initialAppreciations:0,commentsEnabled:true}));};
}
test('owner menu opens collaborator dialog for the correct post and closes menu',()=>{
  const render=harness();render().find(n=>n.type==='button'&&n.props.children==='invitar colaboradores').props.onClick();
  const dialog=render().find(n=>n.type==='PostCollaboratorsDialog');
  assert.equal(dialog.props.postId,'test');assert.equal(dialog.props.userId,'owner');
  assert.ok(!render().some(n=>n.type==='button'&&n.props.children==='invitar colaboradores'));
  dialog.props.onClose();assert.ok(!render().some(n=>n.type==='PostCollaboratorsDialog'));
});
test('invitation menu action is absent for nonowners, guests and disabled rollout',()=>{
  for(const options of [{user:'other'},{user:null},{enabled:false}])assert.ok(!harness(options)().some(n=>n.type==='button'&&n.props.children==='invitar colaboradores'));
});
