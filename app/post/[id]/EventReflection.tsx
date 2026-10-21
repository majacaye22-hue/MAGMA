"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

type Note = { id: string; body: string; is_public: boolean; image_path?: string | null } | null;

export function EventReflection({ eventId, currentUserId }: {
  eventId: string;
  currentUserId: string | null;
}) {
  const [attended, setAttended] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(Boolean(currentUserId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = getSupabaseClient();
    async function load() {
      const [{ data: attendance, error: attendanceError }, { data: savedNote, error: noteError }] = await Promise.all([
        supabase.from("event_attendances").select("event_id").eq("event_id", eventId).eq("user_id", currentUserId).maybeSingle(),
        supabase.from("event_notes").select("*").eq("event_id", eventId).eq("user_id", currentUserId).maybeSingle(),
      ]);
      if (attendanceError || noteError) { setLoadFailed(true); setError('no se pudo cargar tu nota; recarga antes de editarla.'); setLoading(false); return; }
      setAttended(Boolean(attendance));
      if (savedNote) {
        setNote(savedNote);
        setBody(savedNote.body);
        setIsPublic(savedNote.is_public);
      }
      setLoading(false);
    }
    void load().catch(() => { setLoadFailed(true); setLoading(false); setError('no se pudo cargar tu nota; recarga para reintentar.'); });
  }, [currentUserId, eventId]);

  async function markAttendance() {
    if (!currentUserId || saving) return;
    setSaving(true);
    setError(null);
    try {
    const { error: insertError } = await getSupabaseClient().from("event_attendances").insert({ event_id: eventId, user_id: currentUserId });
    if (insertError && insertError.code !== "23505") setError(insertError.message);
    else setAttended(true);
    } catch { setError('no se pudo guardar tu asistencia; intenta de nuevo.'); }
    finally { setSaving(false); }
  }

  async function saveNote() {
    if (!currentUserId || !body.trim() || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const db = getSupabaseClient();
    let newPath: string | null = null;
    let committed = false;
    try {
    if (photo) {
      const ext = photo.type === 'image/jpeg' ? 'jpg' : photo.type === 'image/png' ? 'png' : 'webp';
      newPath = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await db.storage.from('event-notes').upload(newPath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw new Error('no se pudo subir la foto; verifica la conexión y que el almacenamiento de notas esté configurado.');
    }
    const imagePath = newPath ?? (removePhoto ? null : note?.image_path ?? null);
    const { data, error: upsertError } = await db
      .from("event_notes")
      .upsert({ event_id: eventId, user_id: currentUserId, body: body.trim(), is_public: isPublic, image_path: imagePath, updated_at: new Date().toISOString() }, { onConflict: "event_id,user_id" })
      .select("*")
      .single();
    if (upsertError) throw new Error('no se pudo guardar la nota; tu texto y foto siguen aquí para reintentar.');
    committed = true;
    const previousPath = note?.image_path;
    setNote(data); setPhoto(null); setPreview(null); setRemovePhoto(false); setSaved(true);
    if (previousPath && previousPath !== imagePath) await db.storage.from('event-notes').remove([previousPath]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'no se pudo guardar la nota; intenta de nuevo.');
      if (newPath && !committed) await db.storage.from('event-notes').remove([newPath]).catch(() => {});
    } finally { setSaving(false); }
  }

  if (!currentUserId) {
    return (
      <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", margin: "0 0 24px" }}>
        entra a magma para guardar una reflexión de este encuentro en tu perfil.
      </p>
    );
  }

  return (
    <section style={{ background: "#111512", border: "0.5px solid #24443a", margin: "4px 0 24px", padding: "16px" }}>
      <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.14em", textTransform: "uppercase" }}>notas de la sala</p>
      {loadFailed ? null : !loading && !attended ? (
        <>
          <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.55, margin: "8px 0 13px" }}>¿estuviste aquí? deja una reflexión para tu perfil y vuelve a este encuentro cuando quieras.</p>
          <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-orange)"))} onClick={markAttendance} disabled={saving} style={{ background: "var(--magma-orange)", border: "none", color: "var(--magma-obsidian)", cursor: "pointer", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.1em", padding: "9px 12px", textTransform: "uppercase" }}>
            {saving ? "guardando..." : "estuve aquí"}
          </button>
        </>
      ) : loading ? (
        <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", marginTop: "8px" }}>abriendo tu cuaderno...</p>
      ) : (
        <>
          <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.55, margin: "8px 0 12px" }}>¿qué te llevas de este encuentro? guarda una nota en tu perfil, solo para ti o para compartir.</p>
          <textarea aria-label="tu reflexión del encuentro" disabled={saving} value={body} onChange={(event) => { setBody(event.target.value); setSaved(false); }} rows={4} placeholder="algo que aprendiste, alguien que conociste, una canción..." style={{ background: "#0c0c0b", border: "0.5px solid #2a2a28", color: "#F2F4F8", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.55, padding: "10px", resize: "vertical", width: "100%" }} />
          <label className="block mt-3 text-sm">añadir foto <span>(jpg, png o webp · máx. 8 MB)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} className="block w-full mt-2 file:font-bold" onChange={(event) => {
              const file = event.target.files?.[0]; event.target.value = '';
              if (!file) return;
              if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { setError('elige una imagen jpg, png o webp de hasta 8 MB.'); return; }
              setPhoto(file); setRemovePhoto(false); setSaved(false); setError(null);
            }} />
          </label>
          {!removePhoto && (preview || note?.image_path) && <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview || `/api/event-note-image?id=${note?.id}`} alt="foto adjunta al encuentro" className="w-full max-h-64 object-contain" />
            <button type="button" disabled={saving} className="underline text-sm mt-2" onClick={() => { setPhoto(null); setPreview(null); setRemovePhoto(true); setSaved(false); }}>quitar foto</button>
          </div>}
          <label className="flex items-center gap-2" style={{ color: "var(--magma-muted)", cursor: "pointer", fontFamily: mono, fontSize: "var(--magma-text-small)", marginTop: "10px" }}>
            <input type="checkbox" disabled={saving} style={{ accentColor: '#fff', colorScheme: 'light' }} checked={isPublic} onChange={(event) => { setIsPublic(event.target.checked); setSaved(false); }} />
            hacer pública esta nota
          </label>
          <div className="flex items-center gap-3" style={{ marginTop: "12px" }}>
            <button onClick={saveNote} disabled={!body.trim() || saving} style={{ background: "transparent", border: "0.5px solid var(--magma-orange)", color: "var(--magma-ash)", cursor: "pointer", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.1em", padding: "8px 11px", textTransform: "uppercase" }}>
              {saving ? "guardando..." : note ? "actualizar nota" : "guardar nota"}
            </button>
            <span style={{ color: isPublic ? "var(--magma-ash)" : "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)" }}>{isPublic ? "visible para miembros de magma" : "solo para ti"}</span>
          </div>
          <div role="status" aria-live="polite" aria-atomic="true">
            {saved && (
              <div className="mt-4 border border-white/25 p-3 text-sm">
                <p className="font-bold">✓ nota guardada</p>
                <p className="mt-1">puedes verla en tu perfil · agenda · lo que me llevo.</p>
              </div>
            )}
          </div>
        </>
      )}
      {error && <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", marginTop: "10px" }}>{error}</p>}
    </section>
  );
}
