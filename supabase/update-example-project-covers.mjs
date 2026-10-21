import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith("#") && line.includes("="))
  .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const url = "https://jbzkdzcaqmxsmmyrlwif.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error("Refusing non-staging database.");
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const keys = ["azoteas", "ruido", "entrelineas", "tinta", "ultima"];
const rows = [];
for (const [i, key] of keys.entries()) {
  const id = `e7a09280-0000-4000-8000-00000000000${i + 1}`;
  const cover = `/examples/projects/${key}.jpeg`;
  if (!fs.existsSync(`public${cover}`)) throw new Error("Missing cover asset.");
  const { data, error } = await db.from("projects").select("id,title,description,cover_image_url").eq("id", id).single();
  if (error) throw new Error(`Cannot read example ${key}: ${error.message}`);
  if (!data?.description?.startsWith("Proyecto de ejemplo")) throw new Error(`Not an example: ${key}`);
  rows.push({ ...data, cover });
}
for (const row of rows) {
  if (process.argv.includes("--apply")) {
    const result = await db.from("projects").update({ cover_image_url: row.cover }).eq("id", row.id).eq("description", row.description).select("cover_image_url").single();
    if (result.error || result.data?.cover_image_url !== row.cover) throw new Error(`Update failed: ${row.title}`);
  }
  console.log(JSON.stringify({ title: row.title, cover: row.cover, applied: process.argv.includes("--apply") }));
}
