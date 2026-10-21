import { SalaPageClient } from "./SalaPageClient";
import { redirect } from "next/navigation";
import { EVENT_SALA_ENABLED } from "@/lib/features";

export default async function EventSalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!EVENT_SALA_ENABLED) redirect(`/post/${id}`);
  return <SalaPageClient eventId={id} />;
}
