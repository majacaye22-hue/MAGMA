"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

const inputStyle: React.CSSProperties = {
  backgroundColor: "#141412",
  border: "0.5px solid #2a2a28",
  color: "#e8e4dc",
  fontFamily: mono,
  fontSize: "13px",
  outline: "none",
  width: "100%",
  padding: "10px 12px",
};

const labelStyle: React.CSSProperties = {
  color: "#5F5E5A",
  fontFamily: mono,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "block",
  marginBottom: "6px",
};

const DISCIPLINES = [
  "arte visual", "fotografía", "música", "grabado",
  "serigrafía", "diseño", "escritura", "performance", "cine", "otro",
];

const AVATAR_COLORS = [
  { value: "#D85A30", label: "terracota"  },
  { value: "#712B13", label: "siena"      },
  { value: "#0D1F2D", label: "noche"      },
  { value: "#2D1000", label: "tabaco"     },
  { value: "#0F6E56", label: "jade"       },
  { value: "#2D0020", label: "ciruela"    },
];

const CASA_TONES = [
  { value: "terracota", label: "terracota", color: "#D85A30" },
  { value: "jade", label: "jade", color: "#5DCAA5" },
  { value: "noche", label: "noche", color: "#4A7FA5" },
  { value: "ciruela", label: "ciruela", color: "#7F77DD" },
];

const CASA_SHELF_OPTIONS = [
  { value: "radio", label: "radio", detail: "algo sonando" },
  { value: "cartel", label: "cartel", detail: "algo por pasar" },
];

