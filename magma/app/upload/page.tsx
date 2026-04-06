// This page is protected by middleware — only authenticated users reach it.
// Supabase session is verified server-side before rendering.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TYPES = ["arte", "música", "fotografía", "evento"] as const;

export default async function UploadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders check — middleware already redirects, but guard here too
  if (!user) redirect("/login");

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "640px" }}>
        {/* Heading */}
        <div style={{ marginBottom: "36px" }}>
          <h1
            style={{
              fontFamily: "Syne",
              fontWeight: 800,
              fontSize: "24px",
              color: "#e8e4dc",
              letterSpacing: "0.04em",
              marginBottom: "6px",
            }}
          >
            subir obra
          </h1>
          <p
            style={{
              fontFamily: "Space Mono",
              fontSize: "12px",
              color: "#888780",
            }}
          >
            publicando como{" "}
            <span style={{ color: "#D85A30" }}>
              @{user.user_metadata?.username ?? user.email}
            </span>
          </p>
        </div>

        <form>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Type selector */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Space Mono",
                  fontSize: "10px",
                  color: "#888780",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                tipo
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {TYPES.map((t) => (
                  <label
                    key={t}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input type="radio" name="type" value={t} style={{ accentColor: "#D85A30" }} />
                    <span
                      style={{
                        fontFamily: "Space Mono",
                        fontSize: "11px",
                        color: "#e8e4dc",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {t}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <Field label="título">
              <input
                type="text"
                placeholder="nombre de tu obra"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#D85A30")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a28")}
              />
            </Field>

            {/* Description */}
            <Field label="descripción">
              <textarea
                placeholder="cuéntanos sobre tu trabajo..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#D85A30")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a28")}
              />
            </Field>

            {/* File drop zone */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Space Mono",
                  fontSize: "10px",
                  color: "#888780",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                archivo
              </label>
              <div
                style={{
                  border: "1px dashed #2a2a28",
                  borderRadius: "2px",
                  padding: "40px 24px",
                  textAlign: "center",
                  backgroundColor: "#141412",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "1px solid #2a2a28",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2V11M8 2L5 5M8 2L11 5" stroke="#888780" strokeWidth="1.2" strokeLinecap="square" />
                    <path d="M2 13H14" stroke="#888780" strokeWidth="1.2" strokeLinecap="square" />
                  </svg>
                </div>
                <p
                  style={{
                    fontFamily: "Space Mono",
                    fontSize: "12px",
                    color: "#888780",
                    marginBottom: "4px",
                  }}
                >
                  arrastra tu archivo o{" "}
                  <span style={{ color: "#D85A30" }}>selecciona</span>
                </p>
                <p
                  style={{
                    fontFamily: "Space Mono",
                    fontSize: "10px",
                    color: "#2a2a28",
                    letterSpacing: "0.04em",
                  }}
                >
                  JPG, PNG, MP3, MP4 — máx. 50MB
                </p>
                <input
                  type="file"
                  accept="image/*,audio/*,video/*"
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#D85A30",
                border: "1px solid #D85A30",
                borderRadius: "2px",
                color: "#0c0c0b",
                fontFamily: "Space Mono",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              publicar obra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontFamily: "Space Mono",
          fontSize: "10px",
          color: "#888780",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  backgroundColor: "#141412",
  border: "1px solid #2a2a28",
  borderRadius: "2px",
  color: "#e8e4dc",
  fontFamily: "Space Mono",
  fontSize: "13px",
  outline: "none",
};
