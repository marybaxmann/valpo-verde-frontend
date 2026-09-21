/**
 * Perfil de usuario autenticado devuelto por GET /api/auth/me. Refleja
 * exactamente `AuthenticatedUser` en valpo-verde-backend
 * (src/types/auth.ts) — no se agregan ni se infieren campos adicionales.
 * `role` se mantiene como `string | null` (igual que el backend, PR-003/
 * PR-004): no se estrecha a una unión, para no fingir que el frontend
 * valida el catálogo de roles — esa autoridad es del backend.
 */
export interface AuthProfile {
  id: string;
  email: string | undefined;
  nombre: string | null;
  role: string | null;
  activo: boolean;
}

/**
 * Roles reconocidos por el routing/navegación del frontend en esta fase
 * (F5). No es el catálogo de roles del sistema (eso lo define el
 * backend) — es solo la lista de valores de `profile.role` para los que
 * F5 ya sabe a qué shell dirigir. Ver PR-003/PR-004.
 */
export type KnownRole = "admin" | "usuario_municipal";
