import { createClient } from "@/lib/supabase-server";
import { Feed } from "./components/feed";
import { Navbar } from "./components/navbar";
import type { Post } from "./components/card-art";

export default async function Home() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .order("created_at", { ascending: false });

  const posts: Post[] = data ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <Feed posts={posts} />
      </main>
    </div>
  );
}
