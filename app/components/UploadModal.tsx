"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const UploadForm = dynamic(() => import("./UploadForm"), { loading: () => <p className="p-8" role="status">cargando formulario…</p> });

export function UploadModal() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const draft = useRef({ dirty: false, busy: false });
  const pathname = usePathname();
  const updateDraft = useCallback((dirty: boolean, busy: boolean) => { draft.current = { dirty, busy }; }, []);
  const close = useCallback((published = false) => {
    if (!published && (draft.current.busy || (draft.current.dirty && !window.confirm("¿cerrar el formulario? se perderán los cambios no guardados. tu último borrador guardado se conserva.")))) return;
    dialog.current?.close();
    setOpen(false);
    draft.current = { dirty: false, busy: false };
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    function intercept(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !window.matchMedia("(min-width: 1024px)").matches || pathname === "/upload") return;
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      // Keep specialized project/colectivo upload links on their existing route.
      if (url.origin !== location.origin || url.pathname !== "/upload" || url.search || url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      trigger.current = link;
      setOpen(true);
    }
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function beforeUnload(event: BeforeUnloadEvent) {
      if (draft.current.dirty || draft.current.busy) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("beforeunload", beforeUnload); };
  }, [open]);

  return open ? <dialog ref={dialog} aria-label="subir obra" onCancel={event => { event.preventDefault(); close(); }}
    className="magma-upload-scrollbar fixed inset-0 m-auto max-h-[90dvh] w-[min(960px,calc(100vw-48px))] max-w-none overflow-y-auto rounded-2xl border border-white/15 bg-[var(--magma-obsidian)] p-0 text-[var(--magma-ash)] shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm">
    <div className="sticky top-0 z-50 flex justify-end bg-[var(--magma-obsidian)] px-4 py-2">
      <button type="button" onClick={() => close()} aria-label="cerrar formulario" className="magma-nav-action text-xl">×</button>
    </div>
    <UploadForm onDraftState={updateDraft} onPublished={() => close(true)} />
  </dialog> : null;
}
