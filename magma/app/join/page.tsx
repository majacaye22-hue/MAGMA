"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (username.length < 3) {
      setError("el usuario debe tener al menos 3 caracteres");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
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
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "2px solid #D85A30",
              borderRadius: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11L9 16L18 6" stroke="#D85A30" strokeWidth="2" strokeLinecap="square" />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: "Syne",
              fontWeight: 800,
              fontSize: "22px",
              color: "#e8e4dc",
              marginBottom: "12px",
            }}
          >
            revisa tu correo
          </h2>
          <p
            style={{
              fontFamily: "Space Mono",
              fontSize: "12px",
              color: "#888780",
              lineHeight: 1.8,
            }}
          >
            te enviamos un enlace de confirmación a{" "}
            <span style={{ color: "#e8e4dc" }}>{email}</span>.
            <br />
            confirma tu cuenta para entrar a MAGMA.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "28px",
              fontFamily: "Space Mono",
              fontSize: "12px",
              color: "#D85A30",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            volver al inicio
          </Link>
        </div>
      </div>
    );
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
            únete
          </h1>
          <p
            style={{
              fontFamily: "Space Mono",
              fontSize: "12px",
              color: "#888780",
            }}
          >
            crea tu cuenta en{" "}
            <span style={{ color: "#D85A30" }}>MAGMA</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Username */}
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
                usuario
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: "Space Mono",
                    fontSize: "13px",
                    color: "#888780",
                    pointerEvents: "none",
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  required
                  autoComplete="username"
                  placeholder="tunombre"
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 26px",
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
              <div
                style={{
                  fontFamily: "Space Mono",
                  fontSize: "10px",
                  color: "#888780",
                  marginTop: "5px",
                  letterSpacing: "0.03em",
                }}
              >
                solo letras minúsculas, números y guión bajo
              </div>
            </div>

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
                autoComplete="new-password"
                placeholder="mín. 8 caracteres"
                minLength={8}
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
                marginTop: "4px",
              }}
            >
              {loading ? "creando cuenta..." : "únete"}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div style={{ margin: "28px 0", borderTop: "1px solid #2a2a28", position: "relative" }}>
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

        {/* Login link */}
        <p
          style={{
            textAlign: "center",
            fontFamily: "Space Mono",
            fontSize: "12px",
            color: "#888780",
          }}
        >
          ¿ya tienes cuenta?{" "}
          <Link
            href="/login"
            style={{
              color: "#D85A30",
              fontWeight: 700,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
