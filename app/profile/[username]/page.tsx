import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { ProfileView, type ProfileData } from "./ProfileView";
import type { Post } from "@/app/components/card-art";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) notFound();

  // Use select("*") so the query never fails due to missing optional columns
  // (bio, disciplines, avatar_color may not exist if migration hasn't run yet)
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (profileError) throw new Error(`No se pudo cargar el perfil: ${profileError.message}`);
  if (!profileData) notFound();

  const profile = profileData as ProfileData;
  const currentUserId = user.id;
  const isOwnProfile = currentUserId === profile.id;

  // Fetch posts with profiles join — author_id matches profile.id (= auth uid)
  const [{ data: postsData, error: postsError }, { count: commentCount }, { count: colectivoCount }, { data: cartelPostData }, { data: radioPostData }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(username, display_name)")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("colectivo_members").select("colectivo_id", { count: "exact", head: true }).eq("user_id", profile.id),
    profile.casa_cartel_post_id
      ? supabase.from("posts").select("*, profiles!posts_author_id_fkey(username, display_name)").eq("id", profile.casa_cartel_post_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.casa_radio_post_id
      ? supabase.from("posts").select("*, profiles!posts_author_id_fkey(username, display_name)").eq("id", profile.casa_radio_post_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (postsError) throw new Error(`No se pudieron cargar las obras: ${postsError.message}`);
  const posts = (postsData ?? []) as Post[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      <ProfileView
        profile={profile}
        posts={posts}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
        laTrama={{ comments: commentCount ?? 0, colectivos: colectivoCount ?? 0 }}
        cartelPost={cartelPostData as Post | null}
        radioPost={radioPostData as Post | null}
      />
    </div>
  );
}
