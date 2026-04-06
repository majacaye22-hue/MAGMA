"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Heading */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "Syne",
              fontWeight: 800,
              fontSize: "28px",
              color: "#e8e4dc",
              letterSpacing: "0.04em",
              marginBottom: "8px",
            }}
          >
            entrar
          </h1>
          <p
            style={{
              fontFamily: "Space Mono",
              fontSize: "12px",
              color: "#888780",
            }}
          >
            bienvenido de vuelta a{" "}
            <span style={{ color: "#D85A30" }}>MAGMA</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Space Mono",
                  fontSize: "10px",
                  color: "#888780",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                correo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  backgroundColor: "#141412",
                  border: "1px solid #2a2a28",
                  borderRadius: "2px",
                  color: "#e8e4dc",
                  fontFamily: "Space Mono",
                  fontSize: "13px",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#D85A30")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a28")}
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Space Mono",
                  fontSize: "10px",
                  color: "#888780",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  backgroundColor: "#141412",
                  border: "1px solid #2a2a28",
                  borderRadius: "2px",
                  color: "#e8e4dc",
                  fontFamily: "Space Mono",
                  fontSize: "13px",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#D85A30")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a28")}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "transparent",
                  border: "1px solid #D85A30",
                  borderRadius: "2px",
                  fontFamily: "Space Mono",
                  fontSize: "11px",
                  color: "#D85A30",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px",
                backgroundColor: loading ? "#2a2a28" : "#D85A30",
                border: "1px solid #D85A30",
                borderRadius: "2px",
                color: loading ? "#888780" : "#0c0c0b",
                fontFamily: "Space Mono",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s ease",
                marginTop: "4px",
              }}
            >
              {loading ? "entrando..." : "entrar"}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div
          style={{
            margin: "28px 0",
            borderTop: "1px solid #2a2a28",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "-9px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#0c0c0b",
              padding: "0 12px",
              fontFamily: "Space Mono",
              fontSize: "10px",
              color: "#888780",
              letterSpacing: "0.06em",
            }}
          >
            o
          </span>
        </div>

        {/* Join link */}
        <p
          style={{
            textAlign: "center",
            fontFamily: "Space Mono",
            fontSize: "12px",
            color: "#888780",
          }}
        >
          ¿no tienes cuenta?{" "}
          <Link
            href="/join"
            style={{
              color: "#D85A30",
              fontWeight: 700,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            únete
          </Link>
        </p>
      </div>
    </div>
  );
}
