"use client";

import { useState } from 'react';
import Link from 'next/link';
import { eventMedia } from '@/lib/event-media';
import { PostImage } from './PostImage';

export function EventMediaGallery({ post, href }: { post: Parameters<typeof eventMedia>[0] & { title?: string | null }; href?: string }) {
  const { poster, video } = eventMedia(post);
  const [showVideo, setShowVideo] = useState(false);
  const both = Boolean(poster && video);
  return <div className="relative z-20">
    {video && (!poster || showVideo) ? (
      <video key={video} controls playsInline preload="metadata" src={video} aria-label="video del evento" className="block max-h-[70svh] w-full rounded-xl" />
    ) : poster ? (href ? <Link href={href} aria-label={`ver evento: ${post.title ?? 'evento'}`}><PostImage src={poster} alt={post.title ?? 'cartel del evento'} /></Link> : <PostImage src={poster} alt={post.title ?? 'cartel del evento'} />) : <p className="py-16 text-center">sin cartel</p>}
    {both && <div className="flex items-center justify-center gap-5 py-3" role="group" aria-label="cartel y video del evento">
      <button type="button" onClick={() => setShowVideo(false)} disabled={!showVideo} aria-label="ver cartel anterior" className="min-h-11 min-w-11 rounded-xl disabled:opacity-30 focus-visible:outline-2">←</button>
      <span aria-live="polite" className="text-xs">{showVideo ? '2 / 2 · video' : '1 / 2 · cartel'}</span>
      <button type="button" onClick={() => setShowVideo(true)} disabled={showVideo} aria-label="ver video siguiente" className="min-h-11 min-w-11 rounded-xl disabled:opacity-30 focus-visible:outline-2">→</button>
    </div>}
  </div>;
}
