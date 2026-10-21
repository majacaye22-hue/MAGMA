"use client";
export default function ModError({ unstable_retry }: { unstable_retry: () => void }) {
  return <main className="mx-auto max-w-4xl px-6 py-10 text-white">
    <h1 className="text-xl">no se pudo cargar moderación</h1>
    <p className="mt-3">No podemos confirmar si hay publicaciones o reportes pendientes. Revisa la conexión e intenta de nuevo.</p>
    <button className="mt-4 min-h-11 border border-red-600 px-4" onClick={unstable_retry}>reintentar</button>
  </main>;
}
