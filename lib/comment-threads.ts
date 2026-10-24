export const COMMENT_REPLIES_ENABLED = process.env.NEXT_PUBLIC_COMMENT_REPLIES_ENABLED === 'true';

// Missing/deleted/hidden parents must not make an otherwise readable reply vanish.
export function commentThreads<T extends { id: string; parent_id?: string | null }>(comments: T[]) {
  const roots = comments.filter(c => !c.parent_id || !comments.some(p => p.id === c.parent_id && !p.parent_id));
  return roots.map(root => ({ root, replies: comments.filter(c => c.parent_id === root.id && c.id !== root.id) }));
}
