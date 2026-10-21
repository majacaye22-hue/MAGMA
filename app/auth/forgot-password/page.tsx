"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { MagmaWordmark } from "@/app/components/MagmaWordmark";

const supabase = getSupabaseClient();

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

function MagmaLogo() {
  return <MagmaWordmark className="text-3xl" />;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Fire and forget — always show the same message regardless of whether
    // the email is registered, to avoid account enumeration.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);
    setSent(true);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#0c0c0b" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex justify-center">
          <Link href="/auth/login">
            <MagmaLogo />
          </Link>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4">
            <p
              style={{
                color: "#F2F4F8",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: "var(--magma-text-small)",
                lineHeight: "1.6",
              }}
            >
              si ese correo está registrado, te enviaremos un link para
              restablecer tu contraseña. revisa tu bandeja de entrada (y
              spam).
            </p>
            <Link
              href="/auth/login"
              style={{
                color: "var(--magma-muted)",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: "var(--magma-text-small)",
                textDecoration: "underline",
              }}
            >
              volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={inputStyle}
                className="focus:outline-none"
              />
            </div>

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
              {loading ? "enviando..." : "enviar link"}
            </button>

            <p
              className="text-center text-xs"
              style={{ color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace" }}
            >
              <Link href="/auth/login" style={{ color: "var(--magma-muted)", textDecoration: "underline" }}>
                volver al login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
