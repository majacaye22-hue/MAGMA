import Link from "next/link";
import { postShellStyle } from "@/lib/post-layout";

export default function PostLoading() {
  return <main style={{ ...postShellStyle, backgroundColor: "#0c0c0b" }} className="mx-auto min-h-screen w-full max-w-[800px] px-4 pb-12 sm:px-8" aria-busy="true">
    <Link href="/" className="inline-block py-4 text-xs text-[var(--magma-ash)]">← archivo</Link>
    <p role="status" className="py-4 text-sm text-[var(--magma-muted)]">cargando publicación…</p>
  </main>;
}
