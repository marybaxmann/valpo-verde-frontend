/**
 * Proyecto tal como lo devuelve el backend (`ProjectRow` en
 * valpo-verde-backend/src/repositories/project.repository.ts) — no se
 * agregan ni se infieren campos adicionales.
 */
export interface Project {
  id: string;
  name: string;
  institution_name: string;
  responsible_professional: string | null;
  created_by: string | null;
  status: "activo" | "cerrado";
  created_at: string;
  updated_at: string;
}

/**
 * Body de POST /api/projects, igual que `createProjectSchema` en
 * valpo-verde-backend/src/schemas/project.schema.ts (`.strict()`: solo
 * estos tres campos — `created_by`/`status`/timestamps los fija el
 * backend, nunca el cliente).
 */
export interface CreateProjectInput {
  name: string;
  institution_name: string;
  responsible_professional?: string;
}
