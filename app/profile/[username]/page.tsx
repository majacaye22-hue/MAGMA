import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { ProfileView, type ProfileData } from "./ProfileView";
import type { Post } from "@/app/components/card-art";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  // Use select("*") so the query never fails due to missing optional columns
  // (bio, disciplines, avatar_color may not exist if migration hasn't run yet)
  const [{ data: profileData }, { data: { user } }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!profileData) notFound();

  const profile = profileData as ProfileData;
  const currentUserId = user?.id ?? null;
  const isOwnProfile = currentUserId === profile.id;

  // Fetch posts with profiles join — author_id matches profile.id (= auth uid)
  const { data: postsData } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false });

  const posts = (postsData ?? []) as Post[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      <ProfileView
        profile={profile}
        posts={posts}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
      />
    </div>
  );
}
