/**
 * B19 — GET /api/sivu/projects/:id/indicadores?barrio= (hoja INDICES,
 * filas 3 a 13; CC-016) y la estimación de carbono aéreo leñoso (CC-069
 * v1). Contrato tal como lo entrega el backend: el frontend no calcula
 * indicadores, solo los muestra. Un valor null llega con su motivo.
 */

/** Conteo y porcentaje (null si el denominador es 0). */
export interface Parte {
  arboles: number;
  porcentaje: number | null;
}

export interface ClaseDiametrica {
  codigo: string;
  etiqueta: string;
  desde_cm: number;
  hasta_cm: number | null;
  arboles: number;
  porcentaje: number | null;
}

export interface NivelTaxonomico {
  umbral_porcentaje: number;
  taxones: { taxon: string; arboles: number; porcentaje: number | null; supera_umbral: boolean }[];
  sin_dato: Parte;
  /** null cuando no hay ningún taxón con dato. */
  cumple: boolean | null;
}

export type CategoriaSinCarbono = "fuera_del_universo" | "restriccion_modelo" | "dato_faltante_o_inconsistente" | "error_calculo";

export interface MetodoCarbono {
  version: string;
  estado_cc: string;
  fraccion_carbono: number;
  fuente_fraccion_carbono: string;
  factor_co2: string;
  incluye_raices: boolean;
  incluye_follaje: boolean;
}

export interface CarbonoAgregado {
  indicador: "estimacion_carbono_aereo_lenoso";
  metodo: MetodoCarbono;
  limitaciones: string[];
  cobertura: {
    presentes: number;
    universo_calculo: number;
    con_resultado: number;
    /** Resultados con modelo exploratorio (2026-11-20): se muestran rotulados y no suman al total. */
    con_resultado_exploratorio?: number;
    por_categoria: Record<CategoriaSinCarbono, number>;
    motivos: Record<string, number>;
  };
  /** Toneladas; null (no 0) si ningún árbol tiene resultado. */
  total: { biomasa_aerea_lenosa_t: number | null; carbono_t: number | null; co2e_t: number | null };
}

/**
 * Compatibilidad: la API publicada en `release/demo` (congelada el
 * 2026-11-02) usa el contrato del 2026-11-01 (sin carbono, sin universo de
 * evaluados, `denominador`/`denominador_presentes`). El contrato vigente en
 * `feature/fase6-backend-api` es el de abajo. Los campos que cambiaron son
 * opcionales y la vista acepta los dos.
 */
export interface IndicadoresProyecto {
  fecha_consulta: string;
  ambito: { tipo: "proyecto" | "barrio"; barrio: string | null };
  barrios: string[];
  cobertura: {
    arboles_registrados: number;
    arboles_presentes: number;
    /** Universo biométrico (filas 11 a 13): presentes con evaluación completa válida y vigente. */
    arboles_con_evaluacion_valida?: number;
    arboles_sin_evaluacion_valida?: number;
  };
  numero_total_arboles: { valor: number; unidad: "arboles" };
  densidad_arborea: { unidad: "arboles_por_ha"; numerador: number; superficie_m2: number | null; valor: number | null; motivo: string | null };
  clases_diametricas: { denominador_evaluados?: number; denominador?: number; clases: ClaseDiametrica[]; sin_dap: Parte };
  diametro_medio_copa: {
    unidad: "m";
    valor: number | null;
    n_validos: number;
    n_con_medicion: number;
    n_no_presenta_copa: number;
    n_sin_medicion: number;
    denominador_evaluados?: number;
    denominador_presentes?: number;
  };
  /** Cobertura de copa del sector: área de copa / superficie (Valej, 2026-11-22). Ausente en la API publicada hasta su despliegue. */
  cobertura_copa?: {
    unidad: "porcentaje";
    valor: number | null;
    area_copa_m2: number | null;
    superficie_m2: number | null;
    n_con_area: number;
    denominador_evaluados: number;
    motivo: string | null;
  };
  area_proyectada_copa: {
    unidad: "m2";
    total_m2: number | null;
    n_con_area: number;
    n_no_presenta_copa: number;
    n_sin_medicion: number;
    denominador_evaluados?: number;
    denominador_presentes?: number;
  };
  cobertura_taxonomica: {
    presentes: number;
    identificados_especie: number;
    no_identificados_especie: number;
    porcentaje_identificados: number | null;
    con_genero_catalogo: number;
    con_familia_catalogo: number;
    con_origen_catalogo: number;
    identificaciones_provisionales: number | null;
    identificaciones_confirmadas: number | null;
    motivo_provisionales: string | null;
  };
  riqueza_especies: { valor: number; unidad: "especies"; n_identificados: number; n_no_identificados: number };
  abundancia_relativa: { denominador: number; especies: { especie: string; arboles: number; porcentaje: number | null }[]; no_identificados: Parte };
  diversidad_shannon: { valor: number | null; riqueza: number; n_identificados: number; cobertura_identificacion: number | null };
  diversidad_taxonomica_10_20_30: { denominador: number; especie: NivelTaxonomico; genero: NivelTaxonomico; familia: NivelTaxonomico };
  proporcion_origen: { denominador: number; nativos: Parte; introducidos: Parte; origen_no_determinado: Parte };
  /** CC-069 v1; ausente en la API publicada hasta que se despliegue `e57d8fd`. */
  estimacion_carbono_aereo_lenoso?: CarbonoAgregado;
  /** Secuestro anual (decisiones A a C, 2026-11-20); ausente en la API publicada hasta su despliegue. */
  estimacion_secuestro_anual?: SecuestroAgregado;
}

