/**
 * Presentación de Incidencias según la maqueta del módulo (artefacto «SIVU —
 * Incidencias», 2026-10-31; valores de diseño, sin datos). Los estados,
 * tipos y prioridades vienen de la API como `{ codigo, etiqueta }`; aquí
 * solo se asigna color e ícono a cada código.
 */

export const COLOR_ESTADO_INC: Record<string, string> = {
  ingresada: "#c9d1cc",
  en_revision: "#b79cf2",
  derivada: "#7db8e8",
  resuelta: "#8fd9b0",
  descartada: "#8a948e",
};

/** Color del punto de un árbol con una incidencia sin revisar. */
export const COLOR_SIN_REVISAR = "#c9b6f5";

export const COLOR_PRIORIDAD: Record<string, string> = {
  baja: "#a8e6c3",
  media: "#9cc8ee",
  alta: "#f0b84a",
  critica: "#f0705a",
};

export const colorEstadoInc = (codigo: string | null | undefined) => (codigo && COLOR_ESTADO_INC[codigo]) || "#c9d1cc";

/** Trazos de los íconos por tipo de incidencia (maqueta; presentación). */
const ICONO = {
  rama: "M4 20 14 10 M14 10l6-6 M14 10l3 5 M9 15l-4-2",
  raices: "M12 3v9 M12 12c-3 2-5 5-6 9 M12 12c3 2 5 5 6 9 M12 12v9",
  infra: "M3 21h18 M5 21V9l7-5 7 5v12 M9 21v-6h6v6",
  inclinado: "M7 21 15 5 M15 5c3 1 5 4 4 7 M4 21h16",
  fito: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z M8 12h.01 M12 10h.01",
  obstruccion: "M4 12h16 M12 4v16 M5 5l14 14",
  otro: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 8v5 M12 16h.01",
};

export function iconoTipo(codigo: string | null | undefined): string {
  switch (codigo) {
    case "rama_caida":
    case "rama_quebrada":
      return ICONO.rama;
    case "raices_expuestas":
      return ICONO.raices;
    case "dano_en_infraestructura":
      return ICONO.infra;
    case "arbol_inclinado":
    case "arbol_caido":
      return ICONO.inclinado;
    case "problema_fitosanitario":
      return ICONO.fito;
    case "obstruccion":
      return ICONO.obstruccion;
    default:
      return ICONO.otro;
  }
}

/** «hace 35 min», «hace 2 h», «hace 3 días» desde la fecha del reporte. */
export function hace(iso: string | null | undefined): string {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

/** Ingresada hace menos de 24 horas: el punto «late» (maqueta). */
export function esReciente(estado: string, iso: string | null | undefined): boolean {
  return estado === "ingresada" && !!iso && Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;
}
