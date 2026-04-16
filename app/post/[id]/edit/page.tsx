"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { Navbar } from "@/app/components/navbar";

const RichEditor = dynamic(
  () => import("@/app/components/editor/RichEditor").then((m) => m.RichEditor),
  { ssr: false, loading: () => <div style={{ minHeight: "320px", backgroundColor: "#141412", border: "0.5px solid #2a2a28" }} /> }
);

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

type PostType = "arte" | "música" | "fotografía" | "evento" | "escrito";

interface PostData {
  id: string;
  title: string | null;
  body: string | null;
  content: string | null;
  type: PostType;
  media_url: string | null;
  media_type: string | null;
  tags: string[] | null;
  author_id: string | null;
  event_date: string | null;
  venue: string | null;
  address: string | null;
  is_free: boolean | null;
  price: string | null;
}

export default function EditPostPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [postType, setPostType] = useState<PostType>("arte");
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [richContent, setRichContent] = useState("");
  const richContentRef = useRef("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");

  // File upload
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileName, setNewFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const supabase = getSupabaseClient();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      setUserId(session.user.id);
      setAccessToken(session.access_token);

      const { data: post } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (!post || post.author_id !== session.user.id) {
        router.push(`/post/${id}`);
        return;
      }

      const p = post as PostData;
      setPostType(p.type);
      setTitle(p.title ?? "");
      setDescription(p.body ?? "");
      setRichContent(p.content ?? "");
      richContentRef.current = p.content ?? "";
      setTags(p.tags ? p.tags.join(", ") : "");
      setExistingMediaUrl(p.media_url);

      if (p.event_date) {
        const d = new Date(p.event_date);
        setEventDate(d.toISOString().slice(0, 10));
        setEventTime(d.toISOString().slice(11, 16));
      }
      setVenue(p.venue ?? "");
      setAddress(p.address ?? "");
      setIsFree(p.is_free ?? true);
      setPrice(p.price ?? "");

      setLoading(false);
    })();
  }, [id]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setNewFile(f); setNewFileName(f.name); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setNewFile(f); setNewFileName(f.name); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!userId || !accessToken) { setError("debes iniciar sesión"); setSaving(false); return; }

      let mediaUrl = existingMediaUrl;

      // Upload new file if one was selected
      if (newFile) {
        const formData = new FormData();
        formData.append("file", newFile);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const { url, error: uploadError } = await response.json();
        if (uploadError) throw new Error(uploadError);
        mediaUrl = url;
      }

      // Build event_date
      let event_date: string | null = null;
      if (postType === "evento" && eventDate) {
        event_date = eventTime
          ? new Date(`${eventDate}T${eventTime}`).toISOString()
          : new Date(eventDate).toISOString();
      }

      const updatePayload: Record<string, unknown> = {
        title: title.trim() || null,
        body: postType !== "escrito" ? (description.trim() || null) : null,
        content: postType === "escrito" ? richContentRef.current : null,
        media_url: mediaUrl,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      };

      if (postType === "evento") {
        updatePayload.event_date = event_date;
        updatePayload.venue = venue.trim() || null;
        updatePayload.address = address.trim() || null;
        updatePayload.is_free = isFree;
        updatePayload.price = !isFree && price.trim() ? price.trim() : null;
      }

      // Use direct fetch to avoid gotrue-js internal getSession() deadlock
      const SUPABASE_URL = "https://avmztbdgyyrqccizmzsh.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bXp0YmRneXlycWNjaXptenNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjcyNjQsImV4cCI6MjA5MTI0MzI2NH0.ELsHIm9fCTa1hGcW_GQdI_hhcwYu3VkwPTaxfilidl8";
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/posts?id=eq.${id}&author_id=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }

      router.push(`/post/${id}`);
    } catch (err) {
      console.error("[edit] error:", err);
      setError(err instanceof Error ? err.message : "error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const isEscrito = postType === "escrito";
  const isEvento  = postType === "evento";
  const acceptFile = postType === "música" ? "audio/*" : "image/*";

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
        <Navbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Header */}
        <div className="pt-10 pb-8 flex items-center gap-4">
          <Link
            href={`/post/${id}`}
            className="flex items-center justify-center shrink-0"
            style={{ width: "28px", height: "28px", border: "0.5px solid #2a2a28", color: "#888780" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </Link>
          <div>
            <h1 style={{ fontSize: "22px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
              editar
            </h1>
            <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {postType}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Título */}
          <div>
            <label style={labelStyle}>
              Título{isEscrito && <span style={{ color: "#444441" }}> — opcional</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEscrito ? "sin título" : "nombre de la obra"}
              required={!isEscrito}
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Rich text editor — escrito only */}
          {isEscrito && (
            <div>
              <label style={labelStyle}>Contenido</label>
              <RichEditor value={richContent} onChange={(html) => { setRichContent(html); richContentRef.current = html; }} minHeight={360} />
            </div>
          )}

          {/* Description — non-escrito */}
          {!isEscrito && (
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="describe el proceso, la intención, el contexto..."
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                className="focus:outline-none"
              />
            </div>
          )}

          {/* File upload — non-escrito */}
          {!isEscrito && (
            <div>
              <label style={labelStyle}>
                Archivo
                <span style={{ color: "#444441" }}> — opcional, reemplaza el actual</span>
              </label>

              {/* Show current media if no new file selected */}
              {existingMediaUrl && !newFileName && (
                <div style={{ marginBottom: "8px", fontSize: "10px", color: "#5F5E5A", fontFamily: mono }}>
                  archivo actual: <span style={{ color: "#888780" }}>{existingMediaUrl.split("/").pop()}</span>
                </div>
              )}

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-3 cursor-pointer"
                style={{
                  minHeight: "100px",
                  border: `1px dashed ${dragOver ? "#D85A30" : "#2a2a28"}`,
                  backgroundColor: "#141412",
                }}
              >
                {newFileName ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9.5L7 13.5L15 5.5" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "11px", color: "#888780", fontFamily: mono }}>{newFileName}</span>
                    <span style={{ fontSize: "9px", color: "#444441", fontFamily: mono, textDecoration: "underline" }}>cambiar archivo</span>
                  </>
                ) : (
                  <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>
                    arrastra o haz clic para reemplazar
                  </span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept={acceptFile} onChange={handleFileChange} className="hidden" aria-hidden />
            </div>
          )}

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags <span style={{ color: "#444441" }}>separados por coma</span></label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="grabado, tepito, linóleo..."
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Location — arte/foto/música */}
          {!isEscrito && !isEvento && (
            <div>
              <label style={labelStyle}>Colonia / ubicación</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ej. Tepito, CDMX"
                style={inputStyle}
                className="focus:outline-none"
              />
            </div>
          )}

          {/* Evento fields */}
          {isEvento && (
            <div style={{ borderTop: "0.5px solid #2a2a28", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <p style={{ ...labelStyle, marginBottom: 0, color: "#EF9F27" }}>detalles del evento</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} className="focus:outline-none" />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} className="focus:outline-none" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Lugar / venue</label>
                <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="ej. Foro Indie Rocks!" style={inputStyle} className="focus:outline-none" />
              </div>

              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ej. Av. Álvaro Obregón 65, Roma Norte" style={inputStyle} className="focus:outline-none" />
              </div>

              <div>
                <label style={labelStyle}>Entrada</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)} type="button" onClick={() => setIsFree(val)}
                      className="px-4 py-2 text-xs tracking-widest uppercase cursor-pointer"
                      style={{
                        border: `0.5px solid ${isFree === val ? "#EF9F27" : "#2a2a28"}`,
                        backgroundColor: isFree === val ? "#EF9F270d" : "#141412",
                        color: isFree === val ? "#EF9F27" : "#888780",
                        fontFamily: mono,
                      }}
                    >
                      {val ? "libre" : "de paga"}
                    </button>
                  ))}
                </div>
              </div>

              {!isFree && (
                <div>
                  <label style={labelStyle}>Precio</label>
                  <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ej. 150" style={inputStyle} className="focus:outline-none" />
                </div>
              )}
            </div>
          )}

          <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

          {error && (
            <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono }}>{error}</p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="py-3 text-sm tracking-widest uppercase cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{
                backgroundColor: isEscrito ? "#7F77DD" : "#D85A30",
                color: "#0c0c0b",
                fontFamily: mono,
                border: "none",
                padding: "12px 32px",
              }}
            >
              {saving ? "guardando..." : "guardar cambios"}
            </button>
            <Link
              href={`/post/${id}`}
              style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono, textDecoration: "none" }}
              className="hover:opacity-70"
            >
              cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
