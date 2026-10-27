/**
 * Orden de trabajo tal como la entregan los listados de la Fase 6
 * (B3: GET /api/sivu/projects/:id/work-orders; B4: /api/sivu/work-orders/mine;
 * `OtListada` en valpo-verde-backend/src/services/sivu/listadoOt.service.ts;
 * CC-065). Cada catálogo llega con `codigo` y `etiqueta`: el frontend
 * muestra la etiqueta y no escribe catálogos (PR-021).
 */
export interface CodigoEtiqueta {
  codigo: string;
  etiqueta: string;
}

export interface OtListada {
  id: string;
  codigo_ot: string | null;
  tipo_ot: CodigoEtiqueta;
  accion: CodigoEtiqueta;
  subtipo: CodigoEtiqueta | null;
  prioridad: CodigoEtiqueta | null;
  estado: CodigoEtiqueta;
  /** Fecha que ingresa el responsable al programar (CC-050); null si está Pendiente. */
  fecha_accion_programada: string | null;
  fecha_creacion_ot: string;
  fecha_completada_ot: string | null;
  proyecto: { id: string; nombre_proyecto: string | null };
  /** null en una OT de Levantamiento. */
  arbol: {
    id: string;
    tree_code: string;
    nombre_comun: string | null;
    especie_cientifica: string | null;
    ubicacion_descriptiva: string | null;
    ubicacion: { lng: number; lat: number } | null;
  } | null;
  requiere_revision_inspector: boolean | null;
  responsable: { id: string; nombre: string | null; fuera_del_proyecto?: true } | null;
  /** Acciones que el backend habilita a quien consulta (CC-065, punto 5). */
  acciones: string[];
}

export interface ListadoOt {
  data: OtListada[];
  total: number;
  limit: number;
  offset: number;
}

/** Estados abiertos por defecto en el backend (CC-064 n); con el filtro se agregan los cerrados. */
export const ESTADOS_OT_CERRADOS = ["completada", "cancelada"] as const;
export const ESTADOS_OT_ABIERTOS = ["pendiente", "programada", "en_ejecucion"] as const;
