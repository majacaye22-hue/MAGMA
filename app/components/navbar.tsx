"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { MagmaLogo } from "@/app/components/MagmaLogo";
import { NotificationBell } from "@/app/components/NotificationBell";
import { COLLABORATIONS_ENABLED } from '@/lib/collaborations';

interface Profile {
  username: string;
  display_name: string | null;
  is_moderator: boolean;
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
  { href: "/",           label: "explorar" },
  { href: "/eventos",    label: "cartelera" },
  { href: "/colectivos", label: "colectivos" },
  { href: "/proyectos",  label: "proyectos" },
];
const ACTION_LINKS = [
  { href: "/upload",     label: "subir obra" },
  { href: "/mensajes",   label: "mensajes" },
  { href: "/buscar",     label: "buscar" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabaseRef = useRef(getSupabaseClient());
  const supabase = supabaseRef.current;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [moderationQueue, setModerationQueue] = useState<{ username: string; pending: boolean } | null>(null);
  const hasPendingModeration = profile?.is_moderator === true && moderationQueue?.username === profile.username && moderationQueue.pending;

  useEffect(() => {
    if (!profile?.is_moderator) return;
    let disposed = false;
    let request = 0;
    const username = profile.username;
    const refresh = async () => {
      const version = ++request;
      try {
        const { data, error } = await supabase.from("posts").select("id")
          .eq("moderation_status", "pending").limit(1).abortSignal(AbortSignal.timeout(10000));
        if (!disposed && version === request && !error) {
          setModerationQueue({ username, pending: Boolean(data?.length) });
        }
      } catch { /* Keep the last known queue state on a temporary connection failure. */ }
    };
    const wake = () => { if (!document.hidden) void refresh(); };
    void refresh();
    const channel = supabase.channel("moderation-menu-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, wake)
      .subscribe((status: string) => { if (status === "SUBSCRIBED") wake(); });
    const timer = window.setInterval(wake, 15000);
    window.addEventListener("focus", wake);
    window.addEventListener("magma:moderation-changed", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", wake);
      window.removeEventListener("magma:moderation-changed", wake);
      document.removeEventListener("visibilitychange", wake);
      void supabase.removeChannel(channel);
    };
  }, [profile?.username, profile?.is_moderator, supabase, pathname]);

  const moderationLabel = <>moderación{hasPendingModeration && <>
    <span aria-hidden="true" className="ml-2 inline-block h-2 w-2 rounded-full bg-[#DC143C]" />
    <span className="sr-only"> · publicaciones pendientes de revisión</span>
  </>}</>;

  function scrollToTopAfterNavigation() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    });
  }

  // Run after the route commits so Next's own scroll restoration cannot
  // overwrite the top position during a client-side transition.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMobileOpen(false);
      setDropdownOpen(false);
    });
    scrollToTopAfterNavigation();
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const client = supabaseRef.current;

    async function loadProfile(userId: string) {
      const { data } = await client
        .from("profiles")
        .select("username, display_name, is_moderator")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data ?? null);
    }

    // Read session immediately on mount so the account menu appears without waiting
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
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

  function isActiveLink(href: string) {
    return href === "/" ? pathname === "/" || pathname === "/explorar" : pathname === href || pathname.startsWith(href + "/");
  }

  function handlePrimaryNavigation() {
    setMobileOpen(false);
    setDropdownOpen(false);
    scrollToTopAfterNavigation();
  }


  if (pathname === "/auth/login") return null;

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
      <div className="max-w-[1600px] mx-auto px-6 min-h-14 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 xl:grid xl:grid-cols-[minmax(0,1fr)_390px_minmax(0,1fr)]">
        <Link href="/" onClick={handlePrimaryNavigation} className="order-1 shrink-0">
          <MagmaLogo />
        </Link>


        {/* Desktop nav — hidden below xl */}
        <nav aria-label="navegación principal" className="order-2 hidden xl:flex xl:col-start-2 xl:row-start-1 items-center justify-center gap-4 py-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={handlePrimaryNavigation}
              className="magma-nav-link magma-nav-primary"
              aria-current={isActiveLink(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}

        </nav>
        <div className="order-3 mr-12 hidden xl:flex xl:col-start-3 xl:row-start-1 justify-self-end items-center justify-end gap-1">
          {ACTION_LINKS.filter(({ href }) => href !== "/upload").map(({ href, label }) => (
            <Link key={href} href={href} onClick={handlePrimaryNavigation}
              className={`magma-nav-link magma-nav-action whitespace-nowrap text-xs ${href !== "/upload" ? "order-last" : ""}`}
              aria-label={label}
              title={href !== "/upload" ? label : undefined}
              aria-current={isActiveLink(href) ? "page" : undefined}>
              {href === "/mensajes" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <path d="m3 6 9 7 9-7M3 18l6-6m12 6-6-6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              ) : href === "/buscar" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
              ) : label}
            </Link>
          ))}

          {profile ? (
            <>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="magma-nav-account flex items-center justify-center text-xs font-bold cursor-pointer"
                  aria-label={`menú de @${profile.username}`}
                  aria-expanded={dropdownOpen}
                >
                  @{profile.username}
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
                      style={{ color: "#F2F4F8", fontFamily: mono }}
                    >
                      mi perfil
                    </Link>
                    <Link href="/likes" onClick={() => setDropdownOpen(false)} className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t" style={{ color: "#F2F4F8", fontFamily: mono, borderColor: "#2a2a28" }}>mis likes ✦</Link>
                    {COLLABORATIONS_ENABLED && <Link href="/colaboraciones" onClick={() => setDropdownOpen(false)} className="px-4 py-3 text-xs border-t border-[#2a2a28]">invitaciones</Link>}
                    <Link
                      href="/circulo"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs border-t border-[#2a2a28]"
                    >mi círculo</Link>
                    <Link
                      href="/upload"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#F2F4F8", fontFamily: mono, borderColor: "#2a2a28" }}
                    >
                      subir obra
                    </Link>
                    {profile.is_moderator === true && <Link
                      href="/mod"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 text-xs hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "#ffffff", fontFamily: mono, borderColor: "#2a2a28" }}
                    >{moderationLabel}</Link>}
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-3 text-xs text-left cursor-pointer hover:bg-[#1e1e1b] transition-colors border-t"
                      style={{ color: "var(--magma-muted)", fontFamily: mono, borderColor: "#2a2a28" }}
                    >
                      salir
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-red)"))}
                href="/auth/login"
                className="text-xs"
                style={{ color: "var(--magma-muted)", fontFamily: mono }}
              >
                entrar
              </Link>
              <Link data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-red)"))}
                href="/auth/register"
                className="px-3 py-1 text-xs cursor-pointer"
                style={{
                  backgroundColor: "var(--magma-red)",
                  color: "var(--magma-ash)",
                  fontFamily: mono,
                }}
              >
                únete
              </Link>
            </div>
          )}
        </div>

        <div className="order-3 ml-auto xl:order-4 xl:col-start-3 xl:row-start-1 xl:justify-self-end xl:ml-0"><NotificationBell /></div>
        {/* Mobile right: hamburger — hidden at xl+ */}
        <div className="order-4 flex items-center gap-3 xl:hidden">
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

      {/* ── Mobile drawer — hidden at xl+ ── */}
      {mobileOpen && (
        <div
          className="xl:hidden border-t flex flex-col"
          style={{ borderColor: "#2a2a28", backgroundColor: "rgba(12,12,11,0.97)" }}
        >
          {/* Primary nav links */}
          {[...NAV_LINKS, ...ACTION_LINKS].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={handlePrimaryNavigation}
              className="magma-nav-link px-6 py-4 text-xs border-b"
              aria-current={isActiveLink(href) ? "page" : undefined}
              style={{ borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
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
                href={`/profile/${profile.username}`}
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b"
                style={{ color: "#F2F4F8", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                mi perfil
              </Link>
              <Link href="/likes" onClick={() => setMobileOpen(false)} className="px-6 py-4 text-xs border-b" style={{ color: "#F2F4F8", fontFamily: mono, borderColor: "#1e1e1e" }}>mis likes ✦</Link>
              {COLLABORATIONS_ENABLED && <Link href="/colaboraciones" onClick={() => setMobileOpen(false)} className="px-6 py-4 text-xs border-b border-[#1e1e1e]">invitaciones</Link>}
              <Link
                href="/circulo"
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b border-[#1e1e1e]"
              >mi círculo</Link>
              {profile.is_moderator === true && <Link
                href="/mod"
                onClick={() => setMobileOpen(false)}
                className="px-6 py-4 text-xs border-b"
                style={{ color: "#ffffff", fontFamily: mono, borderColor: "#1e1e1e" }}
              >{moderationLabel}</Link>}
              <button
                onClick={handleSignOut}
                className="px-6 py-4 text-xs text-left cursor-pointer border-b"
                style={{ color: "var(--magma-muted)", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
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
                style={{ color: "var(--magma-muted)", fontFamily: mono, borderColor: "#1e1e1e", letterSpacing: "0.1em" }}
              >
                entrar
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileOpen(false)}
                className="mx-4 my-3 py-3 text-xs text-center block"
                style={{ backgroundColor: "var(--magma-red)", color: "var(--magma-ash)", fontFamily: mono, letterSpacing: "0.1em" }}
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
