"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const CATEGORIES = ["zine", "print", "libro", "objeto", "otro"] as const;
type Category = (typeof CATEGORIES)[number];

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

export default function CrearListingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [category, setCategory] = useState<Category>("zine");
  const [location, setLocation] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) { router.push("/auth/login?redirectTo=/tianguis/crear"); return; }
      setUserId(user.id);
    });
  }, [router]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 4 - imageFiles.length);
    const updated = [...imageFiles, ...newFiles].slice(0, 4);
    setImageFiles(updated);
    setImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  }

  function removeImage(i: number) {
    const updated = imageFiles.filter((_, idx) => idx !== i);
    setImageFiles(updated);
    setImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!title.trim()) { setErr("el título es requerido"); return; }
    if (!price || isNaN(Number(price))) { setErr("precio inválido"); return; }

    setSubmitting(true);
    setErr(null);

    try {
      // Upload all images
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? "error al subir imagen");
        imageUrls.push(json.url);
      }

      const supabase = getSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("listings")
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          price: Number(price),
          currency,
          category,
          location: location.trim() || null,
          images: imageUrls,
          is_available: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      router.push(`/tianguis/${data.id}`);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "error al publicar");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: "28px" }}>
          <Link href="/tianguis" style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← tianguis
          </Link>
        </div>

        <h1 style={{ fontSize: "28px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, marginBottom: "32px" }}>
          publicar en tianguis
        </h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Images */}
          <div>
            <label style={labelStyle}>fotos — hasta 4 imágenes</label>

            {/* Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1" style={{ marginBottom: "8px" }}>
                {imagePreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", backgroundColor: "#141412" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      style={{
                        position: "absolute", top: "4px", right: "4px",
                        width: "18px", height: "18px", border: "none",
                        backgroundColor: "rgba(12,12,11,0.8)", color: "#e8e4dc",
                        fontSize: "10px", cursor: "pointer", lineHeight: 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageFiles.length < 4 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                style={{
                  minHeight: "100px",
                  border: `1px dashed ${dragOver ? "#D85A30" : "#2a2a28"}`,
                  backgroundColor: dragOver ? "rgba(216,90,48,0.04)" : "transparent",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: "6px", cursor: "pointer",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                  <path d="M3 14V16.5H17V14" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                </svg>
                <span style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono }}>
                  {imageFiles.length === 0 ? "arrastra o haz clic · jpg, png, webp" : `+ agregar foto (${imageFiles.length}/4)`}
                </span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} className="hidden" aria-hidden />
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>título</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="nombre del objeto" maxLength={120} style={inputStyle} required />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>descripción <span style={{ color: "#444441" }}>— opcional</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="estado, tamaño, historia, condiciones de venta..."
              maxLength={1000}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* Price + currency */}
          <div>
            <label style={labelStyle}>precio</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                style={{ ...inputStyle, width: "auto", flex: 1 }}
                required
              />
              {(["MXN", "USD"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    fontFamily: mono,
                    border: `0.5px solid ${currency === c ? "#D85A30" : "#2a2a28"}`,
                    color: currency === c ? "#D85A30" : "#5F5E5A",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>categoría</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: "10px",
                    fontSize: "10px",
                    fontFamily: mono,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    border: `0.5px solid ${category === cat ? "#D85A30" : "#2a2a28"}`,
                    color: category === cat ? "#D85A30" : "#5F5E5A",
                    backgroundColor: category === cat ? "rgba(216,90,48,0.06)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>ubicación <span style={{ color: "#444441" }}>— opcional</span></label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej. Tepito, CDMX"
              maxLength={100}
              style={inputStyle}
            />
          </div>

          {err && (
            <p style={{ fontSize: "10px", color: "#D85A30", fontFamily: mono }}>{err}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: submitting ? "#2a2a28" : "#D85A30",
              color: submitting ? "#5F5E5A" : "#0c0c0b",
              fontFamily: mono,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              padding: "14px",
              border: "none",
              cursor: submitting ? "default" : "pointer",
              width: "100%",
            }}
          >
            {submitting ? "publicando..." : "publicar en tianguis →"}
          </button>
        </form>
      </div>
    </div>
  );
}
