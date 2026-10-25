import type { Post } from "@/app/components/card-art";
import { EVENT_DETAILS_ENABLED, type EventDetails } from "./event-details";
import { EVENT_MANAGEMENT_ENABLED, EVENT_MANAGEMENT_COLUMNS, type EventManagement } from "./event-management";

export type EventPreview = Pick<Post, "id" | "title" | "media_url" | "media_type" | "event_date" | "created_at" | "venue" | "address" | "is_free" | "price"> & { cover_url?: string | null } & EventDetails & EventManagement;
export const EVENT_PREVIEW_COLUMNS = "id,title,body,media_url,media_type,cover_url,event_date,created_at,venue,address,is_free,price" + (EVENT_DETAILS_ENABLED ? ",event_end_date,event_category" : "") + (EVENT_MANAGEMENT_ENABLED ? `,${EVENT_MANAGEMENT_COLUMNS}` : "");
export function eventDay(timestamp: number | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(timestamp));
}
