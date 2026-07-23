"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    // Implicit flow: Supabase processes the URL hash and fires PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === "PASSWORD_RECOVERY") setSessionReady(true);
      }
    );

    async function establishSession() {
      if (code) {
        // PKCE flow — code in URL param
        const { error: err } = await supabase.auth.exchangeCodeForSession(code);
        if (err) setSessionError("link inválido o expirado");
        else setSessionReady(true);
      } else if (token_hash && type === "recovery") {
        // token_hash flow
        const { error: err } = await supabase.auth.verifyOtp({
          token_hash,
          type: "recovery",
        });
        if (err) setSessionError("link inválido o expirado");
        else setSessionReady(true);
      }
      // Otherwise wait for onAuthStateChange (implicit hash flow).
      // If nothing fires within a reasonable time the user followed a broken link.
    }

    establishSession();
    return () => subscription.unsubscribe();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // updateUser keeps the session active — redirect straight in.
    router.push("/");
    router.refresh();
  }

  if (sessionError) {
    return (
      <div className="flex flex-col gap-4">
        <p
          style={{
            color: "#D85A30",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: "12px",
          }}
        >
          {sessionError}
        </p>
        <Link
          href="/auth/forgot-password"
          style={{
            color: "#888780",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: "11px",
            textDecoration: "underline",
          }}
        >
          solicitar nuevo link
        </Link>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <p
        style={{
          color: "#5F5E5A",
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: "11px",
        }}
      >
        verificando link...
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label style={labelStyle}>Nueva contraseña</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="mínimo 6 caracteres"
          style={inputStyle}
          className="focus:outline-none"
        />
      </div>

      <div>
        <label style={labelStyle}>Confirmar contraseña</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="repite la contraseña"
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
        {loading ? "guardando..." : "cambiar contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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

        <Suspense
          fallback={
            <p
              style={{
                color: "#5F5E5A",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: "11px",
              }}
            >
              verificando link...
            </p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
