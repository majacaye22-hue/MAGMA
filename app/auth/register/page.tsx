"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [colonia, setColonia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError("Error al crear la cuenta — intenta de nuevo");
      setLoading(false);
      return;
    }

    // 2. Insert profile row
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      username: username.trim().toLowerCase(),
      display_name: displayName.trim() || null,
      location: colonia.trim() || null,
      email: email.trim().toLowerCase(),
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

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
              placeholder="mínimo 6 caracteres"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Nombre de usuario{" "}
              <span style={{ color: "#444441" }}>sin espacios</span>
            </label>
            <input
              type="text"
              required
              value={username}
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
            {loading ? "creando cuenta..." : "únete a magma"}
          </button>
        </form>

        {/* Login link */}
        <p
          className="text-center text-xs"
          style={{ color: "#5F5E5A", fontFamily: "var(--font-space-mono), monospace" }}
        >
          ¿ya tienes cuenta?{" "}
          <Link
            href="/auth/login"
            style={{ color: "#888780", textDecoration: "underline" }}
          >
            entra
          </Link>
        </p>
      </div>
    </div>
  );
}
