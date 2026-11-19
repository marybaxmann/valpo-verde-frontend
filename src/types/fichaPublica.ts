/**
 * Ficha pública de un árbol (Valpo Verde Conecta; CC-062, PR-022 v2.0).
 * Solo los campos que CC-062 autoriza mostrar a quien escanea el QR:
 * especie científica (D-13), nombre común (D-14), ubicación descriptiva
 * (D-8) y «Sobre esta especie» con los campos de CATALOGO_ESPECIES
 * (D-257 a D-262). Nunca el `tree_code`, coordenadas, riesgo, fotos ni
 * otro resultado técnico.
 *
 * Forma publicada por el backend: `GET /api/sivu/conecta/arboles/:qrToken`
 * (contrato-frontend §8).
 */
export interface CodigoEtiquetaPublico {
  codigo: string;
  etiqueta: string;
}

export interface EspeciePublica {
  especie_cientifica: string | null;
  genero: string | null;
  familia: string | null;
  /** «Origen no determinado» si el árbol no tiene especie vigente (D-260). */
  origen_biogeografico: CodigoEtiquetaPublico | null;
  persistencia_follaje: CodigoEtiquetaPublico | null;
  tipo_hoja: CodigoEtiquetaPublico | null;
}

export interface FichaPublica {
  especie_cientifica: string | null;
  nombre_comun: string | null;
  ubicacion_descriptiva: string | null;
  sobre_la_especie: EspeciePublica | null;
}

/* ---------------------------------------------------------------------
 * Ficha pública editable (CC-078; PR-022 v3.0, PR-004 v8.0). Claves
 * nuevas de `GET /api/sivu/conecta/arboles/:qrToken` (contrato-frontend
 * §8 ter). Son opcionales: la API publicada antes de CC-078 no las envía
 * y la ficha sigue usando el contenido aprobado de `contenidoEspecie.ts`.
 * ------------------------------------------------------------------- */

export interface FotoPublica {
  url: string;
}

export interface ContenidoEspeciePublico {
  curiosidad: string | null;
  aportes: { icono: CodigoEtiquetaPublico; titulo: string }[];
  quien_soy: string | null;
  rasgos: { etiqueta: string; texto: string; foto: FotoPublica | null }[];
  anio_estacional: { prim: string; ver: string; oto: string; inv: string } | null;
  ciclo: { titulo: string; pasos: { etiqueta: string; texto: string }[] } | null;
  historia_especie: string | null;
  consejo: string | null;
}

export interface NaturalezaMedida extends CodigoEtiquetaPublico {}

export type MedidaPublica =
  | { valor: number; unidad: string; naturaleza: NaturalezaMedida }
  | { codigo: string; etiqueta: string; naturaleza: NaturalezaMedida };

/** Campos de las medidas que el municipio puede activar por árbol (D-297 a D-301). */
export type CampoMedida = "clase_edad" | "altura_total_m" | "dap_cm" | "diametro_copa_m" | "rango_edad_estimada_anios";

export interface FichaPublicaAmpliada extends FichaPublica {
  nombre_visualizacion?: string | null;
  articulo?: "el" | "la" | null;
  contenido_especie?: ContenidoEspeciePublico | null;
  ejemplar?: { historia: string | null; historia_fuente: string | null };
  foto_principal?: { tipo: "ejemplar" | "referencial_especie"; url: string } | null;
  medidas?: Partial<Record<CampoMedida, MedidaPublica>>;
}

/** Texto personalizado del árbol que reemplaza el de la especie (D-305). */
export interface TextoPersonalizado {
  texto: string;
  fuente: string;
}

/** Lo propio del árbol en su ficha pública (D-296 a D-307). */
export interface FichaArbolEditable {
  mostrar_clase_edad: boolean;
  mostrar_altura_total: boolean;
  mostrar_dap: boolean;
  mostrar_diametro_copa: boolean;
  mostrar_rango_edad: boolean;
  historia: string | null;
  historia_fuente: string | null;
  textos_personalizados: Partial<Record<"curiosidad" | "quien_soy" | "consejo", TextoPersonalizado>>;
  foto: FotoPublica | null;
  updated_by: string | null;
  updated_at: string | null;
}

/** `GET …/trees/:treeId/ficha-publica`. */
export interface RespuestaFichaArbol {
  ficha: FichaArbolEditable;
  medidas_vigentes: {
    clase_edad: CodigoEtiquetaPublico | null;
    altura_total_m: number | null;
    dap_cm: number | null;
    diametro_copa_m: number | null;
    rango_edad_estimada_anios: CodigoEtiquetaPublico | null;
  };
  vista_previa: FichaPublicaAmpliada;
}
