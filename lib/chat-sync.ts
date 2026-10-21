export const CHAT_PAGE_SIZE = 50;
export const CHAT_INBOX_CHANGED = "magma:chat-inbox-changed";

export type MessageCursor = { id: string; created_at: string };

export function compareMessages(a: MessageCursor, b: MessageCursor) {
  return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

export function mergeMessages<T extends MessageCursor>(previous: T[], incoming: T[]): T[] {
  const merged = new Map(previous.map(message => [message.id, message]));
  incoming.forEach(message => merged.set(message.id, message));
  return [...merged.values()].sort(compareMessages);
}

// IDs and timestamps come from database rows, never user-entered query text.
export function cursorFilter(cursor: MessageCursor, direction: "before" | "after") {
  const op = direction === "before" ? "lt" : "gt";
  return `created_at.${op}.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.${op}.${cursor.id})`;
}

// getRandomValues also works when testing from a phone over local HTTP.
export function messageId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type InboxChange = { kind: "direct" | "group"; id: string; readThrough?: string; latest?: { body: string; created_at: string; sender_id: string | null } };
export function notifyInbox(detail: InboxChange) {
  window.dispatchEvent(new CustomEvent(CHAT_INBOX_CHANGED, { detail }));
}
