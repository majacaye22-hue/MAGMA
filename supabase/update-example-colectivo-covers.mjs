import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith("#") && line.includes("="))
  .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const url = "https://jbzkdzcaqmxsmmyrlwif.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error("Refusing non-staging database.");
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const keys = ["luz", "onda", "papel", "taller", "cine"];
for (const [i, key] of keys.entries()) {
  const id = `e7a09280-0000-4000-9000-00000000000${i + 1}`;
  const slug = `ejemplo-${key}`;
  const cover = `/examples/colectivos/${key}.jpeg`;
  if (!fs.existsSync(`public${cover}`)) throw new Error("Missing cover asset.");
  const { data, error } = await db.from("colectivos").select("id,name,slug,cover_image_url").eq("id", id).eq("slug", slug).single();
  if (error || !data) throw new Error(`Fixture not found: ${slug}`);
  if (process.argv.includes("--apply")) {
    const result = await db.from("colectivos").update({ cover_image_url: cover }).eq("id", id).eq("slug", slug).select("cover_image_url").single();
    if (result.error || result.data?.cover_image_url !== cover) throw new Error(`Update failed: ${slug}`);
  }
  console.log(JSON.stringify({ name: data.name, cover, applied: process.argv.includes("--apply") }));
}
