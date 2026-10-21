export const EVENT_MANAGEMENT_ENABLED = process.env.NEXT_PUBLIC_EVENT_MANAGEMENT_ENABLED === "true";
export const EVENT_STATUSES = { scheduled: "programado", postponed: "pospuesto", cancelled: "cancelado" } as const;
export type EventStatus = keyof typeof EVENT_STATUSES;
export type EventManagement = { event_status?: EventStatus; event_status_note?: string | null; event_status_version?: number };
export const EVENT_MANAGEMENT_COLUMNS = "event_status,event_status_note,event_status_version";
export function eventUnavailable(event: EventManagement) {
  return event.event_status === "cancelled" || event.event_status === "postponed";
}
