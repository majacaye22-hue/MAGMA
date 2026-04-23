"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const RichEditor = dynamic(
  () => import("@/app/components/editor/RichEditor").then((m) => m.RichEditor),
  { ssr: false, loading: () => <div style={{ minHeight: "320px", backgroundColor: "#141412", border: "0.5px solid #2a2a28" }} /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkType = "arte" | "música" | "fotografía" | "evento" | "escrito";

interface TypeOption {
  id: WorkType;
  label: string;
  description: string;
  accent: string;
  accept: string | null;
}

const TYPE_OPTIONS: TypeOption[] = [
  { id: "arte",       label: "Arte visual",  description: "Pintura, grabado, escultura, técnica mixta",  accent: "#D85A30", accept: "image/*" },
  { id: "música",     label: "Música",       description: "Track, EP, álbum, composición, sesión",       accent: "#5DCAA5", accept: "audio/*" },
  { id: "fotografía", label: "Fotografía",   description: "Análogo, digital, documental, retrato",       accent: "#378ADD", accept: "image/*" },
  { id: "evento",     label: "Evento",       description: "Exposición, concierto, taller, performance",  accent: "#EF9F27", accept: "image/*" },
  { id: "escrito",    label: "Manifiesto",   description: "poema, ensayo, manifiesto, pensamiento",      accent: "#7F77DD", accept: null },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#e8e4dc",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "13px",
  outline: "none",
  width: "100%",
  padding: "10px 12px",
};

const labelStyle: React.CSSProperties = {
  color: "#5F5E5A",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "block",
  marginBottom: "6px",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }} />}>
      <UploadPageInner />
    </Suspense>
  );
}

function UploadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<WorkType | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [richContent, setRichContent] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [openCollab, setOpenCollab] = useState(false);
  const [collabDescription, setCollabDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState<string | null>(null);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Event-specific fields
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const type = searchParams.get("type") as WorkType | null;
    if (type && TYPE_OPTIONS.some((o) => o.id === type)) {
      setSelectedType(type);
    }
  }, [searchParams]);

  const activeOption = TYPE_OPTIONS.find((t) => t.id === selectedType);
  const isEscrito = selectedType === "escrito";

  // ── File handling ─────────────────────────────────────────────────────────

  function handleFile(f: File) {
    setError(null);
    setFile(f);
    setFileName(f.name);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handleCoverFile(f: File) {
    setError(null);
    setCoverFile(f);
    setCoverFileName(f.name);
  }

  function handleCoverDrop(e: React.DragEvent) {
    e.preventDefault();
    setCoverDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleCoverFile(f);
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleCoverFile(f);
  }

  function isSubmittable() {
    if (!selectedType) return false;
    if (isEscrito) return richContent.trim().length > 0 && richContent !== "<p></p>";
    return title.trim().length > 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      if (!userId) {
        setError('debes iniciar sesión')
        return
      }

      let mediaUrl = null
      let coverUrl = null

      if (file) {
        console.log('[upload] uploading file:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)} MB`)
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        console.log('[upload] file upload response status:', response.status)
        const json = await response.json()
        console.log('[upload] file upload response body:', json)
        if (!response.ok || json.error) throw new Error(json.error ?? `HTTP ${response.status}`)
        mediaUrl = json.url
      }

      if (coverFile) {
        console.log('[upload] uploading cover:', coverFile.name, `${(coverFile.size / 1024 / 1024).toFixed(2)} MB`)
        const formData = new FormData()
        formData.append('file', coverFile)
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        console.log('[upload] cover upload response status:', response.status)
        const json = await response.json()
        console.log('[upload] cover upload response body:', json)
        if (!response.ok || json.error) throw new Error(json.error ?? `HTTP ${response.status}`)
        coverUrl = json.url
      }

      console.log('[upload] starting insert with userId:', userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from('posts')
        .insert({
          title: title || null,
          body: isEscrito ? null : (description || null),
          content: isEscrito ? richContent : null,
          type: selectedType,
          media_url: mediaUrl,
          cover_url: coverUrl,
          open_collab: openCollab,
          collab_description: openCollab && collabDescription.trim() ? collabDescription.trim() : null,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          author_id: userId,
          event_date: eventDate && eventTime ? `${eventDate}T${eventTime}` : null,
          venue: venue || null,
          address: address || null,
          is_free: isFree,
          price: !isFree && price ? price : null,
        })
        .select()

      console.log('[upload] insert result:', { data, error: insertError })
      if (insertError) throw insertError

      console.log('[upload] success, redirecting')
      router.push('/')

    } catch (err: unknown) {
      console.error('[upload] error:', err)
      setError(err instanceof Error ? err.message : 'error al publicar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>


      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Header */}
        <div className="pt-10 pb-8 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center shrink-0"
            style={{ width: "28px", height: "28px", border: "0.5px solid #2a2a28", color: "#888780" }}
            aria-label="Volver al feed"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </Link>
          <h1 style={{ fontSize: "22px", color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, lineHeight: 1 }}>
            subir obra
          </h1>
        </div>

        {/* Type selector */}
        <section className="mb-8">
          <p style={{ ...labelStyle, marginBottom: "12px" }}>tipo de obra</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedType(opt.id)}
                  className="flex flex-col items-start gap-2 p-4 text-left cursor-pointer transition-colors duration-150"
                  style={{
                    backgroundColor: isSelected ? `${opt.accent}12` : "#141412",
                    border: `0.5px solid ${isSelected ? opt.accent : "#2a2a28"}`,
                  }}
                >
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: opt.accent, opacity: isSelected ? 1 : 0.35 }} />
                  <span style={{ fontSize: "13px", fontFamily: "var(--font-syne), sans-serif", fontWeight: 700, color: isSelected ? opt.accent : "#e8e4dc", lineHeight: 1.1 }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: "9.5px", fontFamily: "var(--font-space-mono), monospace", color: "#5F5E5A", lineHeight: 1.4 }}>
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Título */}
          <div>
            <label style={labelStyle}>
              Título{isEscrito && <span style={{ color: "#444441" }}> — opcional</span>}
            </label>
            <input
              type="text"
              placeholder={isEscrito ? "sin título" : "nombre de la obra"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required={!isEscrito}
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Rich text — escrito only */}
          {isEscrito && (
            <div>
              <label style={labelStyle}>Contenido</label>
              <RichEditor value={richContent} onChange={setRichContent} minHeight={360} />
            </div>
          )}

          {/* Descripción */}
          {!isEscrito && (
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea
                rows={3}
                placeholder="describe el proceso, la intención, el contexto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                className="focus:outline-none"
              />
            </div>
          )}

          {/* File upload */}
          {!isEscrito && (
            <div>
              <label style={labelStyle}>
                Archivo
                {selectedType && (
                  <span style={{ color: "#444441" }}>
                    {" "}—{" "}
                    {activeOption?.accept === "audio/*" ? "audio (mp3, wav, flac)" : "imagen (jpg, png, gif, webp)"}
                  </span>
                )}
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-150"
                style={{
                  minHeight: "140px",
                  border: `1px dashed ${dragOver ? (activeOption?.accent ?? "#D85A30") : "#2a2a28"}`,
                  backgroundColor: dragOver ? "rgba(255,255,255,0.02)" : "#141412",
                }}
              >
                {fileName ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9.5L7 13.5L15 5.5" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "11px", color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>{fileName}</span>
                    <span style={{ fontSize: "9px", color: "#444441", fontFamily: "var(--font-space-mono), monospace", textDecoration: "underline" }}>cambiar archivo</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                      <path d="M3 14V16.5H17V14" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace" }}>
                      arrastra o haz clic para subir
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={activeOption?.accept ?? "image/*,audio/*"}
                onChange={handleFileChange}
                className="hidden"
                aria-hidden
              />
            </div>
          )}

          {/* Cover image — música only */}
          {selectedType === "música" && (
            <div>
              <label style={labelStyle}>
                Imagen de portada <span style={{ color: "#444441" }}>— opcional</span>
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => coverInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && coverInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
                onDragLeave={() => setCoverDragOver(false)}
                onDrop={handleCoverDrop}
                className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-150"
                style={{
                  minHeight: "100px",
                  border: `1px dashed ${coverDragOver ? "#5DCAA5" : "#2a2a28"}`,
                  backgroundColor: coverDragOver ? "rgba(93,202,165,0.04)" : "#141412",
                }}
              >
                {coverFileName ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9.5L7 13.5L15 5.5" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "11px", color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>{coverFileName}</span>
                    <span style={{ fontSize: "9px", color: "#444441", fontFamily: "var(--font-space-mono), monospace", textDecoration: "underline" }}>cambiar portada</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                      <path d="M3 14V16.5H17V14" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace" }}>
                      portada del track (jpg, png, webp)
                    </span>
                  </>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
                aria-hidden
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags <span style={{ color: "#444441" }}>separados por coma</span></label>
            <input
              type="text"
              placeholder={isEscrito ? "poema, ciudad, noche, amor..." : "grabado, tepito, linóleo, político..."}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Colonia */}
          {!isEscrito && (
            <div>
              <label style={labelStyle}>Colonia / ubicación</label>
              <input
                type="text"
                placeholder="ej. Tepito, CDMX"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={inputStyle}
                className="focus:outline-none"
              />
            </div>
          )}

          {/* Evento fields */}
          {selectedType === "evento" && (
            <div style={{ borderTop: "0.5px solid #2a2a28", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <p style={{ ...labelStyle, marginBottom: 0, color: "#EF9F27" }}>detalles del evento</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Fecha del evento</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} className="focus:outline-none" />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} className="focus:outline-none" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Lugar / venue</label>
                <input type="text" placeholder="ej. Foro Indie Rocks!" value={venue} onChange={(e) => setVenue(e.target.value)} style={inputStyle} className="focus:outline-none" />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" placeholder="ej. Av. Álvaro Obregón 65, Roma Norte" value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} className="focus:outline-none" />
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
                        fontFamily: "var(--font-space-mono), monospace",
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
                  <input type="text" placeholder="ej. 150" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} className="focus:outline-none" />
                </div>
              )}
            </div>
          )}

          {/* Collab toggle */}
          <button
            type="button"
            onClick={() => setOpenCollab((v) => !v)}
            className="flex items-start gap-3 cursor-pointer text-left w-full"
            style={{ background: "none", border: "none", padding: 0 }}
          >
            <div
              style={{
                marginTop: "2px",
                width: "16px",
                height: "16px",
                flexShrink: 0,
                border: `0.5px solid ${openCollab ? "#5DCAA5" : "#2a2a28"}`,
                backgroundColor: openCollab ? "rgba(93,202,165,0.12)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {openCollab && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: "11px", color: openCollab ? "#5DCAA5" : "#888780", fontFamily: "var(--font-space-mono), monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                abierto a colaboración
              </span>
              <span style={{ fontSize: "10px", color: "#444441", fontFamily: "var(--font-space-mono), monospace", lineHeight: 1.5 }}>
                invita a otros artistas a participar o comentar este proyecto
              </span>
            </div>
          </button>

          {openCollab && (
            <textarea
              rows={3}
              placeholder="ej. busco beatmaker, abierto a remix, quiero co-escribir letras..."
              value={collabDescription}
              onChange={(e) => setCollabDescription(e.target.value)}
              style={{
                backgroundColor: "#141412",
                border: "0.5px solid #5DCAA5",
                color: "#e8e4dc",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: "12px",
                outline: "none",
                width: "100%",
                padding: "10px 12px",
                resize: "vertical",
                lineHeight: 1.6,
              }}
              className="focus:outline-none placeholder:text-[#444441]"
            />
          )}

          {error && (
            <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: "var(--font-space-mono), monospace" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !isSubmittable()}
            className="w-full py-3 text-sm tracking-widest uppercase cursor-pointer transition-opacity duration-150 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isEscrito ? "#7F77DD" : "#D85A30",
              color: "#0c0c0b",
              fontFamily: "var(--font-space-mono), monospace",
              marginTop: "4px",
            }}
          >
            {submitting ? "publicando..." : isEscrito ? "publicar manifiesto" : "publicar obra"}
          </button>
        </form>
      </main>
    </div>
  );
}
