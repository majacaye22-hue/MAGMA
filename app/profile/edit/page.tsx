"use client";

import { useEffect, useRef, useState } from "react";
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
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

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
        .select("username, display_name, bio, location, disciplines, avatar_color, cover_image_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setDisciplines(data.disciplines ?? []);
        setAvatarColor(data.avatar_color ?? "#D85A30");
        setCoverImageUrl(data.cover_image_url ?? null);
      }

      setLoading(false);
    })();
  }, [router, supabase]);

  function toggleDiscipline(d: string) {
    setDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function selectCover(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("la portada debe ser una imagen");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("la portada no puede pesar más de 15 MB");
      return;
    }
    setError(null);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
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

    let nextCoverImageUrl = coverImageUrl;
    if (coverFile) {
      const formData = new FormData();
      formData.append("file", coverFile);
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadData.url) {
        setError(uploadData.error ?? "no se pudo subir la portada");
        setSaving(false);
        return;
      }
      nextCoverImageUrl = uploadData.url as string;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: trimmedUsername,
        bio: bio.trim() || null,
        location: location.trim() || null,
        disciplines: disciplines.length > 0 ? disciplines : null,
        avatar_color: avatarColor,
        cover_image_url: nextCoverImageUrl,
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
          {/* Profile cover */}
          <div>
            <label style={labelStyle}>Portada del perfil</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => selectCover(e.target.files?.[0] ?? null)}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="group relative block w-full cursor-pointer overflow-hidden text-left"
              style={{ aspectRatio: "16 / 5", backgroundColor: "#0f0d0b", border: "0.5px solid #2a2a28", padding: 0 }}
            >
              {(coverPreview || coverImageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview ?? coverImageUrl ?? ""} alt="Vista previa de la portada" style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }} />
              ) : (
                <div className="flex h-full items-center justify-center" style={{ backgroundImage: "linear-gradient(#1e1e1c 0.5px, transparent 0.5px), linear-gradient(90deg, #1e1e1c 0.5px, transparent 0.5px)", backgroundSize: "30px 30px", color: "#444441", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  sin portada todavía
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: "rgba(12,12,11,0.72)", color: "#e8e4dc", fontFamily: mono, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {coverImageUrl || coverPreview ? "cambiar portada" : "subir portada"}
              </span>
            </button>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p style={{ color: "#444441", fontFamily: mono, fontSize: "9px" }}>JPG, PNG, GIF o WEBP · máximo 15 MB · formato horizontal</p>
              {(coverImageUrl || coverPreview) && (
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); setCoverImageUrl(null); }} style={{ background: "none", border: "none", color: "#5F5E5A", cursor: "pointer", fontFamily: mono, fontSize: "9px", padding: 0, textDecoration: "underline" }}>
                  quitar
                </button>
              )}
            </div>
          </div>

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
