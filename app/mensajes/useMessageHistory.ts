"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { CHAT_PAGE_SIZE, cursorFilter, mergeMessages, notifyInbox, type MessageCursor } from "@/lib/chat-sync";

export type ChatMessage = MessageCursor & {
  sender_id: string | null; body: string; read?: boolean;
  profiles?: { username: string } | null;
};

export function useMessageHistory(kind: "direct" | "group", id: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(kind === "direct");
  const [error, setError] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
  const [olderBusy, setOlderBusy] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const rowsRef = useRef<ChatMessage[]>([]);
  const alive = useRef(false);
  const epoch = useRef(0);
  const olderLock = useRef(false);
  const refreshRef = useRef<() => void>(() => {});
  const readRef = useRef<() => void>(() => {});
  const table = kind === "direct" ? "messages" : "colectivo_messages";
  const foreignKey = kind === "direct" ? "conversation_id" : "colectivo_id";
  const selection = kind === "direct" ? "id,sender_id,body,created_at,read" : "id,sender_id,body,created_at,profiles!colectivo_messages_sender_id_fkey(username)";

  useEffect(() => {
    const generationCounter = epoch;
    alive.current = true;
    let cancelled = false;
    let inFlight = false;
    let queued = false;
    let initialized = false;
    let membershipId: string | null = null;
    let cursor: ChatMessage | undefined;
    let readCursor = "";
    let reading = false;
    let caughtUp = false;
    const db = getSupabaseClient();

    async function markRead() {
      if (cancelled || reading || !caughtUp || !cursor || document.hidden || !document.hasFocus() || !stickToBottom.current || readCursor === cursor.id) return;
      reading = true;
      const through = cursor;
      try {
        const result = kind === "group"
          ? await db.rpc("read_colectivo_chat", { cid: id, through_time: through.created_at })
          : await db.from("messages").update({ read: true }).eq("conversation_id", id).eq("read", false).neq("sender_id", userId)
            .or(`created_at.lt.${through.created_at},and(created_at.eq.${through.created_at},id.lte.${through.id})`);
        if (!cancelled && !result.error) {
          readCursor = through.id;
          notifyInbox({ kind, id, readThrough: through.created_at });
        }
      } finally { reading = false; }
    }

    async function load() {
      if (cancelled || document.hidden) return;
      if (inFlight) { queued = true; return; }
      inFlight = true;
      try {
        if (kind === "group") {
          const { data: membership, error: membershipError } = await db.from("colectivo_members")
            .select("id").eq("colectivo_id", id).eq("user_id", userId).maybeSingle();
          if (cancelled) return;
          if (membershipError) throw membershipError;
          if (!membership) {
            epoch.current++; rowsRef.current = []; setMessages([]); setAllowed(false);
            initialized = false; cursor = undefined; caughtUp = false; membershipId = null;
            setHasOlder(false); setError("ya no tienes acceso a este chat."); return;
          }
          if (membershipId !== membership.id) {
            epoch.current++; membershipId = membership.id; initialized = false; cursor = undefined; readCursor = "";
            rowsRef.current = []; setMessages([]); stickToBottom.current = true;
          }
        }
        caughtUp = false;
        // Catch up in ordered batches, so more than 50 arrivals between visits cannot leave gaps.
        let more = true;
        while (more && !cancelled && !document.hidden) {
          const initial = !initialized;
          let query = db.from(table).select(selection).eq(foreignKey, id)
            .order("created_at", { ascending: !initial }).order("id", { ascending: !initial }).limit(CHAT_PAGE_SIZE);
          if (cursor && !initial) query = query.or(cursorFilter(cursor, "after"));
          const { data, error: fetchError } = await query;
          if (cancelled) return;
          if (fetchError) throw fetchError;
          const rows = (data ?? []) as unknown as ChatMessage[];
          if (rows.length) {
            rowsRef.current = mergeMessages(rowsRef.current, rows);
            setMessages(rowsRef.current);
            cursor = initial ? rows[0] : rows[rows.length - 1];
            notifyInbox({ kind, id, latest: cursor });
          }
          if (initial) setHasOlder(rows.length === CHAT_PAGE_SIZE);
          initialized = true;
          more = !initial && rows.length === CHAT_PAGE_SIZE;
        }
        caughtUp = !more;
        setAllowed(true); setError("");
        await markRead();
      } catch {
        if (!cancelled) setError("no se pudo actualizar el chat. tu borrador se conserva; reintentaremos al recuperar la conexión.");
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
        if (queued && !cancelled) { queued = false; void load(); }
      }
    }
    refreshRef.current = () => { void load(); };
    readRef.current = () => { void markRead().catch(() => {}); };
    void load();
    const interval = window.setInterval(() => void load(), 5000);
    const wake = () => { void load(); };
    window.addEventListener("focus", wake); window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    // Polling remains the fallback when a table is not published to Realtime.
    const channel = db.channel(`history:${kind}:${id}`).on("postgres_changes", {
      event: "INSERT", schema: "public", table, filter: `${foreignKey}=eq.${id}`,
    }, wake).subscribe();
    return () => {
      cancelled = true; alive.current = false; generationCounter.current++; clearInterval(interval);
      refreshRef.current = () => {}; readRef.current = () => {};
      window.removeEventListener("focus", wake); window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake); void db.removeChannel(channel);
    };
  }, [kind, id, userId, table, foreignKey, selection]);

  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    if (anchor.current) {
      element.scrollTop = anchor.current.top + element.scrollHeight - anchor.current.height;
      anchor.current = null;
    } else if (stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  async function older() {
    const first = rowsRef.current[0];
    if (!first || olderLock.current || !allowed) return;
    olderLock.current = true; setOlderBusy(true);
    const generation = epoch.current;
    try {
      const { data, error: fetchError } = await getSupabaseClient().from(table).select(selection).eq(foreignKey, id)
        .or(cursorFilter(first, "before")).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(CHAT_PAGE_SIZE);
      if (!alive.current || generation !== epoch.current) return;
      if (fetchError) throw fetchError;
      const rows = (data ?? []) as unknown as ChatMessage[];
      if (scroll.current) anchor.current = { height: scroll.current.scrollHeight, top: scroll.current.scrollTop };
      stickToBottom.current = false;
      rowsRef.current = mergeMessages(rowsRef.current, rows); setMessages(rowsRef.current);
      setHasOlder(rows.length === CHAT_PAGE_SIZE); setError("");
    } catch { if (alive.current) setError("no se pudieron cargar los mensajes anteriores. vuelve a intentarlo."); }
    finally { olderLock.current = false; if (alive.current) setOlderBusy(false); }
  }

  const refresh = useCallback(() => refreshRef.current(), []);
  function sent() { stickToBottom.current = true; notifyInbox({ kind, id }); refresh(); }
  function onScroll() {
    if (scroll.current) stickToBottom.current = scroll.current.scrollHeight - scroll.current.scrollTop - scroll.current.clientHeight < 80;
    if (stickToBottom.current) readRef.current();
  }
  return { messages, loading, allowed, error, hasOlder, olderBusy, older, scroll, onScroll, refresh, sent };
}
