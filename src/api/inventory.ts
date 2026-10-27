import { api } from "./client";
import type { ArbolInventario, ListadoInventario } from "../types/inventory";

export interface FiltrosInventario {
  estado_ciclo_vida?: string;
  /** Búsqueda parcial por nombre científico o común (B1). */
  busqueda?: string;
}

/** B1 — una página del inventario (límite del backend: 200). */
export function listarInventario(
  projectId: string,
  filtros: FiltrosInventario & { limit: number; offset: number }
): Promise<ListadoInventario> {
  const q = new URLSearchParams();
  q.set("limit", String(filtros.limit));
  q.set("offset", String(filtros.offset));
  if (filtros.estado_ciclo_vida) q.set("estado_ciclo_vida", filtros.estado_ciclo_vida);
  if (filtros.busqueda) q.set("busqueda", filtros.busqueda);
  return api.get<ListadoInventario>(`/api/sivu/projects/${projectId}/trees?${q.toString()}`);
}

/**
 * Todas las páginas de B1 hasta alcanzar el `total` (para los mapas; el
 * backend mantiene la paginación, decisión del 2026-10-27).
 */
export async function listarInventarioCompleto(projectId: string, filtros: FiltrosInventario): Promise<ArbolInventario[]> {
  const PAGE = 200;
  const todos: ArbolInventario[] = [];
  let total = Infinity;
  while (todos.length < total) {
    const res = await listarInventario(projectId, { ...filtros, limit: PAGE, offset: todos.length });
    total = res.total;
    todos.push(...res.data);
    if (res.data.length === 0) break; // el total cambió mientras se leía
  }
  return todos;
}
