"use client";
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
export function QuestionControls({postId}:{postId:string}) {
  const router=useRouter();const [own,setOwn]=useState<boolean|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true; void (async()=>{
    try {const {data,error}=await getSupabaseClient().rpc('owns_question',{pid:postId});if(error)throw error;if(active)setOwn(data===true);}
    catch {if(active)setError('no se pudieron cargar los controles; recarga para reintentar');}
  })();return()=>{active=false;};},[postId]);
  async function act(){
    if(busy||own===null||!window.confirm(own?'¿eliminar esta pregunta y sus respuestas?':'¿dejar de ver las preguntas de esta persona? no se revelará su identidad.'))return;
    setBusy(true);setError('');
    try {const {error}=await getSupabaseClient().rpc(own?'delete_my_question':'block_question_author',{pid:postId});if(error)throw error;router.replace('/');router.refresh();}
    catch{setError('no se pudo guardar; reintenta');}finally{setBusy(false);}
  }
  return <div className="my-3 text-sm">{own!==null&&<button onClick={act} disabled={busy} className="min-h-11 underline disabled:opacity-40">{own?'eliminar mi pregunta':'ocultar preguntas de esta persona'}</button>}{error&&<p role="alert">{error}</p>}</div>;
}
