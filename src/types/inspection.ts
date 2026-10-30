/**
 * Formulario de inspección (Fase 7). Formas tal como las entrega el backend:
 * - B16 `GET /api/sivu/projects/:id/inspection-form-schema?tipo=evaluacion_inicial`
 *   (`construirInspectionFormSchema`, rama `feature/b16-inspection-form-schema`);
 * - borrador, fotos, calcular y finalizar (`inspection.controller.ts`,
 *   `finalizacion.service.ts`, `photo.service.ts`; #58, #59, CC-049, CC-054).
 * No se agregan ni se infieren campos.
 */

/** Condición de activación de un campo (`CondicionActivacion` de REGLAS_COMPLETITUD). */
export type CondicionActivacion =
  | { op: "siempre" }
  | { op: "igual"; campo: string; valor: unknown }
  | { op: "no_verdadero"; campo: string }
  | { op: "mayor_que"; campo: string; valor: number }
  | { op: "menor_que"; campo: string; valor: number }
  | { op: "mas_de_un_valor"; campo: string }
  | { op: "y"; condiciones: CondicionActivacion[] }
  | { op: "o"; condiciones: CondicionActivacion[] };

export type TipoEntrada =
  | "booleano"
  | "decimal"
  | "entero"
  | "texto"
  | "fecha"
  | "seleccion"
  | "seleccion_multiple"
  | "lista_decimal"
  | "archivo"
  | "identificador";

export interface OpcionCampo {
  codigo: string | boolean;
  etiqueta: string;
}

/** Sección del formulario (B16): orden de las columnas del Excel, etiquetas aprobadas por la responsable. */
export interface SeccionFormulario {
  codigo: string;
  etiqueta: string;
  orden?: number;
  propuesta?: boolean;
}

export interface CampoFormulario {
  identificador: string;
  /** Etiqueta aprobada (B16); igual a `identificador` si `etiqueta_pendiente` es true. */
  etiqueta: string;
  etiqueta_pendiente: boolean;
  tipo: string | null;
  tipo_entrada: TipoEntrada | null;
  unidad: string | null;
  unidad_valores_excel: string | null;
  opciones: OpcionCampo[] | null;
  /** Texto literal de la columna de obligatoriedad del Excel. */
  obligatoriedad: string | null;
  condicion_activacion: CondicionActivacion | null;
  seccion: SeccionFormulario | null;
  /** Fila del Excel. */
  orden: number | null;
  exigencia: string | null;
  /** Bandera «no presenta» que puede reemplazar el valor (p. ej. `altura_primera_rama_no_presenta`). */
  marca: string | null;
  condicion_texto: string | null;
}

export interface EsquemaFormulario {
  tipo: string;
  secciones?: SeccionFormulario[];
  variables: CampoFormulario[];
  campos_arbol: CampoFormulario[];
}

export type ValorCampo = string | number | boolean | null | string[] | number[];

/** Body de POST /work-orders/:id/inspections y PATCH /inspections/:id (estado COMPLETO, nunca un delta). */
export interface BorradorBody {
  /** Debe corresponder a la acción de la OT (D-196). */
  tipo_inspeccion_realizada: string;
  subtipo_inspeccion: string | null;
  variables: Record<string, ValorCampo>;
  campos_arbol: Record<string, ValorCampo>;
}

export interface BorradorResultado {
  inspection_id: string;
  evaluation_id: string;
  tree_data_version_id: string | null;
  estado_registro: string;
}

export type VistaFoto = "arbol_completo" | "base" | "tronco" | "copa";

export interface FotoInspeccion {
  id: string;
  vista: VistaFoto | null;
  /** Enlace firmado de corta duración. */
  url: string;
  created_at: string;
  uploaded_by: string | null;
}

export interface CampoFaltante {
  campo: string;
  hoja: "ARBOLES" | "REGISTRO_EVALUACION";
  fila: number;
  motivo: string;
}

export interface FechaSugerida {
  fecha: string;
  rango_inicio: string;
  rango_fin: string | null;
  inmediato_y_continuo: boolean;
  motivo: string | null;
}

/** Respuesta de POST /inspections/:id/calcular (`CalculoRespuesta`). Los resultados llegan como códigos. */
export interface CalculoRespuesta {
  inspection_id: string;
  tipo_inspeccion_realizada: string;
  subtipo_inspeccion: string | null;
  resultado: Record<string, unknown>;
  nivel_riesgo: string;
  fechas_sugeridas: {
    fecha_proxima_inspeccion: FechaSugerida;
    fecha_proximo_monitoreo: FechaSugerida;
  };
  fecha_proxima_inspeccion_vigente: string | null;
  valores_no_permitidos: string[];
  campos_faltantes: CampoFaltante[];
  puede_finalizar: boolean;
  huella: string;
}

export type FinalizacionRespuesta =
  | { finalizada: false; estado_registro: "preguardado"; campos_faltantes: CampoFaltante[] }
  | {
      finalizada: true;
      fecha_proxima_inspeccion_sugerida: string;
      fecha_proximo_monitoreo_sugerida: string;
      fecha_proxima_inspeccion: string;
      fecha_proximo_monitoreo: string;
      [k: string]: unknown;
    };

/** Ajuste del Inspector sobre una clasificación calculada (D-170 a D-173; CC-044). */
export interface AjusteClasificacion {
  valor_ajustado: string;
  justificacion_ajuste_clasificacion: string;
}

export type CampoAjustable = "clasificacion_riesgo" | "clasificacion_infraestructura" | "clasificacion_prioridad";

export type AjustesBody = Partial<Record<CampoAjustable, AjusteClasificacion>>;

/** Body de POST /inspections/:id/finalizar (CC-054, CC-055; D-202 a D-204). */
export interface FinalizarBody {
  huella: string;
  ajustes?: AjustesBody;
  fecha_proxima_inspeccion?: string;
  fecha_proximo_monitoreo?: string;
  justificacion_ajuste_fecha?: string;
}
