import { redirect } from "next/navigation";

// Direct links to /mensajes/[conversationId] redirect to the
// unified inbox with the conversation pre-selected via query param.
export default async function ConversationDirectLink({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  redirect(`/mensajes?c=${conversationId}`);
}
