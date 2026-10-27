/**
 * Árbol del inventario tal como lo entrega B1 (GET /api/sivu/projects/:id/trees;
 * `ArbolInventario` en valpo-verde-backend/src/services/sivu/inventory.service.ts,
 * rama feature/fase6-consultas-frontend). Sin campos agregados ni inferidos.
 * Aprobados pero aún no expuestos (pendientes de integración, no se simulan):
 * etiqueta del ciclo de vida, DAP (equivalente en el multifustal), multifustal,
 * número de fustes, altura total, riesgo efectivo y fecha de vigencia.
 */
export interface ArbolInventario {
  id: string;
  tree_code: string;
  sector_id: string;
  sector: string | null;
  ubicacion_descriptiva: string | null;
  utm_este: number | null;
  utm_norte: number | null;
  ubicacion: { lng: number; lat: number } | null;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  /** Código ('activo' | 'retirado' | 'tocon'); la etiqueta aún no llega en B1. */
  estado_ciclo_vida: string;
  fecha_registro: string;
}

export interface ListadoInventario {
  data: ArbolInventario[];
  total: number;
  limit: number;
  offset: number;
}

/** Valores del filtro `estado_ciclo_vida` que acepta B1 (`inventarioQuerySchema`). */
export const ESTADOS_CICLO_VIDA_B1 = ["activo", "retirado", "tocon"] as const;
