"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/app/components/navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkType = "arte" | "música" | "fotografía" | "evento";

interface TypeOption {
  id: WorkType;
  label: string;
  description: string;
  accent: string;
  accept: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    id: "arte",
    label: "Arte visual",
    description: "Pintura, grabado, escultura, técnica mixta",
    accent: "#D85A30",
    accept: "image/*",
  },
  {
    id: "música",
    label: "Música",
    description: "Track, EP, álbum, composición, sesión",
    accent: "#5DCAA5",
    accept: "audio/*",
  },
  {
    id: "fotografía",
    label: "Fotografía",
    description: "Análogo, digital, documental, retrato",
    accent: "#378ADD",
    accept: "image/*",
  },
  {
    id: "evento",
    label: "Evento",
    description: "Exposición, concierto, taller, performance",
    accent: "#EF9F27",
    accept: "image/*",
  },
];

// ─── Input styles ─────────────────────────────────────────────────────────────

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
  const [selectedType, setSelectedType] = useState<WorkType | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  // Event-specific fields
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");

  const activeOption = TYPE_OPTIONS.find((t) => t.id === selectedType);

  function handleFile(file: File) {
    setStorageError(null);
    setError(null);
    if (file.size > MAX_FILE_SIZE) {
      setError(`el archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB — el máximo es 10 MB`);
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType || !title.trim()) return;

    setSubmitting(true);
    setError(null);
    setStorageError(null);

    try {
      let media_url: string | null = null;
      let media_type: string | null = null;

      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;

        setUploading(true);
        const uploadPromise = supabase.storage.from("media").upload(path, selectedFile);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 30_000)
        );

        const result = await Promise.race([uploadPromise, timeoutPromise]);
        setUploading(false);

        if (result.error) {
          setStorageError(`storage: ${result.error.message} (status ${result.error.status ?? "—"})`);
          throw new Error("error al subir el archivo — intenta con un archivo más pequeño");
        }

        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        media_url = urlData.publicUrl;
        media_type = selectedFile.type;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Build event_date timestamp from separate date + time inputs
      let event_date: string | null = null;
      if (selectedType === "evento" && eventDate) {
        event_date = eventTime
          ? new Date(`${eventDate}T${eventTime}`).toISOString()
          : new Date(eventDate).toISOString();
      }

      const { error: insertError } = await supabase.from("posts").insert({
        title: title.trim(),
        body: description.trim() || null,
        type: selectedType,
        media_url,
        media_type,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        author_id: user?.id ?? null,
        ...(selectedType === "evento" && {
          event_date,
          venue: venue.trim() || null,
          address: address.trim() || null,
          is_free: isFree,
          price: !isFree && price.trim() ? price.trim() : null,
        }),
      });
      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err) {
      setUploading(false);
      if (err instanceof Error && err.message === "timeout") {
        setError("error al subir el archivo — intenta con un archivo más pequeño");
      } else {
        setError(err instanceof Error ? err.message : "error al publicar");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar active="upload" />

      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Page header */}
        <div className="pt-10 pb-8 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center shrink-0"
            style={{
              width: "28px",
              height: "28px",
              border: "0.5px solid #2a2a28",
              color: "#888780",
            }}
            aria-label="Volver al feed"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </Link>
          <h1
            style={{
              fontSize: "22px",
              color: "#e8e4dc",
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            subir obra
          </h1>
        </div>

        {/* Type selector */}
        <section className="mb-8">
          <p style={{ ...labelStyle, marginBottom: "12px" }}>tipo de obra</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedType(opt.id)}
                  className="flex flex-col items-start gap-2 p-4 text-left cursor-pointer transition-colors duration-150"
                  style={{
                    backgroundColor: isSelected ? `${opt.accent}0d` : "#141412",
                    border: `0.5px solid ${isSelected ? opt.accent : "#2a2a28"}`,
                  }}
                >
                  {/* Accent dot */}
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: opt.accent,
                      opacity: isSelected ? 1 : 0.35,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      fontFamily: "var(--font-syne), sans-serif",
                      fontWeight: 700,
                      color: isSelected ? opt.accent : "#e8e4dc",
                      lineHeight: 1.1,
                    }}
                  >
                    {opt.label}
                  </span>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontFamily: "var(--font-space-mono), monospace",
                      color: "#5F5E5A",
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* Título */}
          <div>
            <label style={labelStyle}>Título</label>
            <input
              type="text"
              placeholder="nombre de la obra"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Descripción */}
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

          {/* Archivo */}
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
                  <span style={{ fontSize: "11px", color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>
                    {fileName}
                  </span>
                  <span
                    style={{ fontSize: "9px", color: "#444441", fontFamily: "var(--font-space-mono), monospace", textDecoration: "underline" }}
                  >
                    cambiar archivo
                  </span>
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

          {/* Tags */}
          <div>
            <label style={labelStyle}>
              Tags{" "}
              <span style={{ color: "#444441" }}>separados por coma</span>
            </label>
            <input
              type="text"
              placeholder="grabado, tepito, linóleo, político..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Colonia */}
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

          {/* Evento-specific fields */}
          {selectedType === "evento" && (
            <>
              <div
                style={{
                  borderTop: "0.5px solid #2a2a28",
                  paddingTop: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <p style={{ ...labelStyle, marginBottom: 0, color: "#EF9F27" }}>
                  detalles del evento
                </p>

                {/* Fecha + Hora */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Fecha del evento</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      style={{ ...inputStyle, colorScheme: "dark" }}
                      className="focus:outline-none"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      style={{ ...inputStyle, colorScheme: "dark" }}
                      className="focus:outline-none"
                    />
                  </div>
                </div>

                {/* Venue */}
                <div>
                  <label style={labelStyle}>Lugar / venue</label>
                  <input
                    type="text"
                    placeholder="ej. Foro Indie Rocks!"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    style={inputStyle}
                    className="focus:outline-none"
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label style={labelStyle}>Dirección</label>
                  <input
                    type="text"
                    placeholder="ej. Av. Álvaro Obregón 65, Roma Norte"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={inputStyle}
                    className="focus:outline-none"
                  />
                </div>

                {/* Entrada libre toggle */}
                <div>
                  <label style={labelStyle}>Entrada</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setIsFree(val)}
                        className="px-4 py-2 text-xs tracking-widest uppercase cursor-pointer transition-colors duration-150"
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

                {/* Precio — only if not free */}
                {!isFree && (
                  <div>
                    <label style={labelStyle}>Precio</label>
                    <input
                      type="text"
                      placeholder="ej. 150"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      style={inputStyle}
                      className="focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Upload progress */}
          {uploading && (
            <div>
              <p style={{ fontSize: "11px", color: "#5DCAA5", fontFamily: "var(--font-space-mono), monospace", marginBottom: "8px" }}>
                subiendo archivo...
              </p>
              <div style={{ height: "2px", backgroundColor: "#2a2a28", width: "100%" }}>
                <div
                  style={{ height: "2px", backgroundColor: "#5DCAA5", width: "100%", opacity: 0.7 }}
                  className="animate-pulse"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: "var(--font-space-mono), monospace" }}>
              {error}
            </p>
          )}

          {/* Storage debug error */}
          {storageError && (
            <p style={{ fontSize: "10px", color: "#444441", fontFamily: "var(--font-space-mono), monospace", wordBreak: "break-all" }}>
              {storageError}
            </p>
          )}

          {/* Success */}
          {success && (
            <p style={{ fontSize: "11px", color: "#5DCAA5", fontFamily: "var(--font-space-mono), monospace" }}>
              obra publicada con éxito
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !selectedType || !title.trim()}
            className="w-full py-3 text-sm tracking-widest uppercase cursor-pointer transition-opacity duration-150 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#D85A30",
              color: "#0c0c0b",
              fontFamily: "var(--font-space-mono), monospace",
              marginTop: "4px",
            }}
          >
            {submitting ? "publicando..." : "publicar obra"}
          </button>
        </form>
      </main>
    </div>
  );
}
