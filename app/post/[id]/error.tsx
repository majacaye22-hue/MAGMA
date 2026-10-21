"use client";

export default function PostError({ unstable_retry }: { unstable_retry: () => void }) {
  return <main className="mx-auto w-full max-w-[800px] px-4 py-8 text-white sm:px-8">
    <h1 className="text-xl">no se pudo cargar la publicación</h1>
    <p className="mt-3 text-sm">la conexión tardó demasiado o no está disponible. puedes intentarlo de nuevo.</p>
    <button onClick={unstable_retry} className="mt-4 min-h-11 rounded-[2px] border border-[var(--magma-red)] px-4 text-sm hover:bg-[var(--magma-red)]">reintentar →</button>
  </main>;
}
