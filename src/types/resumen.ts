/** Conteo de un catálogo; `codigo`/`etiqueta` nulos = diagnóstico sin clasificación. */
export interface ConteoCatalogo {
  codigo: string | null;
  etiqueta: string | null;
  total: number;
}

/** GET /api/sivu/projects/:id/resumen (B7 mínimo). Todos los conteos los hace el backend. */
export interface ResumenProyecto {
  arboles_total: number;
  por_ciclo_vida: ConteoCatalogo[];
  georreferenciados: number;
  sin_georreferenciar: number;
  /** Cuenta el diagnóstico finalizado, no el vigente (CC-050). */
  con_diagnostico: number;
  sin_evaluacion: number;
  por_riesgo: ConteoCatalogo[];
  especies_distintas: number;
  especies_top: { especie_cientifica: string | null; nombre_comun: string | null; total: number }[];
  ot_por_estado: ConteoCatalogo[];
}
