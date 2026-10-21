"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type Notification = {
  id: string; kind: "mention" | "comment" | "conversation" | "message" | "colectivo_request" | "colectivo_approved" | "colectivo_rejected" | "event_cancelled" | "event_postponed" | "event_updated";
  colectivo_id: string | null;
  actor?: { username: string | null } | null;
  post_id: string | null; conversation_id: string | null;
  read_at: string | null; created_at: string;
};

export function NotificationBell() {
  const db = getSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let authChanged = false;
    const { data: { subscription } } = db.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      authChanged = true;
      if (active) setUserId(session?.user.id ?? null);
    });
    void db.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (active && !authChanged) setUserId(data.session?.user.id ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [db]);

  useEffect(() => {
    let active = true;
    let running = false;
    setItems([]); setCount(0); setLoading(true);
    async function load() {
      if (!userId || running || document.hidden) return;
      running = true;
      try {
        const [list, unread] = await Promise.all([
          db.from("notifications").select("id,kind,post_id,conversation_id,colectivo_id,read_at,created_at,actor:profiles!notifications_actor_id_fkey(username)")
            .eq("recipient_id", userId).order("created_at", { ascending: false }).limit(30),
          db.from("notifications").select("id", { count: "exact", head: true })
            .eq("recipient_id", userId).is("read_at", null),
        ]);
        if (!active) return;
        if (list.error || unread.error) { setError(true); return; }
        setItems(list.data ?? []); setCount(unread.count ?? 0); setError(false);
      } catch { if (active) setError(true); }
      finally { running = false; if (active) setLoading(false); }
    }
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false; window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [db, userId, refresh, open]);

  useEffect(() => { setOpen(false); }, [pathname, userId]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); root.current?.querySelector("button")?.focus(); }
    }
    if (open) {
      document.addEventListener("pointerdown", outside);
      document.addEventListener("keydown", escape);
    }
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function markRead(item?: Notification) {
    if (!userId || busy) return;
    setBusy(true);
    try {
      let query = db.from("notifications").update({ read_at: new Date().toISOString() })
        .eq("recipient_id", userId).is("read_at", null);
      if (item) query = query.eq("id", item.id);
      const { error: updateError } = await query;
      if (updateError) { setError(true); return; }
      setRefresh((n) => n + 1);
      if (item) {
        if (item.colectivo_id) {
          const { data: colectivo, error: lookupError } = await db.from("colectivos").select("slug").eq("id", item.colectivo_id).single();
          if (lookupError || !colectivo) { setError(true); return; }
          setOpen(false);
          router.push(`/colectivos/${colectivo.slug}${item.kind === "colectivo_request" ? "/ajustes" : ""}`);
          return;
        }
        setOpen(false);
        router.push(item.kind === "message" ? `/mensajes?c=${item.conversation_id}` : `/post/${item.post_id}${item.kind === "mention" || item.kind.startsWith("event_") ? "" : "#comments"}`);
      }
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  if (!userId) return null;
  return (
    <div ref={root} className="relative ml-3">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        aria-controls="notification-panel" aria-label={`notificaciones${count ? ` · ${count} sin leer` : ""}`}
        className="magma-nav-action relative p-2 text-white cursor-pointer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {count > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-[#E12120] px-1 text-[10px] text-white">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && <section id="notification-panel" aria-label="notificaciones"
        className="fixed right-4 top-14 w-[calc(100vw-2rem)] max-w-sm border border-white/20 bg-[#141412] text-white shadow-xl md:absolute md:top-full md:right-0 md:w-96">
        <div className="flex justify-between items-center gap-3 border-b border-white/15 p-4">
          <h2 className="text-sm">notificaciones</h2>
          <button className="text-xs underline disabled:opacity-40" disabled={busy || !count} onClick={() => void markRead()}>marcar todas leídas</button>
        </div>
        {error && <div role="alert" className="p-4 text-sm">no se pudieron cargar o actualizar las notificaciones. <button className="underline" onClick={() => setRefresh((n) => n + 1)}>reintentar</button></div>}
        {loading ? <p role="status" className="p-4 text-sm">cargando…</p> : !items.length && !error ? <p className="p-4 text-sm">sin notificaciones por ahora</p> : null}
        <ul className="max-h-[65vh] overflow-y-auto">
          {items.map((item) => <li key={item.id} className="border-b border-white/10">
            <button disabled={busy} className={`w-full text-left p-4 hover:bg-white/10 disabled:opacity-50 ${!item.read_at ? "bg-white/5" : ""}`} onClick={() => void markRead(item)}>
              <span className="block text-sm">{!item.read_at && <span aria-label="sin leer" className="mr-2 text-[#E12120]">●</span>}{item.kind === "event_cancelled" ? "se canceló un evento al que te invitaron o confirmaste asistencia" : item.kind === "event_postponed" ? "se pospuso un evento al que te invitaron o confirmaste asistencia" : item.kind === "event_updated" ? "cambió la fecha o el lugar de un evento; revisa los detalles" : item.kind === "mention" ? (item.actor?.username ? `@${item.actor.username} te mencionó en una publicación` : "te mencionaron en una publicación") : item.kind === "colectivo_request" ? "nueva solicitud para tu colectivo" : item.kind === "colectivo_approved" ? "aprobaron tu solicitud al colectivo" : item.kind === "colectivo_rejected" ? "no se aprobó tu solicitud al colectivo" : item.kind === "message" ? "tienes un nuevo mensaje" : item.kind === "comment" ? "comentaron tu publicación" : "hay un nuevo comentario en una conversación en la que participaste"}</span>
              <time dateTime={item.created_at} className="block mt-1 text-xs text-white/60">{new Date(item.created_at).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</time>
            </button>
          </li>)}
        </ul>
        {items.length === 30 && <p className="p-3 text-xs text-white/60">mostrando las 30 más recientes</p>}
      </section>}
    </div>
  );
}
