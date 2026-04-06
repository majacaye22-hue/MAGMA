import Link from "next/link";

interface ProfilePageProps {
  params: { username: string };
}

function BannerPattern({ seed }: { seed: number }) {
  const rects = Array.from({ length: 12 }, (_, i) => ({
    x: ((seed * (i + 1) * 31) % 95) + 2,
    y: ((seed * (i + 2) * 47) % 85) + 5,
    w: ((seed * (i + 3) * 13) % 60) + 10,
    h: ((seed * (i + 4) * 7) % 40) + 5,
    op: 0.03 + ((i * seed) % 7) * 0.015,
  }));
  return (
    <svg
      viewBox="0 0 400 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    >
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill="#D85A30"
          opacity={r.op}
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1={(seed * (i + 3) * 23) % 400}
          y1="0"
          x2={(seed * (i + 7) * 19) % 400}
          y2="100"
          stroke="#2a2a28"
          strokeWidth="0.4"
          opacity="0.5"
        />
      ))}
    </svg>
  );
}

function WorkThumbnail({ seed, span }: { seed: number; span?: string }) {
  const shapes = Array.from({ length: 5 }, (_, i) => ({
    x: ((seed * (i + 1) * 37) % 80) + 10,
    y: ((seed * (i + 1) * 53) % 80) + 10,
    size: ((seed * (i + 3) * 17) % 35) + 10,
    op: 0.05 + ((seed * i) % 6) * 0.04,
  }));
  return (
    <div
      style={{
        backgroundColor: "#0c0c0b",
        border: "1px solid #2a2a28",
        borderRadius: "2px",
        overflow: "hidden",
        gridColumn: span,
        aspectRatio: span === "span 2" ? "2/1" : "1/1",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {shapes.map((s, i) => (
          <rect
            key={i}
            x={s.x - s.size / 2}
            y={s.y - s.size / 2}
            width={s.size}
            height={s.size}
            fill="#D85A30"
            opacity={s.op}
          />
        ))}
        <rect
          x={15 + (seed % 10)}
          y={15 + (seed % 8)}
          width={70 - (seed % 15)}
          height={70 - (seed % 10)}
          fill="none"
          stroke="#2a2a28"
          strokeWidth="0.4"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

const disciplineColors: Record<string, string> = {
  ilustración: "#D85A30",
  música: "#888780",
  fotografía: "#e8e4dc",
  diseño: "#888780",
  video: "#888780",
  instalación: "#888780",
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = params;

  const profile = {
    name: username
      .split(/(?=[A-Z])/)
      .join(" ")
      .replace(/^\w/, (c) => c.toUpperCase()),
    handle: `@${username}`,
    location: "Ciudad de México, MX",
    bio: "Artista visual e investigadora de cultura popular urbana. Trabajo con impresión, collage y archivo.",
    disciplines: ["ilustración", "fotografía", "diseño"],
    stats: {
      obras: 48,
      seguidores: 1203,
      siguiendo: 389,
      debates: 27,
    },
  };

  const works = [
    { seed: 7, span: "span 2" },
    { seed: 23 },
    { seed: 41 },
    { seed: 59 },
    { seed: 77, span: "span 2" },
    { seed: 97 },
    { seed: 113 },
    { seed: 131 },
  ];

  const recentActivity = [
    { action: "subió", item: "Fragmentos III", time: "hace 2h" },
    { action: "comentó en", item: "Cumbia Sintética", time: "hace 5h" },
    { action: "siguió a", item: "@trazolibre", time: "hace 1d" },
    { action: "votó", item: "Mercado Tepito 4AM", time: "hace 2d" },
  ];

  const collaborators = [
    { name: "trazolibre", initials: "TL" },
    { name: "ruidoverde", initials: "RV" },
    { name: "ojoscrudos", initials: "OC" },
    { name: "espaciobruto", initials: "EB" },
  ];

  const upcomingEvents = [
    { title: "Expo Borde", date: "12 abr", location: "CDMX" },
    { title: "Taller Serigrafía", date: "19 abr", location: "Oaxaca" },
    { title: "Feria de Arte Urbano", date: "3 may", location: "Bogotá" },
  ];

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "0 0 48px 0",
      }}
    >
      {/* Banner */}
      <div
        style={{
          position: "relative",
          height: "180px",
          backgroundColor: "#141412",
          borderBottom: "1px solid #2a2a28",
          overflow: "hidden",
        }}
      >
        <BannerPattern seed={username.charCodeAt(0) * 13 + username.length * 7} />
      </div>

      {/* Profile header */}
      <div
        style={{
          padding: "0 32px",
          position: "relative",
        }}
      >
        {/* Avatar + actions row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginTop: "-40px",
            marginBottom: "20px",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "4px",
              backgroundColor: "#2a2a28",
              border: "3px solid #0c0c0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Space Mono",
              fontSize: "22px",
              fontWeight: 700,
              color: "#D85A30",
              flexShrink: 0,
            }}
          >
            {username.slice(0, 2).toUpperCase()}
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              paddingTop: "56px",
            }}
          >
            <button
              style={{
                fontFamily: "Space Mono",
                fontSize: "12px",
                padding: "7px 18px",
                borderRadius: "2px",
                border: "1px solid #2a2a28",
                backgroundColor: "transparent",
                color: "#e8e4dc",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              mensaje
            </button>
            <button
              style={{
                fontFamily: "Space Mono",
                fontSize: "12px",
                padding: "7px 18px",
                borderRadius: "2px",
                border: "1px solid #D85A30",
                backgroundColor: "#D85A30",
                color: "#0c0c0b",
                cursor: "pointer",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              seguir
            </button>
          </div>
        </div>

        {/* Name + handle */}
        <h1
          style={{
            fontFamily: "Syne",
            fontWeight: 800,
            fontSize: "24px",
            color: "#e8e4dc",
            marginBottom: "2px",
            letterSpacing: "0.02em",
          }}
        >
          {profile.name}
        </h1>
        <div
          style={{
            fontFamily: "Space Mono",
            fontSize: "13px",
            color: "#888780",
            marginBottom: "6px",
          }}
        >
          {profile.handle}
        </div>

        {/* Location */}
        <div
          style={{
            fontFamily: "Space Mono",
            fontSize: "12px",
            color: "#888780",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 1C3.567 1 2 2.567 2 4.5C2 7.5 5.5 10 5.5 10C5.5 10 9 7.5 9 4.5C9 2.567 7.433 1 5.5 1ZM5.5 6C4.672 6 4 5.328 4 4.5C4 3.672 4.672 3 5.5 3C6.328 3 7 3.672 7 4.5C7 5.328 6.328 6 5.5 6Z" fill="#888780"/>
          </svg>
          {profile.location}
        </div>

        {/* Bio */}
        <p
          style={{
            fontFamily: "Space Mono",
            fontSize: "13px",
            color: "#e8e4dc",
            maxWidth: "520px",
            lineHeight: 1.7,
            marginBottom: "14px",
          }}
        >
          {profile.bio}
        </p>

        {/* Discipline tags */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "24px",
          }}
        >
          {profile.disciplines.map((d) => (
            <span
              key={d}
              style={{
                fontFamily: "Space Mono",
                fontSize: "11px",
                padding: "3px 10px",
                borderRadius: "2px",
                border: `1px solid ${disciplineColors[d] || "#2a2a28"}`,
                color: disciplineColors[d] || "#888780",
                backgroundColor: "transparent",
                letterSpacing: "0.04em",
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "0",
            borderTop: "1px solid #2a2a28",
            borderBottom: "1px solid #2a2a28",
            marginBottom: "32px",
          }}
        >
          {Object.entries(profile.stats).map(([key, val], i) => (
            <div
              key={key}
              style={{
                flex: 1,
                padding: "14px 0",
                textAlign: "center",
                borderRight: i < 3 ? "1px solid #2a2a28" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 800,
                  fontSize: "20px",
                  color: "#e8e4dc",
                  letterSpacing: "0.02em",
                }}
              >
                {val.toLocaleString()}
              </div>
              <div
                style={{
                  fontFamily: "Space Mono",
                  fontSize: "11px",
                  color: "#888780",
                  letterSpacing: "0.06em",
                  marginTop: "2px",
                }}
              >
                {key}
              </div>
            </div>
          ))}
        </div>

        {/* Main content: works grid + sidebar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 280px",
            gap: "32px",
            alignItems: "start",
          }}
        >
          {/* Works grid */}
          <div>
            <h2
              style={{
                fontFamily: "Syne",
                fontWeight: 800,
                fontSize: "16px",
                color: "#e8e4dc",
                marginBottom: "16px",
                letterSpacing: "0.04em",
              }}
            >
              Obras
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              {works.map((w, i) => (
                <WorkThumbnail key={i} seed={w.seed} span={w.span} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* Recent activity */}
            <div>
              <h3
                style={{
                  fontFamily: "Syne",
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#e8e4dc",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #2a2a28",
                }}
              >
                Actividad
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recentActivity.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Space Mono",
                        fontSize: "12px",
                        color: "#888780",
                      }}
                    >
                      {a.action}{" "}
                      <span style={{ color: "#e8e4dc" }}>{a.item}</span>
                    </span>
                    <span
                      style={{
                        fontFamily: "Space Mono",
                        fontSize: "10px",
                        color: "#2a2a28",
                        flexShrink: 0,
                      }}
                    >
                      {a.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Collaborators */}
            <div>
              <h3
                style={{
                  fontFamily: "Syne",
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#e8e4dc",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #2a2a28",
                }}
              >
                Colaboradores
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {collaborators.map((c) => (
                  <Link
                    key={c.name}
                    href={`/profile/${c.name}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "2px",
                        backgroundColor: "#2a2a28",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "Space Mono",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#D85A30",
                        flexShrink: 0,
                      }}
                    >
                      {c.initials}
                    </div>
                    <span
                      style={{
                        fontFamily: "Space Mono",
                        fontSize: "12px",
                        color: "#888780",
                      }}
                    >
                      @{c.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Upcoming events */}
            <div>
              <h3
                style={{
                  fontFamily: "Syne",
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#e8e4dc",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #2a2a28",
                }}
              >
                Próximos eventos
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcomingEvents.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#141412",
                        border: "1px solid #2a2a28",
                        borderRadius: "2px",
                        padding: "4px 8px",
                        fontFamily: "Space Mono",
                        fontSize: "10px",
                        color: "#D85A30",
                        flexShrink: 0,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {e.date}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "Space Mono",
                          fontSize: "12px",
                          color: "#e8e4dc",
                          lineHeight: 1.4,
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        style={{
                          fontFamily: "Space Mono",
                          fontSize: "10px",
                          color: "#888780",
                        }}
                      >
                        {e.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
