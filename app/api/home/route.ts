import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: posts, error: postsError }, { data: comments, error: commentsError }] = await Promise.all([
    authClient.from("posts").select("*, profiles!posts_author_id_fkey(username, display_name)").order("created_at", { ascending: false }),
    authClient.from("comments").select("post_id"),
  ]);

  if (postsError || commentsError) {
    return NextResponse.json({ error: postsError?.message ?? commentsError?.message }, { status: 500 });
  }
  if (process.env.NODE_ENV !== "production") {
    console.log("[api/home]", { ref: process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0], user: user.id, posts: posts?.length ?? 0 });
  }
  return NextResponse.json({ posts: posts ?? [], comments: comments ?? [] });
}
