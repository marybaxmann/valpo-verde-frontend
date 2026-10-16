/**
 * DATOS ILUSTRATIVOS — maqueta de exploración visual.
 * No provienen de la API de SIVU ni representan árboles reales. Los
 * resultados de riesgo de ejemplo respetan las combinaciones de las
 * matrices M02/M03 del motor (probabilidad de falla × impacto →
 * probabilidad combinada; × consecuencia → nivel), pero no son
 * evaluaciones: solo sirven para mostrar la interfaz.
 */

export type RiskLevel = "Bajo" | "Moderado" | "Alto" | "Extremo";
/** "Sin clasificación" (CC-024 / N13): evaluado, pero algún componente quedó "No determinado". Distinto de "Sin evaluación". */
export type TreeRisk = RiskLevel | "Sin clasificación" | null;
export type Lens = "inventario" | "riesgo" | "infraestructura";

export interface Tree {
  id: string;
  code: string;
  x: number; // px sobre la imagen de 1440×900
  y: number;
  common: string;
  scientific: string;
  place: string;
  risk: TreeRisk; // null = sin evaluación
  infra: boolean; // tiene evaluación de infraestructura
}

export const RISK_COLOR: Record<RiskLevel | "none" | "Sin clasificación", string> = {
  Bajo: "#DCE8A9",
  Moderado: "#F9B52B",
  Alto: "#F04A32",
  Extremo: "#C7252B",
  none: "#A7B0AB",
  "Sin clasificación": "#FFFFFF",
};

const BRASIL = "Av. Brasil · bandejón central";
const VICTORIA = "Plaza Victoria";

type Seed = [number, number, TreeRisk, number, boolean?];
const SPECIES = [
  ["Palmera canaria", "Phoenix canariensis"],
  ["Plátano oriental", "Platanus orientalis"],
  ["Jacarandá", "Jacaranda mimosifolia"],
  ["Pimiento", "Schinus molle"],
  ["Quillay", "Quillaja saponaria"],
] as const;

const seeds: Seed[] = [
  // Av. Brasil, fila norte y fila sur del bandejón
  [727, 296, "Bajo", 0], [777, 300, "Bajo", 0, true], [826, 297, "Moderado", 0], [897, 295, "Bajo", 0],
  [948, 298, "Bajo", 0, true], [1002, 300, "Alto", 0], [1080, 297, "Bajo", 0], [1130, 300, "Bajo", 0],
  [1185, 298, "Extremo", 0, true], [1240, 300, "Bajo", 0], [1290, 298, "Sin clasificación", 0], [1345, 300, "Moderado", 0],
  [743, 333, "Bajo", 0], [795, 335, null, 0], [851, 333, "Bajo", 0, true], [918, 332, "Bajo", 0],
  [978, 333, "Moderado", 0], [1030, 335, "Bajo", 0], [1100, 333, "Bajo", 0], [1160, 335, "Bajo", 0, true],
  [1220, 333, null, 0], [1280, 333, "Bajo", 0],
  // Plaza Victoria
  [700, 415, "Bajo", 2], [742, 405, "Moderado", 1, true], [712, 470, "Bajo", 3], [802, 452, "Bajo", 1],
  [690, 560, "Bajo", 2], [735, 578, null, 4], [782, 560, "Bajo", 1], [705, 622, "Moderado", 2, true],
  [760, 642, "Bajo", 3], [802, 612, "Bajo", 1], [662, 600, "Bajo", 4], [748, 604, "Alto", 1, true],
  // Plazuela y calles al poniente
  [440, 240, "Bajo", 1], [482, 256, "Bajo", 1], [455, 214, "Moderado", 3], [612, 312, "Sin clasificación", 2],
  [560, 690, "Bajo", 2], [880, 860, "Bajo", 3, true], [925, 640, "Bajo", 1],
];

export const TREES: Tree[] = seeds.map(([x, y, risk, sp, infra], i) => ({
  id: `t${i}`,
  code: `A-${String(201 + i).padStart(6, "0")}`,
  x,
  y,
  common: SPECIES[sp][0],
  scientific: SPECIES[sp][1],
  place: y < 360 ? BRASIL : x > 640 && x < 830 && y < 680 ? VICTORIA : "Barrio El Almendral",
  risk,
  infra: !!infra,
}));

