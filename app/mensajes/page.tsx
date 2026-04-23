"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";
const BG = "#0d0d0d";

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

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function abbrev(p: OtherProfile): string {
  if (p.display_name) return p.display_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return p.username.slice(0, 2).toUpperCase();
}

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

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
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
      style={{ backgroundColor: "rgba(13,13,13,0.92)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-5 p-7"
        style={{ backgroundColor: BG, border: "0.5px solid #2a2a28", maxWidth: "320px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono }}>// bloquear usuario</p>
        <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: mono }}>@{other.username}</p>
        <p style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono, lineHeight: 1.7 }}>
          no podrá enviarte mensajes.
        </p>
        <div className="flex gap-5">
          <button
            onClick={handleBlock}
            disabled={blocking}
            className="cursor-pointer hover:opacity-70 disabled:opacity-40"
            style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", background: "none", border: "0.5px solid #D85A30", padding: "6px 16px" }}
          >
            {blocking ? "..." : "confirmar"}
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer hover:opacity-70"
            style={{ fontSize: "10px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", background: "none", border: "none", padding: 0 }}
          >
            cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New message panel ────────────────────────────────────────────────────────

function NewMessagePanel({ currentUserId, onConversationCreated, onClose }: {
  currentUserId: string;
  onConversationCreated: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OtherProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.replace(/^@/, "").trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_color")
        .ilike("username", `%${q}%`)
        .neq("id", currentUserId)
        .limit(8);
      setResults((data ?? []) as OtherProfile[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

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
        <span style={{ fontSize: "12px", color: "#D85A30", fontFamily: mono, userSelect: "none" }}>{">"}</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="buscar por @usuario..."
          style={{ flex: 1, backgroundColor: "transparent", border: "none", outline: "none", color: "#e8e4dc", fontFamily: mono, fontSize: "12px" }}
        />
        <button
          onClick={onClose}
          style={{ fontSize: "14px", color: "#444441", background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 0, flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searching && (
          <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, padding: "10px 14px" }}>buscando...</p>
        )}
        {!searching && query && results.length === 0 && (
          <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, padding: "10px 14px" }}>sin resultados</p>
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
            <div
              className="shrink-0 flex items-center justify-center text-[9px] font-bold"
              style={{ width: "18px", height: "18px", backgroundColor: p.avatar_color ?? "#D85A30", color: "#0c0c0b", fontFamily: syne }}
            >
              {abbrev(p)}
            </div>
            <span style={{ fontSize: "11px", color: "#888780", fontFamily: mono }}>@{p.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message thread ───────────────────────────────────────────────────────────

function MessageThread({ conversationId, currentUserId, other, onBlock }: {
  conversationId: string;
  currentUserId: string;
  other: OtherProfile;
  onBlock: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [blockHover, setBlockHover] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  // Load + mark read
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
      await supabase.from("messages").update({ read: true })
        .eq("conversation_id", conversationId)
        .eq("read", false).neq("sender_id", currentUserId);
    })();
  }, [conversationId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`msg:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: { new: Message }) => {
        const msg = payload.new;
        setMessages((prev) => [...prev, msg]);
        if (msg.sender_id !== currentUserId)
          void supabase.from("messages").update({ read: true }).eq("id", msg.id);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: trimmed,
    });
    if (!error) {
      await supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
      setBody("");
    }
    setSending(false);
  }

  const avatarBg = other.avatar_color ?? "#D85A30";

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center justify-between shrink-0 border-b"
        style={{ padding: "10px 16px", borderColor: "#1e1e1e", backgroundColor: BG }}
      >
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 flex items-center justify-center text-[9px] font-bold"
            style={{ width: "18px", height: "18px", backgroundColor: avatarBg, color: "#0c0c0b", fontFamily: syne }}
          >
            {abbrev(other)}
          </div>
          <Link
            href={`/profile/${other.username}`}
            style={{ fontSize: "12px", color: "#e8e4dc", fontFamily: mono, textDecoration: "none" }}
            className="hover:underline"
          >
            @{other.username}
          </Link>
          {other.display_name && (
            <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
              ({other.display_name})
            </span>
          )}
        </div>
        <button
          onClick={() => setShowBlock(true)}
          onMouseEnter={() => setBlockHover(true)}
          onMouseLeave={() => setBlockHover(false)}
          className="cursor-pointer"
          style={{
            fontSize: "9px",
            color: blockHover ? "#5F5E5A" : "#2a2a28",
            fontFamily: mono,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: "none",
            border: "none",
            padding: 0,
            transition: "color 0.15s",
          }}
        >
          bloquear
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: "20px 18px 10px", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: BG }}
      >
        {/* Start comment */}
        <p style={{ fontSize: "10px", color: "#2a2a28", fontFamily: mono, textAlign: "center", marginBottom: "8px", userSelect: "none" }}>
          // inicio de la conversación
        </p>

        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "72%" }}>
                {/* Sender label */}
                <p style={{
                  fontSize: "9px",
                  color: isMine ? "#D85A30" : "#444441",
                  fontFamily: mono,
                  marginBottom: "4px",
                  textAlign: isMine ? "right" : "left",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  {isMine ? "tú" : `@${other.username}`}
                </p>
                {/* Bubble — border-left stripe, no radius */}
                <div style={{
                  padding: "8px 12px",
                  backgroundColor: isMine ? "#1a1012" : "#141412",
                  borderLeft: `2px solid ${isMine ? "#D85A30" : "#2a2a28"}`,
                }}>
                  <p style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: mono, lineHeight: 1.55, wordBreak: "break-word" }}>
                    {msg.body}
                  </p>
                </div>
                {/* Timestamp */}
                <p style={{
                  fontSize: "9px", color: "#2a2a28", fontFamily: mono,
                  marginTop: "3px", textAlign: isMine ? "right" : "left",
                }}>
                  {relTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center shrink-0 border-t"
        style={{ borderColor: "#1e1e1e", backgroundColor: BG }}
      >
        <span style={{ padding: "12px 4px 12px 16px", fontSize: "13px", color: "#D85A30", fontFamily: mono, userSelect: "none", flexShrink: 0 }}>
          {">"}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="escribe un mensaje..."
          autoComplete="off"
          style={{
            flex: 1,
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            color: "#e8e4dc",
            fontFamily: mono,
            fontSize: "13px",
            padding: "12px 8px",
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          style={{
            fontSize: "9px",
            color: "#D85A30",
            fontFamily: mono,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            background: "none",
            border: "none",
            borderLeft: "0.5px solid #1e1e1e",
            padding: "12px 16px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          enviar
        </button>
      </form>

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

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConvoRow({ convo, isActive, onClick }: {
  convo: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const avatarBg = convo.other?.avatar_color ?? "#D85A30";
  const preview = convo.last_message_preview ? trunc(convo.last_message_preview, 30) : "—";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-start gap-3 w-full text-left cursor-pointer border-b"
      style={{
        padding: "10px 14px",
        borderColor: "#1a1a1a",
        backgroundColor: isActive || hovered ? "#1a1a1a" : "transparent",
        borderLeft: `2px solid ${isActive ? "#D85A30" : "transparent"}`,
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
        style={{ width: "18px", height: "18px", backgroundColor: avatarBg, color: "#0c0c0b", fontFamily: syne }}
      >
        {abbrev(convo.other)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span
            style={{ fontSize: "11px", color: convo.unread ? "#e8e4dc" : "#888780", fontFamily: mono, fontWeight: convo.unread ? 700 : 400 }}
            className="truncate"
          >
            @{convo.other?.username}
          </span>
          <span style={{ fontSize: "9px", color: "#2a2a28", fontFamily: mono, whiteSpace: "nowrap", flexShrink: 0 }}>
            {relTime(convo.last_message_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {convo.unread && (
            <span style={{ fontSize: "7px", color: "#D85A30", lineHeight: 1, flexShrink: 0 }}>●</span>
          )}
          <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, lineHeight: 1.4 }} className="truncate">
            {preview}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function MensajesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setCurrentUserId(user.id);
      await loadConversations(user.id);
      setLoading(false);
    })();
  }, []);

  async function loadConversations(uid: string) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("conversations")
      .select("id, participant_1, participant_2, last_message_at")
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order("last_message_at", { ascending: false });

    if (!data) return;

    const convos: Conversation[] = await Promise.all(
      data.map(async (c: { id: string; participant_1: string; participant_2: string; last_message_at: string }) => {
        const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1;
        const [{ data: profile }, { data: lastMsg }, { count: unreadCount }] = await Promise.all([
          supabase.from("profiles").select("id, username, display_name, avatar_color").eq("id", otherId).single(),
          supabase.from("messages").select("body").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).single(),
          supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", c.id).eq("read", false).neq("sender_id", uid),
        ]);
        return {
          id: c.id,
          other: profile as OtherProfile,
          last_message_at: c.last_message_at,
          last_message_preview: lastMsg?.body ?? null,
          unread: (unreadCount ?? 0) > 0,
        };
      })
    );
    setConversations(convos);
  }

  const activeConvo = conversations.find((c) => c.id === activeId);

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: BG }} />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <style>{BLINK_CSS}</style>


      <div
        className="flex"
        style={{
          height: "calc(100vh - 56px)",
          maxWidth: "1200px",
          margin: "0 auto",
          borderLeft: "0.5px solid #1e1e1e",
          borderRight: "0.5px solid #1e1e1e",
        }}
      >
        {/* ── Left panel ── */}
        <div
          className="flex flex-col shrink-0 border-r"
          style={{ width: "240px", borderColor: "#1e1e1e", backgroundColor: BG }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "#1e1e1e" }}>
            <span style={{ fontSize: "11px", color: "#888780", fontFamily: mono }}>
              mensajes<span className="msg-cursor" style={{ color: "#D85A30" }}>_</span>
            </span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {!showNew && conversations.length === 0 && (
              <p style={{ fontSize: "10px", color: "#2a2a28", fontFamily: mono, padding: "14px" }}>
                // sin mensajes todavía
              </p>
            )}
            {!showNew && conversations.map((convo) => (
              <ConvoRow
                key={convo.id}
                convo={convo}
                isActive={convo.id === activeId}
                onClick={() => router.push(`/mensajes?c=${convo.id}`)}
              />
            ))}
            {showNew && currentUserId && (
              <NewMessagePanel
                currentUserId={currentUserId}
                onConversationCreated={(id) => {
                  setShowNew(false);
                  void loadConversations(currentUserId);
                  router.push(`/mensajes?c=${id}`);
                }}
                onClose={() => setShowNew(false)}
              />
            )}
          </div>

          {/* Bottom button */}
          {!showNew && (
            <div className="border-t shrink-0 px-4 py-3" style={{ borderColor: "#1e1e1e" }}>
              <button
                onClick={() => setShowNew(true)}
                className="cursor-pointer w-full text-left"
                style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", background: "none", border: "none", padding: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >
                + nuevo mensaje
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0" style={{ backgroundColor: BG }}>
          {!activeConvo || !currentUserId ? (
            <div className="h-full flex items-center justify-center">
              <p style={{ fontSize: "10px", color: "#2a2a28", fontFamily: mono }}>
                // selecciona una conversación
              </p>
            </div>
          ) : (
            <MessageThread
              key={activeConvo.id}
              conversationId={activeConvo.id}
              currentUserId={currentUserId}
              other={activeConvo.other}
              onBlock={() => {
                setConversations((prev) => prev.filter((c) => c.id !== activeConvo.id));
                router.push("/mensajes");
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
