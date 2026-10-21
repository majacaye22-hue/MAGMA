"use client";
import { EVENT_CATEGORIES, type EventDetailsDraft } from "@/lib/event-details";

export function EventDetailsFields({ value, onChange }: { value: EventDetailsDraft; onChange: (value: EventDetailsDraft) => void }) {
  const field = "min-h-11 w-full border-b border-[#a6afb0] bg-transparent py-2 text-white focus-visible:outline-2 focus-visible:outline-[var(--magma-red)]";
  const update = <K extends keyof EventDetailsDraft>(key: K, next: EventDetailsDraft[K]) => onChange({ ...value, [key]: next });
  return <fieldset className="grid gap-5 border-t border-[#49463f] pt-5">
    <legend className="px-2 text-sm">detalles del evento</legend>
    <p className="text-xs">horarios de Ciudad de México. para eventos nocturnos, elige la fecha del día siguiente al cerrar.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label>fecha de cierre — opcional<input className={field} type="date" value={value.endDate} onChange={e => update("endDate", e.target.value)} /></label>
      <label>hora de cierre<input className={field} type="time" value={value.endTime} onChange={e => update("endTime", e.target.value)} /></label>
    </div>
    <label>categoría<select className={field} value={value.category} onChange={e => update("category", e.target.value)}><option value="">sin categoría</option>{EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label>enlace externo — opcional<input className={field} type="url" maxLength={2048} placeholder="https://…" value={value.link} onChange={e => update("link", e.target.value)} /></label>
      <label>tipo de enlace<select className={field} value={value.linkKind} onChange={e => update("linkKind", e.target.value as EventDetailsDraft["linkKind"])}><option value="tickets">comprar boleto</option><option value="registration">registrarme</option></select></label>
    </div>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={value.registrationRequired} onChange={e => update("registrationRequired", e.target.checked)} /> requiere registro previo</label>
    <label>edad mínima — opcional<input className={field} type="number" min={0} max={99} step={1} placeholder="0 = todas las edades; vacío = por confirmar" value={value.minimumAge} onChange={e => update("minimumAge", e.target.value)} /></label>
    <label>accesibilidad — opcional<textarea className={field} rows={3} maxLength={1500} placeholder="acceso sin escalones, baños accesibles, contacto para dudas…" value={value.accessibility} onChange={e => update("accessibility", e.target.value)} /></label>
  </fieldset>;
}
