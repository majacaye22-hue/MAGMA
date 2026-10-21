export type OfferingReference = { id: string; title: string; username: string };
export function offeringReference(value: unknown): OfferingReference | null {
  if (!value || typeof value !== 'object') return null;
  const ref = value as OfferingReference;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref.id ?? '') || typeof ref.title !== 'string' || !ref.title.trim() || ref.title.length > 80 || typeof ref.username !== 'string' || !ref.username || ref.username.length > 100) return null;
  return { id: ref.id, title: ref.title, username: ref.username };
}
export function offeringReferenceHref(ref: OfferingReference) {
  return `/profile/${encodeURIComponent(ref.username)}?tab=comparto#offering-${ref.id}`;
}
