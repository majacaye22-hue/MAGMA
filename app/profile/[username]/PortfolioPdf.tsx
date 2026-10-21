"use client";
import { useEffect, useRef, useState } from 'react';
import { isPortfolioPdfUrl, PDF_MAX_SIZE } from '@/lib/portfolio-pdf';

export default function PortfolioPdf({ url, title }: { url: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.showModal();
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void (async () => {
      try {
        if (!isPortfolioPdfUrl(url)) throw new Error('invalid URL');
        const response = await fetch(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
        if (!response.ok || Number(response.headers.get('content-length')) > PDF_MAX_SIZE) throw new Error('unavailable');
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > PDF_MAX_SIZE || new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('invalid PDF');
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        setSource(objectUrl);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); node?.close(); document.body.style.overflow = previous; };
  }, [open, url]);
  if (!isPortfolioPdfUrl(url)) return null;
  return <>
    <button type="button" className="mt-3 min-h-11 cursor-pointer px-3 py-2 text-white transition-colors hover:text-[#dc143c] focus-visible:text-[#dc143c] focus-visible:outline-2 focus-visible:outline-[#dc143c] motion-reduce:transition-none" onClick={() => { setSource(null); setFailed(false); setOpen(true); }}>PDF ↗</button>
    <dialog ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-label={`PDF: ${title}`} className="fixed inset-0 m-auto h-[92dvh] max-h-none w-[96vw] max-w-6xl border border-[#49463f] bg-[#10100f] p-0 text-white backdrop:bg-black/80">
      {open && <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 p-3"><h2 className="truncate">{title} · PDF</h2><button autoFocus type="button" className="min-h-11 shrink-0 px-3 focus-visible:outline-2 focus-visible:outline-[#dc143c]" onClick={() => setOpen(false)}>cerrar ×</button></header>
        <p className="px-3 pb-2 text-xs">desplázate por el documento; los controles de zoom dependen de tu navegador.</p>
        {failed ? <p role="alert" className="p-6">no pudimos abrir el PDF. cierra esta ventana y vuelve a intentarlo.</p> : !source ? <p role="status" className="p-6">cargando PDF…</p> : <object data={source} type="application/pdf" aria-label={`portafolio: ${title}`} className="min-h-0 w-full flex-1 bg-white">
          <p className="p-6 text-black">tu navegador no puede mostrar este PDF aquí. prueba con un navegador de escritorio.</p>
        </object>}
      </div>}
    </dialog>
  </>;
}
