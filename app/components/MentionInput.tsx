"use client";

import { useEffect, useLayoutEffect, useId, useRef, useState, type TextareaHTMLAttributes } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { mentionAtCursor } from "@/lib/mentions";

export function MentionSuggestions({ query, onPick, onDismiss, id }: {
  query: string; onPick: (username: string) => void; onDismiss: () => void; id?: string;
}) {
  const [result, setResult] = useState<{ query: string; names: string[]; failed: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { data, error } = await getSupabaseClient().from("profiles").select("username")
            .ilike("username", `${query.replace(/_/g, "\\_")}%`).order("username").limit(6);
          if (!cancelled) setResult({ query, names: error ? [] : (data ?? []).map((p: { username: unknown }) => p.username).filter((name: unknown): name is string => typeof name === "string" && /^[a-zA-Z0-9_]{3,30}$/.test(name)), failed: Boolean(error) });
        } catch { if (!cancelled) setResult({ query, names: [], failed: true }); }
      })();
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);
  const current = result?.query === query ? result : null;
  return <div id={id} className="magma-mention-menu" role="group" aria-label="cuentas para mencionar" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); onDismiss(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    }
  }}>
    <p className="text-xs opacity-70" role="status">{!current ? "buscando cuentas…" : current.failed ? "no se pudieron buscar cuentas" : !current.names.length ? "no encontramos esa cuenta" : "mencionar a"}</p>
    {current?.names.map(name => <button key={name} type="button" onMouseDown={event => event.preventDefault()} onClick={() => onPick(name)}>@{name}</button>)}
    <button type="button" className="text-xs opacity-70" onClick={onDismiss}>cerrar sugerencias</button>
  </div>;
}

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & { value: string; onValueChange: (value: string) => void; blinkingPlaceholder?: boolean };
export function MentionInput({ value, onValueChange, blinkingPlaceholder = false, ...props }: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const field = input.current;
    const caret = cursor.current;
    if (!blinkingPlaceholder || !field || !caret) return;
    const mirror = document.createElement("div");
    mirror.setAttribute("aria-hidden", "true");
    document.body.appendChild(mirror);
    function update() {
      if (!field || !caret) return;
      const style = getComputedStyle(field);
      mirror.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:break-word;top:0;left:0;";
      for (const property of ["font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-transform", "text-indent", "tab-size", "word-break", "padding-top", "padding-right", "padding-bottom", "padding-left"]) {
        mirror.style.setProperty(property, style.getPropertyValue(property));
      }
      mirror.style.boxSizing = "border-box";
      mirror.style.width = `${field.clientWidth}px`;
      mirror.textContent = field.value.slice(0, field.selectionStart);
      const marker = document.createElement("span");
      marker.textContent = field.value.slice(field.selectionStart) || "\u200b";
      mirror.appendChild(marker);
      const rect = marker.getClientRects()[0];
      const bounds = mirror.getBoundingClientRect();
      const x = rect.left - bounds.left + field.clientLeft - field.scrollLeft;
      const y = rect.top - bounds.top + field.clientTop - field.scrollTop;
      caret.style.left = `${x}px`;
      caret.style.top = `${y}px`;
      caret.style.font = style.font;
      caret.style.lineHeight = `${rect.height}px`;
      caret.style.visibility = ((!field.value || document.activeElement === field) && field.selectionStart === field.selectionEnd && x >= field.clientLeft && x < field.clientWidth && y >= field.clientTop && y + rect.height <= field.clientHeight) ? "visible" : "hidden";
    }
    const events = ["input", "select", "keyup", "click", "focus", "blur", "scroll"];
    events.forEach(event => field.addEventListener(event, update));
    document.addEventListener("selectionchange", update);
    const resize = new ResizeObserver(update);
    resize.observe(field);
    update();
    return () => {
      events.forEach(event => field.removeEventListener(event, update));
      document.removeEventListener("selectionchange", update);
      resize.disconnect();
      mirror.remove();
    };
  }, [blinkingPlaceholder, value]);
  const id = useId();
  const [token, setToken] = useState<ReturnType<typeof mentionAtCursor>>(null);
  function dismiss() { setToken(null); input.current?.focus(); }
  return <div>
    <style jsx>{`
      .magma-writing-cursor {
        position: absolute;
        top: 0;
        left: 0;
        color: var(--magma-ash);
        pointer-events: none;
        animation: writing-blink 1.2s step-end infinite;
      }
      @keyframes writing-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .magma-writing-cursor { animation: none; }
      }
    `}</style>
    <div style={{ position: "relative" }}>
    <textarea {...props} ref={input} value={value} aria-controls={token ? id : undefined}
      style={{ ...props.style, ...(blinkingPlaceholder ? { caretColor: "transparent" } : {}) }}
      onChange={event => { onValueChange(event.target.value); setToken(mentionAtCursor(event.target.value, event.target.selectionStart)); }}
      onSelect={event => setToken(mentionAtCursor(event.currentTarget.value, event.currentTarget.selectionStart))}
      onKeyDown={event => {
        props.onKeyDown?.(event);
        if (event.key === "Escape") setToken(null);
        if (token && event.key === "ArrowDown") { event.preventDefault(); document.getElementById(id)?.querySelector("button")?.focus(); }
      }} />
    {blinkingPlaceholder && <span ref={cursor} aria-hidden="true" className="magma-writing-cursor">_</span>}
    </div>
    {token && <MentionSuggestions id={id} query={token.query} onDismiss={dismiss} onPick={name => {
      const insertion = `@${name} `;
      onValueChange(value.slice(0, token.from) + insertion + value.slice(token.to));
      const caret = token.from + insertion.length;
      setToken(null);
      requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(caret, caret); setToken(null); });
    }} />}
  </div>;
}
