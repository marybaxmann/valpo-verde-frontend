/**
 * Árbol del inventario tal como lo entrega B1 (GET /api/sivu/projects/:id/trees;
 * `ArbolInventario` en valpo-verde-backend/src/services/sivu/inventory.service.ts,
 * rama feature/fase6-consultas-frontend). Sin campos agregados ni inferidos.
 * DAP, altura, multifustal y número de fustes llegan con el valor vigente
 * (D-18, D-19); `null` = sin registro. Riesgo efectivo y fecha de vigencia
 * vienen de B18, no de B1.
 */
export interface ArbolInventario {
  id: string;
  tree_code: string;
  /** Código público por lugar (P-VIC-001, PM-001; CC-086, migración 049). Solo en la plataforma, nunca en la ficha pública. `null` si el árbol no cae en ningún lugar con prefijo. */
  codigo_publico?: string | null;
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
  /** Ciclo de vida con su etiqueta (B1). */
  ciclo_vida?: { codigo: string; etiqueta: string };
  fecha_registro: string;
  /** Token de la placa QR; B1 lo entrega solo al Usuario municipal. */
  qr_token?: string;
  /** D-18: DAP vigente en cm; en el multifustal, el equivalente que calcula la plataforma. */
  dap_cm?: number | null;
  /** D-19: altura total vigente en m. */
  altura_total_m?: number | null;
  multifustal?: boolean | null;
  numero_fustes?: number | null;
}

export interface ListadoInventario {
  data: ArbolInventario[];
  total: number;
  limit: number;
  offset: number;
}

/** Valores del filtro `estado_ciclo_vida` que acepta B1 (`inventarioQuerySchema`). */
export const ESTADOS_CICLO_VIDA_B1 = ["activo", "retirado", "tocon"] as const;
