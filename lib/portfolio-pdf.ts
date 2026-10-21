export const PDF_MAX_SIZE = 15 * 1024 * 1024;
export function portfolioPdfError(file: { name: string; type: string; size: number }) {
  if (file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) return 'elige un archivo PDF';
  if (!file.size || file.size > PDF_MAX_SIZE) return 'el PDF debe pesar entre 1 byte y 15 MB';
  return null;
}
export function isPortfolioPdfUrl(value: string) {
  try {
    const url = new URL(value);
    return url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL && /^\/storage\/v1\/object\/public\/media\/[0-9a-f-]+\.pdf$/i.test(url.pathname) && !url.search && !url.hash;
  } catch { return false; }
}
