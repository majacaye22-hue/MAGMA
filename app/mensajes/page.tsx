"use client";

import { useEffect, useRef, useState, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { ColectivoChatThread, type ColectivoChat } from "./ColectivoChat";
import { EventInvitations } from '@/app/components/EventInvitations';
import { EVENT_INVITATIONS_ENABLED } from '@/lib/event-invitations';

import { useMessageHistory } from "./useMessageHistory";
import { sendDirectMessage } from "@/lib/send-direct-message";
import { CHAT_INBOX_CHANGED, messageId, type InboxChange } from "@/lib/chat-sync";
import { chatDay, chatTime, continuesMessage } from "@/lib/chat-display";
import styles from "./messages.module.css";
import { PROFILE_OFFERINGS_ENABLED } from '@/lib/profile-offerings';
import { offeringReference, offeringReferenceHref, type OfferingReference } from '@/lib/offering-reference';

function ReferenceCard({ reference }: { reference: OfferingReference }) {
  return <Link href={offeringReferenceHref(reference)} className="mb-2 block border border-[#49463f] bg-[#181516] p-3 text-sm text-white hover:border-[#dc143c]">
    <span className="block font-bold">sobre: {reference.title} ↗</span>
    <span className="mt-1 block text-xs">portafolio · @{reference.username}</span>
  </Link>;
}

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";
const BG = "var(--magma-obsidian)";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_color: string | null;
}

interface Conversation {
  id: string;
  other: OtherProfile;
  last_message_at: string;
  last_message_preview: string | null;
  unread: boolean;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────


function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}



// ─── Blink animation ──────────────────────────────────────────────────────────

const BLINK_CSS = `
@keyframes msgblink { 0%,100%{opacity:1} 50%{opacity:0} }
.msg-cursor { animation: msgblink 1s step-end infinite; }
`;

// ─── Block modal ──────────────────────────────────────────────────────────────

function BlockModal({ other, currentUserId, onClose, onBlocked }: {
  other: OtherProfile;
  currentUserId: string;
  onClose: () => void;
  onBlocked: () => void;
}) {
  const [blocking, setBlocking] = useState(false);

  async function handleBlock() {
    setBlocking(true);
    const supabase = getSupabaseClient();
    await supabase.from("blocked_users").insert({ blocker_id: currentUserId, blocked_id: other.id });
    onBlocked();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(9,10,13,0.9)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-5 p-7"
        style={{ backgroundColor: BG, border: "1px solid #49463f", borderRadius: "2px", maxWidth: "320px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>{"// bloquear usuario"}</p>
        <p style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: mono }}>@{other.username}</p>
        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.7 }}>
          no podrá enviarte mensajes.
        </p>
        <div className="flex gap-5">
          <button
            onClick={handleBlock}
            disabled={blocking}
            className="cursor-pointer hover:opacity-70 disabled:opacity-40"
            style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", background: "none", border: "0.5px solid #E12120", padding: "6px 16px" }}
          >
            {blocking ? "..." : "confirmar"}
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer hover:opacity-70"
            style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", background: "none", border: "none", padding: 0 }}
          >
            cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New message panel ────────────────────────────────────────────────────────

