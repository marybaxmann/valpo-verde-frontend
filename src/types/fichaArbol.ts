import type { ArbolAporteFoliar, CarbonoIntegradoArbol } from "./indicadores";
import type { CarbonoAereoTotalArbol, CarbonoArbol, DescriptivosArbol, SecuestroArbol } from "./indicadores";
import type { CodigoEtiqueta, EvaluacionVigente } from "./diagnostico";
import type { OtListada } from "./workOrder";
import type { Incidencia } from "./incidencia";
import type { ValorCampo } from "./inspection";

/** Una versión que fue vigente: el alta o una inspección finalizada de una OT completada (B2). */
export interface VersionHistorial {
  origen: "alta" | "inspeccion";
  vigente_desde: string | null;
  inspection_id: string | null;
  codigo_inspeccion: string | null;
  fecha_inspeccion: string | null;
  /** Solo los campos del árbol que registró esa versión; las listas como `{ codigo, etiqueta }`. */
  valores: Record<string, ValorCampo | CodigoEtiqueta>;
}

/** GET /api/sivu/projects/:id/trees/:treeId (B2). Solo lo que usa el historial. */
export interface FichaArbol {
  arbol: {
    id: string;
    tree_code: string;
    especie_cientifica: string | null;
    nombre_comun: string | null;
    ubicacion_descriptiva: string | null;
    sector: string | null;
    estado_ciclo_vida: CodigoEtiqueta | null;
    fecha_registro: string | null;
    [campo: string]: unknown;
  };
  presencia: (CodigoEtiqueta & { desde: string | null }) | null;
  /** Universo biométrico (B19): evaluación completa válida y vigente. Ausente en la API publicada. */
  evaluacion_completa_vigente?: boolean;
  /** CC-069 v1, por árbol; ausente en la API publicada hasta que se despliegue. */
  estimacion_carbono_aereo_lenoso?: CarbonoArbol;
  /** Carbono aéreo total con hojas (carbono directo, 2026-11-21); otro componente, exploratorio. Ausente en la API publicada. */
  estimacion_carbono_aereo_total?: CarbonoAereoTotalArbol;
  /** Propuesta experimental (2026-11-21): variación anual proyectada del carbono aéreo total (con hojas). Ausente en la API publicada. */
  variacion_anual_carbono_aereo_total?: SecuestroArbol;
  /** Propuesta experimental: valores descriptivos y condición de copa registrada. Ausente en la API publicada. */
  descriptivos?: DescriptivosArbol;
  /** Propuesta experimental (2026-11-23): área foliar, remoción e interceptación del árbol; null sin evaluación vigente. */
  aportes_foliares?: (ArbolAporteFoliar & { precipitacion_anual_mm: number }) | null;
  /** Propuesta experimental (2026-11-23): escenarios de crecimiento del DAP (i-Tree Eco). */
  proyeccion_crecimiento?: ProyeccionCrecimiento | null;
  /** Rasgos de la especie del catálogo (tipo de hoja para la ilustración). */
  sobre_la_especie?: { genero: string | null; familia: string | null; tipo_hoja: { codigo: string; etiqueta: string | null } | null } | null;
  /** Secuestro anual (decisiones A a C, 2026-11-20); ausente en la API publicada hasta su despliegue. */
  secuestro_anual?: SecuestroArbol;
  /** CC-087: carbono con el mejor modelo del árbol (el mismo que suma el proyecto). */
  carbono_integrado?: CarbonoIntegradoArbol;
  evaluacion_vigente: EvaluacionVigente | null;
  historial: VersionHistorial[];
  ordenes_trabajo: OtListada[];
  incidencias: Incidencia[];
}

/** Propuesta experimental (2026-11-23). */
export interface ProyeccionCrecimiento {
  motivo: string | null;
  detalle_motivo: string | null;
  supuestos: string[];
  valor: {
    dap_actual_cm: number;
    categoria_referencia: string | null;
    escenarios: Array<{ categoria: string; etiqueta: string; incremento_cm_anio: number; dap_cm: Array<{ anios: number; dap_cm: number }> }>;
  } | null;
}
