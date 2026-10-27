/**
 * Miembro de proyecto tal como lo devuelve GET /api/sivu/projects/:id/members
 * (`ProjectMemberWithUserRow` en
 * valpo-verde-backend/src/repositories/projectMember.repository.ts) —
 * no se agregan campos, no hay rol por membresía (`project_members`
 * representa SOLO pertenencia, D-266/D-267). La API no entrega el rol del
 * usuario: no se muestra hasta que lo entregue.
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
 * Body de POST /api/sivu/projects/:id/members, igual que
 * `agregarMiembroSchema` (`.strict()`: solo `user_id`).
 */
export interface AddProjectMemberInput {
  user_id: string;
}
