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

/** Sector del proyecto (`SectorRow` del mismo repositorio; SECTORES). */
export interface ProjectSector {
  id: string;
  project_id: string;
  nombre_sector: string;
  superficie_sector_m2: number;
  created_at: string;
  updated_at: string;
}

/** GET /api/sivu/projects/:id — `ProyectoConSector` del backend. */
export interface ProjectWithSector {
  proyecto: Project;
  sector: ProjectSector | null;
}

/**
 * Body de POST /api/projects de la demo, igual que `createProjectSchema`
 * en valpo-verde-backend/src/schemas/project.schema.ts (`.strict()`).
 * Crear un proyecto con su sector (POST /api/sivu/projects, KML/KMZ) llega
 * en el Paso 5 de la Fase 7; hasta entonces el formulario usa la demo y,
 * contra la base de pruebas, muestra el error real que devuelva.
 */
export interface CreateProjectInput {
  name: string;
  institution_name: string;
  responsible_professional?: string;
}
