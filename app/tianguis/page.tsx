import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  location: string | null;
  images: string[];
  profiles: { username: string } | null;
};

const CATEGORIES = ["todo", "zine", "print", "libro", "objeto", "otro"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABEL: Record<Category, string> = {
  todo: "todo",
  zine: "zines",
  print: "prints",
  libro: "libros",
  objeto: "objetos",
  otro: "otro",
};

export default async function TianguisPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const activeCategory = (CATEGORIES.includes(cat as Category) ? cat : "todo") as Category;

  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("id, title, price, currency, category, location, images, profiles(username)")
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (activeCategory !== "todo") {
    query = query.eq("category", activeCategory);
  }

  const { data } = await query;
  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="max-w-6xl mx-auto px-6 pb-24">
        {/* Header */}
        <div style={{ paddingTop: "40px", paddingBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, marginBottom: "6px" }}>
              tianguis
            </h1>
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, letterSpacing: "0.05em" }}>
              compra y vende — directo entre artistas
            </p>
          </div>
          <Link
            href="/tianguis/crear"
            style={{
              fontSize: "var(--magma-text-small)",
              fontFamily: mono,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--magma-ash)",
              border: "0.5px solid #E12120",
              padding: "8px 16px",
              textDecoration: "none",
            }}
          >
            + publicar
          </Link>
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <Link data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String(isActive ? "#E12120" : "transparent"))}
                key={cat}
                href={cat === "todo" ? "/tianguis" : `/tianguis?cat=${cat}`}
                style={{
                  fontFamily: mono,
                  fontSize: "var(--magma-text-small)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  padding: "6px 14px",
                  border: `0.5px solid ${isActive ? "#E12120" : "#2a2a28"}`,
                  color: isActive ? "#0c0c0b" : "var(--magma-muted)",
                  backgroundColor: isActive ? "#E12120" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                {CATEGORY_LABEL[cat]}
              </Link>
            );
          })}
        </div>

        {/* Grid */}
        {listings.length === 0 ? (
          <div style={{ paddingTop: "80px", textAlign: "center" }}>
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              sin publicaciones todavía
            </p>
            <Link href="/tianguis/crear" style={{ display: "inline-block", marginTop: "16px", fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textDecoration: "underline" }}>
              publica el primero →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1px", backgroundColor: "#2a2a28" }}>
            {listings.map((listing) => {
              const img = listing.images?.[0] ?? null;
              return (
                <Link key={listing.id} href={`/tianguis/${listing.id}`} style={{ textDecoration: "none", display: "block", backgroundColor: "#0c0c0b" }}>
                  <div style={{ backgroundColor: "#0c0c0b", transition: "backgroundColor 0.15s ease" }} className="group">
                    {/* Image */}
                    <div style={{ height: "240px", backgroundColor: "#141412", position: "relative", overflow: "hidden" }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={listing.title}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "var(--magma-text-small)", color: "#2a2a28", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em" }}>sin imagen</span>
                        </div>
                      )}
                      {/* Category badge */}
                      <div style={{ position: "absolute", top: "10px", left: "10px" }}>
                        <span style={{
                          fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                          padding: "3px 8px", backgroundColor: "rgba(12,12,11,0.85)",
                          border: "0.5px solid #2a2a28", color: "var(--magma-ash)",
                        }}>
                          {listing.category}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: "14px 16px", borderTop: "0.5px solid #2a2a28" }}>
                      <p style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {listing.title}
                      </p>
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                        <p style={{ fontSize: "16px", color: "var(--magma-ash)", fontFamily: mono, fontWeight: "bold", lineHeight: 1 }}>
                          ${listing.price} <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)" }}>{listing.currency}</span>
                        </p>
                        <div style={{ textAlign: "right" }}>
                          {listing.profiles?.username && (
                            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>@{listing.profiles.username}</p>
                          )}
                          {listing.location && (
                            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono }}>{listing.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
