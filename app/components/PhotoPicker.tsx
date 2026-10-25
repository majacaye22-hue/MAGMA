"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_POST_IMAGES, validatePhotos } from "@/lib/post-images";
import { PHOTO_ACCEPT, isHeic } from "@/lib/photo-format";

function Preview({ item }: { item: File | string }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (typeof item === "string") return;
    const next = URL.createObjectURL(item);
    if (image.current) image.current.src = next;
    return () => URL.revokeObjectURL(next);
  }, [item]);
  return <div>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={image} src={typeof item === "string" ? item : undefined} alt="vista previa" className="h-32 w-full object-contain" onError={event => { event.currentTarget.style.display = "none"; }} />
    {typeof item !== "string" && isHeic(item) && <p className="text-sm">{item.name} · se convertirá a JPG al publicar.</p>}
  </div>;
}

export function PhotoPicker({ items, onChange, disabled, notebook = false }: { items: (File | string)[]; onChange: (items: (File | string)[]) => void; disabled?: boolean; notebook?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  function add(files: File[]) {
    if (disabled) return;
    const problem = validatePhotos(files, items.length);
    setError(problem);
    if (!problem) onChange([...items, ...files]);
  }
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  return <fieldset disabled={disabled} className="space-y-3 text-sm text-white" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); add(Array.from(event.dataTransfer.files)); }}>
    <legend>{notebook ? "suelta aquí tu obra" : `fotos · hasta ${MAX_POST_IMAGES}`}</legend>
    <p className={notebook ? "notebook-note" : undefined}>{`hasta ${MAX_POST_IMAGES} imágenes · la primera será la portada`}</p>
    <p className="text-xs" aria-live="polite">{items.length} / {MAX_POST_IMAGES} imágenes</p>
    <ol className="flex flex-wrap gap-4">
      {items.map((item, index) => <li key={typeof item === "string" ? item : `${item.name}-${item.lastModified}-${index}`} className="w-40 space-y-2">
        <Preview item={item} />
        <p>foto {index + 1}</p>
        <div className="flex gap-3">
          <button type="button" disabled={disabled || index === 0} aria-label={`mover foto ${index + 1} antes`} onClick={() => move(index, -1)} className="p-2 disabled:opacity-30">←</button>
          <button type="button" disabled={disabled || index === items.length - 1} aria-label={`mover foto ${index + 1} después`} onClick={() => move(index, 1)} className="p-2 disabled:opacity-30">→</button>
          <button type="button" onClick={() => { onChange(items.filter((_, i) => i !== index)); setError(null); }} className="underline">quitar</button>
        </div>
      </li>)}
    </ol>
    <label className={notebook ? "notebook-photo-picker" : "block"}>
      {notebook ? <><span>{items.length ? "+ agregar otra foto" : "+ elegir fotos"}</span><span className="notebook-note">también puedes arrastrarlas aquí</span></> : "agregar fotos"}
      <input aria-label="agregar fotos" type="file" multiple accept={PHOTO_ACCEPT} disabled={disabled || items.length >= MAX_POST_IMAGES} className={notebook ? "notebook-photo-input" : "mt-2 block w-full"} onChange={event => { add(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    </label>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
