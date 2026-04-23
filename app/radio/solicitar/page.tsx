"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase"
const supabase = getSupabaseClient();

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const PLATFORMS = ["YouTube", "Twitch", "Mixcloud", "SoundCloud", "Otro"];

// ─── Form (needs Suspense because it reads searchParams) ──────────────────────

function SolicitarForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState(searchParams.get("time") ?? "");
  const [genre, setGenre] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [streamUrl, setStreamUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      if (data) setUsername(data.username);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !genre.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("radio_slot_requests")
      .insert({
        user_id: currentUserId,
        username: username.trim(),
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        genre: genre.trim(),
        platform,
        stream_url: streamUrl.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-6 max-w-lg" style={{ paddingTop: "60px" }}>
        <div style={{ height: "2px", width: "32px", backgroundColor: "#5DCAA5" }} />
        <h1 style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1.1 }}>
          solicitud enviada.
        </h1>
        <p style={{ fontSize: "13px", color: "#888780", fontFamily: mono, lineHeight: 1.7 }}>
          recibimos tu solicitud para el slot {preferredTime ? `de las ${preferredTime}` : ""}.
          <br />te contactamos en menos de 24h.
        </p>
        <div className="flex gap-4" style={{ marginTop: "8px" }}>
          <Link
            href="/radio"
            style={{
              fontSize: "10px",
              color: "#0c0c0b",
              fontFamily: mono,
              backgroundColor: "#D85A30",
              padding: "10px 20px",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            volver a radio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      {/* Username */}
      <div className="flex flex-col gap-2">
        <label style={{ fontSize: "9px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
          nombre artístico / @usuario
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@tu_usuario"
          required
          style={inputStyle}
        />
      </div>

      {/* Date + time — side by side */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="flex flex-col gap-2">
          <label style={labelStyle}>fecha preferida</label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: "dark" }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label style={labelStyle}>hora preferida</label>
          <input
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            style={{ ...inputStyle, colorScheme: "dark" }}
          />
        </div>
      </div>

      {/* Genre / description */}
      <div className="flex flex-col gap-2">
        <label style={labelStyle}>género / descripción del set</label>
        <textarea
          rows={3}
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="techno industrial · mezcla en vivo · 60 min"
          required
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>

      {/* Platform */}
      <div className="flex flex-col gap-2">
        <label style={labelStyle}>plataforma de stream</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              style={{
                fontSize: "10px",
                fontFamily: mono,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "5px 12px",
                cursor: "pointer",
                border: `0.5px solid ${platform === p ? "#D85A30" : "#2a2a28"}`,
                backgroundColor: platform === p ? "rgba(216,90,48,0.08)" : "transparent",
                color: platform === p ? "#D85A30" : "#5F5E5A",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stream URL */}
      <div className="flex flex-col gap-2">
        <label style={labelStyle}>
          URL de tu stream{" "}
          <span style={{ color: "#444441", textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
        </label>
        <input
          type="url"
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="https://youtube.com/..."
          style={inputStyle}
        />
      </div>

      {error && (
        <div style={{ padding: "10px 12px", backgroundColor: "#1a0a08", border: "0.5px solid #D85A30" }}>
          <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono }}>{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4" style={{ marginTop: "4px" }}>
        <button
          type="submit"
          disabled={submitting || !username.trim() || !genre.trim()}
          className="disabled:opacity-40 cursor-pointer"
          style={{
            fontSize: "11px",
            color: "#0c0c0b",
            fontFamily: mono,
            backgroundColor: "#D85A30",
            border: "none",
            padding: "12px 28px",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
          }}
        >
          {submitting ? "enviando..." : "enviar solicitud"}
        </button>
        <Link
          href="/radio"
          style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono, textDecoration: "none" }}
          className="hover:opacity-70"
        >
          cancelar
        </Link>
      </div>
    </form>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#e8e4dc",
  fontFamily: mono,
  fontSize: "13px",
  outline: "none",
  padding: "9px 12px",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "#5F5E5A",
  fontFamily: mono,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SolicitarPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      <main className="max-w-2xl mx-auto px-6 pb-24">
        <div className="pt-8 pb-2">
          <Link
            href="/radio"
            style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em", textDecoration: "none" }}
            className="hover:opacity-70"
          >
            ← radio
          </Link>
        </div>

        <div style={{ paddingTop: "32px", paddingBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1, marginBottom: "8px" }}>
            solicitar un slot
          </h1>
          <p style={{ fontSize: "12px", color: "#5F5E5A", fontFamily: mono, lineHeight: 1.6 }}>
            ¿tienes algo que transmitir? cuéntanos sobre tu set y te contactamos.
          </p>
        </div>

        <div style={{ height: "0.5px", backgroundColor: "#2a2a28", marginBottom: "32px" }} />

        {/* Wrap the form in Suspense because it reads searchParams */}
        <Suspense fallback={<div style={{ height: "400px" }} />}>
          <SolicitarForm />
        </Suspense>
      </main>
    </div>
  );
}
