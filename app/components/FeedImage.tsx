"use client";

import { useState, type ComponentPropsWithRef } from "react";
import { getImageProps } from "next/image";
import { canOptimizeFeedImage, FEED_IMAGE_SIZES } from "@/lib/feed-media";

type Props = Omit<ComponentPropsWithRef<"img">, "src" | "srcSet"> & {
  src: string;
  alt: string;
  mediaType?: string | null;
};

export function FeedImage({ src, alt, mediaType, sizes = FEED_IMAGE_SIZES, onError, ...rest }: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const optimize = failedSource !== src && canOptimizeFeedImage(src, mediaType);
  const generated = optimize ? getImageProps({ src, alt, fill: true, sizes, quality: 75 }).props : null;

  // Use only Next's responsive source URLs: stored posts lack intrinsic dimensions.
  // Do not apply fill positioning or invented dimensions to the natural-height artwork.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} alt={alt} src={generated?.src ?? src} srcSet={generated?.srcSet}
    sizes={generated ? sizes : undefined} decoding="async" loading={rest.loading ?? "lazy"}
    onError={event => {
      if (optimize) setFailedSource(src); // Preserve older/unusual files if optimization fails.
      else onError?.(event);
    }} />;
}
