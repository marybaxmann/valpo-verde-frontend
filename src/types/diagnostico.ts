/** Valor de catálogo tal como lo entrega la API: se muestra la `etiqueta`. */
export interface CodigoEtiqueta {
  codigo: string;
  etiqueta: string;
}

export interface Componente {
  probabilidad_falla: CodigoEtiqueta | null;
  clasificacion: CodigoEtiqueta | null;
}

/**
 * Diagnóstico de la última inspección finalizada de un árbol
 * (GET /api/sivu/projects/:id/diagnosticos; B18 mínimo). No es el dato
 * vigente: la vigencia llega al completar la OT (CC-050).
 */
export interface Diagnostico {
  tree_id: string;
  tree_code: string;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  codigo_inspeccion: string | null;
  tipo_inspeccion: CodigoEtiqueta | null;
  fecha_inspeccion: string | null;
  fecha_proxima_inspeccion: string | null;
  fecha_proximo_monitoreo: string | null;
  resultado: {
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
  };
}
