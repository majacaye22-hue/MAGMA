"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase"
import { MagmaWordmark } from "@/app/components/MagmaWordmark";
import Manifesto from "@/app/components/Manifesto";
import { COMMUNITY_AGREEMENTS, ONBOARDING_PRIVACY, ONBOARDING_QUESTIONS, ONBOARDING_VERSION, validateOnboarding } from "@/lib/onboarding";
const supabase = getSupabaseClient();

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#F2F4F8",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: "var(--magma-text-body)",
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
  const [step, setStep] = useState(1);
  const [motivation, setMotivation] = useState("");
  const [contribution, setContribution] = useState("");
  const [accepted, setAccepted] = useState(false);
  const stepHeading = useRef<HTMLParagraphElement>(null);
  const lastStep = useRef(1);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    stepHeading.current?.focus({ preventScroll: true });
    stepHeading.current?.scrollIntoView({ block: "start" });
  }, [step]);
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
    if (loading) return;
    if (!validateOnboarding({ motivation, contribution, accepted, version: ONBOARDING_VERSION })) {
      setError("responde las dos preguntas y acepta los acuerdos antes de continuar");
      setStep(2);
      return;
    }
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
        onboarding: { motivation, contribution, accepted, version: ONBOARDING_VERSION },
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
    setMotivation("");
    setContribution("");
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
      <p className="mt-4">Tus respuestas ya están guardadas de forma privada. No necesitas esperar una aprobación de Magma.</p>
      <button type="button" disabled={loading} onClick={resendConfirmation} className="my-6 underline">{loading ? "enviando..." : "reenviar correo"}</button>
      <Link href="/auth/login" className="block underline">iniciar sesión →</Link>
    </main>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#0c0c0b" }}
    >
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <MagmaLogo />
          </Link>
        </div>

        <p ref={stepHeading} tabIndex={-1} aria-live="polite" className="text-sm scroll-mt-24">{step} de 3 · {step === 1 ? "conoce Magma" : step === 2 ? "cuéntanos de ti" : "crea tu cuenta"}</p>
        {step === 1 && <section className="space-y-6 leading-relaxed">
          <h1 className="magma-page-title">antes de entrar</h1>
          <p>Magma es una comunidad creativa en la Ciudad de México. Un lugar para compartir lo que haces —incluso lo que todavía no está terminado—, encontrar con quién crear y hacer que las ideas se conviertan en encuentros.</p>
          <p>La pantalla es el punto de partida. Queremos construir un espacio físico en la ciudad: un club donde encontrarnos, experimentar y hacer cosas juntxs.</p>
          <p>No necesitas un portafolio ni tener todas las respuestas. Sí curiosidad, respeto y ganas de participar.</p>
          <details className="border-y border-white/20 py-4"><summary className="cursor-pointer underline">leer el manifiesto completo</summary><Manifesto embedded /></details>
          <h2 className="text-xl">acuerdos para cuidar este espacio</h2>
          <ul className="list-disc pl-5 space-y-3">{COMMUNITY_AGREEMENTS.map(agreement => <li key={agreement}>{agreement}</li>)}</ul>
          <button type="button" onClick={() => setStep(2)} className="w-full bg-[var(--magma-red)] p-3">continuar →</button>
        </section>}
        {step === 2 && <form className="flex flex-col gap-5" onSubmit={e => {
          e.preventDefault();
          if (!validateOnboarding({ motivation, contribution, accepted, version: ONBOARDING_VERSION })) {
            setError("responde ambas preguntas y acepta los acuerdos; máximo 1500 caracteres por respuesta");
            return;
          }
          setError(null); setStep(3);
        }}>
          <h1 className="magma-page-title">cuéntanos de ti</h1>
          <p>No es un examen ni una solicitud de aprobación. Una frase pensada es suficiente.</p>
          <p id="answer-privacy" className="text-sm leading-relaxed">{ONBOARDING_PRIVACY} Evita incluir datos sensibles o información privada de otras personas.</p>
          <label htmlFor="motivation">{ONBOARDING_QUESTIONS[0]}</label>
          <p id="motivation-hint" className="text-sm">Una idea, una obsesión, una pregunta o algo que estás creando.</p>
          <textarea id="motivation" required maxLength={1500} rows={4} style={inputStyle} value={motivation} onChange={e => setMotivation(e.target.value)} aria-describedby="motivation-hint answer-privacy" />
          <label htmlFor="contribution">{ONBOARDING_QUESTIONS[1]}</label>
          <p id="contribution-hint" className="text-sm">También puedes venir a explorar; no necesitas tener un proyecto listo.</p>
          <textarea id="contribution" required maxLength={1500} rows={4} style={inputStyle} value={contribution} onChange={e => setContribution(e.target.value)} aria-describedby="contribution-hint answer-privacy" />
          <label className="flex gap-3 items-start"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" /><span>Entiendo qué es Magma, leí y acepto los acuerdos de convivencia y sé quién podrá leer mis respuestas.</span></label>
          {error && <p role="alert">{error}</p>}
          <button type="button" className="underline" onClick={() => { setError(null); setStep(1); }}>← volver a los acuerdos</button>
          <button type="submit" className="bg-[var(--magma-red)] p-3">continuar →</button>
        </form>}
        {step === 3 && <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <h1 className="magma-page-title">crea tu cuenta</h1>
          <button type="button" disabled={loading} className="underline text-left" onClick={() => { setError(null); setStep(2); }}>← revisar mis respuestas</button>
          <div>
            <label htmlFor="signup-email" style={labelStyle}>Email</label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" style={labelStyle}>Contraseña</label>
            <input
              id="signup-password"
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
            <label htmlFor="signup-username" style={labelStyle}>
              Nombre de usuario{" "}
              <span style={{ color: "var(--magma-muted)" }}>sin espacios</span>
            </label>
            <input
              id="signup-username"
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
            <label htmlFor="signup-name" style={labelStyle}>Nombre artístico</label>
            <input
              id="signup-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Lucio Ramírez"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="signup-colonia" style={labelStyle}>Colonia</label>
            <input
              id="signup-colonia"
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
              role="alert"
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
        </form>}

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
