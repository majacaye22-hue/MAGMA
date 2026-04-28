"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const AVATAR_COLORS = ["#D85A30", "#5DCAA5", "#7F77DD", "#EF9F27", "#378ADD", "#7EC8E3"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function CrearColectivoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState<string | null>(null);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function handleSlugChange(v: string) {
    setSlug(slugify(v));
    setSlugEdited(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) { setErr("el nombre es requerido"); return; }
    if (!slug.trim()) { setErr("el slug es requerido"); return; }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login?redirectTo=/colectivos/crear"); return; }

    let coverImageUrl: string | null = null;
    if (coverFile) {
      const formData = new FormData();
      formData.append("file", coverFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || json.error) { setErr(json.error ?? "error al subir portada"); setLoading(false); return; }
      coverImageUrl = json.url;
    }

    const { data: col, error } = await supabase
      .from("colectivos")
      .insert({ name: name.trim(), slug, description: description.trim() || null, is_private: isPrivate, avatar_color: avatarColor, cover_image_url: coverImageUrl, created_by: user.id })
      .select("id, slug")
      .single();

    if (error) {
      setErr(error.code === "23505" ? "ese slug ya está en uso — elige otro" : error.message);
      setLoading(false);
      return;
    }

    // Add creator as admin
    await supabase.from("colectivo_members").insert({ colectivo_id: col.id, user_id: user.id, role: "admin" });

    router.push(`/colectivos/${col.slug}`);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "transparent",
    border: "0.5px solid #2a2a28",
    color: "#e8e4dc",
    fontFamily: mono,
    fontSize: "13px",
    padding: "10px 12px",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "9px",
    color: "#5F5E5A",
    fontFamily: mono,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: "32px" }}>
          <Link href="/colectivos" style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← colectivos
          </Link>
        </div>

        <h1 style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, marginBottom: "32px" }}>
          crear colectivo
        </h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="nombre del colectivo"
              maxLength={80}
              style={inputStyle}
            />
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>slug — url: /colectivos/{slug || "..."}</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="slug-url-amigable"
              maxLength={60}
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿de qué trata este colectivo?"
              maxLength={400}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Cover image */}
          <div>
            <label style={labelStyle}>imagen de portada <span style={{ color: "#444441" }}>— opcional</span></label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => coverInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && coverInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
              onDragLeave={() => setCoverDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setCoverDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setCoverFile(f); setCoverFileName(f.name); } }}
              style={{
                minHeight: "100px",
                border: `1px dashed ${coverDragOver ? avatarColor : "#2a2a28"}`,
                backgroundColor: coverDragOver ? "rgba(255,255,255,0.02)" : "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "border-color 0.15s ease",
              }}
            >
              {coverFileName ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9.5L7 13.5L15 5.5" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="square" /></svg>
                  <span style={{ fontSize: "11px", color: "#888780", fontFamily: mono }}>{coverFileName}</span>
                  <span style={{ fontSize: "9px", color: "#444441", fontFamily: mono, textDecoration: "underline" }}>cambiar imagen</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                    <path d="M3 14V16.5H17V14" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                  </svg>
                  <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>arrastra o haz clic · jpg, png, webp</span>
                </>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverFileName(f.name); } }} className="hidden" aria-hidden />
          </div>

          {/* Avatar color */}
          <div>
            <label style={labelStyle}>color de avatar</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: "28px", height: "28px", borderRadius: "2px",
                    backgroundColor: c,
                    border: avatarColor === c ? "2px solid #e8e4dc" : "2px solid transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label style={labelStyle}>privacidad</label>
            <div style={{ display: "flex", gap: "12px" }}>
              {[{ val: false, label: "público — cualquiera puede unirse" }, { val: true, label: "privado — aprobación requerida" }].map(({ val, label }) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setIsPrivate(val)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    fontSize: "10px",
                    fontFamily: mono,
                    textAlign: "left",
                    border: `0.5px solid ${isPrivate === val ? "#D85A30" : "#2a2a28"}`,
                    color: isPrivate === val ? "#D85A30" : "#5F5E5A",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {err && (
            <p style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono }}>{err}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#2a2a28" : "#D85A30",
              color: loading ? "#5F5E5A" : "#0c0c0b",
              fontFamily: mono,
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              padding: "12px",
              border: "none",
              cursor: loading ? "default" : "pointer",
              width: "100%",
            }}
          >
            {loading ? "creando..." : "crear colectivo →"}
          </button>
        </form>
      </div>
    </div>
  );
}
