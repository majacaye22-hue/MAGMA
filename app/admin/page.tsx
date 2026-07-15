"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const OWNER_ID = "d546124c-7d0a-4a2b-a668-0e6e491c439a";

interface DJ {
  id: string;
  name: string;
  approved: boolean;
  user_id: string;
  profiles: { email: string } | null;
}

interface RadioSettings {
  id: string;
  is_live: boolean;
  dj_name: string;
  set_description: string;
  stream_url: string;
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

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== OWNER_ID) {
        router.replace("/");
        return;
      }
      setAuthorized(true);

      const { data } = await supabase.from("radio_settings").select("*").single();
      if (data) setSettings(data as RadioSettings);

      const { data: djData } = await supabase
        .from("djs")
        .select("id, name, approved, user_id")
        .order("created_at", { ascending: false });
      setDjs((djData ?? []) as DJ[]);

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

  if (!authorized || loading) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b", padding: "60px 24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "40px" }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "8px" }}>
            magma / admin
          </p>
          <h1 style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800 }}>
            Radio Settings
          </h1>
        </div>

        {/* Live toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
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
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  border: settings?.is_live === val
                    ? `0.5px solid ${val ? "#D85A30" : "#444441"}`
                    : "0.5px solid #2a2a28",
                  backgroundColor: settings?.is_live === val
                    ? val ? "#1a1012" : "#141412"
                    : "transparent",
                  color: settings?.is_live === val
                    ? val ? "#D85A30" : "#888780"
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
          <label style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            DJ / Artista
          </label>
          <input
            value={settings?.dj_name ?? ""}
            onChange={(e) => setSettings((s) => s ? { ...s, dj_name: e.target.value } : s)}
            placeholder="DJ Lava"
            style={{
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              color: "#e8e4dc",
              fontFamily: mono,
              fontSize: "13px",
              padding: "10px 14px",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Descripción del set
          </label>
          <input
            value={settings?.set_description ?? ""}
            onChange={(e) => setSettings((s) => s ? { ...s, set_description: e.target.value } : s)}
            placeholder="Techno industrial / ritual beats"
            style={{
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              color: "#e8e4dc",
              fontFamily: mono,
              fontSize: "13px",
              padding: "10px 14px",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Stream URL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Stream URL (YouTube embed)
          </label>
          <input
            value={settings?.stream_url ?? ""}
            onChange={(e) => setSettings((s) => s ? { ...s, stream_url: e.target.value } : s)}
            placeholder="https://www.youtube.com/embed/..."
            style={{
              backgroundColor: "#0e0e0d",
              border: "0.5px solid #2a2a28",
              color: "#e8e4dc",
              fontFamily: mono,
              fontSize: "13px",
              padding: "10px 14px",
              outline: "none",
              width: "100%",
            }}
          />
          <p style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
            usa el formato: https://www.youtube.com/embed/VIDEO_ID
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saved ? "#5DCAA5" : "#D85A30",
            color: "#0c0c0b",
            fontFamily: mono,
            fontSize: "11px",
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
          <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono }}>
            error al guardar, intenta de nuevo
          </p>
        )}

        {/* Divider */}
        <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

        {/* DJs section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{ fontSize: "18px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800 }}>
            DJs
          </h2>

          {djs.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#444441", fontFamily: mono }}>sin solicitudes todavía</p>
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
                    <span style={{ fontSize: "13px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700 }}>
                      {dj.name || "(sin nombre)"}
                    </span>
                    <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>
                      {dj.user_id}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleApproval(dj)}
                    style={{
                      fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                      padding: "5px 12px", border: `0.5px solid ${dj.approved ? "#444441" : "#5DCAA5"}`,
                      backgroundColor: dj.approved ? "transparent" : "#0d1a14",
                      color: dj.approved ? "#888780" : "#5DCAA5",
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
