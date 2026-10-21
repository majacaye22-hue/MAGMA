"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { projectCoverShape, projectCoverStyle, type ProjectCoverShape } from "@/lib/project-cover";

type Colectivo = {
  cover_shape?: string;
  id: string; name: string; description: string | null; avatar_color: string;
  cover_image_url: string | null; is_private: boolean; created_by: string;
};

export function EditColectivo({ col }: { col: Colectivo }) {
  const router = useRouter();
  const [name, setName] = useState(col.name);
  const [description, setDescription] = useState(col.description ?? "");
  const [color, setColor] = useState(col.avatar_color);
  const [unlisted, setUnlisted] = useState(col.is_private);
  const [cover, setCover] = useState(col.cover_image_url);
  const [shape, setShape] = useState<ProjectCoverShape>(projectCoverShape(col));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      let nextCover = cover;
      if (file) {
        const data = new FormData(); data.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: data });
        const result = await response.json();
        if (!response.ok || !result.url) throw new Error("no se pudo subir la portada");
        nextCover = result.url;
        // Keep the uploaded URL if the subsequent save needs retrying.
        setCover(nextCover); setFile(null);
      }
      const { data, error: updateError } = await getSupabaseClient().from("colectivos")
        .update({ name: name.trim(), description: description.trim() || null, avatar_color: color, is_private: unlisted, cover_image_url: nextCover, ...(col.cover_shape !== undefined ? { cover_shape: shape } : {}) })
        .eq("id", col.id).eq("created_by", col.created_by).select("id").single();
      if (updateError || !data) throw new Error("no se pudieron guardar los cambios. verifica que estás en la cuenta creadora.");
      setSaved(true); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "no se pudo guardar. inténtalo de nuevo."); }
    finally { setSaving(false); }
  }
  const input = "mt-2 block w-full border border-[var(--magma-border)] bg-transparent p-3 text-[var(--magma-ash)]";
  return <form onSubmit={save} onChange={() => setSaved(false)} className="mb-10 space-y-5">
    <h2 className="text-lg">editar colectivo</h2>
    <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
      <label className="block">nombre<input className={input} required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block">descripción<textarea className={input} rows={4} maxLength={3000} value={description} onChange={e => setDescription(e.target.value)} /></label>
      <div>
        <label className="block">portada · jpg, png, webp o gif · máx. 15 MB
          <input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => {
            const selected = e.target.files?.[0];
            if (!selected) return;
            if (!["image/jpeg","image/png","image/webp","image/gif"].includes(selected.type) || selected.size > 15 * 1024 * 1024) {
              setError("elige una imagen jpg, png, webp o gif de hasta 15 MB"); e.target.value = ""; return;
            }
            setError(""); setFile(selected);
          }} />
        </label>
        <fieldset disabled={col.cover_shape === undefined} className="mt-4">
          <legend className="text-sm">formato de portada</legend>
          <div className="flex gap-4">
            {(["horizontal", "vertical"] as const).map(value => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="cover-shape" checked={shape === value} onChange={() => setShape(value)} className="accent-[var(--magma-red)]" />{value}
            </label>)}
          </div>
          <p className="text-xs text-[var(--magma-muted)]">{col.cover_shape === undefined ? "formato pendiente de activación en la base de datos." : "el recorte se centra y será visible para todos. la imagen original se conserva."}</p>
        </fieldset>
        {(preview || cover) && <>
          <div className="mt-3 overflow-hidden" style={projectCoverStyle(shape)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview || cover!} alt="vista previa de la portada" className="h-full w-full object-cover" />
          </div>
          <button type="button" className="mt-2 underline" onClick={() => { setFile(null); setCover(null); setSaved(false); }}>quitar portada</button>
        </>}
      </div>
      <label className="block">color de fondo<input type="color" className="mt-2 block h-10 w-16" value={color} onChange={e => setColor(e.target.value)} /></label>
      <label className="block">visibilidad
        <select className={input} value={unlisted ? "link" : "listed"} onChange={e => setUnlisted(e.target.value === "link")}>
          <option className="bg-[var(--magma-rock)]" value="listed">visible en cartelera de colectivos</option>
          <option className="bg-[var(--magma-rock)]" value="link">solo con enlace</option>
        </select>
      </label>
      <p className="text-xs text-[var(--magma-muted)]">ambas opciones requieren aprobación para ingresar. solo con enlace oculta el colectivo del directorio, no su contenido. el enlace actual se conserva al editar.</p>
      <button type="submit" className="border border-[var(--magma-red)] px-5 py-3">{saving ? "guardando…" : "guardar cambios"}</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    {saved && <p role="status">cambios guardados</p>}
  </form>;
}
