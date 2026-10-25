import { isHeic } from './photo-format';

export const EVENT_MEDIA_ACCEPT = 'image/*,video/mp4,video/quicktime,video/webm';
export const EVENT_VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm';
export function eventMediaError(file: File) {
  if (file.size > 15 * 1024 * 1024) return 'cada archivo puede pesar hasta 15 MB.';
  if (!isHeic(file) && !['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) return 'elige una imagen o un video MP4, MOV o WebM.';
  return null;
}
export function eventMedia(post: { media_url?: string | null; media_base64?: string | null; media_type?: string | null; cover_url?: string | null }) {
  const src = post.media_url ?? post.media_base64 ?? null;
  const video = Boolean(src && (post.media_type?.startsWith('video/') || /\.(mp4|mov|webm)(?:[?#]|$)/i.test(src)));
  return { poster: video ? post.cover_url ?? null : src, video: video ? src : null };
}
