import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: event, error: eventError }, { data: messages, error: messagesError }] = await Promise.all([
    authClient.from("posts").select("*, profiles!posts_author_id_fkey(username, display_name)").eq("id", id).eq("type", "evento").maybeSingle(),
    authClient.from("event_sala_messages").select("*, profiles!event_sala_messages_user_id_fkey(username, display_name, avatar_color)").eq("event_id", id).order("created_at", { ascending: true }).limit(200),
  ]);

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 });
  if (!event || !event.event_date) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ event, messages: messages ?? [], currentUserId: user.id });
}
