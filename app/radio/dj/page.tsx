"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { MagmaWordmark } from "@/app/components/MagmaWordmark";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

interface DJ {
  id: string;
  name: string;
  bio: string;
  instagram: string;
  genres: string;
  profiles: { username: string; display_name: string | null } | null;
}

interface RadioSettings {
  is_live: boolean;
}

export default function DJDashboard() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [dj, setDj] = useState<DJ | null>(null);
  const [isLive, setIsLive] = useState(false);
  const LISTENERS = 47;

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/radio"); return; }

      // Check approved DJ row
      const { data: djData } = await supabase
        .from("djs")
        .select("id, name, bio, instagram, genres, profiles(username, display_name)")
        .eq("user_id", user.id)
        .eq("approved", true)
        .single();

      if (!djData) { router.replace("/radio"); return; }
      setDj(djData as DJ);

      // Radio live status
      const { data: radioData } = await supabase
        .from("radio_settings")
        .select("is_live")
        .single();
      if (radioData) setIsLive((radioData as RadioSettings).is_live);

    })();
  }, []);

  if (!dj) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>

      <main className="max-w-5xl mx-auto px-6 pb-24 pt-12">

        {/* Header */}
        <div style={{ marginBottom: "40px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "8px" }}>
              <MagmaWordmark style={{ fontSize: "1em" }} /> radio / cabina
            </p>
            <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, }}>
              {dj.profiles?.display_name ?? dj.profiles?.username ?? dj.name}
            </h1>
            {dj.genres && (
              <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, marginTop: "6px" }}>
                {dj.genres}
              </p>
            )}
          </div>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "6px" }}>
            {isLive ? (
              <>
                <span style={{
                  display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: "#E12120", animation: "pulse-dot 1.4s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-ash)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                  en vivo
                </span>
              </>
            ) : (
              <>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2a2a28" }} />
                <span style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                  fuera del aire
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8" style={{ alignItems: "start" }}>

          {/* Left — DJ info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Stats */}
            <div style={{ display: "flex", gap: "32px" }}>
              <div>
                <p style={{ fontSize: "28px", color: "#F2F4F8", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
                  {LISTENERS}
                </p>
                <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginTop: "4px" }}>
                  escuchando ahora
                </p>
              </div>
            </div>

            <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

            {/* Bio */}
            {dj.bio && (
              <div>
                <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "10px" }}>
                  bio
                </p>
                <p style={{ fontSize: "var(--magma-text-body)", color: "var(--magma-muted)", fontFamily: mono, lineHeight: 1.8 }}>
                  {dj.bio}
                </p>
              </div>
            )}

            {/* Instagram */}
            {dj.instagram && (
              <div>
                <p style={{ fontSize: "var(--magma-text-small)", color: "var(--magma-muted)", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "10px" }}>
                  instagram
                </p>
                <a
                  href={dj.instagram.startsWith("http") ? dj.instagram : `https://instagram.com/${dj.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "var(--magma-text-body)", color: "var(--magma-ash)", fontFamily: mono, textDecoration: "none" }}
                  className="hover:opacity-70"
                >
                  {dj.instagram.startsWith("@") ? dj.instagram : `@${dj.instagram}`}
                </a>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