type PinnedPost = { id: string; title: string | null; type: string };
type CartelPost = { id: string; title: string | null };
type RadioPost = { id: string; title: string | null };

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [avatarColor, setAvatarColor] = useState("#D85A30");
  const [casaName, setCasaName] = useState("");
  const [casaTone, setCasaTone] = useState("terracota");
  const [casaWelcome, setCasaWelcome] = useState("");
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>([]);
  const [availablePosts, setAvailablePosts] = useState<PinnedPost[]>([]);
  const [shelfItems, setShelfItems] = useState<string[]>(["radio", "cartel"]);
  const [cartelPostId, setCartelPostId] = useState("");
  const [cartelPosts, setCartelPosts] = useState<CartelPost[]>([]);
  const [radioPostId, setRadioPostId] = useState("");
  const [radioPosts, setRadioPosts] = useState<RadioPost[]>([]);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, bio, location, disciplines, avatar_color, casa_name, casa_tone, casa_welcome, casa_pinned_post_ids, casa_shelf_items, casa_cartel_post_id, casa_radio_post_id")
        .eq("id", user.id)
        .single();

      if (data) {
        setUsername(data.username ?? "");
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setDisciplines(data.disciplines ?? []);
        setAvatarColor(data.avatar_color ?? "#D85A30");
        setCasaName(data.casa_name ?? "");
        setCasaTone(data.casa_tone ?? "terracota");
        setCasaWelcome(data.casa_welcome ?? "");
        setPinnedPostIds(data.casa_pinned_post_ids ?? []);
        setShelfItems((data.casa_shelf_items ?? ["radio", "cartel"]).filter((item: string) => item === "radio" || item === "cartel"));
        setCartelPostId(data.casa_cartel_post_id ?? "");
        setRadioPostId(data.casa_radio_post_id ?? "");

        const { data: ownPosts } = await supabase
          .from("posts")
          .select("id, title, type")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false });
        setAvailablePosts(ownPosts ?? []);

        const { data: events } = await supabase
          .from("posts")
          .select("id, title")
          .eq("type", "evento")
          .order("event_date", { ascending: false })
          .limit(24);
        setCartelPosts(events ?? []);

        const { data: music } = await supabase
          .from("posts")
          .select("id, title")
          .eq("type", "música")
          .order("created_at", { ascending: false })
          .limit(24);
        setRadioPosts(music ?? []);
      }

      setLoading(false);
    })();
  }, [router, supabase]);

  function toggleDiscipline(d: string) {
    setDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || saving) return;

    const trimmedUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (!trimmedUsername) {
      setError("el nombre de usuario no puede estar vacío");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: trimmedUsername,
        bio: bio.trim() || null,
        location: location.trim() || null,
        disciplines: disciplines.length > 0 ? disciplines : null,
        avatar_color: avatarColor,
        casa_name: casaName.trim() || null,
        casa_tone: casaTone,
        casa_welcome: casaWelcome.trim() || null,
        casa_pinned_post_ids: pinnedPostIds,
        casa_shelf_items: shelfItems,
        casa_cartel_post_id: cartelPostId || null,
        casa_radio_post_id: radioPostId || null,
      })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push(`/profile/${trimmedUsername}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>

      </div>
    );
  }

  const initials = (displayName || username).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>


      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Header */}
        <div className="pt-10 pb-8 flex items-center gap-4">
          <Link
            href={`/profile/${username}`}
            className="flex items-center justify-center shrink-0"
            style={{ width: "28px", height: "28px", border: "0.5px solid #2a2a28", color: "#888780" }}
            aria-label="Volver al perfil"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </Link>
          <h1 style={{ fontSize: "22px", color: "#e8e4dc", fontFamily: syne, fontWeight: 800, lineHeight: 1 }}>
            editar perfil
          </h1>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b" style={{ borderColor: "#2a2a28" }}>
          <div
            className="flex items-center justify-center text-xl font-bold shrink-0"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "4px",
              backgroundColor: avatarColor,
              color: "#0c0c0b",
              fontFamily: syne,
            }}
          >
            {initials}
          </div>
          <div>
            <p style={{ ...labelStyle, marginBottom: "10px" }}>Color de avatar</p>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAvatarColor(c.value)}
                  title={c.label}
                  className="cursor-pointer"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "3px",
                    backgroundColor: c.value,
                    border: avatarColor === c.value ? "2px solid #e8e4dc" : "2px solid transparent",
                    outline: avatarColor === c.value ? "1px solid #2a2a28" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Display name */}
          <div>
            <label style={labelStyle}>Nombre artístico</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre o nombre artístico"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "_").toLowerCase())}
              placeholder="tu_usuario"
              required
              style={inputStyle}
              className="focus:outline-none"
            />
            <p style={{ fontSize: "9px", color: "#444441", fontFamily: mono, marginTop: "6px" }}>
              sin espacios · solo letras, números, _ y .
            </p>
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>
              Bio
              <span style={{ color: "#444441", textTransform: "none", letterSpacing: 0, marginLeft: "8px" }}>
                {bio.length}/200
              </span>
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => e.target.value.length <= 200 && setBio(e.target.value)}
              placeholder="Cuéntanos sobre tu práctica artística..."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              className="focus:outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>Colonia / ubicación</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej. Roma Norte, CDMX"
              style={inputStyle}
              className="focus:outline-none"
            />
          </div>

          {/* Disciplines */}
          <div>
            <label style={labelStyle}>Disciplinas</label>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map((d) => {
                const active = disciplines.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDiscipline(d)}
                    className="text-xs tracking-widest uppercase cursor-pointer border transition-colors duration-150"
                    style={{
                      fontFamily: mono,
                      padding: "5px 12px",
                      borderColor: active ? "#D85A30" : "#2a2a28",
                      backgroundColor: active ? "rgba(216,90,48,0.08)" : "transparent",
                      color: active ? "#D85A30" : "#5F5E5A",
                      fontSize: "9px",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "0.5px", backgroundColor: "#2a2a28" }} />

          <section>
            <p style={{ ...labelStyle, color: "#D85A30", marginBottom: "12px" }}>Mi casa</p>
            <div className="flex flex-col gap-5">
              <div>
                <label style={labelStyle}>Nombre de la casa</label>
                <input value={casaName} onChange={(e) => setCasaName(e.target.value.slice(0, 48))} placeholder="ej. casa de luz baja" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tono de la casa</label>
                <div className="flex flex-wrap gap-2">
                  {CASA_TONES.map((tone) => (
                    <button key={tone.value} type="button" onClick={() => setCasaTone(tone.value)} style={{ background: casaTone === tone.value ? tone.color : "transparent", border: `0.5px solid ${tone.color}`, color: casaTone === tone.value ? "#0c0c0b" : tone.color, cursor: "pointer", fontFamily: mono, fontSize: "9px", letterSpacing: "0.1em", padding: "6px 10px", textTransform: "uppercase" }}>{tone.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Nota de bienvenida <span style={{ color: "#444441", textTransform: "none", letterSpacing: 0, marginLeft: "8px" }}>{casaWelcome.length}/140</span></label>
                <textarea rows={3} value={casaWelcome} onChange={(e) => e.target.value.length <= 140 && setCasaWelcome(e.target.value)} placeholder="algo que quieres que encuentre quien entra..." style={{ ...inputStyle, lineHeight: 1.6, resize: "vertical" }} />
              </div>
              <div>
                <label style={labelStyle}>Muro principal <span style={{ color: "#444441", textTransform: "none", letterSpacing: 0, marginLeft: "8px" }}>hasta 3 obras</span></label>
                {availablePosts.length === 0 ? (
                  <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px" }}>primero <Link href="/subir" style={{ color: "#D85A30", textDecoration: "underline", textUnderlineOffset: "3px" }}>sube una obra</Link>; después aparecerá aquí para colgarla.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availablePosts.map((post) => {
                      const selected = pinnedPostIds.includes(post.id);
                      return <button key={post.id} type="button" onClick={() => setPinnedPostIds((current) => selected ? current.filter((id) => id !== post.id) : current.length < 3 ? [...current, post.id] : current)} style={{ background: selected ? "rgba(216,90,48,0.08)" : "#141412", border: `0.5px solid ${selected ? "#D85A30" : "#2a2a28"}`, color: selected ? "#e8e4dc" : "#888780", cursor: "pointer", fontFamily: mono, fontSize: "10px", padding: "10px", textAlign: "left" }}>{selected ? "✓ " : ""}{post.title ?? "sin título"} <span style={{ color: "#5F5E5A" }}>· {post.type}</span></button>;
                    })}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Repisa de la casa</label>
                <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", lineHeight: 1.5, marginBottom: "10px" }}>elige las pequeñas cosas que reciben a quien entra. Por ahora son libres; después podrán crecer con lo que haces en Magma.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CASA_SHELF_OPTIONS.map((item) => {
                    const selected = shelfItems.includes(item.value);
                    return <button key={item.value} type="button" onClick={() => setShelfItems((current) => selected ? current.filter((value) => value !== item.value) : [...current, item.value])} style={{ background: selected ? "rgba(216,90,48,0.08)" : "#141412", border: `0.5px solid ${selected ? "#D85A30" : "#2a2a28"}`, color: selected ? "#e8e4dc" : "#888780", cursor: "pointer", fontFamily: mono, fontSize: "10px", minHeight: "72px", padding: "10px", textAlign: "left" }}><span style={{ color: selected ? "#D85A30" : "#5F5E5A", display: "block", fontSize: "9px", letterSpacing: "0.1em", marginBottom: "7px", textTransform: "uppercase" }}>{selected ? "✓ " : ""}{item.label}</span>{item.detail}</button>;
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Cartel fijado</label>
                <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", lineHeight: 1.5, marginBottom: "10px" }}>elige un evento de Magma. El cartel de tu repisa se volverá un enlace para entrar a su página y Sala.</p>
                <select value={cartelPostId} onChange={(e) => setCartelPostId(e.target.value)} style={inputStyle}>
                  <option value="">sin cartel fijado</option>
                  {cartelPosts.map((post) => <option key={post.id} value={post.id}>{post.title ?? "evento sin título"}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Radio de la casa</label>
                <p style={{ color: "#5F5E5A", fontFamily: mono, fontSize: "10px", lineHeight: 1.5, marginBottom: "10px" }}>elige una pieza de música de Magma. La radio abrirá esa publicación.</p>
                <select value={radioPostId} onChange={(e) => setRadioPostId(e.target.value)} style={inputStyle}>
                  <option value="">sin radio fijada</option>
                  {radioPosts.map((post) => <option key={post.id} value={post.id}>{post.title ?? "música sin título"}</option>)}
                </select>
              </div>
            </div>
          </section>

          {error && (
            <p style={{ fontSize: "11px", color: "#D85A30", fontFamily: mono }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 text-sm tracking-widest uppercase cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{
              backgroundColor: "#D85A30",
              color: "#0c0c0b",
              fontFamily: mono,
              border: "none",
            }}
          >
            {saving ? "guardando..." : "guardar cambios"}
          </button>
        </form>
      </main>
    </div>
  );
}
