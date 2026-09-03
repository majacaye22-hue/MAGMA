"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export type SalaMessage = {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_color: string | null } | null;
};

type SalaStatus = "upcoming" | "live" | "archive";

function getSalaStatus(eventDate: string, now = new Date()): SalaStatus {
  const starts = new Date(eventDate).getTime();
  if (now.getTime() < starts - 48 * 60 * 60 * 1000) return "upcoming";
  if (now.getTime() > starts + 72 * 60 * 60 * 1000) return "archive";
  return "live";
}

function relativeTime(dateStr: string) {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatOpenTime(eventDate: string) {
  return new Date(new Date(eventDate).getTime() - 48 * 60 * 60 * 1000).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

function initials(message: SalaMessage) {
  const name = message.profiles?.display_name ?? message.profiles?.username ?? "?";
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function EventSalaClient({
  eventId,
  eventDate,
  eventTitle,
  initialMessages,
  currentUserId,
  isHost,
}: {
  eventId: string;
  eventDate: string;
  eventTitle: string;
  initialMessages: SalaMessage[];
  currentUserId: string | null;
  isHost: boolean;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const bottomRef = useRef<HTMLDivElement>(null);
  const status = getSalaStatus(eventDate, now);
  const canWrite = status === "live";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`event_sala_${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_sala_messages", filter: `event_id=eq.${eventId}` },
        async (payload: { new: { id: string } }) => {
          const { data } = await supabase
            .from("event_sala_messages")
            .select("*, profiles(username, display_name, avatar_color)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((existing) => existing.some((item) => item.id === data.id) ? existing : [...existing, data as SalaMessage]);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_sala_messages", filter: `event_id=eq.${eventId}` },
        (payload: { old: { id: string } }) => setMessages((existing) => existing.filter((item) => item.id !== payload.old.id)),
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [eventId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const body = message.trim();
    if (!body || !currentUserId || sending || !canWrite) return;

    setSending(true);
    setError(null);
    const { error: insertError } = await supabase.from("event_sala_messages").insert({
      event_id: eventId,
      user_id: currentUserId,
      body,
    });
    if (insertError) {
      setError(insertError.message.includes("row-level security")
        ? "La sala está cerrada o estás enviando mensajes demasiado rápido."
        : "No se pudo enviar. Inténtalo de nuevo.");
    } else {
      setMessage("");
    }
    setSending(false);
  }

  async function deleteMessage(id: string) {
    const { error: deleteError } = await supabase.from("event_sala_messages").delete().eq("id", id);
    if (deleteError) setError("No se pudo retirar el mensaje.");
  }

  const statusCopy = status === "live"
    ? "sala abierta · conversación en curso"
    : status === "upcoming"
      ? `abre ${formatOpenTime(eventDate)}`
      : "archivo de la sala · lectura solamente";

  return (
    <section aria-label={`Sala del evento ${eventTitle}`} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]" style={{ border: "0.5px solid #2a2a28", backgroundColor: "#0e0e0d" }}>
      <div className="min-w-0 flex flex-col" style={{ minHeight: "560px" }}>
        <header className="flex flex-wrap items-center justify-between gap-3" style={{ padding: "16px 18px", borderBottom: "0.5px solid #2a2a28" }}>
          <div className="flex items-center gap-3">
            <span style={{ width: "7px", height: "7px", borderRadius: "999px", backgroundColor: status === "live" ? "#D85A30" : "#5F5E5A", boxShadow: status === "live" ? "0 0 0 4px rgba(216,90,48,.10)" : "none" }} />
            <div>
              <p style={{ margin: 0, color: "#e8e4dc", fontFamily: syne, fontSize: "16px", fontWeight: 800 }}>sala</p>
              <p style={{ margin: "2px 0 0", color: status === "live" ? "#D85A30" : "#5F5E5A", fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: ".12em" }}>{statusCopy}</p>
            </div>
          </div>
          <span style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px" }}>{messages.length} {messages.length === 1 ? "mensaje" : "mensajes"}</span>
        </header>

        <div className="flex-1 overflow-y-auto" style={{ padding: "18px", maxHeight: "520px" }}>
          {messages.length === 0 ? (
            <div style={{ maxWidth: "340px", paddingTop: "42px" }}>
              <p style={{ margin: 0, color: "#e8e4dc", fontFamily: syne, fontSize: "18px", fontWeight: 700 }}>la primera voz entra aquí</p>
              <p style={{ margin: "8px 0 0", color: "#5F5E5A", fontFamily: mono, fontSize: "11px", lineHeight: 1.7 }}>
                Preséntate, pregunta algo, comparte un plan o deja una nota para quienes llegarán después.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((item) => {
                const canDelete = item.user_id === currentUserId || isHost;
                return (
                  <article key={item.id} className="group flex gap-3">
                    <div className="shrink-0 flex items-center justify-center" style={{ width: "28px", height: "28px", backgroundColor: item.profiles?.avatar_color ?? "#2a2a28", color: "#0c0c0b", fontFamily: syne, fontSize: "9px", fontWeight: 800 }}>
                      {initials(item)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="flex items-baseline gap-2">
                        <Link href={item.profiles ? `/profile/${item.profiles.username}` : "#"} style={{ color: "#c8c4bc", fontFamily: mono, fontSize: "11px", textDecoration: "none" }}>@{item.profiles?.username ?? "miembro"}</Link>
                        <span style={{ color: "#444441", fontFamily: mono, fontSize: "9px" }}>{relativeTime(item.created_at)}</span>
                        {canDelete && (
                          <button onClick={() => void deleteMessage(item.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100" style={{ marginLeft: "auto", color: "#5F5E5A", background: "none", border: 0, padding: 0, cursor: "pointer", fontFamily: mono, fontSize: "9px" }}>retirar</button>
                        )}
                      </div>
                      <p style={{ margin: "4px 0 0", color: "#e8e4dc", fontFamily: mono, fontSize: "12px", lineHeight: 1.65, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "14px 18px", borderTop: "0.5px solid #2a2a28" }}>
          {!currentUserId ? (
            <p style={{ margin: 0, color: "#5F5E5A", fontFamily: mono, fontSize: "11px" }}>
              <Link href={`/auth/login?redirectTo=/post/${eventId}/sala`} style={{ color: "#e8e4dc", textDecoration: "underline" }}>entra a Magma</Link> para participar en la sala.
            </p>
          ) : canWrite ? (
            <form onSubmit={handleSend} className="flex gap-2">
              <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={600} placeholder="di algo que haga posible el encuentro..." aria-label="Escribe un mensaje en la sala" style={{ minWidth: 0, flex: 1, padding: "10px 12px", backgroundColor: "#141412", border: "0.5px solid #2a2a28", color: "#e8e4dc", outline: "none", fontFamily: mono, fontSize: "12px" }} />
              <button type="submit" disabled={!message.trim() || sending} style={{ padding: "10px 16px", backgroundColor: "#D85A30", border: 0, color: "#0c0c0b", cursor: "pointer", fontFamily: mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: ".1em", opacity: !message.trim() || sending ? .45 : 1 }}>{sending ? "..." : "enviar"}</button>
            </form>
          ) : (
            <p style={{ margin: 0, color: "#5F5E5A", fontFamily: mono, fontSize: "11px", lineHeight: 1.6 }}>
              {status === "upcoming" ? "La sala abre 48 horas antes del encuentro." : "La conversación queda guardada como parte del archivo del evento."}
            </p>
          )}
          {error && <p role="alert" style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", margin: "8px 0 0" }}>{error}</p>}
        </div>
      </div>

      <aside style={{ borderTop: "0.5px solid #2a2a28", borderLeft: "0.5px solid #2a2a28", padding: "18px", backgroundColor: "#11110f" }}>
        <p style={{ margin: 0, color: "#5F5E5A", fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: ".13em" }}>cómo habitar la sala</p>
        <div className="flex flex-col gap-4" style={{ marginTop: "18px" }}>
          {[
            ["antes", "preséntate, comparte logística o propón algo."],
            ["durante", "deja notas, fotos, IDs o coordenadas."],
            ["después", "conecta hilos y deja vivo lo que sigue."],
          ].map(([moment, copy]) => (
            <div key={moment}>
              <p style={{ margin: 0, color: "#D85A30", fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: ".1em" }}>{moment}</p>
              <p style={{ margin: "4px 0 0", color: "#888780", fontFamily: mono, fontSize: "10px", lineHeight: 1.6 }}>{copy}</p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
