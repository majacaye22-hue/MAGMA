export function chatDay(value: string) {
  return new Date(value).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" });
}

export function chatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function continuesMessage(previous: { sender_id: string | null; created_at: string } | undefined, current: { sender_id: string | null; created_at: string }) {
  if (!previous || previous.sender_id !== current.sender_id || chatDay(previous.created_at) !== chatDay(current.created_at)) return false;
  const gap = Date.parse(current.created_at) - Date.parse(previous.created_at);
  return gap >= 0 && gap < 5 * 60 * 1000;
}
