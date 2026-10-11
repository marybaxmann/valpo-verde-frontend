/**
 * Fechas de SIVU en hora de Chile (America/Santiago), independiente de la zona
 * horaria del navegador y de UTC. `toISOString()` entrega el día UTC, que entre
 * las 21:00 (20:00 en invierno) y las 23:59 de Chile ya es el día siguiente.
 * Intl resuelve automáticamente los cambios de horario (UTC−3 / UTC−4).
 */
const ZONA_CHILE = "America/Santiago";

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_CHILE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatoFechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: ZONA_CHILE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Día de hoy en Chile, AAAA-MM-DD (para valores por defecto y `max` de inputs date). */
export function hoyChile(): string {
  return formatoFecha.format(new Date());
}

/** Día en Chile (AAAA-MM-DD) de una marca de tiempo ISO (timestamptz). */
export function fechaChile(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : formatoFecha.format(d);
}

/** Fecha y hora en Chile (dd-mm-aaaa, hh:mm) de una marca de tiempo ISO. */
export function fechaHoraChile(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : formatoFechaHora.format(d);
}
