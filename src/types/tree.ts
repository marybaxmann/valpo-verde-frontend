/**
 * Respuesta de GET /api/projects/:id/trees (SIG-1), igual que
 * `TreeInventory` en valpo-verde-backend/src/services/tree.service.ts.
 * GeoJSON RFC 7946: WGS84, coordenadas [longitud, latitud]. Solo lectura.
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
