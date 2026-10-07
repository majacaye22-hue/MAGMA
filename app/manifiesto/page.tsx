import Link from "next/link";

const stanzas = [
  "ni tú tienes que estarlo.",
  "esto es para lo que haces cuando todavía no sabes cómo llamarlo.\nla maqueta. el ruido. la foto movida.\nel texto que no cierra.\nla idea que necesita otras manos.",
  "y para las cosas que guardaste porque significaron algo para ti.",
  "una foto que has llevado de casa en casa.\nun cassette que alguien te grabó.\nuna frase en el margen de un cuaderno.\nuna canción que todavía te lleva a un lugar.",
  "nos mueve lo analógico:\nlas huellas de uso, las pausas, lo que cambia al pasar de mano en mano.\nla nostalgia está en lo que recuerdas al encontrarlo otra vez.\nno hace falta que algo parezca viejo para que tenga historia.",
  "magma es también un archivo personal.\nun lugar para dejar algo y volver a ello.\npara guardar lo que hiciste\ny hacer eco de lo que alguien más hizo y se quedó contigo,\nsin borrar de dónde viene.",
  "nacemos en la ciudad de méxico.\nentre talleres, cuartos, calles y espacios prestados.\nhay gente haciendo cosas a unas cuadras de distancia\nsin saber que podría hacerlas junta.",
  "queremos abrir ese cruce.",
  "subir algo.\nencontrar a alguien.\npreguntar cómo lo hizo.\nprestar una herramienta.\narmar una fecha.\nvolver a intentar.",
  "aquí una disciplina no tiene que ser una identidad fija.\npuedes escribir hoy y hacer ruido mañana.\npuedes llegar con una obra.\npuedes llegar con una pregunta.",
  "nos interesa lo que pasa después de mirar.",
  "que una publicación termine en una conversación.\nque una conversación termine en un taller.\nque alguien diga «yo tengo espacio».\nque alguien más llegue.",
  "la pantalla es el punto de partida.\nqueremos un lugar en la ciudad:\nuna puerta que abrir,\nmesas que mover,\nalgo sonando al fondo.",
  "todavía estamos construyéndolo.",
];

export default function ManifiestoPage() {
  return (
    <main lang="es" className="min-h-screen bg-bg text-white">
      <article className="mx-auto max-w-[680px] px-6 py-6 sm:px-8 sm:py-8">
        <Link href="/" className="mb-6 inline-block text-sm hover:underline">← volver</Link>
        <p className="mb-3 text-sm tracking-widest">manifiesto · ciudad de méxico</p>
        <h1 className="magma-page-title mb-6 font-bold" style={{ fontFamily: "var(--font-syne), sans-serif", }}>
          magma no está terminado
        </h1>
        <div className="space-y-8 text-sm leading-loose" style={{ fontFamily: "var(--font-space-mono), monospace" }}>
          {stanzas.map(stanza => <p key={stanza} className="whitespace-pre-line">{stanza}</p>)}
          <p className="pt-6 font-bold">
            trae algo.<br />
            hagamos que pase otra cosa.
          </p>
        </div>
      </article>
    </main>
  );
}