/** Árbol seleccionado al abrir la maqueta: el plátano grande de Plaza Victoria. */
export const FEATURED: Tree = {
  id: "featured",
  code: "A-000124",
  x: 762,
  y: 494,
  common: "Plátano oriental",
  scientific: "Platanus orientalis",
  place: VICTORIA,
  risk: "Alto",
  infra: true,
};

export interface RiskDetail {
  falla: string;
  impacto: string;
  combinada: string;
  consecuencia: string;
  componentes: { nombre: string; nivel: RiskLevel; falla: string; consecuencia: string }[];
}

/** Ejemplos coherentes con M02/M03 (impacto común al árbol). */
export const RISK_EXAMPLE: Record<RiskLevel, RiskDetail> = {
  Extremo: {
    falla: "Inminente", impacto: "Alta", combinada: "Muy probable", consecuencia: "Severa",
    componentes: [
      { nombre: "Tronco", nivel: "Extremo", falla: "Inminente", consecuencia: "Severa" },
      { nombre: "Copa y ramas", nivel: "Moderado", falla: "Probable", consecuencia: "Menor" },
      { nombre: "Raíces y cuello", nivel: "Bajo", falla: "Posible", consecuencia: "Menor" },
    ],
  },
  Alto: {
    falla: "Probable", impacto: "Alta", combinada: "Probable", consecuencia: "Significativa",
    componentes: [
      { nombre: "Copa y ramas", nivel: "Alto", falla: "Probable", consecuencia: "Significativa" },
      { nombre: "Raíces y cuello", nivel: "Moderado", falla: "Probable", consecuencia: "Menor" },
      { nombre: "Tronco", nivel: "Bajo", falla: "Posible", consecuencia: "Menor" },
    ],
  },
  Moderado: {
    falla: "Probable", impacto: "Alta", combinada: "Probable", consecuencia: "Menor",
    componentes: [
      { nombre: "Raíces y cuello", nivel: "Moderado", falla: "Probable", consecuencia: "Menor" },
      { nombre: "Copa y ramas", nivel: "Bajo", falla: "Posible", consecuencia: "Menor" },
      { nombre: "Tronco", nivel: "Bajo", falla: "Improbable", consecuencia: "Menor" },
    ],
  },
  Bajo: {
    falla: "Posible", impacto: "Media", combinada: "Improbable", consecuencia: "Menor",
    componentes: [
      { nombre: "Copa y ramas", nivel: "Bajo", falla: "Posible", consecuencia: "Menor" },
      { nombre: "Tronco", nivel: "Bajo", falla: "Improbable", consecuencia: "Menor" },
      { nombre: "Raíces y cuello", nivel: "Bajo", falla: "Improbable", consecuencia: "Menor" },
    ],
  },
};

export const PROJECT = {
  name: "Proyecto piloto",
  place: "Plan de Valparaíso",
  comuna: "Valparaíso",
  total: 131,
  georef: 128,
  sinGeoref: 3,
  evaluados: 103,
  sinEvaluacion: 25,
  especies: 17,
  riesgo: { Bajo: 65, Moderado: 23, Alto: 9, Extremo: 4 } as Record<RiskLevel, number>,
  sinClasificacion: 2,
  estado: { activos: 120, retirados: 8, tocones: 3 },
  topEspecies: [
    { nombre: "Palmera canaria", pct: 27 },
    { nombre: "Plátano oriental", pct: 19 },
    { nombre: "Jacarandá", pct: 14 },
  ],
  infra: {
    evaluaciones: 41,
    conEvaluacion: 36,
    sinEvaluacion: 95,
    componentes: [
      { nombre: "Acera / vereda", n: 18 },
      { nombre: "Alcorque / superficie de plantación", n: 14 },
      { nombre: "Calzada", n: 7 },
      { nombre: "Redes / servicios", n: 5 },
      { nombre: "Infraestructura vertical", n: 3 },
    ],
  },
};
