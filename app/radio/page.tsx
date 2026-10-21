"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase"
import { MagmaWordmark } from "@/app/components/MagmaWordmark";

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
  "en vivo": "var(--magma-red)",
  "próximo": "var(--magma-hot)",
  "disponible": "var(--magma-orange)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RadioSignal({ live = false }: { live?: boolean }) {
  const bars = [22, 42, 68, 36, 76, 52, 88, 46, 72, 30, 58, 82, 40, 64, 26, 48, 78, 34];

  return (
    <div
      className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl md:min-h-[360px]"
      style={{
        background: "radial-gradient(circle at 50% 46%, rgba(240,68,46,0.18) 0%, rgba(115,28,20,0.12) 28%, rgba(16,43,102,0.08) 48%, var(--magma-rock) 76%)",
        border: "0.5px solid var(--magma-border)",
        boxShadow: "0 22px 70px rgba(0,0,0,0.28)",
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-6 rounded-full" style={{ border: "0.5px solid rgba(215,212,205,0.08)" }} />
      <div className="absolute inset-14 rounded-full" style={{ border: "0.5px solid rgba(255,100,31,0.14)" }} />
      <div className="flex h-28 items-center gap-1.5 px-8">
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            style={{
              width: "3px",
              height: `${height}%`,
              borderRadius: "999px",
              backgroundColor: live ? "var(--magma-orange)" : "var(--magma-red)",
              opacity: live ? 0.95 : 0.48,
              animation: live ? `radio-wave ${0.8 + (index % 5) * 0.12}s ease-in-out infinite alternate` : undefined,
            }}
          />
        ))}
      </div>
      <span style={{ bottom: "20px", color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.2em", position: "absolute", textTransform: "uppercase" }}>
        señal desde ciudad de méxico
      </span>
    </div>
  );
}

// ─── Live hero ────────────────────────────────────────────────────────────────

