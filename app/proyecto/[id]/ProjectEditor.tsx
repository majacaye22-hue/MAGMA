"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type EditableProject = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  links: { spotify?: string; soundcloud?: string; instagram?: string; website?: string } | null;
};

const inputStyle: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid #2a2a28",
  color: "#e8e4dc",
  fontFamily: mono,
  fontSize: "12px",
  outline: "none",
  padding: "10px 12px",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  color: "#5F5E5A",
  display: "block",
  fontFamily: mono,
  fontSize: "9px",
  letterSpacing: "0.14em",
  marginBottom: "6px",
  textTransform: "uppercase",
};

export function ProjectEditor({ project }: { project: EditableProject }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [spotify, setSpotify] = useState(project.links?.spotify ?? "");
  const [soundcloud, setSoundcloud] = useState(project.links?.soundcloud ?? "");
  const [instagram, setInstagram] = useState(project.links?.instagram ?? "");
  const [website, setWebsite] = useState(project.links?.website ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(project.cover_image_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      let coverUrl = project.cover_image_url;
      if (coverFile) {
        const payload = new FormData();
        payload.append("file", coverFile);
        const response = await fetch("/api/upload", { method: "POST", body: payload });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error ?? "no se pudo subir la portada");
        coverUrl = result.url;
      }

      const links = Object.fromEntries(
        Object.entries({ spotify: spotify.trim(), soundcloud: soundcloud.trim(), instagram: instagram.trim(), website: website.trim() }).filter(([, value]) => value),
      );
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl,
          links: Object.keys(links).length ? links : null,
        })
        .eq("id", project.id)
        .eq("author_id", project.author_id);

      if (updateError) throw updateError;
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "no se pudo guardar el proyecto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: "transparent", border: "0.5px solid #5F5E5A", color: "#888780", cursor: "pointer", fontFamily: mono, fontSize: "9px", letterSpacing: "0.11em", padding: "8px 12px", textTransform: "uppercase" }}>
        editar proyecto
      </button>

      {open && (
        <div onClick={(event) => event.target === event.currentTarget && setOpen(false)} style={{ alignItems: "center", background: "rgba(12,12,11,0.9)", display: "flex", inset: 0, justifyContent: "center", padding: "20px", position: "fixed", zIndex: 200 }}>
          <div style={{ background: "#141412", border: "0.5px solid #2a2a28", maxHeight: "90vh", maxWidth: "520px", overflowY: "auto", width: "100%" }}>
            <div className="flex items-center justify-between" style={{ borderBottom: "0.5px solid #2a2a28", padding: "18px 20px" }}>
              <h2 style={{ color: "#e8e4dc", fontFamily: syne, fontSize: "18px", fontWeight: 800 }}>editar proyecto</h2>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" style={{ background: "none", border: 0, color: "#888780", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>
            <form onSubmit={save} className="flex flex-col gap-4" style={{ padding: "20px" }}>
              <div>
                <label style={labelStyle}>portada</label>
                <button type="button" onClick={() => fileInput.current?.click()} style={{ aspectRatio: "16 / 6", background: "#0c0c0b", border: "0.5px dashed #2a2a28", cursor: "pointer", overflow: "hidden", padding: 0, width: "100%" }}>
                  {coverPreview ? <img src={coverPreview} alt="Vista previa de portada" style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }} /> : <span style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px" }}>elegir imagen</span>}
                </button>
                <input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); } }} />
              </div>
              <div><label style={labelStyle}>título</label><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} style={inputStyle} required /></div>
              <div><label style={labelStyle}>descripción</label><textarea value={description} maxLength={600} rows={4} onChange={(event) => setDescription(event.target.value)} style={{ ...inputStyle, lineHeight: 1.6, resize: "vertical" }} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label style={labelStyle}>spotify</label><input type="url" value={spotify} onChange={(event) => setSpotify(event.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>soundcloud</label><input type="url" value={soundcloud} onChange={(event) => setSoundcloud(event.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>instagram</label><input type="url" value={instagram} onChange={(event) => setInstagram(event.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>sitio web</label><input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} style={inputStyle} /></div>
              </div>
              {error && <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px" }}>{error}</p>}
              <button disabled={saving} type="submit" style={{ background: saving ? "#2a2a28" : "#D85A30", border: 0, color: saving ? "#888780" : "#0c0c0b", cursor: saving ? "default" : "pointer", fontFamily: mono, fontSize: "10px", letterSpacing: "0.13em", padding: "12px", textTransform: "uppercase" }}>{saving ? "guardando..." : "guardar cambios"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
