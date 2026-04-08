"use client";

import { useState, useRef } from "react";
import Link from "next/link";

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

// ─── Logo ────────────────────────────────────────────────────────────────────

function MagmaLogo() {
  return (
    <span
      style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}
      className="text-2xl tracking-tight select-none"
    >
      {"MAGMA".split("").map((l, i) =>
        l === "A" ? (
          <span key={i} style={{ color: "#D85A30" }}>{l}</span>
        ) : (
          <span key={i} style={{ color: "#e8e4dc" }}>{l}</span>
        )
      )}
    </span>
  );
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOption = TYPE_OPTIONS.find((t) => t.id === selectedType);

  function handleFile(file: File) {
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "rgba(12,12,11,0.92)",
          borderColor: "#2a2a28",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <MagmaLogo />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/upload"
              className="text-xs cursor-pointer"
              style={{ color: "#D85A30", fontFamily: "var(--font-space-mono), monospace" }}
            >
              subir obra
            </Link>
            <div
              className="flex items-center justify-center text-xs font-bold cursor-pointer"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "2px",
                backgroundColor: "#D85A30",
                color: "#0c0c0b",
                fontFamily: "var(--font-syne), sans-serif",
              }}
            >
              M
            </div>
          </div>
        </div>
      </header>

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
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-6"
        >
          {/* Título */}
          <div>
            <label style={labelStyle}>Título</label>
            <input
              type="text"
              placeholder="nombre de la obra"
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
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 text-sm tracking-widest uppercase cursor-pointer transition-opacity duration-150 hover:opacity-80"
            style={{
              backgroundColor: "#D85A30",
              color: "#0c0c0b",
              fontFamily: "var(--font-space-mono), monospace",
              marginTop: "4px",
            }}
          >
            publicar obra
          </button>
        </form>
      </main>
    </div>
  );
}
