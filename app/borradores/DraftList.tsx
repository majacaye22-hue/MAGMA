"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { draftOperation, listUploadDrafts, type DraftListing } from "@/lib/upload-drafts";

export function DraftList({ userId }: { userId: string }) {
  const [rows, setRows] = useState<DraftListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    listUploadDrafts(userId).then(data => { if (active) { setRows(data); setError(""); } })
      .catch(() => { if (active) setError("no se pudieron leer tus borradores. comprueba que el navegador permite almacenamiento local."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, attempt]);
  async function remove(row: DraftListing) {
    if (deleting || !window.confirm(`¿eliminar el borrador «${row.title}» y sus archivos guardados? no se puede deshacer.`)) return;
    setDeleting(row.key);
    try { await draftOperation(row.key, "delete"); setRows(items => items.filter(item => item.key !== row.key)); setError(""); }
    catch { setError("no se pudo eliminar el borrador. intenta de nuevo."); }
    finally { setDeleting(null); }
  }
  if (loading) return <p role="status">cargando borradores…</p>;
  return <>
    {error && <div role="alert" className="mb-4"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>reintentar</button></div>}
    {!error && rows.length === 0 && <p className="py-8">todavía no tienes borradores guardados aquí.</p>}
    <ul className="space-y-3">{rows.map(row => <li key={row.key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/15 p-4">
      <div className="min-w-0"><h2 className="break-words text-lg">{row.title}</h2><p className="mt-1 text-xs text-[var(--magma-muted)]">{row.type} · {new Date(row.savedAt).toLocaleString("es-MX")}</p></div>
      <div className="flex gap-4"><Link className="inline-flex min-h-11 items-center text-[var(--magma-red)]" href={row.href}>retomar →</Link><button type="button" disabled={deleting !== null} onClick={() => void remove(row)} className="min-h-11 underline disabled:opacity-50">{deleting === row.key ? "eliminando…" : "eliminar"}</button></div>
    </li>)}</ul>
    <Link className="mt-6 inline-flex min-h-11 items-center text-[var(--magma-red)]" href="/upload">+ nueva obra</Link>
  </>;
}
