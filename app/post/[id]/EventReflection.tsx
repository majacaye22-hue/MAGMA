"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

type Note = { body: string; is_public: boolean } | null;

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

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = getSupabaseClient();
    async function load() {
      const [{ data: attendance }, { data: savedNote }] = await Promise.all([
        supabase.from("event_attendances").select("event_id").eq("event_id", eventId).eq("user_id", currentUserId).maybeSingle(),
        supabase.from("event_notes").select("body, is_public").eq("event_id", eventId).eq("user_id", currentUserId).maybeSingle(),
      ]);
      setAttended(Boolean(attendance));
      if (savedNote) {
        setNote(savedNote);
        setBody(savedNote.body);
        setIsPublic(savedNote.is_public);
      }
      setLoading(false);
    }
    void load();
  }, [currentUserId, eventId]);

  async function markAttendance() {
    if (!currentUserId || saving) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await getSupabaseClient().from("event_attendances").insert({ event_id: eventId, user_id: currentUserId });
    if (insertError && insertError.code !== "23505") setError(insertError.message);
    else setAttended(true);
    setSaving(false);
  }

  async function saveNote() {
    if (!currentUserId || !body.trim() || saving) return;
    setSaving(true);
    setError(null);
    const { data, error: upsertError } = await getSupabaseClient()
      .from("event_notes")
      .upsert({ event_id: eventId, user_id: currentUserId, body: body.trim(), is_public: isPublic }, { onConflict: "event_id,user_id" })
      .select("body, is_public")
      .single();
    if (upsertError) setError(upsertError.message);
    else setNote(data);
    setSaving(false);
  }

  if (!currentUserId) {
    return (
      <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", margin: "0 0 24px" }}>
        entra a magma para guardar este encuentro en tu casa cuando termine.
      </p>
    );
  }

  return (
    <section style={{ background: "#111512", border: "0.5px solid #24443a", margin: "4px 0 24px", padding: "16px" }}>
      <p style={{ color: "#5DCAA5", fontFamily: mono, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" }}>notas de la sala</p>
      {!loading && !attended ? (
        <>
          <p style={{ color: "#888780", fontFamily: mono, fontSize: "11px", lineHeight: 1.55, margin: "8px 0 13px" }}>¿estuviste aquí? guárdalo en tu casa y deja una nota para volver a esta noche.</p>
          <button onClick={markAttendance} disabled={saving} style={{ background: "#5DCAA5", border: "none", color: "#0c0c0b", cursor: "pointer", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", padding: "9px 12px", textTransform: "uppercase" }}>
            {saving ? "guardando..." : "estuve aquí"}
          </button>
        </>
      ) : loading ? (
        <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", marginTop: "8px" }}>abriendo tu cuaderno...</p>
      ) : (
        <>
          <p style={{ color: "#888780", fontFamily: mono, fontSize: "11px", lineHeight: 1.55, margin: "8px 0 12px" }}>este encuentro ya vive en tu casa. ¿qué se te quedó de esa noche?</p>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="una imagen, alguien que conociste, una canción..." style={{ background: "#0c0c0b", border: "0.5px solid #2a2a28", color: "#e8e4dc", fontFamily: mono, fontSize: "11px", lineHeight: 1.55, outline: "none", padding: "10px", resize: "vertical", width: "100%" }} />
          <label className="flex items-center gap-2" style={{ color: "#888780", cursor: "pointer", fontFamily: mono, fontSize: "10px", marginTop: "10px" }}>
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            compartir con la casa
          </label>
          <div className="flex items-center gap-3" style={{ marginTop: "12px" }}>
            <button onClick={saveNote} disabled={!body.trim() || saving} style={{ background: "transparent", border: "0.5px solid #5DCAA5", color: "#5DCAA5", cursor: "pointer", fontFamily: mono, fontSize: "10px", letterSpacing: "0.1em", padding: "8px 11px", textTransform: "uppercase" }}>
              {saving ? "guardando..." : note ? "actualizar nota" : "guardar nota"}
            </button>
            <span style={{ color: isPublic ? "#5DCAA5" : "#5F5E5A", fontFamily: mono, fontSize: "9px" }}>{isPublic ? "visible para la casa" : "solo para ti"}</span>
          </div>
        </>
      )}
      {error && <p style={{ color: "#D85A30", fontFamily: mono, fontSize: "10px", marginTop: "10px" }}>{error}</p>}
    </section>
  );
}