/** Secuestro anual del ámbito: el total suma solo estimaciones fundamentadas; las simulaciones solo se cuentan. */
export interface SecuestroAgregado {
  indicador: "estimacion_secuestro_anual";
  metodo: MetodoSecuestro;
  supuestos_simulacion: string[];
  cobertura: {
    presentes: number;
    universo_calculo: number;
    estimacion_fundamentada: number;
    simulacion_exploratoria: number;
    no_estimable: number;
    motivos: Record<string, number>;
  };
  /** null (no 0) si ningún árbol tiene estimación fundamentada. */
  total_fundamentado: { co2_kg_anio: number | null; co2_t_anio: number | null };
}

export interface MetodoSecuestro {
  version: string;
  estado: string;
  base_carbono: string;
  altura: string;
  unidad: string;
}

interface SecuestroComun {
  unidad: string;
  modelo: { id: string; fuente: string; confianza: string; especie_ecuacion: string; estado?: "aprobado" | "exploratorio" };
  entradas: { dap_cm: number; altura_total_m: number | null; cle: number; muerte_regresiva_pct: number };
  factores: { factor_cle: number; factor_condicion: number };
  supuestos: string[];
  /** Modelo exploratorio, altura sin rango publicado, poda intensa o desmoche. */
  advertencias?: string[];
  metodo: MetodoSecuestro;
}

export interface SecuestroCategoria {
  categoria: "lento" | "moderado" | "rapido";
  tasa_base_cm_anio: number;
  delta_dap_cm: number;
  dap_proyectado_cm: number;
  co2_kg_anio: number;
}

/** Secuestro de un árbol (B2): fundamentado (un valor), simulación (rango) o no estimable (motivo). */
export type SecuestroArbol =
  | (SecuestroComun & { tipo: "estimacion_fundamentada"; valor: SecuestroCategoria; fuente_categoria: string })
  | (SecuestroComun & { tipo: "simulacion_exploratoria"; rango: { co2_kg_anio_min: number; co2_kg_anio_max: number }; por_categoria: SecuestroCategoria[] })
  | { tipo: "no_estimable" | "fuera_del_universo"; motivo: string; categoria_motivo: string; detalle: string; metodo: MetodoSecuestro };

/** Carbono de un árbol (B2, CC-069 v1): valor, o null con categoría, motivo y detalle. */
export type CarbonoArbol =
  | {
      valor: {
        volumen_m3: number;
        biomasa_aerea_lenosa_kg: number;
        carbono_kg: number;
        co2e_kg: number;
        /** estado «exploratorio» (2026-11-20): modelo sustituto que no suma a los totales. */
        modelo: { id: string; fuente: string; estado?: "aprobado" | "exploratorio"; confianza?: string; especie_ecuacion?: string };
      };
      categoria: null;
      motivo: null;
      detalle: null;
      metodo: MetodoCarbono;
      limitaciones: string[];
    }
  | { valor: null; categoria: CategoriaSinCarbono; motivo: string; detalle: string; metodo: MetodoCarbono; limitaciones: string[] };
