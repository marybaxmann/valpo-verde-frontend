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
  /** Carbono aéreo total con hojas (carbono directo, 2026-11-21): solo cobertura; ausente en la API publicada. */
  estimacion_carbono_aereo_total?: CarbonoAereoTotalAgregado;
  /** Propuesta experimental (Valej, 2026-11-22). Ausente en la API publicada. */
  estimacion_carbono_integrada?: CarbonoIntegrado;
  /** Propuesta experimental (2026-11-21): solo cobertura de la variación anual del carbono aéreo total. */
  /** Propuesta experimental: indicadores descriptivos con datos medidos y vigentes. Ausente en la API publicada. */
  diagnostico_descriptivo?: DiagnosticoDescriptivo;
  /** Propuesta experimental: una sola clase por árbol evaluado. Ausente en la API publicada. */
  resumen_proyeccion_anual?: {
    universo_calculo: number;
    con_proyeccion: number;
    estimacion_fundamentada: number;
    simulacion_secuestro_lenoso: number;
    simulacion_variacion_aereo_total: number;
    no_estimable: number;
    motivos_no_estimable: Record<string, number>;
  };
  estimacion_variacion_anual_carbono_aereo_total?: {
    indicador: "estimacion_variacion_anual_carbono_aereo_total";
    cobertura: { presentes: number; universo_calculo: number; simulacion_exploratoria: number; no_estimable: number; motivos: Record<string, number> };
    total: null;
  };
}

/**
 * Carbono aéreo total del ámbito (carbono directo, 2026-11-21). Otro
 * componente que el leñoso: nunca se suman. Con modelos exploratorios el
 * total es null (sin total oficial) y solo se informa la cobertura.
 */
export interface CarbonoAereoTotalAgregado {
  indicador: "estimacion_carbono_aereo_total";
  limitaciones: string[];
  cobertura: {
    presentes: number;
    universo_calculo: number;
    con_resultado: number;
    con_resultado_exploratorio: number;
    por_modelo: Record<string, number>;
    por_categoria: Record<CategoriaSinCarbono, number>;
    motivos: Record<string, number>;
  };
  total: { carbono_t: number | null; co2e_t: number | null };
}

/** Carbono aéreo total de un árbol (B2, carbono directo, 2026-11-21): incluye hojas, sin raíces. */
export type CarbonoAereoTotalArbol =
  | {
      valor: {
        carbono_kg: number;
        co2e_kg: number;
        componente: { codigo: "aerea_total"; incluye: string[]; excluye: string[] };
        modelo: { id: string; fuente: string; doi: string; estado: "aprobado" | "exploratorio"; confianza: string; especie_ecuacion: string; limitaciones_modelo: string[] };
      };
      categoria: null;
      motivo: null;
      detalle: null;
      limitaciones: string[];
    }
  | { valor: null; categoria: CategoriaSinCarbono; motivo: string; detalle: string; limitaciones: string[] };

export interface EstadisticaDescriptiva {
  n: number;
  media: number | null;
  mediana: number | null;
  minimo: number | null;
  maximo: number | null;
}
type ClaseDescriptiva = { etiqueta: string; desde: number; hasta: number | null; n: number };
type PorValor = { n: number; mediana: number | null; valores: { valor: number; n: number }[] };
type PorCategoria = { categorias: { codigo: string; etiqueta: string | null; n: number }[]; sin_dato: number };
type Abundancia = { denominador: number; grupos: { nombre: string; arboles: number; porcentaje: number | null }[]; sin_dato: number };

