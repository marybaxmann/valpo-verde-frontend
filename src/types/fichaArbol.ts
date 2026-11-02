import type { CarbonoArbol } from "./indicadores";
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
  evaluacion_vigente: EvaluacionVigente | null;
  historial: VersionHistorial[];
  ordenes_trabajo: OtListada[];
  incidencias: Incidencia[];
}
