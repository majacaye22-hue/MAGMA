import { redirect } from "next/navigation";

export default async function HoyRedirect({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { fecha } = await searchParams;
  redirect(fecha ? `/explorar?vista=archivo&fecha=${encodeURIComponent(fecha)}` : "/explorar?vista=hoy");
}
