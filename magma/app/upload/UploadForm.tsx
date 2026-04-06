"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "./actions";

type PostType = "arte" | "música" | "fotografía" | "evento";

const TYPE_CONFIG: Record<
  PostType,
  { label: string; accept: string; hint: string; color: string }
> = {
  arte: {
    label: "arte",
    accept: "image/*",
    hint: "JPG, PNG, WebP, GIF",
    color: "#D85A30",
  },
  música: {
    label: "música",
    accept: "audio/*",
    hint: "MP3, WAV, OGG, FLAC",
    color: "#888780",
  },
  fotografía: {
    label: "fotografía",
    accept: "image/*",
    hint: "JPG, PNG, RAW, TIFF",
    color: "#e8e4dc",
  },
  evento: {
    label: "evento",
    accept: "image/*",
    hint: "imagen de portada (opcional)",
    color: "#D85A30",
  },
};

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <label
          style={{
            fontFamily: "Space Mono",
            fontSize: "10px",
            color: "#888780",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
        {hint && (
          <span
            style={{
              fontFamily: "Space Mono",
              fontSize: "10px",
              color: "#2a2a28",
              letterSpacing: "0.03em",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  backgroundColor: "#141412",
  border: "1px solid #2a2a28",
  borderRadius: "2px",
  color: "#e8e4dc",
  fontFamily: "Space Mono",
  fontSize: "13px",
  outline: "none",
};

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, color = "#D85A30") {
  e.currentTarget.style.borderColor = color;
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#2a2a28";
}

// ── File preview ──────────────────────────────────────────────────────────────
function FilePreview({ file }: { file: File }) {
  const url = URL.createObjectURL(file);
  const isImage = file.type.startsWith("image/");
  const isAudio = file.type.startsWith("audio/");

  return (
    <div
      style={{
        border: "1px solid #2a2a28",
        borderRadius: "2px",
        overflow: "hidden",
        backgroundColor: "#141412",
      }}
    >
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="preview"
          style={{
            width: "100%",
            maxHeight: "280px",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
      {isAudio && (
        <div style={{ padding: "16px 20px" }}>
          {/* Waveform placeholder */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              height: "40px",
              marginBottom: "12px",
            }}
          >
            {Array.from({ length: 48 }, (_, i) => {
              const h = 20 + Math.abs(Math.sin(i * 0.6) * 30);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    backgroundColor: "#D85A30",
                    opacity: 0.5 + (i % 3) * 0.15,
                    borderRadius: "1px",
                  }}
                />
              );
            })}
          </div>
          <audio controls src={url} style={{ width: "100%", accentColor: "#D85A30" }} />
        </div>
      )}
      {/* File info row */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: isImage || isAudio ? "1px solid #2a2a28" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontFamily: "Space Mono",
            fontSize: "11px",
            color: "#888780",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file.name}
        </span>
        <span
          style={{
            fontFamily: "Space Mono",
            fontSize: "10px",
            color: "#2a2a28",
            flexShrink: 0,
          }}
        >
          {(file.size / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({
  type,
  file,
  onFile,
}: {
  type: PostType;
  file: File | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const cfg = TYPE_CONFIG[type];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  if (file) {
    return (
      <div>
        <FilePreview file={file} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            marginTop: "8px",
            fontFamily: "Space Mono",
            fontSize: "11px",
            color: "#888780",
            background: "none",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.04em",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          cambiar archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={cfg.accept}
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `1px dashed ${dragging ? cfg.color : "#2a2a28"}`,
        borderRadius: "2px",
        padding: "48px 24px",
        textAlign: "center",
        backgroundColor: dragging ? "rgba(216,90,48,0.04)" : "#141412",
        cursor: "pointer",
        transition: "border-color 0.15s, background-color 0.15s",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: `1px solid ${dragging ? cfg.color : "#2a2a28"}`,
          borderRadius: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          transition: "border-color 0.15s",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 2V13M9 2L6 5M9 2L12 5"
            stroke={dragging ? cfg.color : "#888780"}
            strokeWidth="1.2"
            strokeLinecap="square"
          />
          <path d="M2 15H16" stroke={dragging ? cfg.color : "#888780"} strokeWidth="1.2" strokeLinecap="square" />
        </svg>
      </div>
      <p
        style={{
          fontFamily: "Space Mono",
          fontSize: "12px",
          color: "#888780",
          marginBottom: "4px",
        }}
      >
        arrastra aquí o{" "}
        <span style={{ color: cfg.color }}>selecciona un archivo</span>
      </p>
      <p
        style={{
          fontFamily: "Space Mono",
          fontSize: "10px",
          color: "#2a2a28",
          letterSpacing: "0.04em",
        }}
      >
        {cfg.hint} — máx. 50MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={cfg.accept}
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div
      style={{
        height: "2px",
        backgroundColor: "#2a2a28",
        borderRadius: "1px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "#D85A30",
          transition: "width 0.2s ease",
        }}
      />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function UploadForm({ userId }: { username: string; userId: string }) {
  const [type, setType] = useState<PostType>("arte");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const accentColor = TYPE_CONFIG[type].color;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const data = new FormData(formEl);

    let fileUrl: string | null = null;
    let filePath: string | null = null;

    // ── Upload file to storage if one was selected ──────────────────────────
    if (file) {
      setUploading(true);
      setUploadProgress(10);

      const ext = file.name.split(".").pop();
      const path = `${userId}/${type}/${Date.now()}.${ext}`;

      const supabase = createClient();
      const { error: storageErr, data: storageData } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (storageErr) {
        setError(`error subiendo archivo: ${storageErr.message}`);
        setUploading(false);
        return;
      }

      setUploadProgress(80);
      filePath = storageData.path;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      fileUrl = publicUrl;
      setUploadProgress(100);
      setUploading(false);
    }

    // ── Append storage results to form data ─────────────────────────────────
    data.set("fileUrl", fileUrl ?? "");
    data.set("filePath", filePath ?? "");

    // ── Call server action ──────────────────────────────────────────────────
    startTransition(async () => {
      const result = await createPost({ status: "idle" }, data);
      if (result?.status === "error") {
        setError(result.message);
      }
    });
  }

  const busy = uploading || isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

        {/* ── Type selector ─────────────────────────────────────────────── */}
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "Space Mono",
              fontSize: "10px",
              color: "#888780",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            tipo de obra
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
            {(Object.keys(TYPE_CONFIG) as PostType[]).map((t) => {
              const cfg = TYPE_CONFIG[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setFile(null); }}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "2px",
                    border: `1px solid ${active ? cfg.color : "#2a2a28"}`,
                    backgroundColor: active ? "rgba(216,90,48,0.06)" : "transparent",
                    color: active ? cfg.color : "#888780",
                    fontFamily: "Space Mono",
                    fontSize: "11px",
                    fontWeight: active ? 700 : 400,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.12s ease",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="type" value={type} />
        </div>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <Field label="título">
          <input
            name="title"
            type="text"
            required
            placeholder="nombre de tu obra"
            style={inputBase}
            onFocus={(e) => focusBorder(e, accentColor)}
            onBlur={blurBorder}
          />
        </Field>

        {/* ── Description ───────────────────────────────────────────────── */}
        <Field label="descripción" hint="opcional">
          <textarea
            name="description"
            rows={4}
            placeholder="cuéntanos sobre tu trabajo..."
            style={{ ...inputBase, resize: "vertical", lineHeight: 1.7 }}
            onFocus={(e) => focusBorder(e, accentColor)}
            onBlur={blurBorder}
          />
        </Field>

        {/* ── Evento-only fields ─────────────────────────────────────────── */}
        {type === "evento" && (
          <>
            <Field label="fecha">
              <input
                name="date"
                type="text"
                placeholder="ej. 12 abr"
                style={inputBase}
                onFocus={(e) => focusBorder(e, accentColor)}
                onBlur={blurBorder}
              />
            </Field>
            <Field label="lugar">
              <input
                name="venue"
                type="text"
                placeholder="nombre del espacio o ciudad"
                style={inputBase}
                onFocus={(e) => focusBorder(e, accentColor)}
                onBlur={blurBorder}
              />
            </Field>
          </>
        )}

        {/* ── File upload ────────────────────────────────────────────────── */}
        <Field
          label="archivo"
          hint={type === "evento" ? "portada opcional" : undefined}
        >
          <DropZone type={type} file={file} onFile={setFile} />
        </Field>

        {/* ── Upload progress ────────────────────────────────────────────── */}
        {uploading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <ProgressBar progress={uploadProgress} />
            <span
              style={{
                fontFamily: "Space Mono",
                fontSize: "11px",
                color: "#888780",
              }}
            >
              subiendo archivo... {uploadProgress}%
            </span>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              border: "1px solid #D85A30",
              borderRadius: "2px",
              fontFamily: "Space Mono",
              fontSize: "11px",
              color: "#D85A30",
            }}
          >
            {error}
          </div>
        )}

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid #2a2a28" }} />

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            padding: "13px",
            backgroundColor: busy ? "#2a2a28" : "#D85A30",
            border: `1px solid ${busy ? "#2a2a28" : "#D85A30"}`,
            borderRadius: "2px",
            color: busy ? "#888780" : "#0c0c0b",
            fontFamily: "Space Mono",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: busy ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {uploading ? "subiendo archivo..." : isPending ? "publicando..." : "publicar obra"}
        </button>

      </div>
    </form>
  );
}
