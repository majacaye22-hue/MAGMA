import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { AjustesClient } from "./AjustesClient";

export default async function ColectivoAjustesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirectTo=/colectivos/${slug}/ajustes`);

  const { data: col } = await supabase
    .from("colectivos")
    .select("id, name, slug, description, avatar_color, is_private, created_by")
    .eq("slug", slug)
    .single();

  if (!col) notFound();

  // Only admins can access settings
  const { data: mem } = await supabase
    .from("colectivo_members")
    .select("role")
    .eq("colectivo_id", col.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = col.created_by === user.id || mem?.role === "admin";
  if (!isAdmin) redirect(`/colectivos/${slug}`);

  // Fetch members
  const { data: members } = await supabase
    .from("colectivo_members")
    .select("id, role, user_id, profiles(username, display_name)")
    .eq("colectivo_id", col.id)
    .order("created_at", { ascending: true });

  // Fetch pending join requests
  const { data: requests } = await supabase
    .from("colectivo_join_requests")
    .select("id, user_id, created_at, profiles(username, display_name)")
    .eq("colectivo_id", col.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <AjustesClient
      col={col}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      members={(members ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requests={(requests ?? []) as any}
      currentUserId={user.id}
    />
  );
}
