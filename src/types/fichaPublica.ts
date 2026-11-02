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
