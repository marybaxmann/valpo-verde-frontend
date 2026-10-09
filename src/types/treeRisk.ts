/**
 * Tipos de evaluación técnica y riesgo (R01–R04, M01–M03). Espejo exacto
 * del contrato del backend (src/services/rules/treeRisk.ts en
 * valpo-verde-backend) — el frontend NUNCA recalcula esto, solo captura
 * variables y representa el resultado que llega del servidor.
 */

export type ZonaObjetivo =
  | "Bajo la copa"
  | "Entre el límite de la copa y 1× la altura del árbol"
  | "Entre 1× y 1,5× la altura del árbol"
  | "Más allá de 1,5× la altura del árbol";

export const ZONA_OBJETIVO_OPTIONS: ZonaObjetivo[] = [
  "Bajo la copa",
  "Entre el límite de la copa y 1× la altura del árbol",
  "Entre 1× y 1,5× la altura del árbol",
  "Más allá de 1,5× la altura del árbol",
];

export type TasaOcupacion = "Rara" | "Ocasional" | "Frecuente" | "Constante";
export const TASA_OCUPACION_OPTIONS: TasaOcupacion[] = ["Rara", "Ocasional", "Frecuente", "Constante"];

export type Consecuencia = "Despreciable" | "Menor" | "Significativa" | "Severa";
export const CONSECUENCIA_OPTIONS: Consecuencia[] = ["Despreciable", "Menor", "Significativa", "Severa"];

export interface TreeRiskVariables {
  levantamiento_plato_radicular: boolean;
  angulo_inclinacion: number;
  raices_expuestas: boolean;
  necrosis_radicular: boolean | null;
  raices_cortadas: boolean | null;
  cavidad_pudricion_basal: boolean;
  cavidad_basal_externa: boolean | null;
  sl_basal_pct: number | null;
  t_r_basal: number | null;

  presenta_cavidad_pudricion_tronco: boolean;
  cavidad_externa_tronco: boolean | null;
  sl_tronco_pct: number | null;
  t_r_tronco: number | null;
  presenta_heridas_tronco: boolean;
  condicion_heridas_tronco: "Cerrada" | "En proceso de cierre" | "Abierta" | null;
  corteza_muerta_ausente: boolean;
  presenta_exudaciones: boolean;
  presenta_fisura_grieta_tronco: boolean;
  afectacion_fisura_grieta: "Solo corteza" | "Penetra en madera" | null;
  direccion_grieta: "Longitudinal" | "Transversal" | null;
  troncos_codominantes: boolean;
  grieta_union_codominante: boolean | null;
  corteza_incluida: boolean | null;

  ramas_secas: boolean;
  ramas_secas_pct_copa: number | null;
  ramas_quebradas: boolean;
  desequilibrio_copa: boolean;

  zona_objetivo: ZonaObjetivo;
  tasa_ocupacion_objetivo: TasaOcupacion;

  consecuencia_raices_cuello: Consecuencia;
  consecuencia_tronco: Consecuencia;
  consecuencia_copa_ramas: Consecuencia;
}

export interface CreateTreeRiskAssessmentPayload {
  fecha_evaluacion: string;
  variables: TreeRiskVariables;
}

export interface TreeRiskAssessmentResultado {
  puntaje_raices_cuello: number | null;
  probabilidad_falla_raices_cuello: string | null;
  puntaje_tronco: number | null;
  probabilidad_falla_tronco: string | null;
  puntaje_copa_ramas: number | null;
  probabilidad_falla_copa_ramas: string | null;
  probabilidad_impacto: string;
  clasificacion_raices_cuello: string | null;
  clasificacion_tronco: string | null;
  clasificacion_copa_ramas: string | null;
  clasificacion_riesgo: string | null;
  consecuencia_raices_cuello: string;
  consecuencia_tronco: string;
  consecuencia_copa_ramas: string;
}

export interface TreeRiskAssessmentDTO {
  id: string;
  tree_id: string;
  fecha_evaluacion: string;
  resultado: TreeRiskAssessmentResultado;
  rule_version: string;
  created_by: string | null;
  inspector_nombre: string | null;
  created_at: string;
}

/** Nivel de riesgo o "sin evaluación" — usado para colorear el mapa y filtrar el inventario. */
export type RiesgoFiltro = "Bajo" | "Moderado" | "Alto" | "Extremo" | "sin_evaluacion";
