"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

function ResetPasswordForm() {
  const router = useRouter();
  const sessionCheck = useRef<Promise<boolean> | null>(null);

  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Share one operation across Strict Mode effect replay: codes are single-use.
    if (!sessionCheck.current) {
      sessionCheck.current = (async () => {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.slice(1));
        const tokenHash = url.searchParams.get("token_hash");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        try {
          if (url.searchParams.has("error") || url.searchParams.has("error_code") || hash.has("error") || hash.has("error_code")) return false;
          // The shared browser client already exchanges PKCE codes on startup.
          // Wait for it instead of exchanging the same code a second time.
          const { error: initializationError } = await supabase.auth.initialize();
          if (tokenHash && url.searchParams.get("type") === "recovery") {
            const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
            if (error) return false;
          } else if (accessToken && refreshToken && hash.get("type") === "recovery") {
            // Support older implicit recovery links with our PKCE-configured client.
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (error) return false;
          } else if (initializationError) {
            return false;
          }
          // Also covers a callback completed before this component mounted.
          const { data, error } = await supabase.auth.getUser();
          return !error && Boolean(data.user);
        } finally {
          for (const key of ["code", "token_hash", "type", "error", "error_code", "error_description"]) url.searchParams.delete(key);
          url.hash = "";
          window.history.replaceState(window.history.state, "", url.pathname + url.search);
        }
      })();
    }
    sessionCheck.current.then(ready => {
      if (!active) return;
      if (ready) setSessionReady(true);
      else setSessionError("no pudimos validar el enlace. solicita uno nuevo y ábrelo en el mismo navegador donde lo pediste.");
    }).catch(() => {
      if (active) setSessionError("no pudimos verificar el enlace. revisa tu conexión y solicita uno nuevo.");
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    setError(null);

    try {
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // updateUser keeps the session active — redirect straight in.
    router.push("/");
    router.refresh();
    } catch {
      setError("no se pudo cambiar la contraseña; revisa tu conexión e intenta de nuevo");
    } finally {
      setLoading(false);
    }
  }

  if (sessionError) {
    return (
      <div className="flex flex-col gap-4">
        <p
          style={{
            color: "var(--magma-ash)",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: "var(--magma-text-small)",
          }}
        >
          {sessionError}
        </p>
        <Link
          href="/auth/forgot-password"
          style={{
            color: "var(--magma-muted)",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: "var(--magma-text-small)",
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
          color: "var(--magma-muted)",
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: "var(--magma-text-small)",
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
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="mínimo 8 caracteres"
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
          minLength={8}
          maxLength={128}
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
                color: "var(--magma-muted)",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: "var(--magma-text-small)",
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
