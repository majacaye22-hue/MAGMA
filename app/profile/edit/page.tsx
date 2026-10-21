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
  color: "#F2F4F8",
  fontFamily: mono,
  fontSize: "var(--magma-text-body)",
  outline: "none",
  width: "100%",
  padding: "10px 12px",
};

const labelStyle: React.CSSProperties = {
  color: "var(--magma-muted)",
  fontFamily: mono,
  fontSize: "var(--magma-text-small)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "block",
  marginBottom: "6px",
};



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
  const [hometown, setHometown] = useState("");
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
        .select("username, display_name, bio, location, hometown, avatar_color, cover_image_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setHometown(data.hometown ?? "");
        setCoverImageUrl(data.cover_image_url ?? null);
      }

      setLoading(false);
    })();
  }, [router, supabase]);


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
        hometown: hometown.trim() || null,
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


  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>


      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Header */}
        <div className="pt-10 pb-8 flex items-center gap-4">
          <Link
            href={`/profile/${username}`}
            className="flex items-center justify-center shrink-0"
            style={{ width: "28px", height: "28px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)" }}
            aria-label="Volver al perfil"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </Link>
          <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, }}>
            editar perfil
          </h1>
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
                <div className="flex h-full items-center justify-center" style={{ backgroundImage: "linear-gradient(#1e1e1c 0.5px, transparent 0.5px), linear-gradient(90deg, #1e1e1c 0.5px, transparent 0.5px)", backgroundSize: "30px 30px", color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  sin portada todavía
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: "rgba(12,12,11,0.72)", color: "#F2F4F8", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {coverImageUrl || coverPreview ? "cambiar portada" : "subir portada"}
              </span>
            </button>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>JPG, PNG, GIF o WEBP · máximo 15 MB · formato horizontal</p>
              {(coverImageUrl || coverPreview) && (
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); setCoverImageUrl(null); }} style={{ background: "none", border: "none", color: "var(--magma-muted)", cursor: "pointer", fontFamily: mono, fontSize: "var(--magma-text-small)", padding: 0, textDecoration: "underline" }}>
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
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, marginTop: "6px" }}>
              sin espacios · solo letras, números, _ y .
            </p>
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>
              Bio
              <span style={{ color: "var(--magma-muted)", textTransform: "none", letterSpacing: 0, marginLeft: "8px" }}>
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
            <label htmlFor="hometown" style={labelStyle}>¿de dónde eres? · opcional</label>
            <input id="hometown" type="text" value={hometown} onChange={(e) => setHometown(e.target.value)} maxLength={100} placeholder="ej. Guadalajara, Oaxaca, Argentina" style={inputStyle} />
            <p className="mt-2 text-xs" style={{ color: "var(--magma-muted)" }}>ciudad, región o país. se mostrará en tu perfil.</p>
          </div>
          <div>
            <label style={labelStyle}>Colonia / ubicación actual</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej. Roma Norte, CDMX"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {error && (
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono }}>
              {error}
            </p>
          )}

          <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-red)"))}
            type="submit"
            disabled={saving}
            className="w-full py-3 text-sm tracking-widest uppercase cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{
              backgroundColor: "var(--magma-red)",
              color: "var(--magma-ash)",
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
