"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/app/components/navbar";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RadioSettings {
  id: number;
  stream_url: string;
  dj_name: string;
  set_description: string;
  is_live: boolean;
}

interface ChatMessage {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; display_name: string | null } | null;
}

interface ScheduleSlot {
  time: string;
  artist: string;
  description: string;
  status: "en vivo" | "próximo" | "disponible";
}

// ─── Static data ─────────────────────────────────────────────────────────────

const SCHEDULE: ScheduleSlot[] = [
  { time: "20:00", artist: "DJ Lava", description: "Techno industrial / ritual beats", status: "en vivo" },
  { time: "22:00", artist: "Ceniza", description: "Ambient · field recordings · México D.F.", status: "próximo" },
  { time: "00:00", artist: "Obsidiana", description: "Bass · cumbia experimental", status: "próximo" },
  { time: "02:00", artist: "", description: "", status: "disponible" },
  { time: "04:00", artist: "", description: "", status: "disponible" },
];

const STATUS_COLOR: Record<ScheduleSlot["status"], string> = {
  "en vivo": "#D85A30",
  "próximo": "#EF9F27",
  "disponible": "#5DCAA5",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─── Live hero ────────────────────────────────────────────────────────────────

function LiveHero({ settings, listeners }: { settings: RadioSettings; listeners: number }) {
  return (
    <div className="grid gap-8 pt-10 pb-12" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
      {/* Left — info */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <span
            style={{
              display: "inline-block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#D85A30",
              animation: "pulse-dot 1.4s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.18em" }}>
            en vivo ahora
          </span>
        </div>

        <h1 style={{ fontSize: "40px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", marginTop: "-4px" }}>
          MAGMA<br /><span style={{ color: "#D85A30" }}>RADIO</span>
        </h1>

        <div className="flex flex-col gap-1">
          <p style={{ fontSize: "18px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}>
            {settings.dj_name || "DJ Lava"}
          </p>
          <p style={{ fontSize: "13px", color: "#888780", fontFamily: mono, lineHeight: 1.6 }}>
            {settings.set_description || "Mezcla en vivo desde la Ciudad de México"}
          </p>
        </div>

        <span style={{ fontSize: "11px", color: "#444441", fontFamily: mono }}>
          {listeners} escuchando ahora
        </span>

        <a
          href="#stream"
          style={{
            display: "inline-block",
            backgroundColor: "#D85A30",
            color: "#0c0c0b",
            fontFamily: mono,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            padding: "12px 28px",
            width: "fit-content",
            textDecoration: "none",
          }}
        >
          sintonizar
        </a>
      </div>

      {/* Right — YouTube embed */}
      <div id="stream" style={{ position: "relative" }}>
        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            overflow: "hidden",
            borderRadius: "4px",
            border: "0.5px solid #2a2a28",
          }}
        >
          <iframe
            src={`${settings.stream_url}?autoplay=1&mute=1`}
            title="MAGMA Radio — en vivo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
        {/* EN VIVO overlay badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            backgroundColor: "rgba(12,12,11,0.75)",
            padding: "3px 8px",
            backdropFilter: "blur(4px)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: "#D85A30",
              animation: "pulse-dot 1.4s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: "9px", color: "#D85A30", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            en vivo
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Offline hero ─────────────────────────────────────────────────────────────

function OfflineHero() {
  return (
    <div className="flex flex-col items-center justify-center text-center pt-20 pb-16" style={{ gap: "20px" }}>
      <div className="flex items-center gap-2">
        <span
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: "#444441",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.18em" }}>
          fuera del aire
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
        <h1 style={{ fontSize: "40px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
          MAGMA <span style={{ color: "#D85A30" }}>RADIO</span>
        </h1>
        <p style={{ fontSize: "13px", color: "#5F5E5A", fontFamily: mono, letterSpacing: "0.08em" }}>
          próximamente
        </p>
      </div>

      <div
        style={{
          width: "320px",
          padding: "20px 24px",
          border: "0.5px solid #2a2a28",
          backgroundColor: "#0e0e0d",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <p style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "4px" }}>
          próxima transmisión
        </p>
        <p style={{ fontSize: "16px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}>DJ Lava</p>
        <p style={{ fontSize: "11px", color: "#888780", fontFamily: mono }}>20:00 · Techno industrial / ritual beats</p>
      </div>
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function Schedule({ isLive }: { isLive: boolean }) {
  const router = useRouter();

  return (
    <div>
      <h2 style={{ fontSize: "12px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "24px" }}>
        programación de hoy
      </h2>

      <div className="flex flex-col" style={{ gap: "2px" }}>
        {SCHEDULE.map((slot) => {
          const active = slot.status === "en vivo" && isLive;
          const isAvailable = slot.status === "disponible";
          const accent = STATUS_COLOR[slot.status];

          return (
            <div
              key={slot.time}
              className="flex items-center gap-5"
              style={{
                padding: "16px 20px",
                backgroundColor: active ? "#141412" : "transparent",
                border: active ? "0.5px solid #2a2a28" : "0.5px solid transparent",
                borderLeft: `2px solid ${active ? accent : "#2a2a28"}`,
              }}
            >
              <span style={{ fontSize: "13px", color: active ? "#e8e4dc" : "#5F5E5A", fontFamily: mono, minWidth: "44px" }}>
                {slot.time}
              </span>

              <div className="flex flex-col gap-0.5 flex-1">
                {isAvailable ? (
                  <span style={{ fontSize: "12px", color: "#444441", fontFamily: mono }}>slot disponible</span>
                ) : (
                  <>
                    <span style={{ fontSize: "14px", color: active ? "#e8e4dc" : "#888780", fontFamily: syne, fontWeight: 700 }}>
                      {slot.artist}
                    </span>
                    <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>
                      {slot.description}
                    </span>
                  </>
                )}
              </div>

              {isAvailable ? (
                <button
                  onClick={() => router.push(`/radio/solicitar?time=${encodeURIComponent(slot.time)}`)}
                  style={{
                    fontSize: "9px",
                    color: accent,
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: `0.5px solid ${accent}`,
                    padding: "3px 8px",
                    background: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  className="hover:opacity-70"
                >
                  solicitar
                </button>
              ) : (
                <span
                  style={{
                    fontSize: "9px",
                    color: active ? accent : "#444441",
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: `0.5px solid ${active ? accent : "#2a2a28"}`,
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {slot.status}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live chat ────────────────────────────────────────────────────────────────

function LiveChat({ currentUserId }: { currentUserId: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial load
    supabase
      .from("radio_chat")
      .select("*, profiles(username, display_name)")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    // Realtime subscription
    const channel = supabase
      .channel("radio_chat_room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "radio_chat" },
        async (payload) => {
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

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "#0e0e0d", border: "0.5px solid #2a2a28", height: "100%", minHeight: "480px" }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #2a2a28", display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "#5DCAA5",
            animation: "pulse 2s infinite",
          }}
        />
        <span style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          chat en vivo
        </span>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 overflow-y-auto flex-1" style={{ padding: "16px" }}>
        {messages.length === 0 && (
          <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono }}>sin mensajes todavía</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
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

      {/* Input */}
      <div style={{ borderTop: "0.5px solid #2a2a28", padding: "12px" }}>
        {currentUserId ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="di algo..."
              maxLength={200}
              style={{
                flex: 1,
                backgroundColor: "#141412",
                border: "0.5px solid #2a2a28",
                color: "#e8e4dc",
                fontFamily: mono,
                fontSize: "12px",
                outline: "none",
                padding: "7px 10px",
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 disabled:opacity-40 cursor-pointer"
              style={{
                backgroundColor: "#D85A30",
                color: "#0c0c0b",
                fontFamily: mono,
                fontSize: "10px",
                border: "none",
                padding: "7px 14px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {sending ? "..." : "enviar"}
            </button>
          </form>
        ) : (
          <p style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>
            <Link href="/auth/login" style={{ color: "#888780", textDecoration: "underline" }}>entra</Link>
            {" "}para chatear
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RadioPage() {
  const [settings, setSettings] = useState<RadioSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [listeners] = useState(47);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch radio settings
    supabase
      .from("radio_settings")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as RadioSettings);
        setLoadingSettings(false);
      });

    // Auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const isLive = settings?.is_live ?? false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>

      <Navbar active="radio" />

      <main className="max-w-6xl mx-auto px-6 pb-24">
        {/* Hero — live or offline */}
        {loadingSettings ? (
          <div style={{ height: "320px" }} />
        ) : isLive && settings ? (
          <LiveHero settings={settings} listeners={listeners} />
        ) : (
          <OfflineHero />
        )}

        <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "40px" }} />

        {/* Schedule + Chat */}
        <div className="grid gap-8" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
          <Schedule isLive={isLive} />
          <LiveChat currentUserId={currentUserId} />
        </div>
      </main>
    </div>
  );
}
