import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ContactSellerButton } from "./ContactSellerButton";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string;
  location: string | null;
  images: string[];
  is_available: boolean;
  user_id: string;
  profiles: { username: string; display_name: string | null; avatar_color: string | null } | null;
};

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const { data } = await supabase
    .from("listings")
    .select("id, title, description, price, currency, category, location, images, is_available, user_id, profiles(username, display_name, avatar_color)")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const listing = data as unknown as Listing;


  const isOwner = currentUserId === listing.user_id;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="max-w-5xl mx-auto px-6 pb-24">
        {/* Back */}
        <div style={{ paddingTop: "28px", marginBottom: "24px" }}>
          <Link href="/tianguis" style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← tianguis
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px]" style={{ gap: "40px", alignItems: "start" }}>
          {/* Images */}
          <div>
            {listing.images && listing.images.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", backgroundColor: "#2a2a28" }}>
                {listing.images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={listing.title}
                    style={{ width: "100%", display: "block", maxHeight: "600px", objectFit: "contain", backgroundColor: "#141412" }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ height: "400px", backgroundColor: "#141412", display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid #2a2a28" }}>
                <span style={{ fontSize: "var(--magma-text-small)", color: "#2a2a28", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em" }}>sin imagen</span>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div style={{ position: "sticky", top: "80px" }}>
            {/* Category + availability */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <span style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", padding: "3px 10px", border: "0.5px solid #E12120", color: "var(--magma-ash)" }}>
                {listing.category}
              </span>
              {!listing.is_available && (
                <span style={{ fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", padding: "3px 10px", border: "0.5px solid #2a2a28", color: "var(--magma-muted)" }}>
                  vendido
                </span>
              )}
            </div>

            <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, marginBottom: "16px" }}>
              {listing.title}
            </h1>

            <p style={{ fontSize: "28px", color: "var(--magma-ash)", fontFamily: mono, fontWeight: "bold", lineHeight: 1, marginBottom: "24px" }}>
              ${listing.price}{" "}
              <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)" }}>{listing.currency}</span>
            </p>

            {listing.description && (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.7, marginBottom: "24px", whiteSpace: "pre-wrap" }}>
                {listing.description}
              </p>
            )}

            {listing.location && (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, marginBottom: "24px" }}>
                📍 {listing.location}
              </p>
            )}

            {/* Seller */}
            {listing.profiles && (
              <Link
                href={`/profile/${listing.profiles.username}`}
                style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", marginBottom: "24px", padding: "12px", border: "0.5px solid #2a2a28" }}
                className="hover:border-[#E12120] transition-colors"
              >

                <div>
                  <p style={{ fontSize: "var(--magma-text-small)", color: "#F2F4F8", fontFamily: syne, fontWeight: 700, lineHeight: 1 }}>
                    {listing.profiles.display_name ?? listing.profiles.username}
                  </p>
                  <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, marginTop: "2px" }}>
                    @{listing.profiles.username}
                  </p>
                </div>
              </Link>
            )}

            {/* CTA */}
            {listing.is_available && !isOwner && (
              <ContactSellerButton
                listingId={listing.id}
                sellerId={listing.user_id}
                currentUserId={currentUserId}
              />
            )}

            {isOwner && (
              <Link
                href="/tianguis/mis-listings"
                style={{
                  display: "block", textAlign: "center", padding: "12px",
                  fontSize: "var(--magma-text-small)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                  border: "0.5px solid #2a2a28", color: "var(--magma-muted)", textDecoration: "none",
                }}
              >
                gestionar mi tianguis →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
