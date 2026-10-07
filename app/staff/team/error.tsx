"use client";
export default function TeamError({ unstable_retry }: { unstable_retry: () => void }) {
  return <main className="mx-auto max-w-4xl px-6 py-10 text-white"><h1>No se pudo cargar el equipo</h1><button className="mt-4 border border-red-600 px-4 py-2" onClick={unstable_retry}>reintentar</button></main>;
}
