"use client";
import { EventDetailsFields } from "@/app/components/EventDetailsFields";
import { EVENT_DETAILS_ENABLED, emptyEventDetails, eventDetailsPayload, eventTimestamp, eventLocalParts, restoreEventDetails, type EventDetails } from "@/lib/event-details";

import { PhotoPicker } from "@/app/components/PhotoPicker";
import { MentionInput } from "@/app/components/MentionInput";
import { supportsCarousel, postImages, uploadPhotos } from "@/lib/post-images";
import { EventTimeInput } from "@/app/components/EventTimeInput";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { sanitizeHtml } from "@/lib/sanitize";
import { normalizeSoundCloudUrl } from "@/lib/soundcloud";
import { COLLABORATIONS_ENABLED } from '@/lib/collaborations';
import { CollaborationPanel } from '@/app/components/CollaborationPanel';
import { PostProjectLinks } from '@/app/components/PostProjectLinks';

const RichEditor = dynamic(
  () => import("@/app/components/editor/RichEditor").then((m) => m.RichEditor),
  { ssr: false, loading: () => <div style={{ minHeight: "320px", backgroundColor: "#141412", border: "0.5px solid #2a2a28" }} /> }
);

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

type PostType = "arte" | "música" | "fotografía" | "evento" | "escrito";

interface PostData {
  audience_colectivo_id?: string | null;
  id: string;
  title: string | null;
  body: string | null;
  content: string | null;
  type: PostType;
  media_url: string | null;
  image_urls?: string[] | null;
  media_type: string | null;
  soundcloud_url: string | null;
  tags: string[] | null;
  author_id: string | null;
  event_date: string | null;
  venue: string | null;
  address: string | null;
  is_free: boolean | null;
  price: string | null;
  open_collab: boolean | null;
  comments_enabled: boolean | null;
  is_sensitive: boolean | null;
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
  const [colectivoId, setColectivoId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<(File | string)[]>([]);
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [soundCloudUrl, setSoundCloudUrl] = useState("");
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
  const [eventDetails, setEventDetails] = useState(emptyEventDetails);
  const [openCollab, setOpenCollab] = useState(false);
  const [collabDescription, setCollabDescription] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isSensitive, setIsSensitive] = useState(false);

