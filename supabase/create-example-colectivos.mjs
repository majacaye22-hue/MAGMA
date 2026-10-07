// Additive staging fixtures; never alters existing colectivos or memberships.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith("#") && line.includes("="))
  .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const url = "https://jbzkdzcaqmxsmmyrlwif.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error("Refusing non-staging database.");
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const examples = [
  ["luz", "luz de banqueta", "Caminatas fotográficas para mirar de nuevo los barrios de la CDMX. Compartimos fotos, procesos y hallazgos."],
  ["onda", "onda suelta", "Un punto de encuentro para hacer ruido, intercambiar grabaciones y experimentar con sonidos de la ciudad."],
  ["papel", "papel de barrio", "Fanzines, poesía y publicaciones independientes. Nos juntamos a escribir, recortar y armar nuevas ediciones."],
  ["taller", "taller sin prisa", "Grabado, dibujo y pruebas que todavía no sabemos cómo llamar. Un espacio para aprender haciendo entre varias personas."],
  ["cine", "cine de azotea", "Cineastas y curiosos de la CDMX que comparten ideas, organizan funciones y se acompañan en sus primeros cortos."],
];
const usernames = examples.map((_, i) => `magma_prueba0${i + 1}`);
const { data: profiles, error } = await db.from("profiles").select("id,username").in("username", usernames);
if (error || profiles?.length !== 5) throw new Error("Five test profiles required.");
const rows = examples.map(([slug, name, description], i) => ({
  id: `e7a09280-0000-4000-9000-00000000000${i + 1}`,
  created_by: profiles.find(p => p.username === usernames[i]).id,
  name, slug: `ejemplo-${slug}`, description: `Colectivo de ejemplo · ${description}`,
  cover_image_url: `/examples/colectivos/${slug}.jpeg`, avatar_color: "#E12120", is_private: false,
}));
const { data: existing, error: readError } = await db.from("colectivos").select("id,created_by,slug").in("id", rows.map(row => row.id));
if (readError) throw readError;
for (const item of existing) {
  const expected = rows.find(row => row.id === item.id);
  if (item.created_by !== expected.created_by || item.slug !== expected.slug) throw new Error("Fixture ID collision.");
}
const missing = rows.filter(row => !existing.some(item => item.id === row.id));
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ environment: "staging", toCreate: missing.map(row => row.name) }));
} else {
  if (missing.length) {
    const { error: insertError } = await db.from("colectivos").insert(missing);
    if (insertError) throw insertError;
  }
  for (const row of rows) {
    const { data: members, error: memberError } = await db.from("colectivo_members").select("user_id,role").eq("colectivo_id", row.id).eq("user_id", row.created_by);
    if (memberError) throw memberError;
    if (!members.length) {
      const { error: addError } = await db.from("colectivo_members").insert({ colectivo_id: row.id, user_id: row.created_by, role: "admin" });
      if (addError) throw addError;
    } else if (members[0].role !== "admin") throw new Error("Existing creator role differs; not overwriting.");
  }
  const { data: verified, error: verifyError } = await db.from("colectivos").select("id,name,slug,colectivo_members(user_id,role)").in("id", rows.map(row => row.id));
  if (verifyError || verified?.length !== 5 || verified.some(group => !group.colectivo_members.some(member => member.user_id === rows.find(row => row.id === group.id).created_by && member.role === "admin"))) throw new Error("Verification failed.");
  console.log(JSON.stringify({ environment: "staging", created: missing.length, verified: verified.map(group => ({ name: group.name, slug: group.slug, members: group.colectivo_members.length })) }));
}
