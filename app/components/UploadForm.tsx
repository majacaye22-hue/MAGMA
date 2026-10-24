"use client";

import { PhotoPicker } from "@/app/components/PhotoPicker";
import { EventDetailsFields } from "@/app/components/EventDetailsFields";
import { EVENT_DETAILS_ENABLED, emptyEventDetails, eventDetailsPayload, eventTimestamp } from "@/lib/event-details";
import { MentionInput } from "@/app/components/MentionInput";
import { CollaboratorPicker } from "@/app/components/CollaboratorPicker";
import { UploadDraftControls } from "@/app/components/UploadDraftControls";
import { FeedMenuIcon, type IconName } from "@/app/components/FeedMenuIcon";
import { draftOperation, uploadDraftKey, type UploadDraft } from "@/lib/upload-drafts";
import { supportsCarousel, uploadPhotos } from "@/lib/post-images";
import { EventTimeInput } from "@/app/components/EventTimeInput";
import { QUESTIONS_ENABLED } from '@/lib/community-questions';

import { useState, useRef, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { sanitizeHtml } from "@/lib/sanitize";
import { normalizeSoundCloudUrl } from "@/lib/soundcloud";
import { COLLABORATIONS_ENABLED, inviteUsernames } from '@/lib/collaborations';

const RichEditor = dynamic(
  () => import("@/app/components/editor/RichEditor").then((m) => m.RichEditor),
  { ssr: false, loading: () => <div style={{ minHeight: "320px", backgroundColor: "var(--notebook-paper)", border: "0.5px solid #2a2a28" }} /> }
);

const isDev = process.env.NODE_ENV !== 'production';

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkType = "arte" | "música" | "fotografía" | "evento" | "escrito" | "video";

const FORMAT_ICONS: Record<WorkType, IconName> = {
  arte: "arte",
  música: "música",
  fotografía: "fotografía",
  video: "video",
  evento: "evento",
  escrito: "letras",
};

interface TypeOption {
  id: WorkType;
  label: string;
  description: string;
  accent: string;
  accept: string | null;
}

const TYPE_OPTIONS: TypeOption[] = [
  { id: "arte",       label: "Arte visual",  description: "Pintura, grabado, escultura, técnica mixta",  accent: "#E83B20", accept: "image/*" },
  { id: "música",     label: "Música",       description: "Track, EP, álbum, composición, sesión",       accent: "#FF641F", accept: "audio/*" },
  { id: "fotografía", label: "Fotografía",   description: "Análogo, digital, documental, retrato",       accent: "#4675D1", accept: "image/*" },
  { id: "video",      label: "Video",        description: "Obra audiovisual, performance, documental",   accent: "#FFB21C", accept: "video/*" },
  { id: "evento",     label: "Evento",       description: "Exposición, concierto, taller, performance",  accent: "#FF641F", accept: "image/*" },
  { id: "escrito",    label: "Letra",        description: "poema, ensayo, manifiesto, pensamiento",      accent: "#D7D4CD", accept: null },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  borderBottom: "1px solid #a6afb0",
  borderRadius: "0",
  color: "var(--notebook-ink)",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "var(--magma-text-body)",
  outline: "none",
  width: "100%",
  padding: "12px 0",
};

const labelStyle: React.CSSProperties = {
  color: "var(--notebook-ink)",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "var(--magma-text-small)",
  letterSpacing: "0.02em",
  display: "block",
  marginBottom: "6px",
};

// ─── TypeCard ────────────────────────────────────────────────────────────────

function TypeCard({ opt, isSelected, onClick }: { opt: TypeOption; isSelected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={isSelected}
      className="notebook-format" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span style={{ display: "flex", justifyContent: "center", width: 20, height: 20 }}><FeedMenuIcon name={FORMAT_ICONS[opt.id]} /></span>
      <span>{opt.label}</span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type UploadFormProps = { onPublished?: () => void; onLeave?: () => void; onDraftState?: (dirty: boolean, busy: boolean) => void };
export default function UploadPage(props: UploadFormProps) {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }} />}>
      <UploadPageInner {...props} />
    </Suspense>
  );
}

