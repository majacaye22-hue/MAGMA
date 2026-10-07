import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto shrink-0 border-t border-white/10 px-6 text-sm text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
        <span>magma · cdmx</span>
        <Link href="/manifiesto" className="inline-flex min-h-9 items-center hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          manifiesto
        </Link>
      </div>
    </footer>
  );
}
