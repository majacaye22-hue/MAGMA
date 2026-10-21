import type { getSupabaseClient } from "./supabase";
import type { OfferingReference } from './offering-reference';

export async function sendDirectMessage(
  db: ReturnType<typeof getSupabaseClient>,
  conversationId: string,
  userId: string,
  attempt: { id: string; body: string; offering_reference?: OfferingReference },
) {
  const { data, error } = await db.from("messages").insert({
    id: attempt.id, conversation_id: conversationId, sender_id: userId, body: attempt.body,
    ...(attempt.offering_reference ? { offering_reference: attempt.offering_reference } : {}),
  }).select("id").single();
  if (!error && data) return;
  // A lost response may still have committed. Confirm the same key, never upsert/overwrite.
  const { data: existing, error: lookupError } = await db.from("messages").select(attempt.offering_reference ? "id,body,offering_reference" : "id,body")
    .eq("id", attempt.id).eq("conversation_id", conversationId).eq("sender_id", userId).maybeSingle();
  if (lookupError || !existing || existing.body !== attempt.body) throw error ?? lookupError ?? new Error("unconfirmed");
  if (attempt.offering_reference && (existing.offering_reference?.id !== attempt.offering_reference.id || existing.offering_reference?.title !== attempt.offering_reference.title || existing.offering_reference?.username !== attempt.offering_reference.username)) throw new Error('unconfirmed reference');
}
