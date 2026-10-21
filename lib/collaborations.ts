// Rollout gate: apply supabase/collaborations.sql and run its permission tests first.
export const COLLABORATIONS_ENABLED = process.env.NEXT_PUBLIC_COLLABORATIONS_ENABLED === 'true';
export type CollaborationKind = 'project' | 'post';
export function inviteUsernames(value: string): string[] {
  const names = [...new Set(value.split(',').map(name => name.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))];
  if (names.length > 20 || names.some(name => name.length > 80 || /\s/.test(name))) throw new Error('usa hasta 20 usuarios separados por comas');
  return names;
}
export type Collaboration = {
  id: string; user_id: string; project_id: string | null; post_id: string | null;
  accepted_at: string | null;
  profiles: { username: string } | null;
};
export function collaborationError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'no se pudo guardar. revisa tu conexión e intenta de nuevo.';
}
