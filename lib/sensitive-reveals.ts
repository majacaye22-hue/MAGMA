const prefix = "magma:revealed-post:";
const revealed = new Set<string>();
const listeners = new Set<() => void>();

export function isPostRevealed(postId: string): boolean {
  if (typeof window === "undefined") return false;
  if (revealed.has(postId)) return true;
  try {
    return window.sessionStorage.getItem(prefix + postId) === "1";
  } catch {
    return false;
  }
}

export function revealPost(postId: string) {
  revealed.add(postId);
  try {
    window.sessionStorage.setItem(prefix + postId, "1");
  } catch {
    // Remounts still retain consent when browser storage is unavailable.
  }
  listeners.forEach(listener => listener());
}

export function subscribeToReveals(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function serverPostRevealed() { return false; }
