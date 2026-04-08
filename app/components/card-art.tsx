import Link from "next/link";

export type CardType = "arte" | "música" | "foto" | "evento";

export interface CardData {
  id: number;
  title: string;
  author: string;
  initials: string;
  upvotes: number;
  type: CardType;
  colSpan: 1 | 2;
  rowSpan: 1 | 2;
  location?: string;
}

export const TYPE_LABEL: Record<CardType, string> = {
  arte: "arte",
  música: "música",
  foto: "foto",
  evento: "evento",
};

// ─── SVG placeholder art ────────────────────────────────────────────────────

export function ArteArt() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="200" cy="200" r="148" fill="none" stroke="#D85A30" strokeOpacity="0.07" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="108" fill="none" stroke="#D85A30" strokeOpacity="0.09" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="68"  fill="none" stroke="#D85A30" strokeOpacity="0.11" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="28"  fill="none" stroke="#D85A30" strokeOpacity="0.14" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="6"   fill="#D85A30" fillOpacity="0.12" />
      <circle cx="310" cy="105" r="52"  fill="none" stroke="#D85A30" strokeOpacity="0.06" strokeWidth="0.5" />
      <rect x="130" y="130" width="140" height="140" fill="none" stroke="#D85A30" strokeOpacity="0.05" strokeWidth="0.5" transform="rotate(22 200 200)" />
      <line x1="0"  y1="400" x2="400" y2="0"  stroke="#D85A30" strokeOpacity="0.04" strokeWidth="0.5" />
      <line x1="0"  y1="340" x2="340" y2="0"  stroke="#D85A30" strokeOpacity="0.03" strokeWidth="0.5" />
      <line x1="60" y1="400" x2="400" y2="60" stroke="#D85A30" strokeOpacity="0.03" strokeWidth="0.5" />
      <circle cx="318" cy="298" r="4"   fill="#D85A30" fillOpacity="0.18" />
      <circle cx="330" cy="290" r="2.5" fill="#D85A30" fillOpacity="0.11" />
      <circle cx="312" cy="312" r="1.8" fill="#D85A30" fillOpacity="0.09" />
    </svg>
  );
}

export function MusicaArt({ title, artist }: { title: string; artist: string }) {
  const heights = [
     5, 10, 18, 28, 40, 55, 64, 72, 80, 88,
    92, 86, 78, 88, 96, 86, 74, 84, 92, 82,
    72, 84, 92, 78, 66, 78, 88, 72, 58, 46,
    56, 66, 74, 62, 50, 40, 30, 22, 15, 10,
     8, 12,  8,  5,  6,  9,  5,  4,
  ];
  const barW = 3;
  const barGap = 2;
  const step = barW + barGap;
  const startX = 20;
  const centerY = 370;
  const maxHalf = 21;

  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text x="20" y="95" fontSize="12" fontWeight="700" fill="#e8e4dc" fillOpacity="0.52" fontFamily="ui-monospace, monospace" letterSpacing="0.3">
        {title}
      </text>
      <text x="20" y="114" fontSize="9.5" fill="#5DCAA5" fillOpacity="0.48" fontFamily="ui-monospace, monospace" letterSpacing="1">
        {artist}
      </text>
      <line x1={startX} y1={centerY} x2={startX + heights.length * step - barGap} y2={centerY} stroke="#5DCAA5" strokeOpacity="0.07" strokeWidth="0.5" />
      {heights.map((h, i) => {
        const half = (h / 100) * maxHalf;
        const x = startX + i * step;
        return (
          <rect key={i} x={x} y={centerY - half} width={barW} height={half * 2} fill="#5DCAA5" fillOpacity={0.12 + (h / 100) * 0.32} rx="0.5" />
        );
      })}
    </svg>
  );
}

export function FotoArt({ location }: { location: string }) {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="32" y="54" width="336" height="292" fill="none" stroke="#4A7FA5" strokeOpacity="0.16" strokeWidth="0.8" />
      <rect x="64" y="86" width="272" height="228" fill="none" stroke="#4A7FA5" strokeOpacity="0.09" strokeWidth="0.5" />
      <line x1="155" y1="54"  x2="155" y2="346" stroke="#4A7FA5" strokeOpacity="0.06" strokeWidth="0.5" />
      <line x1="245" y1="54"  x2="245" y2="346" stroke="#4A7FA5" strokeOpacity="0.06" strokeWidth="0.5" />
      <line x1="32"  y1="152" x2="368" y2="152" stroke="#4A7FA5" strokeOpacity="0.06" strokeWidth="0.5" />
      <line x1="32"  y1="248" x2="368" y2="248" stroke="#4A7FA5" strokeOpacity="0.06" strokeWidth="0.5" />
      <path d="M 32 86  L 32 54  L 64 54"    fill="none" stroke="#4A7FA5" strokeOpacity="0.30" strokeWidth="1.2" />
      <path d="M 336 54 L 368 54 L 368 86"   fill="none" stroke="#4A7FA5" strokeOpacity="0.30" strokeWidth="1.2" />
      <path d="M 32 314 L 32 346 L 64 346"   fill="none" stroke="#4A7FA5" strokeOpacity="0.30" strokeWidth="1.2" />
      <path d="M 336 346 L 368 346 L 368 314" fill="none" stroke="#4A7FA5" strokeOpacity="0.30" strokeWidth="1.2" />
      <path d="M 64 102 L 64 86  L 80 86"    fill="none" stroke="#4A7FA5" strokeOpacity="0.14" strokeWidth="0.8" />
      <path d="M 320 86  L 336 86  L 336 102" fill="none" stroke="#4A7FA5" strokeOpacity="0.14" strokeWidth="0.8" />
      <path d="M 64 298  L 64 314 L 80 314"  fill="none" stroke="#4A7FA5" strokeOpacity="0.14" strokeWidth="0.8" />
      <path d="M 320 314 L 336 314 L 336 298" fill="none" stroke="#4A7FA5" strokeOpacity="0.14" strokeWidth="0.8" />
      <circle cx="200" cy="200" r="20" fill="none" stroke="#4A7FA5" strokeOpacity="0.12" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="3.5" fill="none" stroke="#4A7FA5" strokeOpacity="0.20" strokeWidth="0.8" />
      <line x1="178" y1="200" x2="193" y2="200" stroke="#4A7FA5" strokeOpacity="0.16" strokeWidth="0.5" />
      <line x1="207" y1="200" x2="222" y2="200" stroke="#4A7FA5" strokeOpacity="0.16" strokeWidth="0.5" />
      <line x1="200" y1="178" x2="200" y2="193" stroke="#4A7FA5" strokeOpacity="0.16" strokeWidth="0.5" />
      <line x1="200" y1="207" x2="200" y2="222" stroke="#4A7FA5" strokeOpacity="0.16" strokeWidth="0.5" />
      <line x1="32"  y1="54"  x2="64"  y2="86"  stroke="#4A7FA5" strokeOpacity="0.07" strokeWidth="0.5" />
      <line x1="368" y1="54"  x2="336" y2="86"  stroke="#4A7FA5" strokeOpacity="0.07" strokeWidth="0.5" />
      <line x1="32"  y1="346" x2="64"  y2="314" stroke="#4A7FA5" strokeOpacity="0.07" strokeWidth="0.5" />
      <line x1="368" y1="346" x2="336" y2="314" stroke="#4A7FA5" strokeOpacity="0.07" strokeWidth="0.5" />
      <text x="32" y="380" fontSize="9" fill="#4A7FA5" fillOpacity="0.45" fontFamily="ui-monospace, monospace" letterSpacing="3.5">
        {location}
      </text>
    </svg>
  );
}

