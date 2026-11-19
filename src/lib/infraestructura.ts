/**
 * Presentación del módulo Infraestructura (maqueta aprobada por la
 * responsable el 2026-11-17, v2.1). Nada de esto calcula: agrupa y dibuja lo
 * que entrega B8 (M04 en la evaluación vigente).
 *
 * - Orden y nombres visibles de los componentes: los de la maqueta y de la
 *   ficha del árbol (`TreeSheet`, COMPONENTES_INFRA). La clave es el `codigo`
 *   de `componente_infraestructura` que entrega la API.
 * - Campos de cada componente: entradas de M04 (`M04Input`,
 *   `m04-infraestructura.ts`) tal como se guardan en las variables de la
 *   inspección. Las etiquetas y unidades se leen del esquema del formulario
 *   (B16); un campo que no llega en la inspección no se muestra.
 */

export interface DefComponente {
  codigo: string;
  /** Nombre visible (maqueta y TreeSheet). */
  nombre: string;
  /** Nombre corto para chips y pestañas. */
  corto: string;
  /** Prefijo de las reglas de REGLAS_INDICADORES (solo informativo). */
  familia: string;
  /** Variables de la inspección que M04 usa para este componente. */
  campos: string[];
}

export const COMPONENTES: DefComponente[] = [
  {
    codigo: "vereda",
    nombre: "Acera / vereda",
    corto: "Vereda",
    familia: "IN-VER",
    campos: [
      "existe_vereda",
      "dano_interferencia_vereda",
      "presenta_levantamiento_vereda",
      "presenta_grieta_vereda",
      "presenta_hundimiento_vereda",
      "desnivel_max_vereda_cm",
      "numero_grietas_vereda",
      "ancho_max_grieta_vereda_cm",
      "longitud_max_grieta_vereda_cm",
      "reduce_circulacion_peatonal",
      "ancho_libre_remanente_m",
      "impide_paso_seguro",
    ],
  },
  {
    codigo: "alcorque",
    nombre: "Alcorque / superficie de plantación",
    corto: "Alcorque",
    familia: "IN-ALC",
    campos: [
      "existe_alcorque",
      "dano_interferencia_alcorque",
      "suelo_sellado_impermeabilizado",
      "indicios_compactacion_superficial",
      "obstaculos_crecimiento_radicular",
    ],
  },
  {
    codigo: "calzada",
    nombre: "Calzada",
    corto: "Calzada",
    familia: "IN-CAL",
    campos: [
      "existe_calzada",
      "dano_interferencia_calzada",
      "levantamiento_calzada",
      "hundimiento_calzada",
      "desnivel_max_calzada_cm",
      "afecta_circulacion_vehicular",
    ],
  },
  {
    codigo: "red_aerea",
    nombre: "Red aérea",
    corto: "R. aérea",
    familia: "IN-RAE",
    campos: ["red_aerea_presente", "tipo_red_aerea", "distancia_copa_red_aerea_m", "dano_interferencia_red_aerea"],
  },
  {
    codigo: "red_subterranea",
    nombre: "Red subterránea",
    corto: "R. subt.",
    familia: "IN-RSU",
    campos: ["red_subterranea_presente", "afectacion_fisica_red_subterranea", "compromete_funcionalidad_red_subterranea"],
  },
  {
    codigo: "infraestructura_vertical",
    nombre: "Infraestructura vertical",
    corto: "Vertical",
    familia: "IN-VRT",
    campos: [
      "existe_elemento_vertical",
      "contacto_interferencia_infraestructura_vertical",
      "dano_fisico_observable_infraestructura_vertical",
      "compromete_estabilidad_funcionalidad",
    ],
  },
];

/** Aspecto de una categoría de componente (`categoria_infraestructura`); `sin_dato` = el motor no guardó categoría. */
export type AspectoCategoria = "sev" | "mod" | "lev" | "sin" | "nd" | "na" | "sin_dato";

export function aspectoCategoria(codigo: string | null | undefined): AspectoCategoria {
  switch (codigo) {
    case "severa":
      return "sev";
    case "moderada":
      return "mod";
    case "leve":
      return "lev";
    case "sin_afectacion":
      return "sin";
    case "no_determinado":
      return "nd";
    case "no_aplica":
      return "na";
    default:
      return "sin_dato";
  }
}

/** Afectación = Leve, Moderada o Severa (lo que la maqueta cuenta como «árboles con afectación»). */
export const CATEGORIAS_CON_AFECTACION = ["leve", "moderada", "severa"];

