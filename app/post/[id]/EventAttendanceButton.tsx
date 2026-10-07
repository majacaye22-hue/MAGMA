"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const mono = "var(--font-space-mono), monospace";

export function EventAttendanceButton({
  eventId,
  currentUserId,
}: {
  eventId: string;
  currentUserId: string | null;
}) {
  const [going, setGoing] = useState(false);
  const [loading, setLoading] = useState(Boolean(currentUserId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = getSupabaseClient();
    void supabase
      .from("event_attendances")
      .select("event_id")
      .eq("event_id", eventId)
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data, error }: { data: { event_id: string } | null; error: unknown }) => {
        if (error) { setError("no se pudo consultar tu respuesta; recarga para reintentar"); return; }
        setGoing(Boolean(data));
        setLoading(false);
      }, () => setError("no se pudo consultar tu respuesta; recarga para reintentar"));
  }, [currentUserId, eventId]);

  async function toggleGoing() {
    if (!currentUserId || saving) return;

    const next = !going;
    setGoing(next);
    setSaving(true);
    setError(null);
    try {
    const supabase = getSupabaseClient();
    const { error: attendanceError } = next
      ? await supabase.from("event_attendances").insert({ event_id: eventId, user_id: currentUserId })
      : await supabase.from("event_attendances").delete().eq("event_id", eventId).eq("user_id", currentUserId);

    if (attendanceError) {
      setGoing(!next);
      setError("no se pudo guardar tu respuesta");
    }
    } catch {
      setGoing(!next);
      setError("no se pudo guardar tu respuesta; revisa tu conexión");
    } finally { setSaving(false); }
  }

  if (!currentUserId) return null;

  return (
    <div>
      <button
        type="button"
        onClick={toggleGoing}
        disabled={loading || saving}
        aria-pressed={going}
        title={going ? "quitar mi asistencia" : "confirmar que voy a ir"}
        className="inline-flex min-h-11 items-center justify-between gap-6 rounded-[2px] border px-4 py-2 transition-colors hover:!border-[var(--magma-red)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--magma-red)] disabled:cursor-wait disabled:opacity-60"
        style={{
          backgroundColor: "transparent",
          borderColor: going ? "var(--magma-red)" : "#49463f",
          color: going ? "var(--magma-red)" : "#ffffff",
          fontFamily: mono,
          fontSize: "var(--magma-text-small)",
          letterSpacing: ".02em",
        }}
      >
        <span>{loading ? "consultando..." : saving ? "guardando..." : going ? "voy a ir" : "¿vas a ir?"}</span>
        <span aria-hidden="true" style={{ color: "var(--magma-red)" }}>{going ? "✓" : "→"}</span>
      </button>
      {error && <p style={{ color: "var(--magma-ash)", fontFamily: mono, fontSize: "var(--magma-text-small)", marginTop: "8px" }}>{error}</p>}
    </div>
  );
}
