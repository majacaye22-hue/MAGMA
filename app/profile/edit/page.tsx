"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#e8e4dc",
  fontFamily: mono,
  fontSize: "13px",
  outline: "none",
  width: "100%",
  padding: "10px 12px",
};

const labelStyle: React.CSSProperties = {
  color: "#5F5E5A",
  fontFamily: mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "block",
  marginBottom: "6px",
};

const DISCIPLINES = [
  "arte visual", "fotografía", "música", "grabado",
  "serigrafía", "diseño", "escritura", "performance", "cine", "otro",
];

const AVATAR_COLORS = [
  { value: "#D85A30", label: "terracota"  },
  { value: "#712B13", label: "siena"      },
  { value: "#0D1F2D", label: "noche"      },
  { value: "#2D1000", label: "tabaco"     },
  { value: "#0F6E56", label: "jade"       },
  { value: "#2D0020", label: "ciruela"    },
];

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [avatarColor, setAvatarColor] = useState("#D85A30");

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, bio, location, disciplines, avatar_color")
        .eq("id", user.id)
        .single();

      if (data) {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setDisciplines(data.disciplines ?? []);
        setAvatarColor(data.avatar_color ?? "#D85A30");
      }

      setLoading(false);
    })();
  }, []);

  function toggleDiscipline(d: string) {
    setDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || saving) return;

    const trimmedUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (!trimmedUsername) {
      setError("el nombre de usuario no puede estar vacío");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: trimmedUsername,
        bio: bio.trim() || null,
        location: location.trim() || null,
        disciplines: disciplines.length > 0 ? disciplines : null,
        avatar_color: avatarColor,
      })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push(`/profile/${trimmedUsername}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      </div>
    );
  }

  const initials = (displayName || username).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>


      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Header */}
        <div className="pt-10 pb-8 flex items-center gap-4">
          <Link
            href={`/profile/${username}`}
            className="flex items-center justify-center shrink-0"
            style={{ width: "28px", height: "28px", border: "0.5px solid #2a2a28", color: "#888780" }}
            aria-label="Volver al perfil"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </Link>
          <h1 style={{ fontSize: "22px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
            editar perfil
          </h1>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b" style={{ borderColor: "#2a2a28" }}>
          <div
            className="flex items-center justify-center text-xl font-bold shrink-0"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "4px",
              backgroundColor: avatarColor,
              color: "#0c0c0b",
              fontFamily: syne,
            }}
          >
            {initials}
          </div>
          <div>
            <p style={{ ...labelStyle, marginBottom: "10px" }}>Color de avatar</p>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAvatarColor(c.value)}
                  title={c.label}
                  className="cursor-pointer"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "3px",
                    backgroundColor: c.value,
                    border: avatarColor === c.value ? "2px solid #e8e4dc" : "2px solid transparent",
                    outline: avatarColor === c.value ? "1px solid #2a2a28" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Display name */}
          <div>
            <label style={labelStyle}>Nombre artístico</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre o nombre artístico"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "_").toLowerCase())}
              placeholder="tu_usuario"
              required
              style={inputStyle}
              className="focus:outline-none"
            />
            <p style={{ fontSize: "9px", color: "#444441", fontFamily: mono, marginTop: "6px" }}>
              sin espacios · solo letras, números, _ y .
            </p>
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>
              Bio
              <span style={{ color: "#444441", textTransform: "none", letterSpacing: 0, marginLeft: "8px" }}>
                {bio.length}/200
              </span>
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => e.target.value.length <= 200 && setBio(e.target.value)}
              placeholder="Cuéntanos sobre tu práctica artística..."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              className="focus:outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>Colonia / ubicación</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej. Roma Norte, CDMX"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Disciplines */}
          <div>
            <label style={labelStyle}>Disciplinas</label>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map((d) => {
                const active = disciplines.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDiscipline(d)}
                    className="text-xs tracking-widest uppercase cursor-pointer border transition-colors duration-150"
                    style={{
                      fontFamily: mono,
                      padding: "5px 12px",
                      borderColor: active ? "#D85A30" : "#2a2a28",
                      backgroundColor: active ? "rgba(216,90,48,0.08)" : "transparent",
                      color: active ? "#D85A30" : "#5F5E5A",
                      fontSize: "9px",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

          {error && (
            <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 text-sm tracking-widest uppercase cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{
              backgroundColor: "#D85A30",
              color: "#0c0c0b",
              fontFamily: mono,
              border: "none",
            }}
          >
            {saving ? "guardando..." : "guardar cambios"}
          </button>
        </form>
      </main>
    </div>
  );
}
