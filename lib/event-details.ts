export const EVENT_DETAILS_ENABLED = process.env.NEXT_PUBLIC_EVENT_DETAILS_ENABLED === "true";
export const EVENT_CATEGORIES = ["fiesta", "exposición", "concierto", "taller", "lectura", "screening", "mercado", "otro"] as const;
export type EventDetails = {
  event_end_date?: string | null;
  event_category?: string | null;
  event_link?: string | null;
  event_link_kind?: "tickets" | "registration" | null;
  registration_required?: boolean | null;
  minimum_age?: number | null;
  accessibility_info?: string | null;
};
export const EVENT_DETAILS_COLUMNS = "event_end_date,event_category,event_link,event_link_kind,registration_required,minimum_age,accessibility_info";
export type EventDetailsDraft = { endDate: string; endTime: string; category: string; link: string; linkKind: "tickets" | "registration"; registrationRequired: boolean; minimumAge: string; accessibility: string };
export const emptyEventDetails: EventDetailsDraft = { endDate: "", endTime: "", category: "", link: "", linkKind: "tickets", registrationRequired: false, minimumAge: "", accessibility: "" };

// CDMX has a fixed UTC-06:00 offset for the contemporary events Magma accepts.
export function eventTimestamp(date: string, time: string): string | null {
  if (!date) return null;
  if (!time) throw new Error("indica la hora de inicio");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("fecha u hora inválida");
  const value = new Date(`${date}T${time}:00-06:00`);
  if (!Number.isFinite(value.getTime())) throw new Error("fecha u hora inválida");
  if (eventLocalParts(value.toISOString()).date !== date) throw new Error("fecha inválida");
  return value.toISOString();
}
export function eventLocalParts(value?: string | null) {
  if (!value) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (key: string) => parts.find(p => p.type === key)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
export function safeEventLink(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return value.length <= 2048 && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function eventDetailsPayload(draft: EventDetailsDraft, start: string | null): EventDetails {
  if (Boolean(draft.endDate) !== Boolean(draft.endTime)) throw new Error("indica fecha y hora de cierre");
  const end = draft.endDate ? eventTimestamp(draft.endDate, draft.endTime) : null;
  if (end && (!start || Date.parse(end) <= Date.parse(start))) throw new Error("el cierre debe ser posterior al inicio");
  if (draft.category && !(EVENT_CATEGORIES as readonly string[]).includes(draft.category)) throw new Error("categoría inválida");
  const link = safeEventLink(draft.link);
  if (draft.link.trim() && !link) throw new Error("usa un enlace completo http o https, sin credenciales");
  const age = draft.minimumAge.trim() ? Number(draft.minimumAge) : null;
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 99)) throw new Error("la edad mínima debe ser un número de 0 a 99");
  if (draft.accessibility.length > 1500) throw new Error("la información de accesibilidad es demasiado larga");
  return { event_end_date: end, event_category: draft.category || null, event_link: link, event_link_kind: link ? draft.linkKind : null, registration_required: draft.registrationRequired, minimum_age: age, accessibility_info: draft.accessibility.trim() || null };
}
export function restoreEventDetails(post: EventDetails): EventDetailsDraft {
  const end = eventLocalParts(post.event_end_date);
  return { endDate: end.date, endTime: end.time, category: post.event_category ?? "", link: post.event_link ?? "", linkKind: post.event_link_kind ?? "tickets", registrationRequired: post.registration_required === true, minimumAge: post.minimum_age == null ? "" : String(post.minimum_age), accessibility: post.accessibility_info ?? "" };
}
export function eventFinished(post: { event_date?: string | null; event_end_date?: string | null }, now: number) {
  if (post.event_end_date) return Date.parse(post.event_end_date) <= now;
  // An unknown end is not the same as the start. Keep same-day events actionable.
  if (!post.event_date) return false;
  return eventLocalParts(post.event_date).date < eventLocalParts(new Date(now).toISOString()).date;
}
