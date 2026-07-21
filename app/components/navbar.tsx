"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

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

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {open ? (
        <>
          <line x1="4" y1="4" x2="16" y2="16" stroke="#888780" strokeWidth="1.5" strokeLinecap="square" />
          <line x1="16" y1="4" x2="4" y2="16" stroke="#888780" strokeWidth="1.5" strokeLinecap="square" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="17" y2="6" stroke="#888780" strokeWidth="1.5" strokeLinecap="square" />
          <line x1="3" y1="10" x2="17" y2="10" stroke="#888780" strokeWidth="1.5" strokeLinecap="square" />
          <line x1="3" y1="14" x2="17" y2="14" stroke="#888780" strokeWidth="1.5" strokeLinecap="square" />
        </>
      )}
    </svg>
  );
}

const mono = "var(--font-space-mono), monospace";

const NAV_LINKS = [
  { href: "/manifiesto", label: "manifiesto" },
  { href: "/radio",      label: "radio" },
  { href: "/colectivos", label: "colectivos" },
  { href: "/tianguis",   label: "tianguis" },
  { href: "/upload",     label: "subir obra" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabaseRef = useRef(getSupabaseClient());
  const supabase = supabaseRef.current;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close both menus on navigation
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const client = supabaseRef.current;

    async function loadProfile(userId: string) {
      const { data } = await client
        .from("profiles")
        .select("username, display_name")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data ?? null);
      void fetchUnread(userId);
    }

    // Read session immediately on mount so the avatar appears without waiting
    // for the async onAuthStateChange event.
    client.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) void loadProfile(session.user.id);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          void loadProfile(session.user.id);
        } else {
          setProfile(null);
          setUnreadCount(0);
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUnread(uid: string) {
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

  // Close desktop dropdown when clicking outside
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
    setMobileOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function linkColor(href: string) {
    return pathname.startsWith(href) ? "#D85A30" : "#888780";
  }

  const unreadBadge = unreadCount > 0 ? (
    <span
      className="flex items-center justify-center text-[9px] font-bold"
      style={{ minWidth: "16px", height: "16px", borderRadius: "2px", backgroundColor: "#D85A30", color: "#0c0c0b", padding: "0 4px" }}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  ) : null;

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "rgba(12,12,11,0.92)",
        borderColor: "#2a2a28",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* ── Top bar (always visible) ── */}
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <MagmaLogo />
        </Link>

        {/* Desktop nav — hidden below md */}
        <div className="hidden md:flex items-center gap-5">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs"
              style={{ color: linkColor(href), fontFamily: mono }}
            >
              {label}
            </Link>
          ))}

          {profile ? (
            <>
              <Link
                href="/radio/solicitar"
                className="text-xs"
                style={{
                  color: "#5DCAA5",
                  fontFamily: mono,
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
                      style={{ color: "#e8e4dc", fontFamily: mono }}
                    >
                      mi perfil
                    </Link>
                    <Link
                      href="/mensajes"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t flex items-center justify-between"
                      style={{ color: "#e8e4dc", fontFamily: mono, borderColor: "#2a2a28" }}
                    >
                      mensajes
                      {unreadBadge}
                    </Link>
                    <Link
                      href="/tianguis/mis-listings"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#e8e4dc", fontFamily: mono, borderColor: "#2a2a28" }}
                    >
                      mi tianguis
                    </Link>
                    <Link
                      href="/upload"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#e8e4dc", fontFamily: mono, borderColor: "#2a2a28" }}
                    >
                      subir obra
                    </Link>
                    <Link
                      href="/manifiesto"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#5F5E5A", fontFamily: mono, borderColor: "#2a2a28" }}
                    >
                      manifiesto
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-3 text-xs text-left cursor-pointer hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#5F5E5A", fontFamily: mono, borderColor: "#2a2a28" }}
                    >
                      salir
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-xs"
                style={{ color: "#888780", fontFamily: mono }}
              >
                entrar
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-1 text-xs cursor-pointer"
                style={{
                  backgroundColor: "#D85A30",
                  color: "#0c0c0b",
                  fontFamily: mono,
                }}
              >
                únete
              </Link>
            </div>
          )}
        </div>

        {/* Mobile right: unread badge shortcut + hamburger — hidden at md+ */}
        <div className="flex items-center gap-3 md:hidden">
          {unreadCount > 0 && (
            <Link href="/mensajes" style={{ lineHeight: 0 }}>
              {unreadBadge}
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex items-center justify-center cursor-pointer"
            style={{ background: "none", border: "none", padding: "4px" }}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer — hidden at md+ ── */}
      {mobileOpen && (
        <div
          className="md:hidden border-t flex flex-col"
          style={{ borderColor: "#2a2a28", backgroundColor: "rgba(12,12,11,0.97)" }}
        >
          {/* Primary nav links */}
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="px-6 py-4 text-xs border-b"
              style={{ color: linkColor(href), fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
            >
              {label}
            </Link>
          ))}

          {/* Divider */}
          <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

          {/* Auth-dependent links */}
          {profile ? (
            <>
              <Link
                href="/radio/solicitar"
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b"
                style={{ color: "#5DCAA5", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                ir en vivo
              </Link>
              <Link
                href={`/profile/${profile.username}`}
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b"
                style={{ color: "#e8e4dc", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                mi perfil
              </Link>
              <Link
                href="/mensajes"
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b flex items-center justify-between"
                style={{ color: "#e8e4dc", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                mensajes
                {unreadBadge}
              </Link>
              <Link
                href="/tianguis/mis-listings"
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b"
                style={{ color: "#e8e4dc", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                mi tianguis
              </Link>
              <button
                onClick={handleSignOut}
                className="px-6 py-4 text-xs text-left cursor-pointer border-b"
                style={{ color: "#5F5E5A", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b"
                style={{ color: "#888780", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                entrar
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileOpen(false)}
                className="mx-4 my-3 py-3 text-xs text-center block"
                style={{ backgroundColor: "#D85A30", color: "#0c0c0b", fontFamily: mono, letterSpacing: "0.1em" }}
              >
                únete
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
