"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  is_available: boolean;
  images: string[];
  created_at: string;
};

export default function MisListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) { router.push("/auth/login?redirectTo=/tianguis/mis-listings"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("listings")
        .select("id, title, price, currency, category, is_available, images, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setListings((data ?? []) as Listing[]);
      setLoading(false);
    });
  }, [router]);

  async function toggleAvailability(id: string, current: boolean) {
    setToggling(id);
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("listings").update({ is_available: !current }).eq("id", id);
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, is_available: !current } : l));
    setToggling(null);
  }

  async function deleteListing(id: string) {
    if (!confirm("¿Eliminar este anuncio?")) return;
    setDeleting(id);
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("listings").delete().eq("id", id);
    setListings((prev) => prev.filter((l) => l.id !== id));
    setDeleting(null);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: "28px" }}>
          <Link href="/tianguis" style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← tianguis
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
          <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, }}>
            mi tianguis
          </h1>
          <Link
            href="/tianguis/crear"
            style={{
              fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
              color: "var(--magma-ash)", border: "0.5px solid #E12120", padding: "8px 16px", textDecoration: "none",
            }}
          >
            + publicar
          </Link>
        </div>

        {loading ? (
          <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>cargando...</p>
        ) : listings.length === 0 ? (
          <div style={{ paddingTop: "60px", textAlign: "center" }}>
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              sin publicaciones todavía
            </p>
            <Link href="/tianguis/crear" style={{ display: "inline-block", marginTop: "16px", fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textDecoration: "underline" }}>
              crear primer anuncio →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", backgroundColor: "#2a2a28" }}>
            {listings.map((listing) => {
              const img = listing.images?.[0] ?? null;
              return (
                <div key={listing.id} style={{ backgroundColor: "#0c0c0b", display: "flex", alignItems: "center", gap: "16px", padding: "16px" }}>
                  {/* Thumbnail */}
                  <div style={{ width: "72px", height: "72px", flexShrink: 0, backgroundColor: "#141412", overflow: "hidden", position: "relative" }}>
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/tianguis/${listing.id}`} style={{ textDecoration: "none" }}>
                      <p style={{ fontSize: "var(--magma-text-body)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700, lineHeight: 1.2, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {listing.title}
                      </p>
                    </Link>
                    <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, marginBottom: "4px" }}>
                      ${listing.price} {listing.currency}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 8px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)" }}>
                        {listing.category}
                      </span>
                      <span style={{ fontSize: "var(--magma-text-small)", color: listing.is_available ? "var(--magma-ash)" : "var(--magma-muted)", fontFamily: mono }}>
                        {listing.is_available ? "disponible" : "vendido"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => toggleAvailability(listing.id, listing.is_available)}
                      disabled={toggling === listing.id}
                      style={{
                        fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em",
                        padding: "6px 12px", border: `0.5px solid ${listing.is_available ? "#2a2a28" : "var(--magma-orange)"}`,
                        color: listing.is_available ? "var(--magma-muted)" : "var(--magma-ash)",
                        backgroundColor: "transparent", cursor: "pointer",
                      }}
                    >
                      {toggling === listing.id ? "..." : listing.is_available ? "marcar vendido" : "marcar disponible"}
                    </button>
                    <button
                      onClick={() => deleteListing(listing.id)}
                      disabled={deleting === listing.id}
                      style={{
                        fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em",
                        padding: "6px 12px", border: "0.5px solid #2a2a28",
                        color: "var(--magma-muted)", backgroundColor: "transparent", cursor: "pointer",
                      }}
                      className="hover:border-[#E12120] hover:text-[var(--magma-ash)] transition-colors"
                    >
                      {deleting === listing.id ? "..." : "eliminar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
