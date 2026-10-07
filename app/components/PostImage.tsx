"use client";

import { useState } from "react";
import { FeedImage } from "./FeedImage";
import { postMediaStyle } from "@/lib/post-layout";

// The frame owns layout, never the image's intrinsic or responsive dimensions.
export function PostImage({ src, alt, mediaType }: { src: string; alt: string; mediaType?: string | null }) {
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  return <div style={{ ...postMediaStyle, position: "relative", overflow: "hidden" }}>
    <FeedImage src={src} alt={alt} mediaType={mediaType} loading="eager" fetchPriority="high"
      sizes="(max-width: 767px) calc(100vw - 32px), 736px"
      ref={image => { if (image?.complete && image.naturalWidth > 0 && loadedSource !== src) setLoadedSource(src); }}
      onLoad={() => setLoadedSource(src)}
      style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%", maxWidth: "100%", objectFit: "contain", opacity: loadedSource === src ? 1 : 0 }} />
  </div>;
}
