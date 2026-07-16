import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

const isDev = process.env.NODE_ENV !== 'production';
const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Colectivo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_color: string;
  cover_image_url: string | null;
  is_private: boolean;
  colectivo_members: { count: number }[];
  colectivo_posts: { count: number }[];
};

function ColectivoCard({ col }: { col: Colectivo }) {
  const memberCount = col.colectivo_members?.[0]?.count ?? 0;

  return (
    <Link href={`/colectivos/${col.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          backgroundColor: "#141412",
          border: "0.5px solid #2a2a28",
          overflow: "hidden",
          transition: "border-color 0.15s ease",
        }}
        className="group hover:border-[#D85A30]"
      >
        {/* Cover image or solid color fallback */}
        <div style={{ height: "160px", position: "relative", overflow: "hidden", backgroundColor: col.avatar_color }}>
          {col.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={col.cover_image_url}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              backgroundColor: "#D85A30",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "48px", color: "#0c0c0b", fontFamily: syne, fontWeight: 800, opacity: 0.3, lineHeight: 1 }}>
                {col.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info row */}
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: col.avatar_color, flexShrink: 0 }} />
              <p style={{ fontSize: "14px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {col.name}
              </p>
            </div>
            {col.description && (
              <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {col.description}
              </p>
            )}
            <p style={{ fontSize: "9px", color: "#444441", fontFamily: mono, marginTop: "6px" }}>
              {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
            </p>
          </div>
          <span style={{
            flexShrink: 0,
            fontSize: "8px",
            fontFamily: mono,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            padding: "3px 8px",
            border: `0.5px solid ${col.is_private ? "#2a2a28" : "#5DCAA5"}`,
            color: col.is_private ? "#444441" : "#5DCAA5",
          }}>
            {col.is_private ? "privado" : "abierto"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function ColectivosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("colectivos")
    .select(`
      id, name, slug, description, avatar_color, cover_image_url, is_private,
      colectivo_members(count),
      colectivo_posts(count)
    `)
    .eq("is_private", false)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colectivos = (data ?? []) as unknown as Colectivo[];

  if (isDev) console.log("[colectivos page] raw data:", JSON.stringify(data, null, 2));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div style={{ paddingTop: "40px", paddingBottom: "32px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "32px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1, marginBottom: "8px" }}>
              colectivos
            </h1>
            <p style={{ fontSize: "11px", color: "#5F5E5A", fontFamily: mono, letterSpacing: "0.05em" }}>
              grupos de artistas con feed compartido
            </p>
          </div>
          <Link
            href="/colectivos/crear"
            style={{
              fontSize: "10px",
              fontFamily: mono,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#D85A30",
              border: "0.5px solid #D85A30",
              padding: "8px 16px",
              textDecoration: "none",
            }}
          >
            + crear colectivo
          </Link>
        </div>

        {colectivos.length === 0 ? (
          <div style={{ paddingTop: "80px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "#444441", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              sin colectivos todavía
            </p>
            <Link href="/colectivos/crear" style={{ display: "inline-block", marginTop: "16px", fontSize: "10px", color: "#D85A30", fontFamily: mono, textDecoration: "underline" }}>
              crear el primero →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
            {colectivos.map((col) => {
              const postCount = col.colectivo_posts?.[0]?.count ?? 0;
              if (!col.cover_image_url && postCount === 0) return null;
              return <ColectivoCard key={col.id} col={col} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
