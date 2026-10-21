export default function LoadingProjects() {
  return <main className="min-h-screen w-full" style={{ background: "var(--magma-obsidian)" }} aria-busy="true" aria-label="cargando proyectos">
    <div className="mx-auto max-w-7xl px-5 pb-20 text-white sm:px-8">
    <header className="grid gap-2 py-5 md:py-6">
      <h1 className="magma-page-title" style={{ color: "var(--magma-ash)", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, letterSpacing: "0.02em" }}>proyectos personales</h1>
    </header>
    <div className="flex flex-wrap items-end gap-3 text-sm" aria-hidden="true">
      {[
        ["buscar proyectos", "flex-[2_1_200px]"],
        ["creador", "flex-[1_1_140px]"],
        ["ordenar", "w-[150px]"],
      ].map(([label, sizing]) => <div key={label} className={`flex min-w-0 flex-col gap-1 ${sizing}`}>
        <span className="font-mono text-sm">{label}</span>
        <div className="h-11 rounded-[2px] border border-[#49463f]" />
      </div>)}
      <div className="h-11 w-20 rounded-[2px] border border-[var(--magma-red)]" />
    </div>
    <section className="py-5">
    <p role="status" className="sr-only">cargando proyectos…</p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="overflow-hidden rounded-[2px] border border-[#49463f] bg-[#10100f] p-[10px]"><div className="aspect-[4/5] bg-[#090909]" /><div className="h-24" /></div>)}
    </div>
    </section>
    </div>
  </main>;
}
