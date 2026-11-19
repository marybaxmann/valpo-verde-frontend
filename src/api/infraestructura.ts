import { api } from "./client";
import type { RespuestaInfraestructura } from "../types/infraestructura";

/** B8: árboles con evaluación vigente, su clasificación de infraestructura y el resultado de cada componente. */
export function obtenerInfraestructura(projectId: string, barrio?: string): Promise<RespuestaInfraestructura> {
  const q = barrio ? `?barrio=${encodeURIComponent(barrio)}` : "";
  return api.get<{ data: RespuestaInfraestructura }>(`/api/sivu/projects/${projectId}/infraestructura${q}`).then((res) => res.data);
}
