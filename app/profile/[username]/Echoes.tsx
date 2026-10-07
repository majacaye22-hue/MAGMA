"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { FeedImage } from "@/app/components/FeedImage";
import { EchoButton } from "@/app/components/EchoButton";
type Original = { id:string; type:string; title:string|null; body:string|null; media_url:string|null; cover_url:string|null; media_type:string|null; is_sensitive:boolean|null; profiles:{username:string}|null };
type Echo = {id:string; post_id:string; note:string; created_at:string; posts:Original};

export function Echoes({profileId,currentUserId}:{profileId:string;currentUserId:string|null}) {
  const [rows,setRows]=useState<Echo[]>([]);
  const [status,setStatus]=useState("cargando ecos…");
  useEffect(()=>{
    let active=true;
    async function load() {
      try {
      const {data,error}=await getSupabaseClient().from("post_echoes").select("id, post_id, note, created_at, posts!inner(id,type,title,body,media_url,cover_url,media_type,is_sensitive,profiles!posts_author_id_fkey(username))").eq("user_id",profileId).order("created_at",{ascending:false});
      if(!active)return;
      setRows((data ?? []) as unknown as Echo[]);
      setStatus(error ? "no se pudieron cargar los ecos. intenta recargar la página." : "");
      } catch { if(active)setStatus("no se pudieron cargar los ecos. intenta recargar la página."); }
    }
    void load();
    return ()=>{active=false;};
  },[profileId]);
  return <section aria-label="ecos">
    <p className="mb-6 text-sm text-[var(--magma-muted)]">lo que me mueve · obras de otras personas, con su crédito intacto.</p>
    {status ? <p role="status">{status}</p> : !rows.length ? <p className="py-6 text-sm">todavía no hay ecos</p> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rows.map(e=>{
      const p=e.posts; const image=p.cover_url ?? (p.media_type?.startsWith("image/") || p.type==="fotografía" || p.type==="arte" ? p.media_url : null);
      return <article key={e.id} className="min-w-0 border border-white/15 p-4">
        {e.note && <p className="mb-4 whitespace-pre-wrap break-words">{e.note}</p>}
        <Link href={`/post/${p.id}`} className="block">
          {image&&!p.is_sensitive&&<FeedImage src={image} alt={p.title??"obra original"} className="mb-4 max-h-80 w-full object-contain" />}
          {p.is_sensitive&&<p className="mb-3 text-sm">contenido sensible · ver original</p>}
          <h3>{p.title||"sin título"}</h3>
          {!p.is_sensitive && p.body && <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-[var(--magma-muted)]">{p.body.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").slice(0,400)}</p>}
        </Link>
        {p.profiles&&<Link className="mt-3 block text-sm text-[var(--magma-red)]" href={`/profile/${p.profiles.username}`}>obra de @{p.profiles.username}</Link>}
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/post/${p.id}#comments`} className="min-w-0 text-sm">ver original y conversación →</Link>
          {currentUserId===profileId&&<span className="inline-flex shrink-0"><EchoButton postId={p.id} userId={currentUserId} onRemoved={()=>setRows(rows=>rows.filter(row=>row.id!==e.id))} /></span>}
        </div>
      </article>;
    })}</div>}
  </section>;
}
