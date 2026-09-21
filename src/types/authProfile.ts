/**
 * Perfil de usuario autenticado devuelto por GET /api/auth/me. Refleja
 * exactamente `AuthenticatedUser` en valpo-verde-backend
 * (src/types/auth.ts) — no se agregan ni se infieren campos adicionales.
 */
export interface AuthProfile {
  id: string;
  email: string | undefined;
  nombre: string | null;
  role: string | null;
  activo: boolean;
}
