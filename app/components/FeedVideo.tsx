"use client";
import { useEffect, useRef, useState } from "react";

export function FeedVideo({ src, fitScreen = false, onAspectRatio }: { src: string; fitScreen?: boolean; onAspectRatio?: (ratio: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(true);
  const [error, setError] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const attach = () => {
      if (!video.getAttribute("src")) video.src = src.includes("#") ? src : `${src}#t=0.001`;
    };
    const nearby = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { attach(); nearby?.disconnect(); }
    }, { rootMargin: "200px 0px" });
    if (nearby) nearby.observe(video);
    else attach();
    const pause = () => { if (document.hidden) video.pause(); };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) video.pause();
    });
    observer?.observe(video);
    document.addEventListener("visibilitychange", pause);
    return () => { nearby?.disconnect(); observer?.disconnect(); document.removeEventListener("visibilitychange", pause); };
  }, [src]);
  function play() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.getAttribute("src")) video.src = src;
    setStarted(true);
    setError(false);
    void video.play().catch(() => setError(true));
  }
  return <div className="relative z-20">
    <video ref={videoRef} preload="metadata" controls={started} playsInline
      onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onEnded={() => setPaused(true)}
      aria-label="video de la publicación" onError={() => setError(true)}
      onLoadedMetadata={event => {
        const video = event.currentTarget;
        if (video.videoWidth && video.videoHeight) {
          const nextRatio = video.videoWidth / video.videoHeight;
          setRatio(nextRatio);
          onAspectRatio?.(nextRatio);
        }
      }}
      style={{ display: "block", width: "100%", height: "auto", aspectRatio: ratio ?? "3 / 4", maxHeight: fitScreen ? "min(560px, 60svh)" : undefined, objectFit: "contain" }} />
    {paused && <button type="button" onClick={play} aria-label="reproducir video"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white rounded-full focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--magma-red)] text-xl" aria-hidden="true">▶</span>
    </button>}
    {error && <p role="status" className="p-3 text-xs text-white">no se pudo iniciar el video. <button type="button" onClick={play} className="underline">reintentar</button></p>}
  </div>;
}
