import type { CodigoEtiqueta } from "./diagnostico";

/**
 * Incidencia interna (B9; contrato §7; D-176 a D-189). Los valores de lista
 * llegan como `{ codigo, etiqueta }`: se muestra la etiqueta.
 */
export interface Incidencia {
  id: string;
  codigo_incidencia: string | null;
  arbol: { id: string; tree_code: string; especie_cientifica: string | null; nombre_comun: string | null } | null;
  tipo_incidencia: CodigoEtiqueta | null;
  descripcion: string | null;
  ubicacion: string | null;
  fecha_reporte: string | null;
  origen_reporte: CodigoEtiqueta | null;
  estado_incidencia: CodigoEtiqueta;
  fecha_actualizacion_estado: string | null;
  resultado_revision: CodigoEtiqueta | null;
  observaciones_revision: string | null;
  prioridad_municipal: CodigoEtiqueta | null;
  fecha_revision: string | null;
  /** `nombre: null` y `fuera_del_proyecto` si quien revisó ya no es miembro. */
  revisado_por: { id: string; nombre: string | null; fuera_del_proyecto?: boolean } | null;
  /** 0 después de Descartada (las fotos se borran, CC-049). */
  cantidad_fotos: number;
  ot_derivadas: { id: string; codigo_ot: string | null; estado: CodigoEtiqueta }[];
  /** Solo para el Usuario municipal; null para los demás y después de Validada o Descartada. */
  reportante: { nombre: string | null; rut: string | null } | null;
}

/** GET …/incidencias/:incidentId: la incidencia con sus fotos (enlaces de 10 minutos). */
export interface IncidenciaDetalle extends Incidencia {
  fotos: { id: string; url: string; created_at: string }[];
}

export interface ListadoIncidencias {
  data: Incidencia[];
  total: number;
  limit: number;
  offset: number;
}

/** Body de PATCH …/revision. El backend valida D-185 a D-189. */
export interface RevisionIncidenciaInput {
  estado_incidencia: string;
  resultado_revision: string | null;
  observaciones_revision: string | null;
  prioridad_municipal: string | null;
}
