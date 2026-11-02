import { api } from "./client";
import type { IndicadoresProyecto } from "../types/indicadores";

/** B19: indicadores biométricos del proyecto o de un barrio (hoja INDICES; CC-016, CC-069). */
export function obtenerIndicadores(projectId: string, barrio?: string): Promise<IndicadoresProyecto> {
  const q = barrio ? `?barrio=${encodeURIComponent(barrio)}` : "";
  return api.get<{ data: IndicadoresProyecto }>(`/api/sivu/projects/${projectId}/indicadores${q}`).then((res) => res.data);
}
