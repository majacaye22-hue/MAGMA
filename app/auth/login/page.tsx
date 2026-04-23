"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase"
const supabase = getSupabaseClient();

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#e8e4dc",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "13px",
  outline: "none",
  width: "100%",
  padding: "10px 12px",
};

const labelStyle: React.CSSProperties = {
  color: "#5F5E5A",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "block",
  marginBottom: "6px",
};

function MagmaLogo() {
  return (
    <span
      style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}
      className="text-3xl tracking-tight select-none"
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

function LoginForm() {
  const searchParams = useSearchParams();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let email = emailOrUsername.trim();

    if (!email.includes("@")) {
      // Resolve username → email via server-side API (uses service role, bypasses RLS)
      const res = await fetch('/api/auth/lookup-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email }),
      })
      const json = await res.json()
      console.log("[login] username lookup:", { input: email, status: res.status, json })

      if (!res.ok || !json.email) {
        setError(json.error ?? "usuario no encontrado");
        setLoading(false);
        return;
      }

      email = json.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const raw = searchParams.get("redirectTo") ?? "/";
    // Guard against redirect loops — never send back to /auth/*
    const redirectTo = raw.startsWith("/auth") ? "/" : raw;
    window.location.href = redirectTo;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#0c0c0b" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <MagmaLogo />
          </Link>
        </div>

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
                fontSize: "11px",
                color: "#D85A30",
                fontFamily: "var(--font-space-mono), monospace",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs tracking-widest uppercase cursor-pointer transition-opacity duration-150 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#D85A30",
              color: "#0c0c0b",
              fontFamily: "var(--font-space-mono), monospace",
              marginTop: "4px",
            }}
          >
            {loading ? "entrando..." : "entrar"}
          </button>
        </form>

        {/* Register link */}
        <p
          className="text-center text-xs"
          style={{ color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace" }}
        >
          ¿no tienes cuenta?{" "}
          <Link
            href="/auth/register"
            style={{ color: "#888780", textDecoration: "underline" }}
          >
            únete
          </Link>
        </p>
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
