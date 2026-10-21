export const OFFERING_MODES = ['trabajo pagado', 'intercambio', 'colaboración'] as const;
export type Offering = { id: string; title: string; description: string; modes: string[]; work_path: string | null; cover_image_url?: string | null; pdf_url?: string | null };
export function offeringCoverError(file: { type: string; size: number }): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return 'elige una imagen JPG, PNG, WEBP o GIF';
  if (file.size > 15 * 1024 * 1024) return 'la imagen no puede pesar más de 15 MB';
  if (file.size === 0) return 'la imagen está vacía';
  return null;
}
export const PROFILE_OFFERINGS_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://jbzkdzcaqmxsmmyrlwif.supabase.co';

export function validWorkPath(value: string) {
  return value === '' || /^\/(post|proyecto)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function offeringError(value: Omit<Offering, 'id'>): string | null {
  if (!value.title.trim() || value.title.trim().length > 80) return 'escribe un título de hasta 80 caracteres';
  if (!value.description.trim() || value.description.trim().length > 600) return 'cuéntanos qué compartes en hasta 600 caracteres';
  if (!value.modes.every(mode => (OFFERING_MODES as readonly string[]).includes(mode))) return 'elige una forma de compartir válida';
  if (!validWorkPath(value.work_path ?? '')) return 'usa una ruta de Magma: /post/… o /proyecto/…';
  return null;
}
