/** Valor de catálogo tal como lo entrega la API: se muestra la `etiqueta`. */
export interface CodigoEtiqueta {
  codigo: string;
  etiqueta: string;
}

export interface Componente {
  probabilidad_falla: CodigoEtiqueta | null;
  clasificacion: CodigoEtiqueta | null;
}

/** Resultado de una evaluación con sus etiquetas (`resultadoConEtiquetas` del backend). */
export interface ResultadoDiagnostico {
  clasificacion_riesgo: CodigoEtiqueta | null;
  componentes: {
    raices_cuello: Componente | null;
    tronco: Componente | null;
    copa_ramas: Componente | null;
  } | null;
  infraestructura: {
    clasificacion: CodigoEtiqueta | null;
    puntaje: number | null;
    porcentaje: number | null;
  } | null;
  prioridad: CodigoEtiqueta | null;
}

/** Evaluación vigente del árbol (`tree_assessments`, la más reciente; CC-050). */
export interface EvaluacionVigente {
  evento: string;
  work_order_id: string | null;
  inspection_id: string | null;
  /** Desde cuándo rige (al completar la OT o al recomponer tras una anulación). */
  desde: string;
  requiere_revision_ajuste: boolean;
  resultado: ResultadoDiagnostico;
}

/**
 * Por árbol (GET /api/sivu/projects/:id/diagnosticos; B18): la última
 * inspección finalizada y, aparte, la evaluación vigente (`vigente`), que
 * existe solo cuando alguna OT del árbol se completó. La ficha y el mapa
 * muestran la vigente; sin ella, «Evaluación pendiente» (REGLAS_GENERALES
 * «Historial y vigencia»).
 */
export interface Diagnostico {
  tree_id: string;
  tree_code: string;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  inspection_id: string;
  codigo_inspeccion: string | null;
  tipo_inspeccion: CodigoEtiqueta | null;
  fecha_inspeccion: string | null;
  fecha_proxima_inspeccion: string | null;
  fecha_proximo_monitoreo: string | null;
  resultado: ResultadoDiagnostico;
  vigente: EvaluacionVigente | null;
}
