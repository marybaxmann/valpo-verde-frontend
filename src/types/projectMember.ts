/**
 * Miembro de proyecto tal como lo devuelve GET /api/projects/:id/members
 * (`ProjectMemberWithUserRow` en
 * valpo-verde-backend/src/repositories/projectMember.repository.ts) —
 * no se agregan campos, no hay rol por membresía (`project_members`
 * representa SOLO pertenencia, PR-005 v3.0).
 */
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  added_by: string | null;
  user: { nombre: string | null } | null;
}

/**
 * Body de POST /api/projects/:id/members, igual que
 * `addProjectMemberSchema` (`.strict()`: solo `user_id`).
 */
export interface AddProjectMemberInput {
  user_id: string;
}
