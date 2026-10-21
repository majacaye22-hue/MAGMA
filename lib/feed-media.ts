// Keep the optimizer limited to Magma's public media buckets, not arbitrary URLs.
export const MAGMA_MEDIA_HOSTS = [
  "avmztbdgyyrqccizmzsh.supabase.co",
  "jbzkdzcaqmxsmmyrlwif.supabase.co",
];

export function canOptimizeFeedImage(src: string, mediaType?: string | null) {
  if (mediaType === "image/gif" || mediaType === "image/svg+xml") return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && MAGMA_MEDIA_HOSTS.includes(url.hostname)
      && !url.port && !url.username && !url.password && !url.search
      && url.pathname.startsWith("/storage/v1/object/public/media/")
      && !/\.(gif|svg)$/i.test(url.pathname);
  } catch { return false; }
}

// CSS columns are ~300–600px wide; the browser also accounts for screen density.
export const FEED_IMAGE_SIZES = "(max-width: 767px) calc(100vw - 72px), (max-width: 1279px) 50vw, 400px";
