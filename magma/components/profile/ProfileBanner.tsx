// Deterministic SVG banner pattern unique to each user via seed
interface ProfileBannerProps {
  seed: number;
  height?: number;
}

export default function ProfileBanner({ seed, height = 180 }: ProfileBannerProps) {
  const s = seed;

  // Blueprint / architectural grid — columns and rows of cells,
  // some filled with accent at varying opacities
  const cols = 24;
  const rows = 6;
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Pseudo-random fill using seed
    const hash = ((s * 31 + col * 17 + row * 97) * 2654435761) >>> 0;
    const filled = hash % 7 === 0; // ~14% of cells filled
    const opacity = filled ? 0.06 + ((hash % 5) * 0.05) : 0;
    return { col, row, opacity, filled };
  });

  // Accent vertical stripes (1-3 per banner)
  const stripes = Array.from({ length: 3 }, (_, i) => {
    const x = ((s * (i + 3) * 41) % (cols - 2)) + 1;
    return x;
  });

  // Accent horizontal marks (scattered dots / cross marks)
  const marks = Array.from({ length: 8 }, (_, i) => ({
    x: ((s * (i + 7) * 29) % 96) + 2,
    y: ((s * (i + 5) * 53) % 82) + 8,
    size: 2 + ((s * i) % 4),
    op: 0.25 + ((s * i) % 4) * 0.1,
  }));

  return (
    <div
      style={{
        position: "relative",
        height,
        backgroundColor: "#141412",
        borderBottom: "1px solid #2a2a28",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/* Fine base grid */}
        {Array.from({ length: cols + 1 }, (_, i) => (
          <line
            key={`vg-${i}`}
            x1={(i / cols) * 100}
            y1="0"
            x2={(i / cols) * 100}
            y2="100"
            stroke="#2a2a28"
            strokeWidth="0.2"
            opacity="0.8"
          />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <line
            key={`hg-${i}`}
            x1="0"
            y1={(i / rows) * 100}
            x2="100"
            y2={(i / rows) * 100}
            stroke="#2a2a28"
            strokeWidth="0.2"
            opacity="0.8"
          />
        ))}

        {/* Filled cells */}
        {cells
          .filter((c) => c.filled)
          .map((c) => (
            <rect
              key={`cell-${c.col}-${c.row}`}
              x={(c.col / cols) * 100}
              y={(c.row / rows) * 100}
              width={100 / cols}
              height={100 / rows}
              fill="#D85A30"
              opacity={c.opacity}
            />
          ))}

        {/* Accent vertical stripes (full height, very faint) */}
        {stripes.map((col, i) => (
          <rect
            key={`stripe-${i}`}
            x={(col / cols) * 100}
            y="0"
            width={100 / cols}
            height="100"
            fill="#D85A30"
            opacity="0.12"
          />
        ))}

        {/* Cross marks scattered */}
        {marks.map((m, i) => (
          <g key={`mark-${i}`}>
            <line
              x1={m.x - m.size}
              y1={m.y}
              x2={m.x + m.size}
              y2={m.y}
              stroke="#D85A30"
              strokeWidth="0.5"
              opacity={m.op}
            />
            <line
              x1={m.x}
              y1={m.y - m.size}
              x2={m.x}
              y2={m.y + m.size}
              stroke="#D85A30"
              strokeWidth="0.5"
              opacity={m.op}
            />
          </g>
        ))}

        {/* Bottom fade overlay */}
        <rect
          x="0" y="70" width="100" height="30"
          fill="#141412"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
