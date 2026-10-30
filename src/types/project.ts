/**
 * Proyecto tal como lo devuelve la API de la Fase 6 (`ProyectoRow` en
 * valpo-verde-backend/src/repositories/sivu/project.repository.ts;
 * PR-005 v4.0, migraciones 012 y 018b) — no se agregan ni se infieren
 * campos adicionales. El modelo nuevo ya no tiene institución ni
 * profesional responsable.
 */
export interface Project {
  id: string;
  nombre_proyecto: string;
  estado_proyecto: "activo" | "cerrado";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Geometría del sector tal como la entrega la API (B13). */
export interface SectorGeoJson {
  type: "MultiPolygon" | "Polygon";
  coordinates: number[][][][] | number[][][];
}

/** Sector del proyecto (`SectorRow` del mismo repositorio; SECTORES). */
export interface ProjectSector {
  id: string;
  project_id: string;
  nombre_sector: string;
  superficie_sector_m2: number;
  /** Contorno del sector en GeoJSON WGS84, longitud primero (B13); null si no se pudo leer. */
  geometria_sector?: SectorGeoJson | null;
  created_at: string;
  updated_at: string;
}

/** GET /api/sivu/projects/:id — `ProyectoConSector` del backend. */
export interface ProjectWithSector {
  proyecto: Project;
  sector: ProjectSector | null;
}

/**
 * Body de PATCH /api/sivu/projects/:id (`editarProyectoSchema`, `.strict()`):
 * al menos uno de los dos; sin `geometria_sector` (no se edita aquí).
 */
export interface EditProjectInput {
  nombre_proyecto?: string;
  sector?: { nombre_sector: string };
}

/** Geometría del sector desde un archivo (`geometriaSectorInput`, rama KML/KMZ). */
export interface GeometriaSectorArchivo {
  formato: "kml" | "kmz";
  /** Contenido del archivo en base64, sin el prefijo `data:`. */
  archivoBase64: string;
  /** Índices de la vista previa que integran el sector (CC-047). */
  indicesSeleccionados?: number[];
}

/** Body de POST /api/sivu/projects (`crearProyectoConSectorSchema`). Solo Administrador. */
export interface CreateProjectInput {
  nombre_proyecto: string;
  sector: { nombre_sector: string; geometria_sector: GeometriaSectorArchivo };
}

/** Respuesta de POST /api/sivu/projects. */
export interface CreateProjectResult {
  projectId: string;
  sectorId: string;
  /** Puntos y líneas del archivo que no integran el sector (D-255). */
  superficiesExcluidas: number;
}

/** Estado de cada elemento del archivo en la vista previa (CC-047). */
export type EstadoSuperficie = "valida" | "invalida" | "excluida";

/** Un elemento del KML/KMZ (`SuperficieVistaPrevia` del backend). */
export interface SuperficieVistaPrevia {
  indice: number;
  nombre: string | null;
  estado: EstadoSuperficie;
  tipo: string | null;
  /** Motivo de `invalida` o `excluida`, tal como lo da el backend. */
  motivo: string | null;
  /** GeoJSON en WGS84; null si no se pudo leer. */
  geometria: { type: string; coordinates: unknown } | null;
}

/** POST /api/sivu/projects/sector-preview: no guarda nada. */
export interface VistaPreviaSector {
  superficies: SuperficieVistaPrevia[];
  validas: number;
  invalidas: number;
  excluidas: number;
}
