import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.resolve(".env.local");
const flyerFile = "/Users/maja/Desktop/flyers/Screenshot 2026-04-09 at 2.31.07 p.m..png";
const eventTitle = "The Draaarty — ejemplo de Sala";

async function readEnv(file) {
  const contents = await fs.readFile(file, "utf8");
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
      }),
  );
}

const env = await readEnv(envFile);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: author, error: authorError } = await supabase
  .from("profiles")
  .select("id")
  .eq("username", "majmaj")
  .limit(1)
  .single();

if (authorError || !author) throw new Error(`Could not find the staging author: ${authorError?.message ?? "missing profile"}`);

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) throw new Error(`Could not inspect staging storage: ${bucketsError.message}`);

if (!buckets.some((bucket) => bucket.id === "media")) {
  const { error } = await supabase.storage.createBucket("media", { public: true });
  if (error) throw new Error(`Could not create staging media bucket: ${error.message}`);
}

const mediaPath = "staging-events/the-draaarty-sala-prueba.png";
const flyer = await fs.readFile(flyerFile);
const { error: uploadError } = await supabase.storage.from("media").upload(mediaPath, flyer, {
  contentType: "image/png",
  upsert: true,
});
if (uploadError) throw new Error(`Could not upload flyer to staging: ${uploadError.message}`);

const mediaUrl = supabase.storage.from("media").getPublicUrl(mediaPath).data.publicUrl;
const payload = {
  author_id: author.id,
  title: eventTitle,
  body: "Ejemplo de Sala en staging usando un flyer de referencia descubierto en Local.mx / Agenda Loca. No es una convocatoria activa: sirve para experimentar la conversación antes, durante y después de un encuentro.",
  type: "evento",
  media_url: mediaUrl,
  media_type: "image/png",
  event_date: "2026-08-11T20:00:00-06:00",
  venue: "Av. Oaxaca 99",
  address: "Roma Norte, CDMX",
  is_free: true,
  open_collab: true,
  collab_description: "Deja una nota, una recomendación o una coordinación para la sala.",
  tags: ["staging", "sala", "música"],
};

const { data: existing, error: existingError } = await supabase
  .from("posts")
  .select("id")
  .eq("title", eventTitle)
  .limit(1)
  .maybeSingle();
if (existingError) throw new Error(`Could not check existing staging event: ${existingError.message}`);

const result = existing
  ? await supabase.from("posts").update(payload).eq("id", existing.id).select("id").single()
  : await supabase.from("posts").insert(payload).select("id").single();

if (result.error || !result.data) throw new Error(`Could not save staging event: ${result.error?.message ?? "no event returned"}`);

console.log(`Staging test event ready: ${result.data.id}`);