  // File upload
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileName, setNewFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project linking
  const [userProjects, setUserProjects] = useState<{ id: string; title: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [initialProject, setInitialProject] = useState<string>("");

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
      setColectivoId(p.audience_colectivo_id ?? null);
      setTitle(p.title ?? "");
      setDescription(p.body ?? "");
      setSoundCloudUrl(p.soundcloud_url ?? "");
      setRichContent(p.content ?? "");
      richContentRef.current = p.content ?? "";
      setTags(p.tags ? p.tags.join(", ") : "");
      setExistingMediaUrl(p.media_url);
      setPhotos(postImages(p));

      if (p.event_date) {
        const d = eventLocalParts(p.event_date);
        setEventDate(d.date);
        setEventTime(d.time);
      }
      setEventDetails(restoreEventDetails(p as PostData & EventDetails));
      setVenue(p.venue ?? "");
      setAddress(p.address ?? "");
      setIsFree(p.is_free ?? true);
      setPrice(p.price ?? "");
      setOpenCollab(p.open_collab ?? false);
      setCommentsEnabled(p.comments_enabled !== false);
      setIsSensitive(p.is_sensitive === true);
      setCollabDescription((p as PostData & { collab_description?: string | null }).collab_description ?? "");

      // Fetch user's projects and this post's current project link
      if (!COLLABORATIONS_ENABLED) {
        const [{ data: projects }, { data: linked }] = await Promise.all([
          supabase.from("projects").select("id, title").eq("author_id", session.user.id).order("created_at", { ascending: false }),
          supabase.from("post_projects").select("project_id").eq("post_id", id).order('created_at').limit(1).maybeSingle(),
        ]);
        setUserProjects(projects ?? []);
        const currentProjectId = linked?.project_id ?? "";
        setSelectedProject(currentProjectId);
        setInitialProject(currentProjectId);
      }

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

      const normalizedSoundCloudUrl = postType === "música" && soundCloudUrl.trim()
        ? normalizeSoundCloudUrl(soundCloudUrl)
        : null;
      if (postType === "música" && soundCloudUrl.trim() && !normalizedSoundCloudUrl) {
        setError("pega un enlace válido de SoundCloud que comience con https://");
        setSaving(false);
        return;
      }

      const imageUrls = supportsCarousel(postType) && photos.length ? await uploadPhotos(photos, colectivoId) : null;
      let mediaUrl = supportsCarousel(postType) ? imageUrls?.[0] ?? null : existingMediaUrl;

      // Upload new file if one was selected
      if (newFile && !supportsCarousel(postType)) {
        const formData = new FormData();
        formData.append("file", newFile);
        if (colectivoId) formData.append("colectivo_id", colectivoId);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const { url, error: uploadError } = await response.json();
        if (uploadError) throw new Error(uploadError);
        mediaUrl = url;
      }

      // Build event_date
      let event_date: string | null = null;
      if (postType === "evento" && eventDate) {
        event_date = eventTimestamp(eventDate, eventTime);
      }

      const updatePayload: Record<string, unknown> = {
        title: title.trim() || null,
        body: postType !== "escrito" ? (description.trim() || null) : null,
        content: postType === "escrito" ? sanitizeHtml(richContentRef.current) : null,
        media_url: mediaUrl,
        ...(supportsCarousel(postType) ? { image_urls: imageUrls } : {}),
        soundcloud_url: normalizedSoundCloudUrl,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        open_collab: openCollab,
        collab_description: openCollab && collabDescription.trim() ? collabDescription.trim() : null,
        comments_enabled: commentsEnabled,
        is_sensitive: isSensitive,
      };

      if (postType === "evento") {
        updatePayload.event_date = event_date;
        updatePayload.venue = venue.trim() || null;
        updatePayload.address = address.trim() || null;
        updatePayload.is_free = isFree;
        updatePayload.price = !isFree && price.trim() ? price.trim() : null;
        if (EVENT_DETAILS_ENABLED) Object.assign(updatePayload, eventDetailsPayload(eventDetails, event_date));
      }

      // Use direct fetch to avoid gotrue-js internal getSession() deadlock
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/posts?id=eq.${id}&author_id=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

      // Update project linkage if changed
      if (!COLLABORATIONS_ENABLED && selectedProject !== initialProject) {
        const supabase = getSupabaseClient();
        const { error: unlinkError } = initialProject ? await supabase.from("post_projects").delete().eq("post_id", id).eq('project_id', initialProject) : { error: null };
        if (unlinkError) throw unlinkError;
        setInitialProject('');
        if (selectedProject) {
          const { error: linkError } = await supabase.from("post_projects").insert({ post_id: id, project_id: selectedProject });
          if (linkError) throw linkError;
          setInitialProject(selectedProject);
        }
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

      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>


      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Header */}
        <div className="pt-10 pb-8 flex items-center gap-4">
          <Link
            href={`/post/${id}`}
            className="flex items-center justify-center shrink-0"
            style={{ width: "28px", height: "28px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </Link>
          <div>
            <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, }}>
              editar
            </h1>
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {postType}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Título */}
          <div>
            <label style={labelStyle}>
              Título{isEscrito && <span style={{ color: "var(--magma-muted)" }}> — opcional</span>}
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
              <MentionInput
                rows={3}
                value={description}
                onValueChange={setDescription}
                placeholder="describe el proceso, la intención, el contexto..."
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                className="focus:outline-none"
              />
            </div>
          )}

          {postType === "música" && (
            <div>
              <label style={labelStyle}>
                SoundCloud <span style={{ color: "var(--magma-muted)" }}>— track, playlist o set</span>
              </label>
              <input
                type="url"
                value={soundCloudUrl}
                onChange={(event) => setSoundCloudUrl(event.target.value)}
                placeholder="https://soundcloud.com/artista/track"
                style={inputStyle}
                className="focus:outline-none"
              />
              <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.5, marginTop: "6px" }}>
                Pega el enlace normal de SoundCloud; no el código iframe.
              </p>
            </div>
          )}

          {/* File upload — non-escrito */}
          {supportsCarousel(postType) && <PhotoPicker items={photos} onChange={setPhotos} disabled={saving} />}
          {!isEscrito && !supportsCarousel(postType) && (
            <div>
              <label style={labelStyle}>
                Archivo
                <span style={{ color: "var(--magma-muted)" }}> — opcional, reemplaza el actual</span>
              </label>

              {/* Show current media if no new file selected */}
              {existingMediaUrl && !newFileName && (
                <div style={{ marginBottom: "8px", fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                  archivo actual: <span style={{ color: "var(--magma-muted)" }}>{existingMediaUrl.split("/").pop()}</span>
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
                  border: `1px dashed ${dragOver ? "#E12120" : "#2a2a28"}`,
                  backgroundColor: "#141412",
                }}
              >
                {newFileName ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9.5L7 13.5L15 5.5" stroke="var(--magma-orange)" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>{newFileName}</span>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textDecoration: "underline" }}>cambiar archivo</span>
                  </>
                ) : (
                  <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>
                    arrastra o haz clic para reemplazar
                  </span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept={acceptFile} onChange={handleFileChange} className="hidden" aria-hidden />
            </div>
          )}

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags <span style={{ color: "var(--magma-muted)" }}>separados por coma</span></label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} className="focus:outline-none" />
                </div>
                <div>
                  <label style={labelStyle}>Hora · 24 h</label>
                  <EventTimeInput value={eventTime} onChange={setEventTime} style={inputStyle} />
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
                        color: isFree === val ? "#EF9F27" : "var(--magma-muted)",
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

          {/* Collab toggle */}
          {EVENT_DETAILS_ENABLED && postType === "evento" && <EventDetailsFields value={eventDetails} onChange={setEventDetails} />}
          <button
            type="button"
            onClick={() => setOpenCollab((v) => !v)}
            aria-pressed={openCollab}
            className="flex items-start gap-3 cursor-pointer text-left w-full"
            style={{ background: "none", border: "none", padding: 0 }}
          >
            <div
              style={{
                marginTop: "2px",
                width: "16px",
                height: "16px",
                flexShrink: 0,
                border: "1.5px solid #F2F4F8",
                backgroundColor: openCollab ? "#F2F4F8" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {openCollab && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#090a0d" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: "var(--magma-text-small)", color: openCollab ? "var(--magma-ash)" : "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                abierto a colaboración
              </span>
              <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.5 }}>
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
                border: "1px solid #65616b",
                borderRadius: "8px",
                color: "#F2F4F8",
                fontFamily: mono,
                fontSize: "var(--magma-text-small)",
                outline: "none",
                width: "100%",
                padding: "10px 12px",
                resize: "vertical",
                lineHeight: 1.6,
              }}
              className="focus:outline-none placeholder:text-[#444441]"
            />
          )}

          {/* Comments toggle */}
          <button
            type="button"
            onClick={() => setCommentsEnabled((v) => !v)}
            className="flex items-start gap-3 cursor-pointer text-left w-full"
            style={{ background: "none", border: "none", padding: 0 }}
            aria-pressed={commentsEnabled}
          >
            <div
              style={{
                marginTop: "2px",
                width: "16px",
                height: "16px",
                flexShrink: 0,
                border: "1.5px solid #F2F4F8",
                backgroundColor: commentsEnabled ? "#F2F4F8" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {commentsEnabled && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#090a0d" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: "var(--magma-text-small)", color: commentsEnabled ? "var(--magma-ash)" : "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                permitir comentarios
              </span>
              <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.5 }}>
                {commentsEnabled
                  ? "otras personas pueden responder a esta publicación"
                  : "la conversación queda cerrada; los comentarios existentes seguirán visibles"}
              </span>
            </div>
          </button>

          {/* Sensitive content toggle */}
          <button
            type="button"
            onClick={() => setIsSensitive((value) => !value)}
            className="flex items-start gap-3 cursor-pointer text-left w-full"
            style={{ background: "none", border: "none", padding: 0 }}
            aria-pressed={isSensitive}
          >
            <div
              style={{
                marginTop: "2px",
                width: "16px",
                height: "16px",
                flexShrink: 0,
                border: "1.5px solid #F2F4F8",
                backgroundColor: isSensitive ? "#F2F4F8" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSensitive && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#090a0d" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: "var(--magma-text-small)", color: isSensitive ? "#EF9F27" : "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                contenido sensible
              </span>
              <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.5 }}>
                {isSensitive
                  ? "la publicación quedará oculta hasta que cada persona elija verla"
                  : "actívalo para desnudez, sexualidad, violencia gráfica u otro material que merezca una advertencia"}
              </span>
            </div>
          </button>

          {/* Agregar a proyecto */}
          {COLLABORATIONS_ENABLED && <>
            <PostProjectLinks postId={id} privatePost={Boolean(colectivoId)} />
            {userId && <CollaborationPanel kind="post" targetId={id} ownerId={userId} userId={userId} />}
          </>}
          {!COLLABORATIONS_ENABLED && userProjects.length > 0 && (
            <div>
              <label style={labelStyle}>
                Agregar a proyecto <span style={{ color: "var(--magma-muted)" }}>— opcional</span>
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235F5E5A' strokeWidth='1.2' fill='none' strokeLinecap='square'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: "32px",
                  cursor: "pointer",
                  color: selectedProject ? "#F2F4F8" : "var(--magma-muted)",
                }}
                className="focus:outline-none"
              >
                <option value="">ninguno</option>
                {userProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

          {error && (
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono }}>{error}</p>
          )}

          <div className="flex items-center gap-4">
            <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String(isEscrito ? "#7F77DD" : "#E12120"))}
              type="submit"
              disabled={saving}
              className="py-3 text-sm tracking-widest uppercase cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{
                backgroundColor: isEscrito ? "#7F77DD" : "#E12120",
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
              style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textDecoration: "none" }}
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
