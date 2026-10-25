export function supportsCarousel(type: string | null) {
  return type === "arte" || type === "fotografía";
}

export function postImages(post: { type: string; image_urls?: string[] | null; media_url?: string | null; media_base64?: string | null }) {
  if (supportsCarousel(post.type) && post.image_urls?.length) return post.image_urls.slice(0, MAX_POST_IMAGES);
  const first = post.media_url ?? post.media_base64;
  return first ? [first] : [];
}

export function validatePhotos(files: File[], existingCount: number) {
  if (existingCount + files.length > MAX_POST_IMAGES) return `puedes subir hasta ${MAX_POST_IMAGES} fotos por publicación.`;
  if (files.some(file => !isHeic(file) && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))) return "elige fotos en JPG, PNG, WebP, GIF o HEIC.";
  if (files.some(file => file.size > 15 * 1024 * 1024)) return "cada foto debe pesar menos de 15 MB.";
  return null;
}

export async function uploadPhotos(items: (File | string)[], colectivoId?: string | null) {
  const problem = validatePhotos(items.filter((item): item is File => typeof item !== 'string'), items.filter(item => typeof item === 'string').length);
  if (problem) throw new Error(problem);
  const urls: string[] = [];
  for (const item of items) {
    if (typeof item === "string") { urls.push(item); continue; }
    const body = new FormData();
    body.append("file", item);
    if (colectivoId) body.append("colectivo_id", colectivoId);
    const response = await fetch("/api/upload", { method: "POST", body });
    const result = await response.json();
    if (!response.ok || result.error || !result.url) throw new Error("no se pudo subir una foto. inténtalo de nuevo.");
    urls.push(result.url);
  }
  return urls;
}
import { isHeic } from "./photo-format";
export const MAX_POST_IMAGES = 10;
