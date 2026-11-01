import type { CodigoEtiqueta, OtListada } from "./workOrder";

/**
 * Ejecución de una OT de Mantenimiento (#61; PR-020 v1.1; D-216 a D-230),
 * tal como la entrega GET /api/sivu/work-orders/:id/ejecuciones
 * (contrato §5 bis). Los valores de lista llegan con su etiqueta.
 */
export interface EjecucionMantenimiento {
  id: string;
  codigo_mantenimiento: string | null;
  work_order_id: string;
  fecha_ejecucion: string;
  ejecutado_por: string | null;
  accion_ejecutada: CodigoEtiqueta | null;
  subtipo_ejecutado: CodigoEtiqueta | null;
  resultado: CodigoEtiqueta | null;
  observaciones: string | null;
  requiere_seguimiento: boolean | null;
  fecha_seguimiento: string | null;
  estado_revision: CodigoEtiqueta | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  observaciones_revision: string | null;
  requiere_correccion: boolean | null;
  fecha_limite_correccion: string | null;
  created_at: string;
  /** Enlaces firmados de 10 minutos (CC-049). */
  fotos: { id: string; url: string; created_at: string }[];
}

/** «Revisiones de mantenimiento» del Inspector (GET /api/sivu/work-orders/revisiones; CC-064 b). */
export interface OtEnRevision extends OtListada {
  ejecucion_pendiente: EjecucionMantenimiento | null;
}

/** Body de POST /api/sivu/projects/:id/work-orders/mantenimiento (`crearOtMantenimientoSchema`). */
export interface CrearOtMantenimientoInput {
  tree_id: string;
  incident_id?: string;
  accion_solicitada: string;
  subtipo_accion?: string | null;
  motivo?: string | null;
  prioridad: string;
  observaciones?: string | null;
  responsable_accion_id: string;
  requiere_revision_inspector?: boolean;
  inspector_revisor_id?: string | null;
}

/** Body de PATCH …/ejecuciones/:recordId/revision (`revisarEjecucionSchema`). */
export interface RevisarEjecucionInput {
  estado_revision: "aprobado" | "rechazado";
  observaciones_revision?: string | null;
  requiere_correccion: boolean;
  fecha_limite_correccion?: string | null;
}