export function EventoArt() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text x="-8" y="236" fontSize="168" fontWeight="900" fill="#e8e4dc" fillOpacity="0.025" fontFamily="ui-sans-serif, system-ui, sans-serif" letterSpacing="-8">NOC</text>
      <line x1="40" y1="162" x2="360" y2="162" stroke="#888780" strokeOpacity="0.18" strokeWidth="0.8" />
      <line x1="40" y1="165" x2="360" y2="165" stroke="#888780" strokeOpacity="0.08" strokeWidth="0.5" />
      <text x="40" y="194" fontSize="9.5" fill="#888780" fillOpacity="0.42" fontFamily="ui-monospace, monospace" letterSpacing="3.5">VIERNES 22.05.26</text>
      <text x="40" y="214" fontSize="9.5" fill="#888780" fillOpacity="0.28" fontFamily="ui-monospace, monospace" letterSpacing="3.5">22:00 — 04:00 HRS</text>
      <text x="40" y="238" fontSize="9.5" fill="#888780" fillOpacity="0.18" fontFamily="ui-monospace, monospace" letterSpacing="3.5">CDMX / COL. ROMA NORTE</text>
      <line x1="40" y1="252" x2="360" y2="252" stroke="#888780" strokeOpacity="0.1" strokeWidth="0.5" />
      <rect x="40" y="274" width="9" height="9" fill="#D85A30" fillOpacity="0.18" />
      <rect x="55" y="274" width="9" height="9" fill="#D85A30" fillOpacity="0.10" />
      <rect x="70" y="274" width="9" height="9" fill="#D85A30" fillOpacity="0.05" />
    </svg>
  );
}

export function CardArt({ card }: { card: CardData }) {
  switch (card.type) {
    case "arte":   return <ArteArt />;
    case "música": return <MusicaArt title={card.title} artist={card.author} />;
    case "foto":   return <FotoArt location={card.location ?? "CDMX · NOCHE"} />;
    case "evento": return <EventoArt />;
  }
}

// ─── Card tile ───────────────────────────────────────────────────────────────

export function ArtCard({ card }: { card: CardData }) {
  const username = card.author.replace(/^@/, "");

  return (
    <div
      className="group relative overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "#141412",
        border: "0.5px solid #2a2a28",
        gridColumn: `span ${card.colSpan}`,
        gridRow: `span ${card.rowSpan}`,
      }}
    >
      {/* SVG art */}
      <div className="absolute inset-0">
        <CardArt card={card} />
      </div>

      {/* Type badge */}
      <span
        className="absolute top-3 left-3 z-10 px-2 py-0.5 text-[10px] uppercase tracking-widest border"
        style={{ background: "rgba(20,20,18,0.88)", color: "#888780", borderColor: "#2a2a28", fontFamily: "var(--font-space-mono), monospace" }}
      >
        {TYPE_LABEL[card.type]}
      </span>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 z-20 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "rgba(12,12,11,0.85)" }}
      >
        <div className="flex justify-end">
          <span className="text-xs tabular-nums" style={{ color: "#D85A30", fontFamily: "var(--font-space-mono), monospace" }}>
            ↑ {card.upvotes.toLocaleString()}
          </span>
        </div>
        <div>
          <p className="leading-snug mb-3" style={{ fontSize: "16px", color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif", fontWeight: 700 }}>
            {card.title}
          </p>
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{ width: "28px", height: "28px", borderRadius: "2px", backgroundColor: "#2a2a28", color: "#e8e4dc", fontFamily: "var(--font-syne), sans-serif" }}
            >
              {card.initials}
            </div>
            <Link
              href={`/profile/${username}`}
              className="text-xs hover:underline"
              style={{ color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}
              onClick={(e) => e.stopPropagation()}
            >
              {card.author}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