/** Orden de lectura de las categorías en la ficha y la leyenda: la más grave primero. */
export const ORDEN_CATEGORIAS = ["severa", "moderada", "leve", "sin_afectacion", "no_determinado", "no_aplica"];

function token(nombre: string, respaldo: string): string {
  if (typeof document === "undefined") return respaldo;
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || respaldo;
}

/** Colores literales para el pin (un SVG como imagen no lee variables CSS). Paleta de clasificación de PR-016. */
export function coloresPin() {
  return {
    sev: token("--classification-high", "#F04A32"),
    mod: token("--classification-medium", "#F9B52B"),
    lev: token("--classification-low", "#DCE8A9"),
    crit: token("--classification-critical", "#C7252B"),
    sin: "#CFE8F7",
    pend: "#A7B0AB",
  };
}

/** Color de la clasificación general por tono (`getClassificationTone`). */
export function colorClasificacion(tono: "critical" | "high" | "medium" | "low" | "neutral"): string {
  const c = coloresPin();
  return { critical: c.crit, high: c.sev, medium: c.mod, low: c.lev, neutral: c.pend }[tono];
}

const HATCH =
  '<defs><pattern id="h" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#3c4a43"/><rect width="1.6" height="4" fill="#9aa69f"/></pattern></defs>';

export function arco(r1: number, r2: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [(r * Math.cos((a * Math.PI) / 180)).toFixed(2), (r * Math.sin((a * Math.PI) / 180)).toFixed(2)];
  const [x0, y0] = p(r2, a0);
  const [x1, y1] = p(r2, a1);
  const [x2, y2] = p(r1, a1);
  const [x3, y3] = p(r1, a0);
  return `M${x0} ${y0}A${r2} ${r2} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 0 0 ${x3} ${y3}Z`;
}

function rellenoSegmento(a: AspectoCategoria): string {
  const c = coloresPin();
  if (a === "na") return 'fill="rgba(10,24,18,.55)" stroke="rgba(255,255,255,.6)" stroke-width=".8" stroke-dasharray="1.6 1.3"';
  if (a === "nd" || a === "sin_dato") return 'fill="url(#h)"';
  return `fill="${c[a]}"`;
}

/**
 * Pin «reloj» (vista Todos): seis sectores en el orden de COMPONENTES, en el
 * sentido del reloj desde arriba, y la clasificación general al centro.
 * `centro` = null cuando la clasificación es No aplica (centro punteado).
 */
export function svgReloj(aspectos: AspectoCategoria[], centro: string | null): string {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="-15 -15 30 30">${HATCH}<circle r="14" fill="rgba(255,255,255,.95)"/>`;
  aspectos.forEach((a, i) => {
    s += `<path d="${arco(7, 12.6, -90 + 60 * i + 4, -90 + 60 * (i + 1) - 4)}" ${rellenoSegmento(a)}/>`;
  });
  s += centro
    ? `<circle r="5.4" fill="${centro}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>`
    : '<circle r="5.2" fill="#fff" stroke="#7d8a84" stroke-width="1" stroke-dasharray="1.6 1.2"/>';
  return s + "</svg>";
}

/** Punto de un componente (vista por componente); `null` = árbol sin evaluación vigente. */
export function svgPunto(a: AspectoCategoria | null): string {
  const c = coloresPin();
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="-11 -11 22 22">${HATCH}`;
  if (a === null) return `${head}<circle r="5.5" fill="${c.pend}" stroke="#fff" stroke-width="1.5" stroke-dasharray="2.4 1.6"/></svg>`;
  if (a === "na") return `${head}<circle r="6" fill="rgba(10,24,18,.45)" stroke="#fff" stroke-width="1.6" stroke-dasharray="2.2 1.8"/></svg>`;
  if (a === "nd" || a === "sin_dato") return `${head}<circle r="7.5" fill="url(#h)" stroke="#fff" stroke-width="2"/></svg>`;
  const r = a === "sev" ? 9 : a === "mod" ? 8.5 : 8;
  return `${head}<circle r="${r}" fill="${c[a]}" stroke="#fff" stroke-width="2"/></svg>`;
}

/** Pin de un árbol sin evaluación vigente en la vista Todos. */
export function svgPendiente(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="-11 -11 22 22"><circle r="7" fill="${coloresPin().pend}" stroke="#fff" stroke-width="1.6" stroke-dasharray="2.6 1.8"/><text y="3" text-anchor="middle" font-size="8" font-weight="700" fill="#1d2520" font-family="sans-serif">?</text></svg>`;
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
