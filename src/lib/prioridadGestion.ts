/**
 * Prioridad de intervención árbol–infraestructura (M05 del Excel maestro:
 * riesgo del árbol × clasificación de infraestructura). El código lo entrega
 * B8 (`prioridad`); aquí solo se ordena y se presenta. La «orientación de
 * gestión» es la de la hoja MATRICES_CALCULO, M05.
 *
 * Paleta propia (2026-11-24): distinta de la de riesgo (PR-016, CC-085) para
 * que el mapa de Infraestructura no se confunda con el de Riesgo Arbóreo.
 */

export interface DefPrioridad {
  codigo: string;
  /** Orientación de gestión de M05. */
  orientacion: string;
  /** Texto corto para chips. */
  corto: string;
  color: string;
  /** Diámetro del pin en el mapa (px): lo urgente se ve más grande. */
  pin: number;
}

export const PRIORIDADES: DefPrioridad[] = [
  { codigo: "critica", orientacion: "Atención urgente", corto: "Urgente", color: "#7B1FA2", pin: 26 },
  { codigo: "alta", orientacion: "Intervención prioritaria en el corto plazo", corto: "Corto plazo", color: "#C2185B", pin: 22 },
  { codigo: "media", orientacion: "Intervención programada", corto: "Programada", color: "#1E6FD9", pin: 18 },
  { codigo: "baja", orientacion: "Seguimiento rutinario", corto: "Seguimiento", color: "#8FA3A0", pin: 13 },
];

export const prioridadDe = (codigo: string | null | undefined): DefPrioridad | null => PRIORIDADES.find((p) => p.codigo === codigo) ?? null;

/** Pin circular de un color, con borde blanco y anillo exterior para lo urgente. */
export function svgPin(color: string, urgente: boolean): string {
  const anillo = urgente ? `<circle cx="16" cy="16" r="14.5" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.45"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${anillo}<circle cx="16" cy="16" r="${urgente ? 10.5 : 12}" fill="${color}" stroke="#fff" stroke-width="2.5"/></svg>`;
}

/** Pin de árbol sin evaluación vigente: anillo tenue, sin relleno. */
export function svgPinPendiente(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#ffffff" fill-opacity="0.55" stroke="#8a948f" stroke-width="2" stroke-dasharray="3 3"/></svg>`;
}
