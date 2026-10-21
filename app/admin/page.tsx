"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { MagmaWordmark } from "@/app/components/MagmaWordmark";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_USER_ID ?? "";

interface DJ {
  id: string;
  name: string;
  approved: boolean;
  user_id: string;
}

interface RadioSettings {
  id: string;
  is_live: boolean;
  dj_name: string;
  set_description: string;
  stream_url: string;
}

interface SlotRequest {
  id: string;
  username: string;
  genre: string;
  platform: string;
  preferred_date: string | null;
  preferred_time: string | null;
  stream_url: string | null;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RadioSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [handling, setHandling] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== OWNER_ID) {
        router.replace("/");
        return;
      }
      setAuthorized(true);

      const [settingsRes, djsRes, requestsRes] = await Promise.all([
        supabase.from("radio_settings").select("*").single(),
        supabase.from("djs").select("id, name, approved, user_id").order("created_at", { ascending: false }),
        supabase.from("radio_slot_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data as RadioSettings);
      setDjs((djsRes.data ?? []) as DJ[]);
      setRequests((requestsRes.data ?? []) as SlotRequest[]);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaveError(false);
    const { error } = await supabase
      .from("radio_settings")
      .update({
        is_live: settings.is_live,
        dj_name: settings.dj_name,
        set_description: settings.set_description,
        stream_url: settings.stream_url,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    }
  }

  async function toggleApproval(dj: DJ) {
    await supabase.from("djs").update({ approved: !dj.approved }).eq("id", dj.id);
    setDjs((prev) => prev.map((d) => d.id === dj.id ? { ...d, approved: !d.approved } : d));
  }

  async function handleSlotAction(requestId: string, action: "approve" | "reject") {
    setHandling((prev) => new Set(prev).add(requestId));
    try {
      const res = await fetch("/api/admin/slot-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (action === "approve") {
          // Refresh DJ list to pick up the newly created row
          const { data } = await supabase
            .from("djs")
            .select("id, name, approved, user_id")
            .order("created_at", { ascending: false });
          if (data) setDjs(data as DJ[]);
        }
      }
    } finally {
      setHandling((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }

  if (!authorized || loading) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b", padding: "60px 24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "40px" }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "8px" }}>
            <MagmaWordmark style={{ fontSize: "1em" }} /> / admin
          </p>
          <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800 }}>
            Radio Settings
          </h1>
        </div>

        {/* Live toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Estado
          </label>
          <div style={{ display: "flex", gap: "12px" }}>
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setSettings((s) => s ? { ...s, is_live: val } : s)}
                style={{
                  padding: "10px 24px",
                  fontFamily: mono,
                  fontSize: "var(--magma-text-small)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  border: settings?.is_live === val
                    ? `0.5px solid ${val ? "#E12120" : "#444441"}`
                    : "0.5px solid #2a2a28",
                  backgroundColor: settings?.is_live === val
                    ? val ? "#1a1012" : "#141412"
                    : "transparent",
                  color: settings?.is_live === val
                    ? val ? "var(--magma-ash)" : "#888780"
                    : "#444441",
                  cursor: "pointer",
                }}
              >
                {val ? "🔴 En Vivo" : "⚫ Fuera del Aire"}
              </button>
            ))}
          </div>
        </div>

        {/* DJ Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            DJ / Artista
          </label>
          <input
            value={settings?.dj_name ?? ""}
            onChange={(e) => setSettings((s) => s ? { ...s, dj_name: e.target.value } : s)}
            placeholder="DJ Lava"
            style={{
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              color: "#F2F4F8",
              fontFamily: mono,
              fontSize: "var(--magma-text-body)",
              padding: "10px 14px",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Descripción del set
          </label>
          <input
            value={settings?.set_description ?? ""}
            onChange={(e) => setSettings((s) => s ? { ...s, set_description: e.target.value } : s)}
            placeholder="Techno industrial / ritual beats"
            style={{
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              color: "#F2F4F8",
              fontFamily: mono,
              fontSize: "var(--magma-text-body)",
              padding: "10px 14px",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Stream URL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Stream URL (YouTube embed)
          </label>
          <input
            value={settings?.stream_url ?? ""}
            onChange={(e) => setSettings((s) => s ? { ...s, stream_url: e.target.value } : s)}
            placeholder="https://www.youtube.com/embed/..."
            style={{
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              color: "#F2F4F8",
              fontFamily: mono,
              fontSize: "var(--magma-text-body)",
              padding: "10px 14px",
              outline: "none",
              width: "100%",
            }}
          />
          <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
            usa el formato: https://www.youtube.com/embed/VIDEO_ID
          </p>
        </div>

        {/* Save button */}
        <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String(saved ? "var(--magma-hot)" : "var(--magma-red)"))}
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saved ? "var(--magma-hot)" : "var(--magma-red)",
            color: "#0c0c0b",
            fontFamily: mono,
            fontSize: "var(--magma-text-small)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            padding: "14px 32px",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            width: "fit-content",
            transition: "background-color 0.2s",
          }}
        >
          {saving ? "guardando..." : saved ? "✓ guardado" : "guardar cambios"}
        </button>

        {saveError && (
          <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono }}>
            error al guardar, intenta de nuevo
          </p>
        )}

        {/* Divider */}
        <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

        {/* Slot requests section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", color: "#F2F4F8", fontFamily: syne, fontWeight: 800, marginBottom: "4px" }}>
              Solicitudes de slot
            </h2>
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
              {requests.length === 0 ? "sin solicitudes pendientes" : `${requests.length} pendiente${requests.length > 1 ? "s" : ""}`}
            </p>
          </div>

          {requests.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {requests.map((req) => {
                const busy = handling.has(req.id);
                return (
                  <div
                    key={req.id}
                    style={{
                      padding: "16px",
                      backgroundColor: "#0e0e0d",
                      border: "0.5px solid #2a2a28",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {/* Name + genre */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700 }}>
                        {req.username}
                      </span>
                      <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.5 }}>
                        {req.genre}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                      {req.platform && (
                        <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          {req.platform}
                        </span>
                      )}
                      {req.preferred_date && (
                        <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                          {req.preferred_date}
                        </span>
                      )}
                      {req.preferred_time && (
                        <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                          {req.preferred_time.slice(0, 5)}
                        </span>
                      )}
                      {req.stream_url && (
                        <a
                          href={req.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "var(--magma-text-small)", color: "#378ADD", fontFamily: mono, textDecoration: "none" }}
                        >
                          link →
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleSlotAction(req.id, "approve")}
                        disabled={busy}
                        style={{
                          fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                          padding: "6px 16px", border: "0.5px solid var(--magma-orange)",
                          backgroundColor: "var(--magma-rock)", color: "var(--magma-ash)",
                          cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1,
                        }}
                      >
                        {busy ? "..." : "aprobar"}
                      </button>
                      <button
                        onClick={() => handleSlotAction(req.id, "reject")}
                        disabled={busy}
                        style={{
                          fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                          padding: "6px 16px", border: "0.5px solid #2a2a28",
                          backgroundColor: "transparent", color: "var(--magma-muted)",
                          cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1,
                        }}
                      >
                        {busy ? "..." : "rechazar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

        {/* DJs section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{ fontSize: "18px", color: "#F2F4F8", fontFamily: syne, fontWeight: 800 }}>
            DJs
          </h2>

          {djs.length === 0 ? (
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>ningún DJ todavía</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {djs.map((dj) => (
                <div
                  key={dj.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", backgroundColor: "#0e0e0d", border: "0.5px solid #2a2a28",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700 }}>
                      {dj.name || "(sin nombre)"}
                    </span>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                      {dj.user_id}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleApproval(dj)}
                    style={{
                      fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                      padding: "5px 12px", border: `0.5px solid ${dj.approved ? "#444441" : "var(--magma-orange)"}`,
                      backgroundColor: dj.approved ? "transparent" : "var(--magma-rock)",
                      color: dj.approved ? "var(--magma-muted)" : "var(--magma-ash)",
                      cursor: "pointer",
                    }}
                  >
                    {dj.approved ? "desaprobar" : "aprobar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
