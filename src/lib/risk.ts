import type { TreeRiskAssessmentDTO } from "../types/treeRisk";

/**
 * id de árbol → clasificacion_riesgo de su última evaluación, tal como la
 * calculó el backend (null = evaluado sin clasificación, N13). Los árboles
 * sin evaluación no aparecen. El frontend no calcula riesgo: solo reindexa.
 */
export function riskLevelsByTree(summary: Record<string, TreeRiskAssessmentDTO>): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const [treeId, dto] of Object.entries(summary)) {
    map[treeId] = dto.resultado.clasificacion_riesgo;
  }
  return map;
}
