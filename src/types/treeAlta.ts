/**
 * Alta municipal mínima del árbol en la API de la Fase 6
 * (valpo-verde-backend: src/schemas/sivu/arboles.schema.ts y
 * src/repositories/sivu/tree.repository.ts; PR-003 v8.0, PR-006 v10.0).
 * Solo `usuario_municipal`. Sin datos técnicos: esos los registra el
 * Inspector mediante OT.
 */

/** Body de POST /api/sivu/projects/:id/trees (`altaMunicipalArbolSchema`, `.strict()`). */
export interface AltaArbolInput {
  /** D-7: nombre del barrio o sector dentro del proyecto. */
  sector: string;
  /** D-8: dirección, plaza u otras referencias de terreno. */
  ubicacion_descriptiva: string;
  /** D-9 / D-10: UTM huso 19S, datum WGS84 (EPSG:32719), en metros. */
  utm_este: number;
  utm_norte: number;
  /** D-13 / D-14: al menos uno de los dos. */
  especie_cientifica?: string;
  nombre_comun?: string;
}

/** Respuesta 201 (`ArbolAltaRow`). */
export interface ArbolAlta {
  id: string;
  tree_code: string;
  project_id: string;
  sector_id: string;
  sector: string;
  ubicacion_descriptiva: string;
  utm_este: number;
  utm_norte: number;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  estado_ciclo_vida: string;
  fecha_registro: string;
  registrado_por: string;
  created_at: string;
}

/** Fila de CATALOGO_ESPECIES (`EspecieRow`, GET /api/sivu/projects/:id/species). */
export interface Especie {
  id: string;
  especie_cientifica: string;
  genero: string | null;
  familia: string | null;
}
