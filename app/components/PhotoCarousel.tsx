"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FeedImage } from "./FeedImage";
import { PostImage } from "./PostImage";

export function PhotoCarousel({ images, title, href, eager = false, fitScreen = false }: { images: string[]; title: string; href?: string; eager?: boolean; fitScreen?: boolean }) {
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const current = Math.min(index, images.length - 1);
  function move(delta: number) { setIndex(value => Math.max(0, Math.min(images.length - 1, value + delta))); }
  const alt = `${title || "foto"} · ${current + 1} de ${images.length}`;
  const picture = fitScreen
    ? <PostImage key={images[current]} src={images[current]} alt={alt} />
    : <div className="relative aspect-[3/4] w-full overflow-hidden" style={{ backgroundColor: "var(--magma-obsidian)" }}>
        <FeedImage src={images[current]} alt={alt} loading={eager || current > 0 ? "eager" : "lazy"}
          className="absolute inset-0 block h-full w-full object-cover object-center" />
      </div>;
  return <section aria-label="fotos de la publicación" aria-roledescription="carrusel" className="relative z-20 w-full min-w-0" style={{ touchAction: "pan-y pinch-zoom" }}
    onTouchStart={event => { const touch = event.touches[0]; start.current = { x: touch.clientX, y: touch.clientY }; swiped.current = false; }}
    onTouchEnd={event => { if (!start.current) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.current.x; const dy = touch.clientY - start.current.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { move(dx < 0 ? 1 : -1); swiped.current = true; } start.current = null; }}
    onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}>
    {href ? <Link href={href}>{picture}</Link> : picture}
    <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center">
      <button type="button" aria-label="foto anterior" disabled={current === 0} onClick={() => move(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,.8)" }}><span aria-hidden="true">←</span></button>
      <button type="button" aria-label="siguiente foto" disabled={current === images.length - 1} onClick={() => move(1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,.8)" }}><span aria-hidden="true">→</span></button>
    </div>
    <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 text-white" style={{ fontSize: "12px", lineHeight: 1, textShadow: "0 1px 4px rgba(0,0,0,.9)" }}>{current + 1}/{images.length}</span>
    <span className="sr-only" aria-live="polite" aria-atomic="true">foto {current + 1} de {images.length}</span>
  </section>;
}