function LiveHero({ settings, listeners }: { settings: RadioSettings; listeners: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 pb-12" style={{ alignItems: "start" }}>
      {/* Left — info */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <span
            style={{
              display: "inline-block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#E12120",
              animation: "pulse-dot 1.4s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.18em" }}>
            en vivo ahora
          </span>
        </div>

        <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, letterSpacing: "-0.02em", marginTop: "-4px" }}>
          <MagmaWordmark style={{ fontSize: "1em" }} /><br /><span style={{ color: "var(--magma-ash)" }}>RADIO</span>
        </h1>

        <div className="flex flex-col gap-1">
          <p style={{ fontSize: "18px", color: "#F2F4F8", fontFamily: syne, fontWeight: 700 }}>
            {settings.dj_name || "DJ Lava"}
          </p>
          <p style={{ fontSize: "var(--magma-text-body)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.6 }}>
            {settings.set_description || "Mezcla en vivo desde la Ciudad de México"}
          </p>
        </div>

        <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
          {listeners} escuchando ahora
        </span>

        <a data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-red)"))}
          href="#stream"
          style={{
            display: "inline-block",
            backgroundColor: "var(--magma-red)",
            color: "var(--magma-ash)",
            fontFamily: mono,
            fontSize: "var(--magma-text-small)",
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
              backgroundColor: "#E12120",
              animation: "pulse-dot 1.4s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
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
    <div className="grid grid-cols-1 gap-8 py-10 md:grid-cols-[0.8fr_1.2fr] md:items-center md:py-14">
      <div className="flex flex-col items-start" style={{ gap: "20px" }}>
        <div className="flex items-center gap-2">
        <span
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: "var(--magma-muted)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.18em" }}>
          fuera del aire
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
        <h1 className="magma-page-title" style={{ color: "var(--magma-ash)", fontFamily: syne, fontWeight: 800, letterSpacing: "-0.055em" }}>
          frecuencia<br /><span style={{ color: "var(--magma-ash)" }}>magma</span>
        </h1>
        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.7, maxWidth: "420px" }}>
          Sesiones, mezclas y transmisiones independientes hechas desde la ciudad. Cuando la señal despierta, nos encontramos aquí.
        </p>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "20px 24px",
          border: "0.5px solid var(--magma-border)",
          borderRadius: "12px",
          backgroundColor: "var(--magma-rock)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "4px" }}>
          próxima transmisión
        </p>
        <p style={{ fontSize: "16px", color: "var(--magma-ash)", fontFamily: syne, fontWeight: 700 }}>DJ Lava</p>
        <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>20:00 · Techno industrial / ritual beats</p>
      </div>
      </div>
      <RadioSignal />
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function Schedule({ isLive }: { isLive: boolean }) {
  const router = useRouter();

  return (
    <div className="rounded-xl" style={{ backgroundColor: "var(--magma-rock)", border: "0.5px solid var(--magma-border)", padding: "22px" }}>
      <h2 style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "24px" }}>
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
                backgroundColor: active ? "rgba(16,43,102,0.12)" : "transparent",
                border: active ? "0.5px solid var(--magma-border)" : "0.5px solid transparent",
                borderLeft: `2px solid ${active ? accent : "var(--magma-border)"}`,
              }}
            >
              <span style={{ fontSize: "var(--magma-text-body)", color: active ? "#F2F4F8" : "var(--magma-muted)", fontFamily: mono, minWidth: "44px" }}>
                {slot.time}
              </span>

              <div className="flex flex-col gap-0.5 flex-1">
                {isAvailable ? (
                  <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>slot disponible</span>
                ) : (
                  <>
                    <span style={{ fontSize: "var(--magma-text-body)", color: active ? "#F2F4F8" : "var(--magma-muted)", fontFamily: syne, fontWeight: 700 }}>
                      {slot.artist}
                    </span>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                      {slot.description}
                    </span>
                  </>
                )}
              </div>

              {isAvailable ? (
                <button
                  onClick={() => router.push(`/radio/solicitar?time=${encodeURIComponent(slot.time)}`)}
                  style={{
                    fontSize: "var(--magma-text-small)",
                    color: "var(--magma-ash)",
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: "0.5px solid var(--magma-red)",
                    backgroundColor: "var(--magma-rock)",
                    padding: "3px 8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  className="hover:opacity-70"
                >
                  solicitar
                </button>
              ) : slot.status === "en vivo" ? (
                <span
                  style={{
                    fontSize: "var(--magma-text-small)",
                    color: "var(--magma-ash)",
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: "0.5px solid #E12120",
                    backgroundColor: "#1a1012",
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  en vivo
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "var(--magma-text-small)",
                    color: "#EF9F27",
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: "0.5px solid #854F0B",
                    backgroundColor: "#16120e",
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  próximo
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RadioPage() {
  const supabase = getSupabaseClient();
  const [settings, setSettings] = useState<RadioSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [listeners] = useState(47);

  useEffect(() => {
    // Fetch radio settings
    void (async () => {
      const { data } = await supabase.from("radio_settings").select("*").single();
      if (data) setSettings(data as RadioSettings);
      setLoadingSettings(false);

    })();
  }, []);

  const isLive = settings?.is_live ?? false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--magma-obsidian)" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes radio-wave {
          from { transform: scaleY(0.55); opacity: 0.5; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>



      <main className="max-w-6xl mx-auto px-6 pb-24">
        {/* Hero — live or offline */}
        {loadingSettings ? (
          <div style={{ height: "320px" }} />
        ) : isLive && settings ? (
          <LiveHero settings={settings} listeners={listeners} />
        ) : (
          <OfflineHero />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-4" style={{ background: "linear-gradient(105deg, rgba(115,28,20,0.08), rgba(16,43,102,0.045), var(--magma-rock))", border: "0.5px solid var(--magma-border)", marginBottom: "32px" }}>
          <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.5 }}>
            ¿tienes un set, sesión o transmisión que compartir?
          </p>
          <Link
            href="/radio/solicitar"
            style={{ border: "0.5px solid var(--magma-orange)", color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.12em", padding: "9px 14px", textDecoration: "none", textTransform: "uppercase" }}
          >
            solicitar un slot →
          </Link>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 gap-8" style={{ alignItems: "start" }}>
          <Schedule isLive={isLive} />
        </div>
      </main>
    </div>
  );
}
