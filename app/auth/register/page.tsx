"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase"
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

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [colonia, setColonia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
    // Create auth user + profile server-side in one shot
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        username: username.trim(),
        displayName: displayName.trim() || null,
        location: colonia.trim() || null,
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "error al crear la cuenta" }));
      setError(msg ?? "error al crear la cuenta");
      setLoading(false);
      return;
    }

    const result = await res.json();
    setAwaitingConfirmation(true);
    setPassword("");
    setNotice(result.delivery_failed ? "cuenta creada, pero no se pudo enviar el correo. reintenta el envío abajo." : "revisa tu correo y confirma tu dirección antes de iniciar sesión.");
    } catch { setError("no se pudo completar la solicitud; revisa tu conexión"); }
    finally { setLoading(false); }
  }

  async function resendConfirmation() {
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/login` } });
      setNotice(error ? "no se pudo enviar el correo; espera un minuto y reintenta" : "correo enviado; revisa también spam");
    } catch { setNotice("no se pudo enviar el correo; revisa tu conexión"); }
    finally { setLoading(false); }
  }

  if (awaitingConfirmation) return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="magma-page-title mb-6">confirma tu email</h1>
      <p role="status">{notice}</p>
      <button type="button" disabled={loading} onClick={resendConfirmation} className="my-6 underline">{loading ? "enviando..." : "reenviar correo"}</button>
      <Link href="/auth/login" className="block underline">iniciar sesión →</Link>
    </main>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
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

          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
              minLength={8}
              maxLength={128}
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Nombre de usuario{" "}
              <span style={{ color: "var(--magma-muted)" }}>sin espacios</span>
            </label>
            <input
              type="text"
              required
              value={username}
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]{3,30}"
              title="3–30 letras, números o guiones bajos"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="lucioramirez"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          <div>
            <label style={labelStyle}>Nombre artístico</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Lucio Ramírez"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          <div>
            <label style={labelStyle}>Colonia</label>
            <input
              type="text"
              value={colonia}
              onChange={(e) => setColonia(e.target.value)}
              placeholder="ej. Tepito, CDMX"
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
            {loading ? "creando cuenta..." : "únete a magma"}
          </button>
        </form>

        {/* Login link */}
        <p
          className="text-center text-xs"
          style={{ color: "var(--magma-muted)", fontFamily: "var(--font-space-mono), monospace" }}
        >
          ¿ya tienes cuenta?{" "}
          <Link
            href="/auth/login"
            style={{ color: "var(--magma-muted)", textDecoration: "underline" }}
          >
            entra
          </Link>
        </p>
      </div>
    </div>
  );
}