function NewMessagePanel({ currentUserId, blockedIds, onConversationCreated, onClose }: {
  currentUserId: string;
  blockedIds: Set<string>;
  onConversationCreated: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OtherProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  useEffect(() => { if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.replace(/^@/, "").trim();
    if (!q) return;
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_color")
        .ilike("username", `%${q}%`)
        .neq("id", currentUserId)
        .limit(8);
      setResults(((data ?? []) as OtherProfile[]).filter((p) => !blockedIds.has(p.id)));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, currentUserId, blockedIds, supabase]);

  async function startConversation(other: OtherProfile) {
    const [p1, p2] = [currentUserId, other.id].sort();
    const { data: existing } = await supabase
      .from("conversations").select("id")
      .eq("participant_1", p1).eq("participant_2", p2).single();
    if (existing) { onConversationCreated(existing.id); return; }
    const { data: created } = await supabase
      .from("conversations")
      .insert({ participant_1: p1, participant_2: p2 })
      .select("id").single();
    if (created) onConversationCreated(created.id);
  }

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      {/* Search row */}
      <div
        className="flex items-center border-b shrink-0"
        style={{ borderColor: "#1e1e1e", padding: "10px 14px", gap: "8px" }}
      >
        <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, userSelect: "none" }}>{">"}</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="buscar por @usuario..."
          style={{ flex: 1, backgroundColor: "transparent", border: "none", outline: "none", color: "#F2F4F8", fontFamily: mono, fontSize: "var(--magma-text-small)" }}
        />
        <button
          onClick={onClose}
          style={{ fontSize: "var(--magma-text-body)", color: "var(--magma-muted)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 0, flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searching && (
          <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, padding: "10px 14px" }}>buscando...</p>
        )}
        {!searching && query && results.length === 0 && (
          <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, padding: "10px 14px" }}>sin resultados</p>
        )}
        {results.map((p) => (
          <button
            key={p.id}
            onClick={() => startConversation(p)}
            className="flex items-center gap-3 w-full text-left cursor-pointer border-b"
            style={{ padding: "9px 14px", borderColor: "#1a1a1a", backgroundColor: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1a1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
          >

            <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>@{p.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message thread ───────────────────────────────────────────────────────────

function MessageThread({ conversationId, currentUserId, other, onBlock, onBack, offeringId }: {
  offeringId: string | null;
  conversationId: string;
  currentUserId: string;
  other: OtherProfile;
  onBlock: () => void;
  onBack: () => void;
}) {
  const history = useMessageHistory("direct", conversationId, currentUserId);
  const { messages } = history;
  const attempt = useRef<{ id: string; body: string; offering_reference?: OfferingReference } | null>(null);
  const [reference, setReference] = useState<OfferingReference | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(!!offeringId && PROFILE_OFFERINGS_ENABLED);
  const [referenceError, setReferenceError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (!offeringId || !PROFILE_OFFERINGS_ENABLED) return;
    void (async () => {
      try {
        const result = await getSupabaseClient().from('profile_offerings').select('id,title')
          .eq('id', offeringId).eq('profile_id', other.id).single()
          .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
        if (result.error) throw result.error;
        if (!controller.signal.aborted) setReference(offeringReference({ ...result.data, username: other.username }));
      } catch { if (!controller.signal.aborted) setReferenceError(true); }
      finally { if (!controller.signal.aborted) setReferenceLoading(false); }
    })();
    return () => controller.abort();
  }, [offeringId, other.id, other.username]);
  const sendLock = useRef(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showBlock, setShowBlock] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  useEffect(() => { if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus(); }, [conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sendLock.current || referenceLoading) return;
    sendLock.current = true;
    setSending(true);
    setSendError(null);
    try {
      if (attempt.current?.body !== trimmed || attempt.current?.offering_reference?.id !== reference?.id) attempt.current = { id: messageId(), body: trimmed, ...(reference ? { offering_reference: reference } : {}) };
      await sendDirectMessage(supabase, conversationId, currentUserId, attempt.current);
      setBody(""); attempt.current = null;
      setReference(null);
      window.history.replaceState(null, '', `/mensajes?c=${conversationId}`);
      history.sent();
    } catch {
      setSendError("no se pudo confirmar el envío. tu mensaje sigue aquí; puedes reintentar sin duplicarlo.");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }


  return (
    <div className="flex min-h-0 flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center justify-between shrink-0 border-b"
        style={{ padding: "14px 18px", borderColor: "var(--magma-border)", backgroundColor: "var(--magma-rock)" }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {/* Back to list — mobile only */}
          <button
            onClick={onBack}
            className="md:hidden flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: "none", border: "none", padding: "4px", color: "var(--magma-muted)" }}
            aria-label="Volver a mensajes"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>

          <Link
            href={`/profile/${other.username}`}
            style={{ fontSize: "var(--magma-text-small)", color: "#F2F4F8", fontFamily: mono, textDecoration: "none" }}
            className="hover:underline"
          >
            @{other.username}
          </Link>
          {other.display_name && (
            <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
              ({other.display_name})
            </span>
          )}
        </div>
        <details className="relative">
          <summary aria-label="opciones de conversación" className="cursor-pointer list-none rounded p-2 text-white">···</summary>
          <div className="absolute right-0 z-40 mt-2 w-40 rounded-[2px] border border-[#49463f] bg-[#10100f] p-2">
            <button className="w-full p-2 text-left text-white" onClick={() => setShowBlock(true)}>bloquear</button>
          </div>
        </details>
      </div>

      {/* Messages */}
      <div
        ref={history.scroll}
        onScroll={history.onScroll}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "4px", background: BG }}
      >
        {history.loading && <p role="status">cargando mensajes…</p>}
        {!history.loading && !history.error && messages.length === 0 && <p className="text-sm text-white/70">sin mensajes todavía. empieza la conversación.</p>}
        {history.hasOlder && <button onClick={history.older} disabled={history.olderBusy} className="self-center py-2 underline">{history.olderBusy ? "cargando…" : "cargar anteriores"}</button>}

        {messages.map((msg, index) => {
          const isMine = msg.sender_id === currentUserId;
          const previous = messages[index - 1];
          const continued = continuesMessage(previous, msg);
          const newDay = !previous || chatDay(previous.created_at) !== chatDay(msg.created_at);
          return (
            <Fragment key={msg.id}>
            {newDay && <p className="py-2 text-center text-xs text-white/60">{chatDay(msg.created_at)}</p>}
            <div style={{ marginTop: continued ? 0 : 6, display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "72%" }}>
                {/* Sender label */}
                {!continued && <p style={{
                  fontSize: "var(--magma-text-small)",
                  color: isMine ? "var(--magma-ash)" : "var(--magma-muted)",
                  fontFamily: mono,
                  marginBottom: "4px",
                  textAlign: isMine ? "right" : "left",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  {isMine ? "tú" : `@${other.username}`}
                </p>}
                {/* Bubble — border-left stripe, no radius */}
                <div style={{
                  padding: "8px 12px",
                  backgroundColor: "#10100f",
                  border: `1px solid ${isMine ? "var(--magma-red)" : "#49463f"}`,
                  borderRadius: "2px",
                }}>
                  {offeringReference(msg.offering_reference) && <ReferenceCard reference={offeringReference(msg.offering_reference)!} />}
                  <p style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: mono, lineHeight: 1.55, wordBreak: "break-word" }}>
                    {msg.body}
                  </p>
                </div>
                {/* Timestamp */}
                <p style={{
                  fontSize: "12px", color: "#a6a6ad", fontFamily: mono,
                  marginTop: "3px", textAlign: isMine ? "right" : "left",
                }}>
                  {chatTime(msg.created_at)}
                </p>
              </div>
            </div>
            </Fragment>
          );
        })}

      </div>

      {history.error && <p role="alert" className="px-4 py-2 text-sm text-white">{history.error} <button onClick={history.refresh} className="underline">reintentar</button></p>}

      {/* Input */}
      {referenceLoading && <p role="status" className="px-4 py-2 text-sm">cargando referencia…</p>}
      {referenceError && <p role="status" className="px-4 py-2 text-sm">esta referencia ya no está disponible. puedes escribir sin ella.</p>}
      {reference && <div className="shrink-0 px-3 pt-3">
        <ReferenceCard reference={reference} />
        <button type="button" disabled={sending} className="mb-2 min-h-11 text-sm text-white" onClick={() => { setReference(null); window.history.replaceState(null, '', `/mensajes?c=${conversationId}`); }}>quitar referencia ×</button>
      </div>}
      <form
        onSubmit={handleSend}
        className="flex items-center shrink-0 border-t"
        style={{ borderColor: "var(--magma-border)", backgroundColor: "var(--magma-rock)", padding: "8px" }}
      >
        <span style={{ padding: "8px 4px 8px 8px", fontSize: "var(--magma-text-body)", color: "var(--magma-ash)", fontFamily: mono, userSelect: "none", flexShrink: 0 }}>
          {">"}
        </span>
        <input
          ref={inputRef}
          disabled={sending}
          type="text"
          aria-label="mensaje directo"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="escribe un mensaje..."
          autoComplete="off"
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            color: "#F2F4F8",
            fontFamily: mono,
            fontSize: "var(--magma-text-body)",
            padding: "8px 8px", minHeight: "44px",
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending || referenceLoading}
          className="magma-send-button cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          style={{
            fontSize: "var(--magma-text-small)",
            color: "var(--magma-ash)",
            fontFamily: mono,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            background: "none",
            border: "none",
            borderLeft: "0.5px solid var(--magma-border)",
            borderRadius: "7px",
            padding: "8px 16px", minHeight: "44px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          {sending ? "enviando…" : sendError ? "reintentar" : "enviar"}
        </button>
      </form>

      {sendError && <p role="alert" className="px-4 py-2 text-sm" style={{ color: "var(--magma-ash)" }}>{sendError}</p>}

      {showBlock && (
        <BlockModal
          other={other}
          currentUserId={currentUserId}
          onClose={() => setShowBlock(false)}
          onBlocked={() => { setShowBlock(false); onBlock(); }}
        />
      )}
    </div>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function MensajesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c");
  const activeGroupId = searchParams.get("colectivo");
  const [groupChats, setGroupChats] = useState<ColectivoChat[]>([]);
  const [groupError, setGroupError] = useState("");
  const [inboxError, setInboxError] = useState("");
  const inboxVersion = useRef(0);
  const directRequest = useRef(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  async function refreshBlockedIds(uid: string): Promise<Set<string>> {
    const supabase = getSupabaseClient();
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", uid),
      supabase.from("blocked_users").select("blocker_id").eq("blocked_id", uid),
    ]);
    const ids = new Set<string>([
      ...(mine ?? []).map((r: { blocked_id: string }) => r.blocked_id),
      ...(theirs ?? []).map((r: { blocker_id: string }) => r.blocker_id),
    ]);
    setBlockedIds(ids);
    return ids;
  }

  async function loadConversations(uid: string, blocked: Set<string>) {
    const supabase = getSupabaseClient();
    const version = inboxVersion.current;
    const request = ++directRequest.current;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, participant_1, participant_2, last_message_at")
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order("last_message_at", { ascending: false }).abortSignal(AbortSignal.timeout(10000));

    if (error) throw error;
    if (!data) return;

    type ConvRow = { id: string; participant_1: string; participant_2: string; last_message_at: string };
    const visible = (data as ConvRow[]).filter((c) => {
      const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1;
      return !blocked.has(otherId);
    });

    const profileIds = [...new Set(visible.map(c => c.participant_1 === uid ? c.participant_2 : c.participant_1))];
    const { data: profiles, error: profileError } = profileIds.length
      ? await supabase.from("profiles").select("id, username, display_name, avatar_color").in("id", profileIds).abortSignal(AbortSignal.timeout(10000))
      : { data: [], error: null };
    if (profileError) throw profileError;
    const profileMap = new Map((profiles as OtherProfile[]).map(profile => [profile.id, profile]));
    const isCurrent = () => version === inboxVersion.current && request === directRequest.current;
    // Show the conversation list before waiting on each independent preview.
    if (isCurrent()) {
      setConversations(previous => visible.map(c => {
        const old = previous.find(item => item.id === c.id);
        const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1;
        return { id: c.id, other: profileMap.get(otherId) ?? { id: otherId, username: "cuenta eliminada", display_name: null, avatar_color: null },
          last_message_at: old?.last_message_at ?? c.last_message_at,
          last_message_preview: old?.last_message_preview ?? null, unread: old?.unread ?? false };
      }));
    }
    const results = await Promise.allSettled(
      visible.map(async (c) => {
        const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1;
        const [latest, unread] = await Promise.all([
          supabase.from("messages").select("body,created_at").eq("conversation_id", c.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(10000)).maybeSingle(),
          supabase.from("messages").select("id").eq("conversation_id", c.id).eq("read", false).neq("sender_id", uid).limit(1).abortSignal(AbortSignal.timeout(10000)),
        ]);
        if (latest.error || unread.error) throw latest.error || unread.error;
        const updated = {
          id: c.id,
          other: profileMap.get(otherId) ?? { id: otherId, username: "cuenta eliminada", display_name: null, avatar_color: null },
          last_message_at: latest.data?.created_at ?? c.last_message_at,
          last_message_preview: latest.data?.body ?? null,
          unread: Boolean(unread.data?.length),
        };
        if (isCurrent()) setConversations(previous => previous.map(chat => chat.id === c.id ? updated : chat));
      })
    );
    if (isCurrent()) setInboxError(results.some(result => result.status === "rejected") ? "algunas conversaciones no se pudieron actualizar. volveremos a intentarlo." : "");
  }

  useEffect(() => {
    void (async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setCurrentUserId(user.id);
      const blocked = await refreshBlockedIds(user.id);
      setLoading(false);
      try { await loadConversations(user.id, blocked); }
      catch { setInboxError("no se pudo actualizar la bandeja. volveremos a intentarlo."); }
      finally { setLoading(false); }
    })();
  }, [router]);

  useEffect(() => {
    if (!currentUserId) return;
    const requestCounter = directRequest;
    let active = true;
    let busy = false;
    let queued = false;
    async function refresh() {
      if (!active || document.hidden) return;
      if (busy) { queued = true; return; }
      busy = true;
      try { await loadConversations(currentUserId!, blockedIds); }
      catch { if (active) setInboxError("no se pudo actualizar la bandeja. volveremos a intentarlo."); }
      finally {
        busy = false;
        if (queued && active) { queued = false; void refresh(); }
      }
    }
    function changed(event: Event) {
      const detail = (event as CustomEvent<InboxChange>).detail;
      if (detail.kind !== "direct") return;
      inboxVersion.current++;
      if (detail.latest) setConversations(previous => previous.map(chat =>
        chat.id === detail.id && (!chat.last_message_at || detail.latest!.created_at >= chat.last_message_at)
          ? { ...chat, last_message_preview: detail.latest!.body, last_message_at: detail.latest!.created_at, unread: chat.unread || detail.latest!.sender_id !== currentUserId } : chat));
      if (detail.readThrough) setConversations(previous => previous.map(chat =>
        chat.id === detail.id && chat.last_message_at <= detail.readThrough! ? { ...chat, unread: false } : chat));
      void refresh();
    }
    const wake = () => { void refresh(); };
    const db = getSupabaseClient();
    const channel = db.channel("direct-inbox").on("postgres_changes", {
      event: "*", schema: "public", table: "messages",
    }, wake).on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, wake)
      .subscribe((status: string) => { if (status === "SUBSCRIBED") wake(); });
    const interval = window.setInterval(wake, 5000);
    window.addEventListener(CHAT_INBOX_CHANGED, changed);
    window.addEventListener("focus", wake); window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false; requestCounter.current++; clearInterval(interval); void db.removeChannel(channel);
      window.removeEventListener(CHAT_INBOX_CHANGED, changed);
      window.removeEventListener("focus", wake); window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [currentUserId, blockedIds]);

  const activeConvo = conversations.find((c) => c.id === activeId);
  const activeGroup = groupChats.find(chat => chat.id === activeGroupId);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    let busy = false;
    let queued = false;
    let version = 0;
    async function loadGroups() {
      if (!active || document.hidden) return;
      if (busy) { queued = true; return; }
      busy = true;
      const requestVersion = version;
      try {
        const { data, error } = await getSupabaseClient().rpc("list_colectivo_chats").abortSignal(AbortSignal.timeout(10000));
        if (!active || requestVersion !== version) return;
        if (error) throw error;
        setGroupChats((data ?? []) as ColectivoChat[]); setGroupError("");
      } catch { if (active) setGroupError("no se pudieron actualizar los chats de colectivos."); }
      finally { busy = false; if (queued && active) { queued = false; void loadGroups(); } }
    }
    function changed(event: Event) {
      const detail = (event as CustomEvent<InboxChange>).detail;
      if (detail.kind !== "group") return;
      version++;
      if (detail.latest) setGroupChats(previous => previous.map(chat =>
        chat.id === detail.id && (!chat.last_message_at || detail.latest!.created_at >= chat.last_message_at)
          ? { ...chat, preview: detail.latest!.body, last_message_at: detail.latest!.created_at, unread: chat.unread || (!chat.muted && detail.latest!.sender_id !== currentUserId) } : chat));
      if (detail.readThrough) setGroupChats(previous => previous.map(chat =>
        chat.id === detail.id && (!chat.last_message_at || chat.last_message_at <= detail.readThrough!) ? { ...chat, unread: false } : chat));
      void loadGroups();
    }
    void loadGroups();
    const db = getSupabaseClient();
    const channel = db.channel("group-inbox").on("postgres_changes", {
      event: "INSERT", schema: "public", table: "colectivo_messages",
    }, () => { void loadGroups(); }).subscribe((status: string) => { if (status === "SUBSCRIBED") void loadGroups(); });
    const interval = window.setInterval(() => void loadGroups(), 5000);
    window.addEventListener(CHAT_INBOX_CHANGED, changed);
    window.addEventListener("focus", loadGroups); window.addEventListener("online", loadGroups);
    document.addEventListener("visibilitychange", loadGroups);
    return () => {
      active = false; clearInterval(interval);
      void db.removeChannel(channel);
      window.removeEventListener(CHAT_INBOX_CHANGED, changed);
      window.removeEventListener("focus", loadGroups); window.removeEventListener("online", loadGroups);
      document.removeEventListener("visibilitychange", loadGroups);
    };
  }, [currentUserId]);

  const query = search.trim().toLocaleLowerCase("es-MX").replace(/^@/, "");
  const inbox = [
    ...conversations.map(c => ({ key: "direct-" + c.id, name: "@" + (c.other?.username ?? "cuenta eliminada"), searchName: c.other?.display_name ?? "", preview: c.last_message_preview, at: c.last_message_at, unread: c.unread, group: false, muted: false, selected: c.id === activeId, href: "/mensajes?c=" + c.id })),
    ...groupChats.map(c => ({ key: "group-" + c.id, name: c.name, searchName: "", preview: c.preview, at: c.last_message_at, unread: c.unread, group: true, muted: c.muted, selected: c.id === activeGroupId, href: "/mensajes?colectivo=" + c.id })),
  ].filter(c => (filter !== "directos" || !c.group) && (filter !== "colectivos" || c.group) && (c.name + " " + c.searchName).toLocaleLowerCase("es-MX").includes(query))
    .sort((a, b) => (Date.parse(b.at ?? "") || 0) - (Date.parse(a.at ?? "") || 0) || a.key.localeCompare(b.key));

  if (loading) return <div role="status" className="p-6 text-white">cargando mensajes…</div>;

  return (
    <div className={`${styles.page} messages-page flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden px-0 pb-0 md:px-6 md:py-4`} style={{ backgroundColor: BG }}>
      <style>{BLINK_CSS}</style>



      <div
        className="flex min-h-0 w-full flex-1 overflow-hidden rounded-[2px]"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          border: "1px solid #49463f",
        }}
      >
        {/* ── Left panel ── */}
        <div
          className={`min-h-0 flex-col shrink-0 border-r ${activeId || activeGroupId ? "hidden md:flex md:w-[360px]" : "flex w-full md:w-[360px]"}`}
          style={{ borderColor: "var(--magma-border)", backgroundColor: BG }}
        >
          <div className="shrink-0 space-y-2 border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">mensajes</h1>
              <button onClick={() => setShowNew(true)} className="min-h-11 rounded-[2px] border border-[var(--magma-red)] px-3 py-2 text-sm text-white hover:bg-[var(--magma-red)]">+ nuevo</button>
            </div>
            <input aria-label="buscar conversaciones" placeholder="buscar persona o colectivo…" value={search} onChange={e => setSearch(e.target.value)} className="w-full min-w-0 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white focus:outline-white" />
            <div role="group" aria-label="filtrar conversaciones" className="flex min-w-0 flex-nowrap justify-between gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {["todos", "directos", "colectivos"].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 px-1.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--magma-red)] ${filter === value ? "border-[var(--magma-red)] text-white" : "border-transparent text-white/60 hover:text-white"}`}>{value}</button>)}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!showNew && <>
              {EVENT_INVITATIONS_ENABLED && currentUserId && <EventInvitations userId={currentUserId} />}
              {inboxError && <p role="status" className="p-4 text-sm">{inboxError}</p>}
              {groupError && <p role="status" className="p-4 text-sm">{groupError}</p>}
              {!inbox.length && <p className="p-4 text-sm text-white/70">no hay conversaciones para mostrar.</p>}
              {inbox.map(chat => <button key={chat.key} onClick={() => router.push(chat.href)} aria-current={chat.selected ? "page" : undefined}
                className={`flex w-full min-w-0 gap-3 border-b border-l-2 border-b-white/5 bg-transparent px-3 py-2.5 text-left transition-colors ${chat.selected ? "border-l-[#be1836] text-white" : "border-l-transparent text-white/75 hover:text-[var(--magma-red)]"}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate ${chat.selected ? "text-white" : "text-inherit"} ${chat.unread ? "font-bold" : ""}`}>{chat.name}</span>
                    <span className="shrink-0 text-xs text-white/60">{chat.at ? relTime(chat.at) : ""}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-white/70">{chat.preview || "sin mensajes todavía"}</p>
                  {chat.group && <span className="text-xs text-white/50">colectivo{chat.muted ? " · silenciado" : ""}</span>}
                </div>
                {chat.unread && <span aria-label="sin leer" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E12120]" />}
              </button>)}
            </>}
            {showNew && currentUserId && (
              <NewMessagePanel
                currentUserId={currentUserId}
                blockedIds={blockedIds}
                onConversationCreated={(id) => {
                  setShowNew(false);
                  void loadConversations(currentUserId!, blockedIds).catch(() => setInboxError("no se pudo actualizar la bandeja."));
                  router.push(`/mensajes?c=${id}`);
                }}
                onClose={() => setShowNew(false)}
              />
            )}
          </div>

        </div>

        {/* ── Right panel ── */}
        <div className={`min-h-0 min-w-0 overflow-hidden ${activeId || activeGroupId ? "flex-1" : "hidden md:block md:flex-1"}`} style={{ backgroundColor: BG }}>
          {activeGroup && currentUserId ? <ColectivoChatThread key={activeGroup.id} chat={activeGroup} userId={currentUserId} onBack={() => router.push("/mensajes")} /> : activeGroupId ? (
            <div className="space-y-4 p-6"><button onClick={() => router.push("/mensajes")} className="underline">← mensajes</button><p>{groupError || "este chat no está disponible. debes ser miembro del colectivo."}</p></div>
          ) : !activeConvo || !currentUserId ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.16em", marginBottom: "12px", textTransform: "uppercase" }}>línea abierta</p>
                <p style={{ fontSize: "clamp(24px, 4vw, 42px)", color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800, letterSpacing: "-0.04em" }}>elige una conversación</p>
                <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.6, marginTop: "10px" }}>o empieza una nota nueva desde la columna izquierda</p>
              </div>
            </div>
          ) : (
            <MessageThread
              key={activeConvo.id}
              offeringId={searchParams.get('offering')}
              conversationId={activeConvo.id}
              currentUserId={currentUserId}
              other={activeConvo.other}
              onBack={() => router.push("/mensajes")}
              onBlock={() => {
                void (async () => {
                  if (!currentUserId) return;
                  const blocked = await refreshBlockedIds(currentUserId);
                  await loadConversations(currentUserId, blocked).catch(() => setInboxError("no se pudo actualizar la bandeja."));
                  router.push("/mensajes");
                })();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MensajesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: BG }} />}>
      <MensajesInner />
    </Suspense>
  );
}
