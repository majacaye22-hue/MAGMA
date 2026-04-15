"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
const supabase = getSupabaseClient();

interface Profile {
  username: string;
  display_name: string | null;
}

function getInitials(p: Profile): string {
  if (p.display_name) {
    return p.display_name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return p.username.slice(0, 2).toUpperCase();
}

function MagmaLogo() {
  return (
    <span
      style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}
      className="text-2xl tracking-tight select-none"
    >
      {"MAGMA".split("").map((l, i) =>
        l === "A" ? (
          <span key={i} style={{ color: "#D85A30" }}>{l}</span>
        ) : (
          <span key={i} style={{ color: "#e8e4dc" }}>{l}</span>
        )
      )}
    </span>
  );
}

export function Navbar({ active }: { active?: "upload" | "eventos" | "radio" | "manifiestos" }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", user.id)
          .single();
        setProfile(data);
        void fetchUnread(user.id);
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", session.user.id)
            .single();
          setProfile(data);
          void fetchUnread(session.user.id);
        } else {
          setProfile(null);
          setUnreadCount(0);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUnread(uid: string) {
    // Get conversations for this user
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`);

    if (!convos || convos.length === 0) return;

    const ids = convos.map((c: { id: string }) => c.id);
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", ids)
      .eq("read", false)
      .neq("sender_id", uid);

    setUnreadCount(count ?? 0);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "rgba(12,12,11,0.92)",
        borderColor: "#2a2a28",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/">
          <MagmaLogo />
        </Link>

        <div className="flex items-center gap-5">
          <Link
            href="/radio"
            className="text-xs"
            style={{
              color: active === "radio" ? "#D85A30" : "#888780",
              fontFamily: "var(--font-space-mono), monospace",
            }}
          >
            radio
          </Link>
          <Link
            href="/eventos"
            className="text-xs"
            style={{
              color: active === "eventos" ? "#EF9F27" : "#888780",
              fontFamily: "var(--font-space-mono), monospace",
            }}
          >
            eventos
          </Link>
          <Link
            href="/upload"
            className="text-xs"
            style={{
              color: active === "upload" ? "#D85A30" : "#888780",
              fontFamily: "var(--font-space-mono), monospace",
            }}
          >
            subir obra
          </Link>

          {/* Auth area — hidden until session resolves to avoid flash */}
          {!loading && (
            profile ? (
              /* Logged in — ir en vivo + avatar with dropdown */
              <>
              <Link
                href="/radio/solicitar"
                className="text-xs"
                style={{
                  color: "#5DCAA5",
                  fontFamily: "var(--font-space-mono), monospace",
                  border: "0.5px solid #5DCAA5",
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                ir en vivo
              </Link>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center justify-center text-xs font-bold cursor-pointer"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "2px",
                    backgroundColor: "#D85A30",
                    color: "#0c0c0b",
                    fontFamily: "var(--font-syne), sans-serif",
                  }}
                >
                  {getInitials(profile)}
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 flex flex-col"
                    style={{
                      backgroundColor: "#141412",
                      border: "0.5px solid #2a2a28",
                      minWidth: "140px",
                      zIndex: 100,
                    }}
                  >
                    <Link
                      href={`/profile/${profile.username}`}
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors"
                      style={{ color: "#e8e4dc", fontFamily: "var(--font-space-mono), monospace" }}
                    >
                      mi perfil
                    </Link>
                    <Link
                      href="/mensajes"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t flex items-center justify-between"
                      style={{ color: "#e8e4dc", fontFamily: "var(--font-space-mono), monospace", borderColor: "#2a2a28" }}
                    >
                      mensajes
                      {unreadCount > 0 && (
                        <span
                          className="flex items-center justify-center text-[9px] font-bold"
                          style={{ minWidth: "16px", height: "16px", borderRadius: "2px", backgroundColor: "#D85A30", color: "#0c0c0b", padding: "0 4px" }}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/upload"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#e8e4dc", fontFamily: "var(--font-space-mono), monospace", borderColor: "#2a2a28" }}
                    >
                      subir obra
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-3 text-xs text-left cursor-pointer hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace", borderColor: "#2a2a28" }}
                    >
                      salir
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              /* Logged out */
              <div className="flex items-center gap-4">
                <Link
                  href="/auth/login"
                  className="text-xs"
                  style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}
                >
                  entrar
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 py-1 text-xs cursor-pointer"
                  style={{
                    backgroundColor: "#D85A30",
                    color: "#0c0c0b",
                    fontFamily: "var(--font-space-mono), monospace",
                  }}
                >
                  únete
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
