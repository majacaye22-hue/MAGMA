import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { DraftList } from "./DraftList";

export default async function DraftsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/borradores");
  const { data: profile } = await db.from("profiles").select("username").eq("id", user.id).single();
  if (profile?.username) redirect(`/profile/${encodeURIComponent(profile.username)}?tab=borradores`);
  return <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
    <h1 className="magma-page-title mb-4">borradores</h1>
    <p className="mb-6 text-sm text-[var(--magma-muted)]">solo los guardados con esta cuenta en este navegador. no se sincronizan entre dispositivos.</p>
    <DraftList userId={user.id} />
  </main>;
}
