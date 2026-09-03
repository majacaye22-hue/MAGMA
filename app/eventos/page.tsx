import { EventosClient } from "./EventosClient";

export default async function EventosPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0c0c0b" }}>


      <main className="max-w-6xl mx-auto px-6 pb-20">
        <div className="pt-10 pb-8" style={{ borderBottom: "0.5px solid #2a2a28" }}>
          <p style={{ fontSize: "9px", color: "#D85A30", fontFamily: "var(--font-space-mono), monospace", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "12px" }}>
            cdmx · carteles que siguen hablando
          </p>
          <h1
            style={{
              fontSize: "clamp(36px, 7vw, 76px)",
              color: "#e8e4dc",
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.05em",
              marginBottom: "12px",
            }}
          >
            cartelera
          </h1>
          <p style={{ maxWidth: "580px", fontSize: "12px", lineHeight: 1.7, color: "#888780", fontFamily: "var(--font-space-mono), monospace" }}>
            como encontrar una pared llena de flyers camino a casa. Aquí se quedan un poco más: para llegar, recordar y volver a encontrarse.
          </p>
        </div>

        <EventosClient />
      </main>
    </div>
  );
}
