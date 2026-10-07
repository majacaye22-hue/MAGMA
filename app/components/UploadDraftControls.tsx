"use client";

import { useEffect, useRef, useState } from "react";
import { draftOperation, type SavedUploadDraft, type UploadDraft } from "@/lib/upload-drafts";

export function UploadDraftControls({ storageKey, value, disabled, resume = false, onRestore, onBusy, onSaved }: {
  storageKey: string; value: UploadDraft; disabled: boolean;
  resume?: boolean;
  onRestore: (value: UploadDraft) => void; onBusy: (busy: boolean) => void;
  onSaved: () => void;
}) {
  const existing = useRef(false);
  const restored = useRef(false);
  const restore = useRef(onRestore);
  useEffect(() => { restore.current = onRestore; }, [onRestore]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    draftOperation<SavedUploadDraft | undefined>(storageKey, "read").then(saved => {
      if (!active) return;
      existing.current = saved?.version === 1;
      if (saved?.version === 1 && resume && !restored.current) {
        restore.current(saved.value);
        restored.current = true;
      }
      setReady(true);
    }).catch(() => { if (active) { setFailed(true); setMessage("no se pueden abrir los borradores en este navegador. tu formulario sigue disponible."); } });
    return () => { active = false; };
  }, [storageKey, resume]);

  async function save() {
    if (!ready || busy || disabled) return;
    const hasContent = Boolean(value.title.trim() || value.description.trim() || value.richContent.replace(/<[^>]*>/g, "").trim() || value.file || value.coverFile || value.photos.length || value.soundCloudUrl.trim() || value.eventDate || value.venue.trim());
    if (!hasContent) { setFailed(true); setMessage("añade texto o un archivo antes de guardar."); return; }
    if (existing.current && !restored.current && !window.confirm("¿reemplazar el borrador anterior con este contenido?")) return;
    setBusy(true); onBusy(true); setFailed(false);
    try {
      await draftOperation(storageKey, "save", { version: 1, savedAt: Date.now(), value });
      existing.current = true;
      restored.current = true;
      onSaved();
      setMessage("borrador guardado en este navegador.");
    } catch {
      setFailed(true); setMessage("no se pudo guardar el borrador. vuelve a intentar; no cierres el formulario.");
    } finally { setBusy(false); onBusy(false); }
  }

  return <section aria-label="borrador" className="text-sm">
    <button type="button" className="min-h-11 border border-[var(--magma-red)] px-3 disabled:opacity-50" disabled={!ready || disabled || busy} onClick={() => void save()}>{busy ? "guardando…" : "guardar borrador"}</button>
    {message && <p role={failed ? "alert" : "status"} className="mt-3 text-xs">{message}</p>}
  </section>;
}
