import type { ValorCrudo } from "./inspectionForm";

/**
 * Presentación del formulario de inspección (evaluación guiada, 2026-11-22).
 * Nada de esto cambia reglas: qué falta y todo resultado lo decide el backend.
 */

/**
 * Obligatoriedad del Excel (B16) leída para mostrarla, sin cambiar la regla:
 * «Obligatorio…» → asterisco; «Opcional» → «opcional»; «Condicional» (y
 * combinaciones) → el campo solo se ve cuando su condición se cumple.
 */
export function tipoObligatoriedad(texto: string | null): "obligatorio" | "opcional" | "condicional" | null {
  const t = (texto ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith("obligatorio")) return "obligatorio";
  if (t === "opcional") return "opcional";
  return "condicional";
}

/** ¿El campo ya tiene una respuesta? Solo para mostrar el avance. */
export function tieneValor(v: ValorCrudo | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  return v.trim() !== "";
}

/**
 * Etiqueta más legible: abreviaturas y tildes que quedaron del nombre técnico
 * (p. ej., «Diámetro copa ns» → «Diámetro de copa N–S»). No cambia el campo
 * ni su significado.
 */
export function etiquetaVisible(etiqueta: string): string {
  return etiqueta
    .replace(/\bDiámetro copa\b/, "Diámetro de copa")
    .replace(/\bns\b/, "N–S")
    .replace(/\beo\b/, "E–O")
    .replace(/\bcle\b/, "(CLE)")
    .replace(/\bpct copa\b/, "(% de la copa)")
    .replace(/\bm2\b/, "m²")
    .replace(/\bDefoliacion\b/, "Defoliación")
    .replace(/\bcirculacion\b/, "circulación")
    .replace(/\bcompactacion\b/, "compactación")
    .replace(/\bfisic([oa])\b/, "físic$1");
}