/** Diagnóstico descriptivo (propuesta experimental): datos medidos y vigentes, sin ecuaciones ni índices. */
export interface DiagnosticoDescriptivo {
  estado: string;
  universo: { presentes: number; con_evaluacion_vigente: number };
  dimensiones: {
    altura_m: EstadisticaDescriptiva & { clases: ClaseDescriptiva[] };
    dap_cm: EstadisticaDescriptiva & { multifustales_con_dap_equivalente: number };
    diametro_copa_m: EstadisticaDescriptiva;
    area_copa_por_arbol_m2: EstadisticaDescriptiva;
    longitud_copa_viva_m: EstadisticaDescriptiva;
    proporcion_copa_viva_pct: EstadisticaDescriptiva & { clases: ClaseDescriptiva[] };
    relacion_copa_altura: EstadisticaDescriptiva;
    altura_primera_rama_m: EstadisticaDescriptiva;
    clase_edad: PorCategoria;
  };
  condicion_copa: {
    nota: string;
    cle: PorValor;
    muerte_regresiva_pct: PorValor;
    defoliacion_pct: PorValor;
    clorosis_pct: PorValor;
    necrosis_pct: PorValor;
    copa_faltante_pct: PorValor;
    vitalidad: PorCategoria;
  };
  composicion: { genero: Abundancia; familia: Abundancia };
  territorio: {
    sectores: {
      sector: string;
      presentes: number;
      con_evaluacion_vigente: number;
      especies: number;
      altura_mediana_m: number | null;
      dap_mediano_cm: number | null;
      diametro_copa_mediano_m: number | null;
    }[];
    comparable: boolean;
  };
  completitud: {
    presentes_sin_evaluacion_vigente: number;
    evaluados_sin: Record<"altura" | "dap" | "diametro_copa" | "base_copa_viva" | "primera_rama" | "clase_edad" | "cle" | "muerte_regresiva", number>;
    base_copa_viva_mayor_que_altura: number;
    multifustales_sin_fustes: number;
    presentes_sin_especie: number;
    presentes_especie_sin_rasgos: number;
    especies_sin_origen_en_catalogo: string[];
    mediciones_en_revision: { tree_code: string; motivo: string }[];
  };
}

/** Descriptivos de un árbol (ficha; propuesta experimental). */
export interface DescriptivosArbol {
  longitud_copa_viva_m: number | null;
  proporcion_copa_viva_pct: number | null;
  relacion_copa_altura: number | null;
  altura_primera_rama_m: number | null;
  altura_base_copa_viva_m: number | null;
  numero_fustes: number | null;
  condicion_copa: {
    cle: number | null;
    muerte_regresiva_pct: number | null;
    defoliacion_pct: number | null;
    clorosis_pct: number | null;
    necrosis_pct: number | null;
    copa_faltante_pct: number | null;
    vitalidad: { codigo: string; etiqueta: string | null } | null;
  };
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
  /** Parámetros de crecimiento con su fuente (Nowak 2024). */
  crecimiento?: { fuente: string };
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
  /** Propuesta experimental: categoría de crecimiento según i-Tree (solo referencia, no aprobada). */
  categoria_itree?: { categoria: "lento" | "moderado" | "rapido"; fuente: string; estado: string } | null;
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
        /** Propuesta experimental: estado del resultado (un multifustal siempre es exploratorio). */
        estado_resultado?: "aprobado" | "exploratorio";
        tratamiento_multifustal?: null | { metodo: string; fuente: string; dap_fustes_cm: number[]; dap_equivalente_cm: number };
      };
      categoria: null;
      motivo: null;
      detalle: null;
      metodo: MetodoCarbono;
      limitaciones: string[];
    }
  | { valor: null; categoria: CategoriaSinCarbono; motivo: string; detalle: string; metodo: MetodoCarbono; limitaciones: string[] };

/** Carbono almacenado con el mejor modelo por árbol (propuesta experimental, Valej 2026-11-22). */
export interface ComponenteCarbonoIntegrado {
  biomasa_kg: number | null;
  carbono_kg: number;
  co2e_kg: number;
  componente: "aerea_lenosa" | "aerea_total" | "total";
  incluye: string[];
  modelo: { id: string; version: number; forma: string; fuente: string; especie_ecuacion: string; confianza: string; estado: "aprobado" | "exploratorio"; fraccion_carbono: number | null };
  variables: Record<string, number>;
  advertencias: string[];
}
export interface CarbonoIntegradoArbol {
  tree_id: string;
  tree_code: string | null;
  especie: string | null;
  estado: "aprobado" | "exploratorio" | "no_estimable";
  aereo: ComponenteCarbonoIntegrado | null;
  total: ComponenteCarbonoIntegrado | null;
  comparacion: ComponenteCarbonoIntegrado[];
  motivo: string | null;
  fecha_calculo: string;
}
export interface CarbonoIntegrado {
  indicador: "estimacion_carbono_integrada";
  estado_metodologico: string;
  fecha_calculo: string;
  arboles_presentes: number;
  con_estimacion: number;
  aprobados: number;
  exploratorios: number;
  no_estimables: number;
  aereo: {
    arboles: number;
    carbono_kg_aprobado: number;
    carbono_kg_exploratorio: number;
    carbono_kg: number;
    por_componente: { aerea_lenosa: { arboles: number; carbono_kg: number }; aerea_total: { arboles: number; carbono_kg: number } };
    co2e_kg: number;
  };
  total: { arboles: number; carbono_kg: number; co2e_kg: number };
  pendientes: Record<string, number>;
  arboles: CarbonoIntegradoArbol[];
}
