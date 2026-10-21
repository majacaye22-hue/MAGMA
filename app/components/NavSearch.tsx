"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeSearch, searchHref } from "@/lib/search";

export function NavSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  return <form role="search" aria-label="búsqueda global" action="/buscar" onSubmit={event => {
      event.preventDefault();
      const q = normalizeSearch(query);
      if (q.length < 2) return;
      onNavigate?.();
      router.push(searchHref(q));
    }} className="flex h-11 w-full min-w-0 items-center rounded-full border border-white/15 bg-white/[0.07] transition-colors hover:border-white/30 focus-within:border-[var(--magma-red)] focus-within:ring-1 focus-within:ring-[var(--magma-red)]">
      <button type="submit" aria-label="buscar" disabled={normalizeSearch(query).length < 2}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-[var(--magma-red)] disabled:cursor-default">
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      </button>
      <input name="q" type="search" value={query} onChange={event => setQuery(event.target.value)} required minLength={2} maxLength={80}
        aria-label="buscar en magma" placeholder="buscar en magma…" enterKeyHint="search"
        className="h-full min-w-0 flex-1 rounded-r-full bg-transparent pr-4 text-sm text-white outline-none" />
    </form>;
}
