import { MagmaWordmark } from "./MagmaWordmark";

export function MagmaLogo() {
  return (
    <span className="inline-flex flex-col gap-1">
      <MagmaWordmark className="text-[30px] md:text-[34px]" />
      <span className="w-0 min-w-full text-[12.6px] leading-tight tracking-[0.08em] [text-align-last:justify] text-[var(--magma-ash)]">el archivo vivo</span>
    </span>
  );
}
