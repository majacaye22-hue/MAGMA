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

  const sellerInitials = listing.profiles?.display_name
    ? listing.profiles.display_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
    : (listing.profiles?.username ?? "?").slice(0, 2).toUpperCase();

  const isOwner = currentUserId === listing.user_id;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="max-w-5xl mx-auto px-6 pb-24">
        {/* Back */}
        <div style={{ paddingTop: "28px", marginBottom: "24px" }}>
          <Link href="/tianguis" style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ← tianguis
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "40px", alignItems: "start" }}>
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
                <span style={{ fontSize: "10px", color: "#2a2a28", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.1em" }}>sin imagen</span>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div style={{ position: "sticky", top: "80px" }}>
            {/* Category + availability */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <span style={{ fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", padding: "3px 10px", border: "0.5px solid #D85A30", color: "#D85A30" }}>
                {listing.category}
              </span>
              {!listing.is_available && (
                <span style={{ fontSize: "9px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", padding: "3px 10px", border: "0.5px solid #2a2a28", color: "#444441" }}>
                  vendido
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "26px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1.1, marginBottom: "16px" }}>
              {listing.title}
            </h1>

            <p style={{ fontSize: "28px", color: "#D85A30", fontFamily: mono, fontWeight: "bold", lineHeight: 1, marginBottom: "24px" }}>
              ${listing.price}{" "}
              <span style={{ fontSize: "12px", color: "#5F5E5A" }}>{listing.currency}</span>
            </p>

            {listing.description && (
              <p style={{ fontSize: "12px", color: "#888780", fontFamily: mono, lineHeight: 1.7, marginBottom: "24px", whiteSpace: "pre-wrap" }}>
                {listing.description}
              </p>
            )}

            {listing.location && (
              <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, marginBottom: "24px" }}>
                📍 {listing.location}
              </p>
            )}

            {/* Seller */}
            {listing.profiles && (
              <Link
                href={`/profile/${listing.profiles.username}`}
                style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", marginBottom: "24px", padding: "12px", border: "0.5px solid #2a2a28" }}
                className="hover:border-[#D85A30] transition-colors"
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "2px", flexShrink: 0,
                  backgroundColor: listing.profiles.avatar_color ?? "#D85A30",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "13px", color: "#0c0c0b", fontFamily: syne, fontWeight: 800 }}>{sellerInitials}</span>
                </div>
                <div>
                  <p style={{ fontSize: "12px", color: "#e8e4dc", fontFamily: syne, fontWeight: 700, lineHeight: 1 }}>
                    {listing.profiles.display_name ?? listing.profiles.username}
                  </p>
                  <p style={{ fontSize: "10px", color: "#5F5E5A", fontFamily: mono, marginTop: "2px" }}>
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
                  fontSize: "10px", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em",
                  border: "0.5px solid #2a2a28", color: "#5F5E5A", textDecoration: "none",
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
