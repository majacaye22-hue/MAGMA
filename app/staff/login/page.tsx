"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MagmaWordmark } from "@/app/components/MagmaWordmark";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#F2F4F8",
  fontFamily: mono,
  fontSize: "var(--magma-text-body)",
  outline: "none",
  padding: "11px 12px",
  width: "100%",
};

function StaffLoginForm() {
  const searchParams = useSearchParams();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "unauthorized" ? "esta cuenta no tiene acceso al espacio de equipo" : null,
  );
  const [loading, setLoading] = useState(false);

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: emailOrUsername.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "no se pudo iniciar sesión");
        return;
      }
      window.location.href = "/staff";
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#0c0c0b" }}>
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link href="/"><MagmaWordmark style={{ fontSize: "28px" }} /></Link>
          <span style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.16em", textTransform: "uppercase" }}>espacio de equipo</span>
          <h1 className="magma-page-title" style={{ color: "#F2F4F8", fontFamily: syne, fontWeight: 800, }}>cuidar la casa</h1>
          <p style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.6 }}>Acceso individual para moderación, operación y herramientas internas.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.12em", textTransform: "uppercase" }}>email o usuario</span>
            <input required autoComplete="username" value={emailOrUsername} onChange={(event) => setEmailOrUsername(event.target.value)} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-2">
            <span style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.12em", textTransform: "uppercase" }}>contraseña</span>
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
          </label>
          {error && <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", lineHeight: 1.5 }}>{error}</p>}
          <button data-magma-glow={/magma-(red|orange|hot)|#E12120|#7f77dd/i.test(String("var(--magma-orange)"))} disabled={loading} className="cursor-pointer disabled:opacity-40" style={{ backgroundColor: "var(--magma-orange)", border: 0, color: "var(--magma-obsidian)", fontFamily: mono, fontSize: "var(--magma-text-small)", letterSpacing: "0.14em", padding: "13px", textTransform: "uppercase" }}>
            {loading ? "verificando…" : "entrar al espacio de equipo"}
          </button>
        </form>

        <Link href="/auth/forgot-password" style={{ color: "var(--magma-muted)", fontFamily: mono, fontSize: "var(--magma-text-small)", textDecoration: "underline" }}>¿olvidaste tu contraseña?</Link>
      </div>
    </main>
  );
}

export default function StaffLoginPage() {
  return <Suspense fallback={null}><StaffLoginForm /></Suspense>;
}
