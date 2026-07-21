"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

interface DJ {
  id: string;
  name: string;
  bio: string;
  instagram: string;
  genres: string;
  profiles: { username: string; display_name: string | null } | null;
}

interface RadioSettings {
  is_live: boolean;
}

interface ChatMessage {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; display_name: string | null } | null;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function DJDashboard() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [dj, setDj] = useState<DJ | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const LISTENERS = 47;

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/radio"); return; }
      setCurrentUserId(user.id);

      // Check approved DJ row
      const { data: djData } = await supabase
        .from("djs")
        .select("id, name, bio, instagram, genres, profiles(username, display_name)")
        .eq("user_id", user.id)
        .eq("approved", true)
        .single();

      if (!djData) { router.replace("/radio"); return; }
      setDj(djData as DJ);

      // Radio live status
      const { data: radioData } = await supabase
        .from("radio_settings")
        .select("is_live")
        .single();
      if (radioData) setIsLive((radioData as RadioSettings).is_live);

      // Initial chat load
      const { data: chatData } = await supabase
        .from("radio_chat")
        .select("*, profiles(username, display_name)")
        .order("created_at", { ascending: true })
        .limit(100);
      if (chatData) setMessages(chatData as ChatMessage[]);

      // Realtime chat subscription
      const channel = supabase
        .channel("dj_radio_chat")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "radio_chat" },
          async (payload: { new: { id: string } }) => {
            const { data } = await supabase
              .from("radio_chat")
              .select("*, profiles(username, display_name)")
              .eq("id", payload.new.id)
              .single();
            if (data) setMessages((prev) => [...prev, data as ChatMessage]);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending || !currentUserId) return;
    setSending(true);
    await supabase.from("radio_chat").insert({ body: trimmed, user_id: currentUserId });
    setInput("");
    setSending(false);
  }

  if (!dj) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>

      <main className="max-w-5xl mx-auto px-6 pb-24 pt-12">

        {/* Header */}
        <div style={{ marginBottom: "40px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "8px" }}>
              magma radio / cabina
            </p>
            <h1 style={{ fontSize: "32px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
              {dj.profiles?.display_name ?? dj.profiles?.username ?? dj.name}
            </h1>
            {dj.genres && (
              <p style={{ fontSize: "12px", color: "#5F5E5A", fontFamily: mono, marginTop: "6px" }}>
                {dj.genres}
              </p>
            )}
          </div>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "6px" }}>
            {isLive ? (
              <>
                <span style={{
                  display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: "#D85A30", animation: "pulse-dot 1.4s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                  en vivo
                </span>
              </>
            ) : (
              <>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2a2a28" }} />
                <span style={{ fontSize: "11px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                  fuera del aire
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8" style={{ alignItems: "start" }}>

          {/* Left — DJ info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Stats */}
            <div style={{ display: "flex", gap: "32px" }}>
              <div>
                <p style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
                  {LISTENERS}
                </p>
                <p style={{ fontSize: "9px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginTop: "4px" }}>
                  escuchando ahora
                </p>
              </div>
            </div>

            <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

            {/* Bio */}
            {dj.bio && (
              <div>
                <p style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "10px" }}>
                  bio
                </p>
                <p style={{ fontSize: "13px", color: "#888780", fontFamily: mono, lineHeight: 1.8 }}>
                  {dj.bio}
                </p>
              </div>
            )}

            {/* Instagram */}
            {dj.instagram && (
              <div>
                <p style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "10px" }}>
                  instagram
                </p>
                <a
                  href={dj.instagram.startsWith("http") ? dj.instagram : `https://instagram.com/${dj.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "13px", color: "#D85A30", fontFamily: mono, textDecoration: "none" }}
                  className="hover:opacity-70"
                >
                  {dj.instagram.startsWith("@") ? dj.instagram : `@${dj.instagram}`}
                </a>
              </div>
            )}
          </div>

          {/* Right — live chat */}
          <div style={{ backgroundColor: "#0e0e0d", border: "0.5px solid #2a2a28", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #2a2a28", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
                backgroundColor: "#5DCAA5",
              }} />
              <span style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                chat en vivo
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto" style={{ padding: "16px", height: "400px" }}>
              {messages.length === 0 && (
                <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono }}>sin mensajes todavía</p>
              )}
              {messages.map((m) => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "10px", color: "#888780", fontFamily: mono }}>
                      @{m.profiles?.username ?? "anon"}
                    </span>
                    <span style={{ fontSize: "9px", color: "#444441", fontFamily: mono }}>
                      {relativeTime(m.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#e8e4dc", fontFamily: mono, lineHeight: 1.5, wordBreak: "break-word" }}>
                    {m.body}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div style={{ borderTop: "0.5px solid #2a2a28", padding: "12px" }}>
              <form onSubmit={handleSend} style={{ display: "flex", gap: "8px" }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="di algo..."
                  maxLength={200}
                  style={{
                    flex: 1, backgroundColor: "#141412", border: "0.5px solid #2a2a28",
                    color: "#e8e4dc", fontFamily: mono, fontSize: "12px",
                    outline: "none", padding: "7px 10px", minWidth: 0,
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  style={{
                    backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: mono,
                    fontSize: "10px", border: "none", padding: "7px 14px",
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                    opacity: sending || !input.trim() ? 0.4 : 1,
                  }}
                >
                  {sending ? "..." : "enviar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
