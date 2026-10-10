/**
 * Tipos de Inventario y Árboles para SIVU (INV-1C / INV-1B / SIG-1).
 * GeoJSON RFC 7946: WGS84, coordenadas [longitud, latitud].
 */
export interface TreeFeatureProperties {
  id: string;
  tree_code: string;
  legacy_id: string | null;
  estado_ciclo_vida: string;
  nombre_cientifico: string | null;
  nombre_comun: string | null;
  direccion: string | null;
  comuna: string | null;
  lugar_referencia: string | null;
}

export interface TreeFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: TreeFeatureProperties;
}

export interface TreeInventory {
  data: { type: "FeatureCollection"; features: TreeFeature[] };
  meta: { total: number; con_ubicacion: number; sin_ubicacion: number };
}

export interface SpeciesItem {
  id: string;
  nombre_cientifico: string;
  nombre_comun: string | null;
}

export interface PublicSpaceItem {
  id: string;
  nombre: string;
  tipo: string | null;
}

export interface TreeMeasurementRow {
  id: string;
  tree_id: string;
  fecha_medicion: string;
  configuracion_fustes: string;
  numero_fustes: number | null;
  dap_fustes_cm: number[] | null;
  dap_cm: number | null;
  altura_total_m: number;
  diametro_copa_m: number;
  altura_primera_rama_m: number;
  clase_edad: "Joven" | "Semimaduro" | "Tempranamente maduro" | "Maduro" | "Sobremaduro" | string | null;
  estado_medicion: "valida" | "anulada";
  motivo_anulacion: string | null;
  anulado_por: string | null;
  fecha_anulacion: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TreeDetailDTO {
  id: string;
  tree_code: string;
  legacy_id: string | null;
  project_id: string;
  public_space_id: string | null;
  direccion: string | null;
  comuna: string | null;
  lugar_referencia: string | null;
  ubicacion: { lon: number; lat: number } | null;
  estado_ciclo_vida: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  species: { id: string; nombre_cientifico: string; nombre_comun: string | null } | null;
  public_spaces: { id: string; nombre: string; tipo: string | null } | null;
  medicion_actual: TreeMeasurementRow | null;
  medicion_actual_estado: "sin_mediciones" | "ok" | "error_empate_fecha_maxima";
  medicion_actual_detalle: string | null;
}

export const CLASE_EDAD_OPTIONS = [
  "Joven",
  "Semimaduro",
  "Tempranamente maduro",
  "Maduro",
  "Sobremaduro",
] as const;

export type ClaseEdad = (typeof CLASE_EDAD_OPTIONS)[number];

export interface InitialMeasurementInput {
  fecha_medicion: string;
  configuracion_fustes: string;
  numero_fustes?: number | null;
  dap_fustes_cm?: number[] | null;
  dap_cm?: number | null;
  altura_total_m: number;
  diametro_copa_m: number;
  altura_primera_rama_m: number;
  clase_edad?: ClaseEdad | null;
}

export interface UpdateTreePayload {
  species_id?: string;
  direccion?: string | null;
  comuna?: string | null;
  lugar_referencia?: string | null;
}

export interface CreateTreePayload {
  species_id: string;
  public_space_id?: string | null;
  direccion?: string | null;
  comuna?: string | null;
  lugar_referencia?: string | null;
  ubicacion: {
    lon: number;
    lat: number;
  };
  medicion_inicial: InitialMeasurementInput;
}
