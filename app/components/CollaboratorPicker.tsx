"use client";

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { inviteUsernames } from '@/lib/collaborations';

export function CollaboratorPicker({ id, value, onChange, userId, inputStyle, selectedLabel = 'colaboradores seleccionados', resultsLabel = 'cuentas para colaborar' }: {
  id: string; value: string; onChange: (value: string) => void;
  userId: string | null; inputStyle?: CSSProperties; selectedLabel?: string; resultsLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ query: string; names: string[]; failed: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // Older drafts could contain unfinished free-text usernames.
  let names: string[];
  try { names = inviteUsernames(value); }
  catch { names = [...new Set(value.split(',').map(name => name.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))]; }
  const term = query.trim().replace(/^@/, '').toLowerCase();
  const valid = /^[a-z0-9_]{2,30}$/.test(term);
  useEffect(() => {
    if (!valid || !open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          let search = getSupabaseClient().from('profiles').select('id,username')
            .ilike('username', `%${term.replace(/_/g, '\\_')}%`).order('username').limit(50);
          if (userId) search = search.neq('id', userId);
          const { data, error } = await search;
          if (error) throw error;
          if (!cancelled) setResult({ query: term, names: (data ?? []).map((row: { username: unknown }) => row.username)
            .filter((name: unknown): name is string => typeof name === 'string'), failed: false });
        } catch {
          if (!cancelled) setResult({ query: term, names: [], failed: true });
        }
      })();
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, valid, open, userId, retry]);
  const current = result?.query === term ? result : null;
  const matches = current?.names.filter(name => !names.includes(name.toLowerCase())).slice(0, 8) ?? [];
  function pick(name: string) {
    if (names.length >= 20 || names.includes(name.toLowerCase())) return;
    onChange([...names, name.toLowerCase()].join(', '));
    setQuery(''); setOpen(false); input.current?.focus();
  }
  return <div onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); input.current?.focus();
    }
  }}>
    {names.length > 0 && <ul aria-label={selectedLabel} className="my-2 flex flex-wrap gap-2">
      {names.map(name => <li key={name}>
        <button type="button" className="min-h-11 rounded border border-current/30 px-3 text-sm"
          aria-label={`quitar a @${name}`} onClick={() => onChange(names.filter(item => item !== name).join(', '))}>
          @{name} <span aria-hidden="true">×</span>
        </button>
      </li>)}
    </ul>}
    <input id={id} ref={input} style={inputStyle} value={query} maxLength={31} autoComplete="off"
      placeholder="buscar por @usuario" aria-describedby={`${id}-help`} aria-controls={open && valid ? `${id}-results` : undefined}
      disabled={names.length >= 20} onFocus={() => setOpen(true)}
      onChange={event => { setQuery(event.target.value); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); if (open && matches.length === 1) pick(matches[0]); }
        if (event.key === 'ArrowDown' && open) { event.preventDefault(); menu.current?.querySelector('button')?.focus(); }
      }} />
    <p id={`${id}-help`} className="mt-2 text-xs opacity-75">{names.length >= 20
      ? 'puedes invitar hasta 20 personas.' : 'escribe al menos 2 caracteres y selecciona una cuenta. puedes añadir varias.'}</p>
    {open && valid && <div id={`${id}-results`} ref={menu} role="group" aria-label={resultsLabel}
      className="mt-2 rounded border border-current/30 p-2" onKeyDown={event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
      }}>
      <p role="status" className="text-xs opacity-75">{!current ? 'buscando cuentas…' : current.failed
        ? 'no se pudieron buscar cuentas.' : matches.length ? 'selecciona a quién invitar' : 'no encontramos otras cuentas con ese usuario.'}</p>
      {current?.failed && <button type="button" className="min-h-11 underline" onClick={() => { setResult(null); setRetry(retry + 1); }}>reintentar búsqueda</button>}
      {matches.map(name => <button type="button" key={name} className="block min-h-11 w-full rounded px-3 text-left hover:bg-current/10 focus-visible:outline"
        onClick={() => pick(name)}> @{name}</button>)}
    </div>}
  </div>;
}
