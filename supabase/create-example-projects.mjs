// Staging-only, additive examples. Stable IDs prevent duplicate creation.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith("#") && line.includes("="))
  .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const url = "https://jbzkdzcaqmxsmmyrlwif.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error("Refusing non-staging database.");
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const examples = [
  ["azoteas", "azoteas de la ciudad", "Una serie fotográfica sobre tendederos, tinacos y jardines improvisados en las azoteas de la CDMX."],
  ["ruido", "ruido de paso", "Un EP armado con grabaciones del Metro, pregones y percusiones encontradas en los recorridos de todos los días."],
  ["entrelineas", "entre líneas y banquetas", "Un fanzine de poemas, conversaciones escuchadas al pasar y dibujos hechos en las calles de la ciudad."],
  ["tinta", "tinta en común", "Pruebas de grabado y carteles hechos a mano. Un taller abierto para experimentar con papel, tinta y errores."],
  ["ultima", "última corrida", "Un cortometraje en proceso sobre los trayectos de regreso a casa cuando la ciudad está por amanecer."],
];
const usernames = examples.map((_, i) => `magma_prueba0${i + 1}`);
const { data: profiles, error } = await db.from("profiles").select("id,username").in("username", usernames);
if (error || profiles.length !== 5) throw new Error("Five test profiles required.");
const rows = examples.map(([slug, title, description], i) => ({
  id: `e7a09280-0000-4000-8000-00000000000${i + 1}`,
  author_id: profiles.find(p => p.username === usernames[i]).id,
  title, description: `Proyecto de ejemplo · ${description}`,
  cover_image_url: `/examples/projects/${slug}.jpeg`, links: {},
}));
const { data: existing, error: readError } = await db.from("projects").select("id").in("id", rows.map(row => row.id));
if (readError) throw readError;
const missing = rows.filter(row => !existing.some(item => item.id === row.id));
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ environment: "staging", toCreate: missing.map(row => row.title) }));
} else {
  if (missing.length) {
    const { error: insertError } = await db.from("projects").insert(missing);
    if (insertError) throw insertError;
  }
  const { data: verified, error: verifyError } = await db.from("projects").select("id,title,cover_image_url").in("id", rows.map(row => row.id));
  if (verifyError || verified.length !== 5) throw new Error("Verification failed.");
  console.log(JSON.stringify({ environment: "staging", created: missing.length, verified }));
}
