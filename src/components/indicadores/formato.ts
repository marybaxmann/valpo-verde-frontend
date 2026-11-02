/** Formato es-CL para los indicadores. Solo presenta lo que llega de la API. */

export function num(v: number | null | undefined, decimales = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("es-CL", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function pct(v: number | null | undefined, decimales = 1): string {
  return v === null || v === undefined ? "—" : `${num(v, decimales)} %`;
}

/**
 * Masa en toneladas → texto y unidad: bajo 1 t se muestra en kg (la API
 * entrega toneladas; solo cambia la unidad de lectura).
 */
export function masa(t: number | null | undefined): { valor: string; unidad: string } {
  if (t === null || t === undefined) return { valor: "—", unidad: "" };
  if (t < 1) return { valor: num(t * 1000, 0), unidad: "kg" };
  return { valor: num(t, t < 10 ? 2 : 1), unidad: "t" };
}

/** Etiqueta de los motivos de exclusión del carbono (códigos del backend, CC-069). */
export const MOTIVO_CARBONO: Record<string, string> = {
  no_presente: "No presente",
  sin_evaluacion_valida: "Sin evaluación completa vigente",
  sin_modelo: "Especie sin modelo aprobado",
  palmera_sin_modelo: "Palmera (sin modelo)",
  multifustal_no_admitido: "Multifustal (el modelo no lo admite)",
  fuera_de_rango: "DAP fuera del rango del modelo",
  fuera_de_rango_altura: "Altura fuera del rango del modelo",
  falta_dap: "Falta el DAP",
  configuracion_fuste_no_determinada: "Sin dato de multifustal",
  resultado_invalido: "Cálculo no válido",
};
