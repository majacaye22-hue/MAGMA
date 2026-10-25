export default function LoadingProjects() {
  return <main className="min-h-screen w-full" style={{ background: "var(--magma-obsidian)" }} aria-busy="true" aria-label="cargando proyectos">
    <div className="mx-auto max-w-7xl px-5 pb-20 text-white sm:px-8">
    <header className={styles.hero}>
      <div><h1 style={{ color: "var(--magma-ash)", fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}>ideas tomando forma.</h1>
      <p className={styles.intro}>proyectos · procesos, pruebas y cosas por descubrir.</p></div>
    </header>
    <div className="flex flex-wrap items-end gap-3 py-[18px] text-sm" aria-hidden="true">
      {[
        ["buscar proyectos", "flex-[2_1_200px]"],
        ["creador", "flex-[1_1_140px]"],
        ["ordenar", "w-[150px]"],
      ].map(([label, sizing]) => <div key={label} className={`flex min-w-0 flex-col gap-1 ${sizing}`}>
        <span className="font-mono text-[11px] text-[var(--magma-muted)]">{label}</span>
        <div className="h-11 rounded-xl bg-[#181817]" />
      </div>)}
      <div className="h-11 w-20 rounded-xl bg-[#292827]" />
    </div>
    <section className="py-5">
    <p role="status" className="sr-only">cargando proyectos…</p>
    <div className={styles.discoveryGrid} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <div key={i}><div className={styles.skeletonCover} /><div className="mt-5 h-5 w-2/3 rounded bg-[#181817]" /><div className="mt-3 h-3 w-1/3 rounded bg-[#181817]" /></div>)}
    </div>
    </section>
    </div>
  </main>;
}
import styles from "./proyectos.module.css";
