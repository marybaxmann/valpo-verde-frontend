import { api } from "./client";
import type { CreateTreeRiskAssessmentPayload, TreeRiskAssessmentDTO } from "../types/treeRisk";

/**
 * Evaluación técnica y riesgo (R01–R04/M01–M03). El cálculo ocurre en el
 * backend (services/rules/treeRisk.ts) — este cliente solo envía las
 * variables observadas y recibe el resultado ya calculado.
 */
export function createTreeRiskAssessment(
  treeId: string,
  payload: CreateTreeRiskAssessmentPayload
): Promise<{ data: TreeRiskAssessmentDTO }> {
  return api.post<{ data: TreeRiskAssessmentDTO }>(`/api/trees/${treeId}/risk-assessments`, payload);
}

export function listTreeRiskAssessments(treeId: string): Promise<{ data: TreeRiskAssessmentDTO[] }> {
  return api.get<{ data: TreeRiskAssessmentDTO[] }>(`/api/trees/${treeId}/risk-assessments`);
}

export function getLatestTreeRiskAssessment(
  treeId: string
): Promise<{ data: TreeRiskAssessmentDTO | null }> {
  return api.get<{ data: TreeRiskAssessmentDTO | null }>(`/api/trees/${treeId}/risk-assessments/latest`);
}

/**
 * Última evaluación vigente de cada árbol del proyecto, en una sola
 * llamada — usado para colorear el mapa de Inventario por riesgo sin
 * una consulta por árbol.
 */
export function getProjectRiskSummary(
  projectId: string
): Promise<{ data: Record<string, TreeRiskAssessmentDTO> }> {
  return api.get<{ data: Record<string, TreeRiskAssessmentDTO> }>(
    `/api/projects/${projectId}/risk-assessments/latest`
  );
}
