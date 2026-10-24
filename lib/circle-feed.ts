import type { SupabaseClient } from "@supabase/supabase-js";

export function feedHref(href: string, circle: boolean) {
  if (!circle) return href;
  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("feed", "circulo");
  return `${path}?${params}`;
}

// Use an inner join so filtering, counts and pagination happen in the database,
// under the viewer's existing post and private-circle RLS policies.
export function postsForFeed(db: SupabaseClient, circleOwner?: string) {
  let query = db.from("posts").select(circleOwner
    ? "*, comments(count), profiles!posts_author_id_fkey!inner(username, display_name, profile_circle!profile_circle_member_id_fkey!inner(owner_id))"
    : "*, comments(count), profiles!posts_author_id_fkey(username, display_name)", { count: "exact" })
    .is("audience_colectivo_id", null)
    .neq("type", "evento");
  if (circleOwner) query = query.eq("profiles.profile_circle.owner_id", circleOwner);
  return query.order("created_at", { ascending: false }).order("id", { ascending: false });
}
