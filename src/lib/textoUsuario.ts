/**
 * Motivos que entrega el motor de reglas (`indicadores.*.motivo`, M04) para
 * mostrarlos a quien usa la plataforma. El motor escribe referencias
 * internas —CC, reglas de REGLAS_INDICADORES, D-n— y a veces el nombre del
 * campo con su valor; nada de eso debe verse en pantalla (pedido de la
 * responsable, 2026-11-19).
 *
 * - Quita las referencias entre paréntesis: «(CC-043)», «(IN-RSU-02)», «(D-27)».
 * - Si el texto nombra un campo interno («red_subterranea_presente = …»),
 *   devuelve null: la categoría que se muestra al lado («No determinado»)
 *   ya lo dice en palabras.
 * - Deja la primera letra en mayúscula.
 */
const REFERENCIA = /\s*\((?:[A-Z]{1,4}-[A-Z0-9]{1,5}(?:-\d+)?|D-\d+)(?:\s*[,;/]\s*(?:[A-Z]{1,4}-[A-Z0-9]{1,5}(?:-\d+)?|D-\d+))*\)/g;
const CAMPO_INTERNO = /\b[a-z]+(?:_[a-z0-9]+)+\b/;

export function motivoParaUsuario(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  const limpio = motivo.replace(REFERENCIA, "").replace(/\s{2,}/g, " ").trim();
  if (!limpio || CAMPO_INTERNO.test(limpio)) return null;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
