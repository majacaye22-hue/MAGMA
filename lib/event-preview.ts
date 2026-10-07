import type { Post } from "@/app/components/card-art";

export type EventPreview = Pick<Post, "id" | "title" | "media_url" | "media_type" | "event_date" | "created_at" | "venue" | "address" | "is_free" | "price">;
export const EVENT_PREVIEW_COLUMNS = "id,title,body,media_url,media_type,event_date,created_at,venue,address,is_free,price";
export function eventDay(timestamp: number | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(timestamp));
}
