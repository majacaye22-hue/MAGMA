"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MagmaLogo } from "@/app/components/MagmaLogo";
import { getSupabaseClient } from "@/lib/supabase";

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#F2F4F8",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "var(--magma-text-body)",
  outline: "none",
  width: "100%",
  padding: "10px 12px",
};

const labelStyle: React.CSSProperties = {
  color: "var(--magma-muted)",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "var(--magma-text-small)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "block",
  marginBottom: "6px",
};


function LoginForm() {
  const searchParams = useSearchParams();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmationCheck = useRef<Promise<string> | null>(null);

  useEffect(() => {
    let active = true;
    if (!confirmationCheck.current) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const token = params.get("access_token");
      if (!token && !params.has("error") && !params.has("error_code")) return;
      // Remove credentials from the address bar; never store or log them.
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      confirmationCheck.current = (async () => {
        if (!token || params.has("error") || params.has("error_code")) {
          return "este enlace no es válido o ya venció. solicita otro correo de confirmación.";
        }
        // Validate the token with Auth rather than trusting a URL success flag.
        const { data, error } = await getSupabaseClient().auth.getUser(token);
        if (error || !data.user?.email_confirmed_at) {
          return "no pudimos verificar la confirmación. intenta iniciar sesión o solicita un nuevo enlace.";
        }
        return "email confirmado. ya puedes iniciar sesión en magma con tu email y contraseña.";
      })().catch(() => "no pudimos comprobar tu email. revisa tu conexión e intenta iniciar sesión.");
    }
    confirmationCheck.current.then(message => { if (active) setConfirmation(message); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: emailOrUsername.trim(), password }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "email o contraseña incorrectos");
        return;
      }

      const raw = searchParams.get("redirectTo") ?? "/";
      // Guard against redirect loops — never send back to /auth/*
      const redirectTo = raw.startsWith("/auth") ? "/" : raw;
      window.location.href = redirectTo;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#0c0c0b" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/" className="origin-center scale-[1.05]">
            <MagmaLogo />
          </Link>
        </div>

        {confirmation && (
          <p role="status" aria-live="polite" style={{ borderLeft: "3px solid #ff5638", padding: "12px 16px", color: "#fff", background: "#191513", fontSize: "14px", lineHeight: 1.6 }}>
            {confirmation}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Email o usuario</label>
            <input
              type="text"
              autoComplete="username"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="tu@email.com o @usuario"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: "var(--magma-text-small)",
                color: "var(--magma-ash)",
                fontFamily: "var(--font-space-mono), monospace",
              }}
            >
              {error}
            </p>
          )}

          <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-red)"))}
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs tracking-widest uppercase cursor-pointer transition-opacity duration-150 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--magma-red)",
              color: "var(--magma-ash)",
              fontFamily: "var(--font-space-mono), monospace",
              marginTop: "4px",
            }}
          >
            {loading ? "entrando..." : "entrar"}
          </button>
        </form>

        {/* Register + forgot password links */}
        <div className="flex flex-col gap-2 items-center">
          <p
            className="text-center text-xs"
            style={{ color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace" }}
          >
            ¿no tienes cuenta?{" "}
            <Link
              href="/auth/register"
              style={{ color: "var(--magma-muted)", textDecoration: "underline" }}
            >
              únete
            </Link>
          </p>
          <p
            className="text-center text-xs"
            style={{ color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace" }}
          >
            <Link
              href="/auth/forgot-password"
              style={{ color: "var(--magma-muted)", textDecoration: "underline" }}
            >
              ¿olvidaste tu contraseña?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0c0c0b" }} />}>
      <LoginForm />
    </Suspense>
  );
}
