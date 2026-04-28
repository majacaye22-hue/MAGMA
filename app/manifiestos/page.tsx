import { redirect } from "next/navigation";

export default async function ManifiestosRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  redirect(tag ? `/letras?tag=${tag}` : "/letras");
}
