"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

import { useMessageHistory } from "./useMessageHistory";
import { messageId, notifyInbox } from "@/lib/chat-sync";
import { chatDay, chatTime, continuesMessage } from "@/lib/chat-display";

export type ColectivoChat = {
  id: string; name: string; slug: string; muted: boolean; unread: boolean;
  preview: string | null; last_message_at: string | null;
};

export function ColectivoChatThread({ chat, userId, onBack }: {
  chat: ColectivoChat; userId: string; onBack: () => void;
}) {
  const history = useMessageHistory("group", chat.id, userId);
  const { messages, loading, allowed, hasOlder, olderBusy, older, scroll, onScroll } = history;
  const [sendFailed, setSendFailed] = useState(false);
  const sendLock = useRef(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [muted, setMuted] = useState(chat.muted);
  const [muteBusy, setMuteBusy] = useState(false);
  const attempt = useRef<{ id: string; body: string } | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => { setMuted(chat.muted); }, [chat.muted]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sendLock.current || !allowed) return;
    sendLock.current = true;
    setSending(true); setError("");
    try {
      if (attempt.current?.body !== trimmed) attempt.current = { id: messageId(), body: trimmed };
      const db = getSupabaseClient();
      const { error: sendError } = await db.rpc("send_colectivo_message", { cid: chat.id, message_id: attempt.current.id, message_body: trimmed });
      if (sendError) throw sendError;
      if (!alive.current) return;
      setBody(""); attempt.current = null; setSendFailed(false); history.sent();
    } catch { if (alive.current) { setSendFailed(true); setError("no se pudo confirmar el envío. puedes reintentar sin duplicar el mensaje."); } }
    finally { sendLock.current = false; if (alive.current) setSending(false); }
  }

  async function toggleMute() {
    setMuteBusy(true);
    try {
      const { error: muteError } = await getSupabaseClient().rpc("mute_colectivo_chat", { cid: chat.id, muted: !muted });
      if (muteError) throw muteError;
      if (alive.current) { setMuted(!muted); notifyInbox({ kind: "group", id: chat.id }); }
    } catch { if (alive.current) setError("no se pudo cambiar el silencio del chat."); }
    finally { if (alive.current) setMuteBusy(false); }
  }

  return <section className="flex h-full min-h-0 flex-col overflow-hidden text-sm text-white">
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <button onClick={onBack} className="md:hidden" aria-label="volver a mensajes">←</button>
      <Link className="min-w-0 flex-1 break-words font-bold hover:underline" href={`/colectivos/${chat.slug}`}>{chat.name}</Link>
      <button disabled={!allowed || muteBusy} aria-pressed={muted} onClick={toggleMute} className="underline disabled:opacity-50">{muted ? "activar avisos" : "silenciar"}</button>
    </header>
    <div ref={scroll} onScroll={onScroll} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-3">
      <details className="mb-2 text-sm text-white/60"><summary className="cursor-pointer">sobre este chat</summary><p className="mt-2">solo ves mensajes enviados desde tu última incorporación. todos los miembros actuales pueden participar.</p></details>
      {loading && <p role="status">cargando chat...</p>}
      {!loading && allowed && messages.length === 0 && <p>sin mensajes todavía. empieza la conversación.</p>}
      {hasOlder && <button onClick={older} disabled={olderBusy || !allowed} className="underline">{olderBusy ? "cargando..." : "cargar anteriores"}</button>}
      {messages.map((message, index) => <Fragment key={message.id}>
        {(!messages[index - 1] || chatDay(messages[index - 1].created_at) !== chatDay(message.created_at)) && <p className="py-2 text-center text-xs text-white/60">{chatDay(message.created_at)}</p>}
        <article className={`max-w-[90%] space-y-1 border-l-2 pl-3 ${message.sender_id === userId ? "border-accent" : "border-border"}`}>
        {!continuesMessage(messages[index - 1], message) && (message.profiles ? <Link className="font-bold hover:underline" href={`/profile/${message.profiles.username}`}>@{message.profiles.username}</Link> : <span>cuenta eliminada</span>)}
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <time className="text-xs text-white/60" dateTime={message.created_at}>{chatTime(message.created_at)}</time>
      </article></Fragment>)}
    </div>
    {history.error && <p role="alert" className="shrink-0 px-4 py-2">{history.error} <button onClick={history.refresh} className="underline">reintentar</button></p>}
    {error && <p role="alert" className="shrink-0 px-4 py-2">{error}</p>}
    <form onSubmit={send} className="flex shrink-0 items-center gap-3 border-t border-border bg-surface px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <textarea aria-label="mensaje al colectivo" maxLength={4000} rows={1} value={body} disabled={sending} onChange={e => setBody(e.target.value)} placeholder="escribe al colectivo..." className="min-h-11 min-w-0 flex-1 resize-none bg-transparent p-2 focus:outline-2 focus:outline-white" />
      <button disabled={!allowed || sending || !body.trim()} className="magma-send-button min-h-11 shrink-0 px-4 py-2 disabled:opacity-40">{sending ? "enviando..." : sendFailed ? "reintentar" : "enviar"}</button>
    </form>
  </section>;
}
