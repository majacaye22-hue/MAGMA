import type { getSupabaseClient } from "./supabase";

export async function sendDirectMessage(
  db: ReturnType<typeof getSupabaseClient>,
  conversationId: string,
  userId: string,
  attempt: { id: string; body: string },
) {
  const { data, error } = await db.from("messages").insert({
    id: attempt.id, conversation_id: conversationId, sender_id: userId, body: attempt.body,
  }).select("id").single();
  if (!error && data) return;
  // A lost response may still have committed. Confirm the same key, never upsert/overwrite.
  const { data: existing, error: lookupError } = await db.from("messages").select("id,body")
    .eq("id", attempt.id).eq("conversation_id", conversationId).eq("sender_id", userId).maybeSingle();
  if (lookupError || !existing || existing.body !== attempt.body) throw error ?? lookupError ?? new Error("unconfirmed");
}
