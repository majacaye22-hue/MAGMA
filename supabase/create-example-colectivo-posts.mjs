// Additive, repeatable demo content for the five seeded staging colectivos.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith("#") && line.includes("="))
  .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const url = "https://jbzkdzcaqmxsmmyrlwif.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error("Refusing non-staging database.");
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const examples = [
  ["luz", [
    ["caminar sin buscar la foto", "Propongo una caminata por Santa María la Ribera: una hora, una sola calle y nada de perseguir la foto perfecta. ¿Qué horario les funciona? Traigan cámara o celular; la mirada no depende del equipo."],
    ["ejercicio: una esquina, tres miradas", "Para la siguiente ronda, compartamos tres imágenes de la misma esquina: un detalle, alguien que pasa y algo que normalmente ignoramos. Cuéntenos qué cambió entre la primera y la última toma."],
    ["mesa de edición colectiva", "Estoy armando una serie sobre las sombras de los puestos cuando cierran. Busco dos personas para revisar la secuencia conmigo. A cambio, puedo ayudarles a editar su próxima serie. ¿Quién trae algo a medio hacer?"],
  ]],
  ["onda", [
    ["¿a qué suena tu cuadra?", "Abramos un pequeño archivo sonoro de la CDMX. Grabemos treinta segundos de un lugar cotidiano y anotemos colonia, hora y qué nos hizo detenernos. Evitemos conversaciones privadas: queremos escuchar el barrio, no espiar a nadie."],
    ["busco ruido para una pieza", "Tengo una base hecha con el ritmo de una cortina metálica. Me gustaría cruzarla con voz, percusión o un sintetizador prestado. No hace falta tener una canción terminada: compartamos ideas por aquí antes de juntarnos."],
    ["escucha sin escenario", "¿Armamos una sesión para escuchar trabajos en proceso? Diez minutos por persona, sin concurso y sin obligación de tocar en vivo. En comentarios podemos proponer espacio, equipo disponible y duración."],
  ]],
  ["papel", [
    ["una página para lo que no cabe", "Convocatoria de prueba para un fanzine colectivo: una página sobre algo de la ciudad que no queremos perder. Puede ser un poema, una lista, un dibujo o una conversación inventada. Primero reunimos propuestas aquí y después decidimos formato."],
    ["antes de mandar a imprimir", "Estoy probando una edición doblada de ocho páginas. ¿Alguien quiere revisar legibilidad y orden? También podemos comparar papeles y costos de impresión. Dejemos recomendaciones con fecha, porque los precios cambian."],
    ["intercambio de lecturas", "Traigo este inicio: «la ciudad doblada en mi bolsillo / todavía hace ruido». Busco otra mirada, no una corrección definitiva. Compartan un fragmento propio y dígannos qué tipo de devolución les serviría."],
  ]],
  ["taller", [
    ["la prueba fallida también cuenta", "En esta ronda compartamos una prueba que no salió como esperábamos y lo que aprendimos. En mi caso, demasiada tinta borró los detalles del grabado. ¿Qué cambiarían antes del siguiente intento?"],
    ["herramientas que podemos compartir", "Hagamos una lista de materiales disponibles para una sesión común: rodillos, gubias, recortes y papeles de prueba. Anoten qué pueden llevar y qué necesitan. Los préstamos y devoluciones se acuerdan entre quienes participan."],
    ["una tarde para empezar", "Propongo trabajar sobre una misma palabra: grieta. Cada quien elige técnica y al final mostramos el proceso, no sólo el resultado. ¿Les interesa? Definamos juntos fecha, espacio y cómo repartir materiales."],
  ]],
  ["cine", [
    ["un corto que cabe en una azotea", "Tengo una idea de tres minutos: dos vecinos se comunican con objetos que dejan al sol. Busco alguien que quiera pensar el sonido y otra persona para cámara. Antes de grabar, armemos un guion breve y pidamos permiso para usar el espacio."],
    ["programemos una función", "¿Qué les gustaría ver en una primera sesión? Propongan cortos propios o trabajos cuyos autores nos puedan autorizar la proyección. Podemos reunir las propuestas aquí y acordar duración, equipo y accesibilidad del lugar."],
    ["ver el corte antes de cerrarlo", "Abramos una ronda de revisión: cada persona trae una escena y una pregunta concreta. ¿Se entiende el cambio de tiempo? ¿Sobra ese silencio? Primero escuchamos qué necesita quien hizo la pieza y después comentamos."],
  ]],
];
const ids = examples.map((_, i) => `e7a09280-0000-4000-9000-00000000000${i + 1}`);
const { data: groups, error } = await db.from("colectivos").select("id,slug,name,created_by,description").in("id", ids);
if (error) throw error;
if (groups.length !== examples.length) throw new Error("Missing example colectivos.");
const { data: profiles, error: profileError } = await db.from("profiles").select("id,username").in("id", groups.map(g => g.created_by));
if (profileError) throw profileError;
const rows = examples.flatMap(([slug, posts], i) => {
  const group = groups.find(g => g.id === ids[i]);
  if (group.slug !== `ejemplo-${slug}` || !group.description.startsWith("Colectivo de ejemplo") || !profiles.some(p => p.id === group.created_by && p.username === `magma_prueba0${i + 1}`)) throw new Error("Example ownership mismatch.");
  return posts.map(([title, body], j) => ({
    id: `e7a09281-0000-4000-9000-${String(i * 3 + j + 1).padStart(12, "0")}`,
    author_id: group.created_by, title, type: "escrito",
    content: `<p><em>Publicación de ejemplo · propuesta ficticia para explorar el colectivo.</em></p><p>${body}</p>`,
    body: null, tags: ["ejemplo-colectivo"], comments_enabled: true, is_sensitive: false,
    moderation_status: "approved", is_hidden: false,
    groupId: group.id,
  }));
});
const { data: existing, error: readError } = await db.from("posts").select("id,author_id,title,tags").in("id", rows.map(r => r.id));
if (readError) throw readError;
for (const post of existing) {
  const expected = rows.find(r => r.id === post.id);
  if (post.author_id !== expected.author_id || post.title !== expected.title || !post.tags?.includes("ejemplo-colectivo")) throw new Error("Post fixture collision.");
}
const missing = rows.filter(r => !existing.some(p => p.id === r.id));
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ environment: "staging", toCreate: missing.length, groups: groups.map(g => g.name) }));
} else {
  if (missing.length) {
    const { error } = await db.from("posts").insert(missing.map(({ groupId, ...post }) => ({ ...post, audience_colectivo_id: groupId })));
    if (error) throw error;
  }
  for (const row of rows) {
    const { data, error } = await db.from("colectivo_posts").select("post_id").eq("colectivo_id", row.groupId).eq("post_id", row.id);
    if (error) throw error;
    if (!data.length) {
      const { error } = await db.from("colectivo_posts").insert({ colectivo_id: row.groupId, post_id: row.id, added_by: row.author_id });
      if (error) throw error;
    }
  }
  const { data, error } = await db.from("colectivo_posts").select("colectivo_id,post_id").in("post_id", rows.map(r => r.id));
  if (error || !rows.every(r => data?.some(link => link.post_id === r.id && link.colectivo_id === r.groupId))) throw new Error("Link verification failed.");
  console.log(JSON.stringify({ environment: "staging", created: missing.length, verifiedPosts: rows.length, colectivos: groups.map(g => g.name) }));
}
