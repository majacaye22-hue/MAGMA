import { SalaPageClient } from "./SalaPageClient";

export default async function EventSalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SalaPageClient eventId={id} />;
}
