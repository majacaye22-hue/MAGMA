import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import TeamManager from "./TeamManager";

export default async function TeamPage() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/staff/login");
  const { data: config, error: configError } = await db.from("app_config").select("owner_user_id").limit(1).maybeSingle();
  if (configError) throw new Error("No se pudo verificar el acceso al equipo.");
  if (config?.owner_user_id !== user.id) redirect("/staff");
  return <main className="mx-auto max-w-4xl px-6 py-10 text-white">
    <Link href="/staff" className="text-sm">← equipo</Link>
    <h1 className="magma-page-title mt-6">cuidadorxs de la casa</h1>
    <p className="mt-4 mb-8">Agrega a alguien por su @usuario. Cada persona usa su propia cuenta; solo tú puedes cambiar los permisos.</p>
    <TeamManager ownerId={user.id} />
  </main>;
}
