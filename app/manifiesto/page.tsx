import Link from "next/link";

const mono = "var(--font-space-mono), monospace";
const syne = "var(--font-syne), sans-serif";

export default function ManifiestoPage() {
  return (
    <div style={{ backgroundColor: "#0c0c0b", minHeight: "100vh" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "80px 32px 120px" }}>

        {/* Back */}
        <div style={{ marginBottom: "64px" }}>
          <Link
            href="/"
            style={{ fontSize: "10px", color: "#444441", fontFamily: mono, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.14em" }}
          >
            ← volver
          </Link>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 64px)",
          fontFamily: syne,
          fontWeight: 800,
          color: "#e8e4dc",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          marginBottom: "28px",
        }}>
          MAGMA
          <br />
          <span style={{ color: "#D85A30" }}>Manifiesto</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: "18px",
          fontFamily: syne,
          fontStyle: "italic",
          fontWeight: 400,
          color: "#888780",
          lineHeight: 1.5,
          marginBottom: "72px",
          maxWidth: "520px",
        }}>
          Un cabaret digital para la ciudad que nunca termina de inventarse.
        </p>

        {/* Rule */}
        <div style={{ width: "40px", height: "1px", backgroundColor: "#D85A30", marginBottom: "56px" }} />

        {/* Body */}
        <div style={{
          fontFamily: mono,
          fontSize: "13px",
          color: "#aaa89e",
          lineHeight: 2,
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}>
          <p>
            MAGMA nace del barro de la Ciudad de México — de sus bardas pintadas, sus fanzines fotocopiados a las 3am, sus conciertos en azoteas, sus exposiciones en pasillos, sus manifiestos pegados en postes que nadie lee pero todos sienten.
          </p>

          <p>
            Somos un archivo vivo. Un espacio donde el arte no espera permiso, donde el proceso importa tanto como el resultado, donde publicar es un acto político y compartir es una forma de resistencia.
          </p>

          <p>
            MAGMA existe porque las plataformas globales no entienden lo que significa hacer cultura desde aquí. No entienden el tianguis, el colectivo, el fanzine, la pieza de una sola edición, la obra que no cabe en un algoritmo.
          </p>

          <p>
            Aquí no hay feeds optimizados para el engagement. Hay obras. Hay artistas. Hay colectivos que se forman en la madrugada y exponen al amanecer.
          </p>

          <p>
            MAGMA es para el grabador de Tepito y el fotógrafo de La Merced. Para la poeta que lleva tres años escribiendo el mismo poema y para el productor que lleva tres noches sin dormir terminando un track. Para quien vende zines en el metro y para quien instala en galerías que aún no existen.
          </p>

          <p>
            Creemos en la colaboración como acto creativo. En la colonia como contexto. En el error como método. En la incomodidad como material.
          </p>

          <p>
            No somos una red social. Somos una red.
          </p>
        </div>

        {/* Closing rule */}
        <div style={{ width: "40px", height: "1px", backgroundColor: "#2a2a28", margin: "72px 0 56px" }} />

        {/* Closing line */}
        <p style={{
          fontSize: "clamp(20px, 3.5vw, 30px)",
          fontFamily: syne,
          fontStyle: "italic",
          fontWeight: 700,
          color: "#e8e4dc",
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
        }}>
          La revolución creativa no se anuncia.
          <br />
          <span style={{ color: "#D85A30" }}>Se contagia.</span>
        </p>

        {/* Footer */}
        <p style={{ marginTop: "80px", fontSize: "9px", color: "#2a2a28", fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.2em" }}>
          MAGMA — Ciudad de México
        </p>
      </div>
    </div>
  );
}
