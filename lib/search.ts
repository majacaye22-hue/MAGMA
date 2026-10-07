import type { SupabaseClient } from "@supabase/supabase-js";

export const SEARCH_TYPES = ["todo", "publicaciones", "personas", "proyectos", "colectivos"] as const;
export type SearchType = typeof SEARCH_TYPES[number];
type Category = Exclude<SearchType, "todo">;
export type SearchResult = { id: string; title: string; description: string; href: string; label: string };
export type SearchGroup = { type: Category; rows: SearchResult[]; hasMore: boolean; error: boolean };

export function normalizeSearch(value: string) {
  // Limit input and remove PostgREST filter grammar and SQL wildcard characters.
  // Keep accented Spanish text, numbers, hyphens and literal username underscores.
  return value.slice(0, 160).normalize("NFC").replace(/[^\p{L}\p{N}\s_-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function searchParamsFrom(params: Record<string, string | string[] | undefined>) {
  const q = normalizeSearch(typeof params.q === "string" ? params.q : "");
  const type: SearchType = SEARCH_TYPES.includes(params.tipo as SearchType) ? params.tipo as SearchType : "todo";
  const number = typeof params.pagina === "string" ? Number(params.pagina) : 1;
  const page = type !== "todo" && Number.isSafeInteger(number) && number > 0 && number <= 500 ? number : 1;
  return { q, type, page };
}

export function searchHref(q: string, type: SearchType = "todo", page = 1) {
  return `/buscar?${new URLSearchParams({ q, tipo: type, ...(page > 1 ? { pagina: String(page) } : {}) })}`;
}

export function searchFilter(fields: string[], q: string, tags = false) {
  const pattern = `%${normalizeSearch(q).replace(/_/g, "\\_")}%`;
  const literal = JSON.stringify(pattern); // quote/escape PostgREST filter values
  const clauses = fields.map(field => `${field}.ilike.${literal}`);
  if (tags) {
    const terms = [...new Set([q, ...q.split(" ")].map(term => normalizeSearch(term).toLocaleLowerCase("es-MX")).filter(Boolean))];
    clauses.push(`tags.ov.{${terms.map(term => JSON.stringify(term)).join(",")}}`);
  }
  return clauses.join(",");
}

function excerpt(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function searchMagma(db: SupabaseClient, q: string, type: SearchType, page: number): Promise<SearchGroup[]> {
  if (q.length < 2) return [];
  const categories: Category[] = type === "todo" ? ["publicaciones", "personas", "proyectos", "colectivos"] : [type];
  const limit = type === "todo" ? 6 : 20;
  const start = (page - 1) * limit;
  return Promise.all(categories.map(async category => {
    try {
      let rows: SearchResult[];
      if (category === "publicaciones") {
        const { data, error } = await db.from("posts").select("id,title,body,type,is_sensitive,created_at")
          .eq("is_hidden", false).eq("moderation_status", "approved")
          .is("audience_colectivo_id", null)
          .or(searchFilter(["title", "body"], q, true))
          .order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + limit);
        if (error) throw error;
        rows = (data ?? []).map(row => ({ id: row.id, title: row.is_sensitive ? "publicación con contenido sensible" : row.title || "sin título",
          description: row.is_sensitive ? "abre la publicación para revisar el aviso de contenido." : excerpt(row.body), href: `/post/${row.id}`, label: row.type === "escrito" ? "letras" : row.type }));
      } else if (category === "personas") {
        const { data, error } = await db.from("profiles").select("id,username,display_name,bio")
          .or(searchFilter(["username", "display_name", "bio"], q))
          .order("username").order("id").range(start, start + limit);
        if (error) throw error;
        rows = (data ?? []).map(row => ({ id: row.id, title: `@${row.username}`, description: excerpt(row.bio), href: `/profile/${encodeURIComponent(row.username)}`, label: row.display_name || "persona" }));
      } else if (category === "proyectos") {
        const { data, error } = await db.from("projects").select("id,title,description,created_at")
          .or(searchFilter(["title", "description"], q))
          .order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + limit);
        if (error) throw error;
        rows = (data ?? []).map(row => ({ id: row.id, title: row.title, description: excerpt(row.description), href: `/proyecto/${row.id}`, label: "proyecto" }));
      } else {
        const { data, error } = await db.from("colectivos").select("id,name,slug,description,created_at")
          .eq("is_private", false).or(searchFilter(["name", "description"], q))
          .order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + limit);
        if (error) throw error;
        rows = (data ?? []).map(row => ({ id: row.id, title: row.name, description: excerpt(row.description), href: `/colectivos/${encodeURIComponent(row.slug)}`, label: "colectivo" }));
      }
      return { type: category, rows: rows.slice(0, limit), hasMore: rows.length > limit, error: false };
    } catch { return { type: category, rows: [], hasMore: false, error: true }; }
  }));
}
