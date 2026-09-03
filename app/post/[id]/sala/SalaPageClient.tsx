"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventSalaClient, type SalaMessage } from "./EventSalaClient";
import type { Post } from "@/app/components/card-art";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

function formatEventDate(date: string) {
  return new Date(date).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function SalaPageClient({ eventId }: { eventId: string }) {
  const [data, setData] = useState<{ event: Post; messages: SalaMessage[]; currentUserId: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/events/${eventId}/sala`, { cache: "no-store" });
      if (!response.ok) { setFailed(true); return; }
      setData(await response.json());
    }
    void load();
  }, [eventId]);

  if (failed) return <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0c0c0b", color: "#888780", fontFamily: mono, fontSize: "12px" }}>no encontramos esta sala.</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0c0c0b", color: "#5F5E5A", fontFamily: mono, fontSize: "12px" }}>abriendo la sala...</div>;
  const { event, messages, currentUserId } = data;
  return <main className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}><div className="mx-auto px-5 sm:px-6 pb-20" style={{ maxWidth: "1120px" }}><div className="flex items-center justify-between gap-4" style={{ paddingTop: "32px", paddingBottom: "28px" }}><Link href={`/post/${eventId}`} style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: ".12em", textDecoration: "none" }}>← volver al evento</Link><span style={{ color: "#444441", fontFamily: mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: ".12em" }}>Casita Magma</span></div><header className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-5 items-end" style={{ paddingBottom: "28px" }}><div><p style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: ".14em", margin: "0 0 10px" }}>sala de evento</p><h1 style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, lineHeight: .98, letterSpacing: "-.03em", margin: 0 }}>{event.title ?? "evento"}</h1></div><p style={{ color: "#888780", fontFamily: mono, fontSize: "11px", lineHeight: 1.6, margin: 0 }}>{formatEventDate(event.event_date!)}<br />{[event.venue, event.address].filter(Boolean).join(" · ")}</p></header><EventSalaClient eventId={event.id} eventDate={event.event_date!} eventTitle={event.title ?? "evento"} initialMessages={messages} currentUserId={currentUserId} isHost={event.author_id === currentUserId} /></div></main>;
}
