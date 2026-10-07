export function mentionAtCursor(text: string, cursor: number) {
  const match = text.slice(0, cursor).match(/(?:^|\s|[([{"'¿¡])@([a-zA-Z0-9_]{0,30})$/);
  return match ? { query: match[1], from: cursor - match[1].length - 1, to: cursor } : null;
}

export function mentionParts(text: string) {
  return text.split(/((?<![\w@/])@[a-zA-Z0-9_]{3,30}(?![\w@]))/g);
}

export function profileMentionHref(username: string) {
  return `/profile/${encodeURIComponent(username)}`;
}
