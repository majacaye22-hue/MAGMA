"use client";

import { useState, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Project } from "./ProjectCard";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "transparent",
  border: "0.5px solid #2a2a28",
  color: "#e8e4dc",
  fontFamily: mono,
  fontSize: "12px",
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

export function CreateProjectModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [spotify, setSpotify] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCoverFile(f: File) {
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) { setErr("el título es requerido"); return; }
    setSubmitting(true);
    setErr(null);

    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? "error al subir portada");
        coverUrl = json.url;
      }

      const links: Record<string, string> = {};
      if (spotify.trim()) links.spotify = spotify.trim();
      if (instagram.trim()) links.instagram = instagram.trim();
      if (website.trim()) links.website = website.trim();

      const supabase = getSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("projects")
        .insert({
          author_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl,
          links: Object.keys(links).length > 0 ? links : null,
        })
        .select()
        .single();

      if (error) {
        console.error("[CreateProjectModal] supabase error:", JSON.stringify(error, null, 2));
        throw error;
      }
      onCreated(data as Project);
    } catch (error: unknown) {
      console.error("[CreateProjectModal] caught error:", error);
      const msg = (error as { message?: string; details?: string; hint?: string })?.message
        ?? (error as { details?: string })?.details
        ?? "error al crear proyecto";
      setErr(msg);
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(12,12,11,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "#141412",
          border: "0.5px solid #2a2a28",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid #2a2a28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "16px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, margin: 0 }}>
            nuevo proyecto
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#5F5E5A", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Cover image */}
          <div>
            <label style={labelStyle}>portada — opcional</label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
              onDragLeave={() => setCoverDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setCoverDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f); }}
              style={{
                height: "120px",
                border: `1px dashed ${coverDragOver ? "#D85A30" : "#2a2a28"}`,
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                backgroundColor: "#0f0f0d",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "10px", color: "#444441", fontFamily: mono }}>arrastra o haz clic · jpg, png, webp</span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }} className="hidden" aria-hidden />
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>título</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="nombre del proyecto" maxLength={120} style={inputStyle} required />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>descripción — opcional</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿de qué trata este proyecto?"
              maxLength={600}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>links — opcional</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: "#5DCAA5", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em", pointerEvents: "none" }}>spotify</span>
              <input type="url" value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/..." style={{ ...inputStyle, paddingLeft: "72px" }} />
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: "#888780", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em", pointerEvents: "none" }}>ig</span>
              <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." style={{ ...inputStyle, paddingLeft: "40px" }} />
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: "#888780", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em", pointerEvents: "none" }}>web</span>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." style={{ ...inputStyle, paddingLeft: "50px" }} />
            </div>
          </div>

          {err && <p style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono }}>{err}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: submitting ? "#2a2a28" : "#D85A30",
              color: submitting ? "#5F5E5A" : "#0c0c0b",
              fontFamily: mono,
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              padding: "12px",
              border: "none",
              cursor: submitting ? "default" : "pointer",
              width: "100%",
            }}
          >
            {submitting ? "creando..." : "crear proyecto →"}
          </button>
        </form>
      </div>
    </div>
  );
}
