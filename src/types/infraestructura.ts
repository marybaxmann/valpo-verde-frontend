import type { CodigoEtiqueta } from "./diagnostico";

/**
 * B8 — GET /api/sivu/projects/:id/infraestructura (CC-059/CC-060;
 * `infraestructura.service.ts`). Solo lectura: lo que calculó el motor (M04)
 * en la evaluación vigente de cada árbol, con el ajuste del Inspector si
 * existe (CC-044). El frontend no recalcula ni reclasifica nada.
 */

/** Resultado de un componente (salida de M04 en `tree_assessments.indicadores`). */
export interface ComponenteInfraestructura {
  componente: CodigoEtiqueta;
  /** null = el motor no guardó categoría para este componente. */
  categoria: { codigo: string; etiqueta: string | null } | null;
  puntaje: number | null;
  /** ID exacto de REGLAS_INDICADORES que produjo el resultado; null si fue un corte genérico. */
  regla_id: string | null;
  /** Presente cuando la categoría es No aplica o No determinado. */
  motivo: string | null;
}

export interface ArbolInfraestructura {
  arbol: {
    id: string;
    tree_code: string;
    especie_cientifica: string | null;
    nombre_comun: string | null;
    sector: string | null;
    ubicacion: { lng: number; lat: number } | null;
  };
  infraestructura: {
    clasificacion: CodigoEtiqueta | null;
    ajustada: boolean;
    puntaje: number | null;
    porcentaje: number | null;
  };
  /** Riesgo vigente del árbol (2026-11-24): junto con la afectación explica la prioridad (M05). */
  riesgo?: CodigoEtiqueta | null;
  prioridad: CodigoEtiqueta | null;
  prioridad_ajustada: boolean;
  componentes: ComponenteInfraestructura[];
  evaluacion_vigente: { evento: string; work_order_id: string | null; desde: string; rule_version: string | null };
}

export interface ResumenInfraestructura {
  por_clasificacion: (CodigoEtiqueta & { arboles: number })[];
  por_componente: {
    componente: CodigoEtiqueta;
    categorias: (CodigoEtiqueta & { arboles: number })[];
    sin_dato: number;
  }[];
}

export interface RespuestaInfraestructura {
  fecha_consulta: string;
  ambito: { tipo: "proyecto" | "barrio"; barrio: string | null };
  barrios: string[];
  cobertura: {
    arboles_presentes: number;
    arboles_con_evaluacion_valida: number;
    arboles_sin_evaluacion_valida: number;
  };
  resumen: ResumenInfraestructura;
  filtros: { clasificacion: string | null; componente: string | null; categoria: string | null };
  total_listados: number;
  arboles: ArbolInfraestructura[];
}