function UploadPageInner({ onPublished, onLeave, onDraftState }: UploadFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<WorkType | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [photos, setPhotos] = useState<(File | string)[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [soundCloudUrl, setSoundCloudUrl] = useState("");
  const [richContent, setRichContent] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [openCollab, setOpenCollab] = useState(false);
  const [collabDescription, setCollabDescription] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isSensitive, setIsSensitive] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState<string | null>(null);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<{ id: string; title: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [collaboratorUsernames, setCollaboratorUsernames] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Event-specific fields
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [eventDetails, setEventDetails] = useState(emptyEventDetails);
  const [savingDraft, setSavingDraft] = useState(false);
  const draftActive = useRef(false);
  const [draftRevision, setDraftRevision] = useState(0);
  const draftContext = JSON.stringify([searchParams.get("type"), searchParams.get("proyecto"), searchParams.get("colectivo")]);
  const draftKey = userId ? uploadDraftKey(userId, draftContext) : null;
  const draftValue: UploadDraft = { selectedType, title, description, richContent, soundCloudUrl, tags, location, selectedProject, collaboratorUsernames, openCollab, collabDescription, commentsEnabled, isSensitive, eventDate, eventTime, venue, address, isFree, price, eventDetails, file, coverFile, photos };
  function restoreDraft(draft: UploadDraft) {
    draftActive.current = true;
    setDraftRevision(value => value + 1);
    setSelectedType(draft.selectedType); setTitle(draft.title); setDescription(draft.description);
    setCollaboratorUsernames(draft.collaboratorUsernames ?? '');
    setRichContent(draft.richContent); setSoundCloudUrl(draft.soundCloudUrl); setTags(draft.tags); setLocation(draft.location);
    setSelectedProject(draft.selectedProject); setOpenCollab(draft.openCollab); setCollabDescription(draft.collabDescription);
    setCommentsEnabled(draft.commentsEnabled); setIsSensitive(draft.isSensitive);
    setEventDate(draft.eventDate); setEventTime(draft.eventTime); setVenue(draft.venue); setAddress(draft.address);
    setEventDetails(draft.eventDetails ?? emptyEventDetails);
    setIsFree(draft.isFree); setPrice(draft.price); setFile(draft.file); setFileName(draft.file?.name ?? null);
    setCoverFile(draft.coverFile); setCoverFileName(draft.coverFile?.name ?? null); setPhotos(draft.photos);
  }

  useEffect(() => {
    onDraftState?.(Boolean(selectedType || title || description || file || coverFile || photos.length || richContent || soundCloudUrl || tags || location || eventDate || venue || address || selectedProject || collaboratorUsernames || isSensitive || openCollab), submitting || savingDraft);
  }, [onDraftState, selectedType, title, description, file, coverFile, photos, richContent, soundCloudUrl, tags, location, eventDate, venue, address, selectedProject, collaboratorUsernames, isSensitive, openCollab, submitting, savingDraft]);

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      const uid = user?.id ?? null;
      setUserId(uid);
      if (uid) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (COLLABORATIONS_ENABLED ? getSupabaseClient().rpc('contributable_projects') : (getSupabaseClient() as any)
          .from("projects")
          .select("id, title")
          .eq("author_id", uid)
          .order("created_at", { ascending: false }))
          .then(({ data, error: projectsError }: { data: { id: string; title: string }[] | null; error: unknown }) => {
            if (isDev) console.log("userProjects:", data, "error:", projectsError)
            setUserProjects(data ?? []);
            if (projectsError) setError('no se pudieron cargar los proyectos; recarga antes de elegir uno.');
          });
      }
    });
  }, []);

  // Pre-select project from ?proyecto= query param
  useEffect(() => {
    const proyectoId = searchParams.get("proyecto");
    if (proyectoId) setSelectedProject(proyectoId);
  }, [searchParams]);

  useEffect(() => {
    const type = searchParams.get("type") as WorkType | null;
    if (type && TYPE_OPTIONS.some((o) => o.id === type)) {
      setSelectedType(type);
    }
  }, [searchParams]);

  const activeOption = TYPE_OPTIONS.find((t) => t.id === selectedType);
  const selectedProjectTitle = userProjects.find((project) => project.id === selectedProject)?.title ?? null;
  const isProjectEntry = Boolean(selectedProject);
  const isEscrito = selectedType === "escrito";
  const isVideo = selectedType === "video";

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

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    if (savingDraft) { e.preventDefault(); return; }
    e.preventDefault()
    if (submitting || publishedId) return
    setSubmitting(true)
    setError(null)

    try {
      if (selectedType === "evento") {
        const start = eventTimestamp(eventDate, eventTime);
        if (EVENT_DETAILS_ENABLED) eventDetailsPayload(eventDetails, start);
      }
      const supabase = getSupabaseClient()

      if (!userId) {
        setError('debes iniciar sesión')
        return
      }

      const normalizedSoundCloudUrl = selectedType === "música" && soundCloudUrl.trim()
        ? normalizeSoundCloudUrl(soundCloudUrl)
        : null
      if (selectedType === "música" && soundCloudUrl.trim() && !normalizedSoundCloudUrl) {
        setError('pega un enlace válido de SoundCloud que comience con https://')
        return
      }

      const colectivoSlug = searchParams.get('colectivo');
      const invitees = COLLABORATIONS_ENABLED ? inviteUsernames(collaboratorUsernames) : [];
      if (colectivoSlug && selectedProject) throw new Error('una publicación privada no puede añadirse a un proyecto. elige «ninguno» para continuar.');
      let colectivoId: string | null = null;
      if (colectivoSlug) {
        const { data: group, error } = await supabase.from('colectivos').select('id').eq('slug', colectivoSlug).single();
        if (error || !group) throw new Error('no se pudo abrir el colectivo');
        const { data: member, error: memberError } = await supabase.rpc('is_colectivo_member', { cid: group.id });
        if (memberError || member !== true) throw new Error('necesitas ser miembro del colectivo');
        colectivoId = group.id;
      }
      const imageUrls = supportsCarousel(selectedType) && photos.length ? await uploadPhotos(photos, colectivoId) : null;
      let mediaUrl: string | null = imageUrls?.[0] ?? null
      let coverUrl = null

      if (file && !supportsCarousel(selectedType)) {
        if (isDev) console.log('[upload] uploading file:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)} MB`)
        const formData = new FormData()
        formData.append('file', file)
        if (colectivoId) formData.append('colectivo_id', colectivoId)
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        if (isDev) console.log('[upload] file upload response status:', response.status)
        const json = await response.json()
        if (isDev) console.log('[upload] file upload response body:', json)
        if (!response.ok || json.error) throw new Error(json.error ?? `HTTP ${response.status}`)
        mediaUrl = json.url
      }

      if (coverFile) {
        if (isDev) console.log('[upload] uploading cover:', coverFile.name, `${(coverFile.size / 1024 / 1024).toFixed(2)} MB`)
        const formData = new FormData()
        formData.append('file', coverFile)
        if (colectivoId) formData.append('colectivo_id', colectivoId)
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        if (isDev) console.log('[upload] cover upload response status:', response.status)
        const json = await response.json()
        if (isDev) console.log('[upload] cover upload response body:', json)
        if (!response.ok || json.error) throw new Error(json.error ?? `HTTP ${response.status}`)
        coverUrl = json.url
      }

      if (isDev) console.log('[upload] starting insert with userId:', userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from('posts')
        .insert({
          ...(colectivoId ? { audience_colectivo_id: colectivoId } : {}),
          title: title || null,
          body: isEscrito ? null : (description || null),
          content: isEscrito ? sanitizeHtml(richContent) : null,
          type: selectedType,
          media_url: mediaUrl,
          ...(imageUrls ? { image_urls: imageUrls, media_type: typeof photos[0] === "string" ? null : photos[0]?.type } : {}),
          soundcloud_url: normalizedSoundCloudUrl,
          cover_url: coverUrl,
          open_collab: openCollab,
          collab_description: openCollab && collabDescription.trim() ? collabDescription.trim() : null,
          comments_enabled: commentsEnabled,
          is_sensitive: isSensitive,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          author_id: userId,
          event_date: selectedType === "evento" ? eventTimestamp(eventDate, eventTime) : null,
          ...(EVENT_DETAILS_ENABLED && selectedType === "evento" ? eventDetailsPayload(eventDetails, eventTimestamp(eventDate, eventTime)) : {}),
          venue: venue || null,
          address: address || null,
          is_free: isFree,
          price: !isFree && price ? price : null,
        })
        .select()

      if (isDev) console.log('[upload] insert result:', { data, error: insertError })
      if (insertError) throw insertError
      const postId = data?.[0]?.id;
      if (!postId) throw new Error('no se recibió confirmación; revisa tu perfil antes de reintentar');
      setPublishedId(postId);
      if (draftKey && draftActive.current) {
        try { await draftOperation(draftKey, "delete"); }
        catch { window.alert("tu publicación se guardó, pero no se pudo eliminar el borrador local. descártalo antes de volver a publicar."); }
      }
      const attachmentErrors: string[] = [];
      for (const username of invitees) {
        const { error: inviteError } = await supabase.rpc('change_collaboration', { kind: 'post', target_id: postId, action: 'invite', username_input: username });
        if (inviteError) attachmentErrors.push(`invitación a @${username}`);
      }

      // Colectivo-only posts are linked atomically by the database trigger.

      // If a project was selected, link the post to it
      if (isDev) console.log("About to insert post_projects - selectedProject:", selectedProject, "post id:", data?.[0]?.id)
      if (selectedProject && data?.[0]?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: ppError } = await (supabase as any).from('post_projects').insert({ project_id: selectedProject, post_id: data[0].id })
        if (isDev) console.log('[upload] post_projects insert error:', ppError)
        if (ppError) attachmentErrors.push('proyecto');
      }
      if (attachmentErrors.length) {
        setError(`tu publicación está guardada, pero no se pudo añadir a: ${attachmentErrors.join(', ')}. no vuelvas a publicarla.`);
        return;
      }

      if (isDev) console.log('[upload] success, redirecting to post')
      onPublished?.();
      router.push(`/post/${data?.[0]?.id}`)

    } catch (err: unknown) {
      // PostgREST returns plain objects, not necessarily Error instances.
      const message = err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message : 'error al publicar; revisa tu conexión e intenta de nuevo'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen magma-notebook"
      style={{
        background: "#08090a",
      }}
    >


      <main className="notebook-page max-w-3xl mx-auto pb-16" style={{ background: "#08090a", border: 0, boxShadow: "none", paddingLeft: 24, paddingRight: 24 }}>
        {/* Header */}
        <div className="grid gap-2 py-5 md:py-6" style={{ borderColor: "var(--magma-border)" }}>
          <div className="flex items-start gap-4">
            <Link
              href={isProjectEntry ? `/proyecto/${selectedProject}` : "/"}
              className="mt-1 flex items-center justify-center shrink-0"
              style={{ width: "34px", height: "34px", border: "0.5px solid var(--magma-border)", borderRadius: "50%", color: "var(--notebook-muted)" }}
              aria-label={isProjectEntry ? "Volver al proyecto" : "Volver al inicio"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
              </svg>
            </Link>
            <div>

              <h1 className="magma-page-title" style={{ color: "var(--notebook-ink)", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, letterSpacing: "-0.055em", }}>
                {isProjectEntry ? "nueva entrada" : "¿qué traes?"}
              </h1>
            </div>
          </div>
          {searchParams.get("colectivo") && <p className="text-sm text-white">una publicación para miembros de este colectivo.</p>}
        </div>

        {isProjectEntry && (
          <div className="mb-8" style={{ borderLeft: "2px solid #E12120", padding: "12px 14px" }}>
            <p style={{ color: "var(--notebook-ink)", fontFamily: "var(--font-space-mono), monospace", fontSize: "var(--magma-text-small)", letterSpacing: "0.14em", marginBottom: "5px", textTransform: "uppercase" }}>entrada para el proyecto</p>
            <p style={{ color: "var(--notebook-ink)", fontFamily: "var(--font-syne), sans-serif", fontSize: "18px", fontWeight: 700 }}>{selectedProjectTitle ?? "cargando cuaderno..."}</p>
          </div>
        )}

        {/* Type selector */}
        <section className="pb-5">
          <div className={`grid w-full grid-cols-3 gap-x-2 gap-y-2 ${QUESTIONS_ENABLED && !searchParams.get('colectivo') && !isProjectEntry ? 'sm:grid-cols-7' : 'sm:grid-cols-6'}`} role="group" aria-label="formato de la obra">
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.id;
              return (
                <TypeCard
                  key={opt.id}
                  opt={opt}
                  isSelected={isSelected}
                  onClick={() => setSelectedType(opt.id)}
                />
              );
            })}
            {QUESTIONS_ENABLED && !searchParams.get('colectivo') && !isProjectEntry && <Link href="/preguntar" onClick={event => {
              if (submitting || savingDraft || (Boolean(selectedType || title || description || file || coverFile || photos.length || richContent || soundCloudUrl || tags) && !window.confirm('¿abrir preguntas? los cambios no guardados de esta obra se perderán.'))){event.preventDefault();return;}
              onLeave?.();
            }} className="notebook-format inline-flex flex-col items-center gap-1.5"><span aria-hidden="true" className="text-xl leading-[22px]">?</span><span>pregunta</span></Link>}
          </div>
        </section>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
          data-upload-form

        >
          {/* File upload */}
          {supportsCarousel(selectedType) && <PhotoPicker items={photos} onChange={setPhotos} disabled={submitting} notebook />}
          {!isEscrito && !supportsCarousel(selectedType) && (
            <div>
              <label style={labelStyle}>
                suelta aquí tu obra
                {selectedType && (
                  <span style={{ color: "var(--notebook-muted)" }}>
                    {" "}—{" "}
                    {activeOption?.accept === "audio/*" ? "audio (mp3, wav, flac)" : isVideo ? "video (mp4, mov, webm)" : "imagen (jpg, png, gif, webp)"}
                  </span>
                )}
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-150"
                style={{
                  minHeight: "112px",
                  border: `1px dashed ${dragOver ? (activeOption?.accent ?? "#E12120") : "#494743"}`,
                  backgroundColor: dragOver ? "rgba(255,100,31,0.08)" : "rgba(255,255,255,0.035)",
                  borderRadius: "14px",
                }}
              >
                {fileName ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9.5L7 13.5L15 5.5" stroke="var(--magma-orange)" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace" }}>{fileName}</span>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace", textDecoration: "underline" }}>cambiar archivo</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                      <path d="M3 14V16.5H17V14" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace" }}>
                      + elegir archivo
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={isVideo ? "video/mp4,video/quicktime,video/webm" : (activeOption?.accept ?? "image/*,audio/*")}
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
                Imagen de portada <span style={{ color: "var(--notebook-muted)" }}>— opcional</span>
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => coverInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); coverInputRef.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
                onDragLeave={() => setCoverDragOver(false)}
                onDrop={handleCoverDrop}
                className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-150"
                style={{
                  minHeight: "100px",
                  border: `1px dashed ${coverDragOver ? "var(--magma-orange)" : "#a6afb0"}`,
                  backgroundColor: coverDragOver ? "rgba(255,100,31,0.08)" : "transparent",
                  borderRadius: "10px",
                }}
              >
                {coverFileName ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9.5L7 13.5L15 5.5" stroke="var(--magma-orange)" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace" }}>{coverFileName}</span>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace", textDecoration: "underline" }}>cambiar portada</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                      <path d="M3 14V16.5H17V14" stroke="#444441" strokeWidth="1.2" strokeLinecap="square" />
                    </svg>
                    <span style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace" }}>
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

          {/* Título */}
          <div>
            <label htmlFor="work-title" style={labelStyle}>
              dale un nombre{isEscrito && <span style={{ color: "var(--notebook-muted)" }}> — opcional</span>}
            </label>
            <input
              id="work-title"
              type="text"
              placeholder={isEscrito ? "sin título" : isProjectEntry ? "nombre de esta entrada" : "nombre de la obra"}
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
              <label style={labelStyle}>tu página</label>
              <RichEditor key={draftRevision} value={richContent} onChange={setRichContent} minHeight={360} />
            </div>
          )}

          {/* Descripción */}
          {!isEscrito && (
            <div>
              <label htmlFor="work-description" style={labelStyle}>lo que quieras contar <span className="notebook-note">— opcional</span></label>
              <MentionInput
                id="work-description"
                rows={3}
                blinkingPlaceholder
                value={description}
                onValueChange={setDescription}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                className="focus:outline-none"
              />
            </div>
          )}

          {selectedType === "música" && (
            <div>
              <label style={labelStyle}>
                SoundCloud <span style={{ color: "var(--notebook-muted)" }}>— track, playlist o set</span>
              </label>
              <input
                type="url"
                value={soundCloudUrl}
                onChange={(event) => setSoundCloudUrl(event.target.value)}
                placeholder="https://soundcloud.com/artista/track"
                style={inputStyle}
                className="focus:outline-none"
              />
              <p style={{ color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace", fontSize: "var(--magma-text-small)", lineHeight: 1.5, marginTop: "6px" }}>
                un enlace a tu track, playlist o set.
              </p>
            </div>
          )}

          {/* Evento fields */}
          {selectedType === "evento" && (
            <div style={{ paddingTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <p style={{ ...labelStyle, marginBottom: 0, color: "#EF9F27" }}>detalles del evento</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Fecha del evento</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} className="focus:outline-none" />
                </div>
                <div>
                  <label style={labelStyle}>Hora · 24 h</label>
                  <EventTimeInput value={eventTime} onChange={setEventTime} style={inputStyle} />
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
                        backgroundColor: isFree === val ? "#EF9F270d" : "var(--notebook-paper)",
                        color: isFree === val ? "#EF9F27" : "var(--notebook-muted)",
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

          <div>
            <div className="flex flex-col gap-6 pt-6">
          {EVENT_DETAILS_ENABLED && selectedType === "evento" && <EventDetailsFields value={eventDetails} onChange={setEventDetails} />}
          {/* Tags */}
          <div>
            <label style={labelStyle}>palabras clave <span style={{ color: "var(--notebook-muted)" }}>separados por coma</span></label>
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
              <label style={labelStyle}>colonia — opcional</label>
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

          {/* Collab toggle */}
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
                border: "1.5px solid var(--notebook-ink)",
                backgroundColor: openCollab ? "var(--notebook-ink)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {openCollab && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="var(--notebook-paper)" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: "var(--magma-text-small)", color: openCollab ? "var(--notebook-ink)" : "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                abierto a colaboración
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
                backgroundColor: "var(--notebook-paper)",
                border: "1px solid #b4b6b5",
                borderRadius: "8px",
                color: "var(--notebook-ink)",
                fontFamily: "var(--font-space-mono), monospace",
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
                border: "1.5px solid var(--notebook-ink)",
                backgroundColor: commentsEnabled ? "var(--notebook-ink)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {commentsEnabled && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="var(--notebook-paper)" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: "var(--magma-text-small)", color: commentsEnabled ? "var(--notebook-ink)" : "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                permitir comentarios
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
                border: "1.5px solid var(--notebook-ink)",
                backgroundColor: isSensitive ? "var(--notebook-ink)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSensitive && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="var(--notebook-paper)" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: "var(--magma-text-small)", color: isSensitive ? "#EF9F27" : "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                contenido sensible
              </span>
              <span style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-muted)", fontFamily: "var(--font-space-mono), monospace", lineHeight: 1.5 }}>
                desnudez, sexualidad o violencia gráfica
              </span>
            </div>
          </button>



          {/* Agregar a proyecto */}
          {COLLABORATIONS_ENABLED && <details>
            <summary className="cursor-pointer py-2">añadir colaboradores</summary>
            <label className="sr-only" htmlFor="post-collaborators">buscar colaboradores</label>
            <CollaboratorPicker id="post-collaborators" inputStyle={inputStyle} value={collaboratorUsernames} onChange={setCollaboratorUsernames} userId={userId} />
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer py-2">cómo funciona</summary>
              <p>Compartirán crédito al aceptar, sin permisos de edición ni acceso al proyecto. Las invitaciones se envían al publicar y aparecen cuando la obra esté aprobada. En un colectivo privado, solo puedes invitar a sus miembros.</p>
            </details>
          </details>}
          {(userProjects.length > 0 || Boolean(selectedProject)) && (
            <div>
              <label style={labelStyle}>{isProjectEntry ? "cuaderno del proyecto" : "guardar en un proyecto"} <span style={{ color: "var(--notebook-muted)" }}>{isProjectEntry ? "" : "— opcional"}</span></label>
              <select
                value={selectedProject}
                onChange={(e) => { if (isDev) console.log("selectedProject changed to:", e.target.value); setSelectedProject(e.target.value); }}
                style={{
                  ...inputStyle,
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235F5E5A' strokeWidth='1.2' fill='none' strokeLinecap='square'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: "32px",
                  cursor: "pointer",
                  color: selectedProject ? "var(--notebook-ink)" : "var(--notebook-muted)",
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

            </div>
          </div>

          {error && (
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--notebook-ink)", fontFamily: "var(--font-space-mono), monospace" }}>
              {error}
            </p>
          )}

          {publishedId && <Link href={`/post/${publishedId}`} className="underline">ver publicación guardada →</Link>}
          <div className="sticky bottom-0 z-40 flex flex-wrap items-center justify-between gap-3 bg-[#08090a] py-3">
          {draftKey && <UploadDraftControls key={draftKey} storageKey={draftKey} value={draftValue} resume={searchParams.get("draft") === "resume"} disabled={submitting || Boolean(publishedId)} onRestore={restoreDraft} onBusy={setSavingDraft} onSaved={() => { draftActive.current = true; }} />}
          <button
            type="submit"
            disabled={savingDraft || submitting || !!publishedId || !isSubmittable()}
            className="magma-soft-action self-start text-sm"
            style={{
              color: "#fff",
              fontFamily: "var(--font-space-mono), monospace",
              marginTop: "4px",
            }}
          >
            {submitting ? "publicando..." : <>publicar <span aria-hidden="true">→</span></>}
          </button>
          </div>
        </form>
      </main>
    </div>
  );
}
